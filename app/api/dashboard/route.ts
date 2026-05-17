import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Run all queries in parallel
  const [campaignsRes, healthRes, insightsRes] = await Promise.all([
    // All campaigns with metrics
    supabase
      .from("campaigns")
      .select(`
        id, name, subject, sent_at, status,
        campaign_metrics (
          total_sent, delivered,
          open_rate, ctr, ctor,
          bounce_rate, unsubscribe_rate,
          spam_complaint_rate, delivery_rate,
          hard_bounces, soft_bounces, spam_complaints, unsubscribes
        ),
        health_scores (
          score, grade, delta, component_scores
        )
      `)
      .eq("user_id", userId)
      .order("sent_at", { ascending: false }),

    // All health scores for this user (via campaign join)
    supabase
      .from("health_scores")
      .select("score, grade, delta, component_scores, campaign_id")
      .in(
        "campaign_id",
        // sub-select done via a second query below — handled in JS
        []
      ),

    // Top insights across all campaigns
    supabase
      .from("insight_results")
      .select(`
        id, layer, severity, diagnosis, recommendation, metric_key,
        campaigns!inner (user_id)
      `)
      .eq("campaigns.user_id", userId)
      .in("severity", ["critical", "warning"])
      .order("severity", { ascending: true })
      .limit(10),
  ]);

  const campaigns = (campaignsRes.data ?? []).map((c) => ({
    ...c,
    metrics: Array.isArray(c.campaign_metrics) ? c.campaign_metrics[0] ?? null : c.campaign_metrics ?? null,
    health_score: Array.isArray(c.health_scores) ? c.health_scores[0] ?? null : c.health_scores ?? null,
  }));

  const withMetrics  = campaigns.filter((c) => c.metrics && c.metrics.total_sent > 0);
  const withScores   = campaigns.filter((c) => c.health_score);

  // ── Quick stats ────────────────────────────────────────────────────────────
  const activeCampaigns = campaigns.filter((c) => c.status === "sent").length;
  const avgOpenRate = avg(withMetrics.map((c) => c.metrics!.open_rate));
  const avgCtr      = avg(withMetrics.map((c) => c.metrics!.ctr));
  const avgCtor     = avg(withMetrics.map((c) => c.metrics!.ctor));

  // ── Account health score ───────────────────────────────────────────────────
  const scores = withScores.map((c) => c.health_score!.score);
  const accountScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const accountGrade =
    accountScore === null ? null :
    accountScore >= 85 ? "A" : accountScore >= 70 ? "B" :
    accountScore >= 55 ? "C" : accountScore >= 40 ? "D" : "F";

  // Average component scores across all campaigns
  type Components = Record<string, number>;
  const componentKeys = ["hard_bounce","spam_complaint","open_rate","ctr","unsubscribe","ctor","delivery"];
  const avgComponents: Components = {};
  for (const key of componentKeys) {
    const vals = withScores
      .map((c) => (c.health_score!.component_scores as Components)?.[key])
      .filter((v): v is number => typeof v === "number");
    avgComponents[key] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 50;
  }

  // Top issue = component with lowest weighted score
  const WEIGHTS: Components = { hard_bounce:0.20, spam_complaint:0.15, open_rate:0.20, ctr:0.15, unsubscribe:0.15, ctor:0.10, delivery:0.05 };
  const worstComponent = componentKeys
    .filter((k) => avgComponents[k] < 70)
    .sort((a, b) => (avgComponents[a] * WEIGHTS[a]) - (avgComponents[b] * WEIGHTS[b]))[0] ?? null;
  const ISSUE_LABELS: Components = {
    hard_bounce:"Hard bounce rate is above benchmark", spam_complaint:"Spam complaint rate is elevated",
    open_rate:"Open rate is below benchmark", ctr:"Click-through rate is below benchmark",
    unsubscribe:"Unsubscribe rate is above benchmark", ctor:"Click-to-open rate needs improvement",
    delivery:"Delivery rate is below benchmark",
  } as unknown as Components;

  // ── Top & bottom campaigns ────────────────────────────────────────────────
  const ranked = [...withScores].sort((a, b) => b.health_score!.score - a.health_score!.score);
  const topCampaigns = ranked.slice(0, 3).map(campaignRow);
  const bottomCampaigns = ranked.slice(-3).reverse().map(campaignRow);

  // ── Immediate wins from insights ──────────────────────────────────────────
  const rawInsights = (insightsRes.data ?? []) as Array<{
    id: string; layer: number; severity: string;
    diagnosis: string; recommendation: string; metric_key: string | null;
  }>;

  const immediateWins = deduplicateInsights(rawInsights).slice(0, 3).map((ins) => ({
    id: ins.id,
    type: ins.severity === "critical" ? "warning" : "opportunity",
    title: insightTitle(ins.metric_key),
    description: truncate(ins.diagnosis, 120),
    recommendation: truncate(ins.recommendation, 140),
    effort: effortFor(ins.metric_key),
    layer: ins.layer,
    severity: ins.severity,
  }));

  // ── Contact cost saving estimate ──────────────────────────────────────────
  const totalHardBounces   = withMetrics.reduce((s, c) => s + (c.metrics!.hard_bounces ?? 0), 0);
  const totalUnsubscribes  = withMetrics.reduce((s, c) => s + (c.metrics!.unsubscribes ?? 0), 0);
  const unengagedEstimate  = totalHardBounces + totalUnsubscribes;
  // Rough SFMC contact cost: ~$0.0015/contact/send across 10 sends/month
  const estimatedMonthlySaving = Math.round(unengagedEstimate * 0.015);

  return NextResponse.json({
    hasCampaigns: campaigns.length > 0,
    stats: { activeCampaigns, avgOpenRate, avgCtr, avgCtor },
    healthScore: accountScore !== null
      ? { score: accountScore, grade: accountGrade, components: avgComponents, topIssue: worstComponent ? ISSUE_LABELS[worstComponent] : null }
      : null,
    topCampaigns,
    bottomCampaigns,
    immediateWins,
    contactSaving: unengagedEstimate > 0 ? { unengagedCount: unengagedEstimate, estimatedMonthlySaving } : null,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(vals: (number | null | undefined)[]): number | null {
  const clean = vals.filter((v): v is number => v !== null && v !== undefined);
  return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : null;
}

function campaignRow(c: { id: string; name: string; metrics: { open_rate: number | null; ctr: number | null } | null; health_score: { score: number; grade: string; delta: number | null } | null }) {
  return {
    id: c.id,
    name: c.name,
    openRate: c.metrics?.open_rate ?? null,
    ctr: c.metrics?.ctr ?? null,
    score: c.health_score?.score ?? null,
    grade: c.health_score?.grade ?? null,
    delta: c.health_score?.delta ?? null,
  };
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function deduplicateInsights(ins: Array<{ metric_key: string | null; severity: string; diagnosis: string; recommendation: string; id: string; layer: number }>) {
  const seen = new Set<string>();
  return ins.filter((i) => {
    const key = i.metric_key ?? i.diagnosis.slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function insightTitle(metricKey: string | null): string {
  const map: Record<string, string> = {
    spf: "Fix SPF authentication",
    dkim: "Fix DKIM signature",
    dmarc: "Align DMARC policy",
    blocklist: "Domain is blocklisted",
    sender_score: "Low sender reputation",
    delivery_rate: "Delivery rate is falling",
    hard_bounce_rate: "Hard bounces need suppression",
    spam_complaint_rate: "Spam complaints are rising",
    open_rate: "Boost open rate with better subject lines",
    ctr: "Improve click-through rate",
    ctor: "Fix content-to-subject mismatch",
    unsubscribe_rate: "High unsubscribe rate",
    send_day: "Avoid weekend sends",
    send_hour: "Send during peak hours",
    send_timing: "Send timing is optimal",
    audience_size: "Consider segmenting your audience",
  };
  return map[metricKey ?? ""] ?? "Review campaign performance";
}

function effortFor(metricKey: string | null): "Low" | "Medium" | "High" {
  const low = ["hard_bounce_rate","spam_complaint_rate","open_rate","ctr","ctor","send_day","send_hour","unsubscribe_rate"];
  const high = ["blocklist","spf","dkim"];
  if (low.includes(metricKey ?? "")) return "Low";
  if (high.includes(metricKey ?? "")) return "High";
  return "Medium";
}
