// POST /api/recalculate
// Runs health score + insight + benchmark calculation for all existing campaigns.
// Does NOT call SFMC — safe to run against seeded SQL data.

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateHealthScore } from "@/lib/healthscore";
import { generateInsights } from "@/lib/insights";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  let healthScores = 0, insights = 0;

  // Fetch all campaigns with metrics
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(`id, sent_at, campaign_metrics (
      open_rate, ctr, ctor, hard_bounces, total_sent,
      unsubscribe_rate, spam_complaint_rate, delivery_rate
    )`)
    .eq("user_id", userId);

  if (!campaigns) return NextResponse.json({ healthScores: 0, insights: 0 });

  for (const camp of campaigns) {
    const m = Array.isArray(camp.campaign_metrics) ? camp.campaign_metrics[0] : camp.campaign_metrics;
    if (!m) continue;

    const hardBounceRate = m.hard_bounces != null && m.total_sent > 0 ? m.hard_bounces / m.total_sent : null;

    const hs = calculateHealthScore({
      hard_bounce_rate:    hardBounceRate,
      spam_complaint_rate: m.spam_complaint_rate ?? null,
      open_rate:           m.open_rate ?? null,
      ctr:                 m.ctr ?? null,
      ctor:                m.ctor ?? null,
      unsubscribe_rate:    m.unsubscribe_rate ?? null,
      delivery_rate:       m.delivery_rate ?? null,
    });

    const { data: existing } = await supabase
      .from("health_scores")
      .select("score")
      .eq("campaign_id", camp.id)
      .maybeSingle();

    await supabase.from("health_scores").upsert(
      { campaign_id: camp.id, score: hs.score, previous_score: existing?.score ?? null, delta: existing?.score != null ? hs.score - existing.score : null, component_scores: hs.components, grade: hs.grade },
      { onConflict: "campaign_id" }
    );
    healthScores++;

    const insightRecords = generateInsights({
      campaignId: camp.id,
      metrics: { open_rate: m.open_rate ?? null, ctr: m.ctr ?? null, ctor: m.ctor ?? null, bounce_rate: hardBounceRate, unsubscribe_rate: m.unsubscribe_rate ?? null, spam_complaint_rate: m.spam_complaint_rate ?? null, delivery_rate: m.delivery_rate ?? null, total_sent: m.total_sent },
      deliverability: null,
      sentAt: camp.sent_at,
    });

    if (insightRecords.length > 0) {
      await supabase.from("insight_results").delete().eq("campaign_id", camp.id);
      await supabase.from("insight_results").insert(insightRecords);
      insights += insightRecords.length;
    }
  }

  // Compute account-level benchmarks across all campaigns
  const { data: allMetrics } = await supabase
    .from("campaign_metrics")
    .select("campaign_id, open_rate, ctr, ctor, bounce_rate, unsubscribe_rate, spam_complaint_rate, delivery_rate")
    .in("campaign_id", campaigns.map(c => c.id));

  if (allMetrics && allMetrics.length > 0) {
    const avg = (key: keyof typeof allMetrics[0]) => {
      const vals = allMetrics.map(m => m[key] as number | null).filter((v): v is number => v !== null && v > 0);
      return vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4)) : null;
    };
    const acct = { acct_open_rate: avg("open_rate"), acct_ctr: avg("ctr"), acct_ctor: avg("ctor"), acct_bounce_rate: avg("bounce_rate"), acct_unsub_rate: avg("unsubscribe_rate"), acct_spam_rate: avg("spam_complaint_rate"), acct_delivery_rate: avg("delivery_rate"), ind_open_rate: 0.21, ind_ctr: 0.025, ind_ctor: 0.11, ind_bounce_rate: 0.005, ind_unsub_rate: 0.002, ind_spam_rate: 0.0005, ind_delivery_rate: 0.97 };
    await supabase.from("benchmarks").upsert(allMetrics.map(m => ({ campaign_id: m.campaign_id, ...acct })), { onConflict: "campaign_id" });
  }

  return NextResponse.json({ healthScores, insights, message: `Calculated ${healthScores} health scores and ${insights} insights` });
}
