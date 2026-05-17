import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/encrypt";
import { getSFMCToken, fetchSendJobs, fetchJobTracking, SFMCToken, SFMCSendJob } from "@/lib/sfmc";
import { calculateHealthScore } from "@/lib/healthscore";
import { generateInsights } from "@/lib/insights";
import { checkDeliverability } from "@/lib/deliverability";

export interface SyncResult {
  campaignsSynced: number;
  campaignsSkipped: number;
  healthScoresCalculated: number;
  insightsGenerated: number;
  deliverabilityChecked: boolean;
  errors: string[];
  durationMs: number;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function syncWorkspace(userId: string): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = { campaignsSynced: 0, campaignsSkipped: 0, healthScoresCalculated: 0, insightsGenerated: 0, deliverabilityChecked: false, errors: [], durationMs: 0 };

  const supabase = createServiceClient();

  // 1. Load workspace credentials
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (wsErr || !ws) {
    result.errors.push("No active workspace found. Connect SFMC in Settings first.");
    result.durationMs = Date.now() - start;
    return result;
  }

  // 2. Ensure profile row exists (Clerk webhook may not have fired yet)
  await supabase
    .from("profiles")
    .upsert({ id: userId, email: "" }, { onConflict: "id", ignoreDuplicates: true });

  // 3. Get SFMC token
  let token: SFMCToken;
  try {
    token = await getSFMCToken({
      subdomain: ws.subdomain,
      clientId: ws.client_id,
      clientSecret: decrypt(ws.client_secret_enc),
      accountId: ws.account_id ?? undefined,
    });
  } catch (err) {
    result.errors.push(`SFMC auth failed: ${String(err)}`);
    result.durationMs = Date.now() - start;
    return result;
  }

  // 4. Fetch all send jobs, paginated
  const allJobs: SFMCSendJob[] = [];
  let page = 1;
  const pageSize = 50;

  while (true) {
    try {
      const { jobs, total } = await fetchSendJobs(token, { page, pageSize });
      allJobs.push(...jobs);
      if (allJobs.length >= total || jobs.length < pageSize) break;
      page++;
    } catch (err) {
      result.errors.push(`Failed fetching send jobs page ${page}: ${String(err)}`);
      break;
    }
  }

  // 5. Upsert each job + its metrics
  for (const job of allJobs) {
    try {
      // Fetch per-job tracking (skip if job already has counts from the list)
      let tracking = {
        sentCount: job.sentCount,
        deliveredCount: job.deliveredCount,
        openCount: job.openCount,
        uniqueOpenCount: job.uniqueOpenCount,
        clickCount: job.clickCount,
        uniqueClickCount: job.uniqueClickCount,
        hardBounceCount: job.hardBounceCount,
        softBounceCount: job.softBounceCount,
        unsubscribeCount: job.unsubscribeCount,
        spamComplaintCount: job.spamComplaintCount,
      };

      // Fetch detailed tracking if job list didn't include metrics
      if (tracking.sentCount === 0 && job.id) {
        try {
          tracking = await fetchJobTracking(token, job.id);
        } catch {
          // Non-fatal — use whatever we have
        }
      }

      // Upsert campaign row
      const { data: campaign, error: campErr } = await supabase
        .from("campaigns")
        .upsert(
          {
            user_id: userId,
            workspace_id: ws.id,
            external_id: String(job.id),
            name: job.name || `Job ${job.id}`,
            subject: job.subject || null,
            status: normalizeSFMCStatus(job.status),
            sent_at: job.sentDate || null,
            platform_id: null,
          },
          { onConflict: "user_id,external_id" }
        )
        .select("id")
        .single();

      if (campErr || !campaign) {
        result.errors.push(`Campaign upsert failed for job ${job.id}: ${campErr?.message}`);
        result.campaignsSkipped++;
        continue;
      }

      // Compute rates (guard divide-by-zero)
      const sent = tracking.sentCount || 0;
      const delivered = tracking.deliveredCount || sent;
      const rates = computeRates(tracking, sent, delivered);

      // Upsert metrics row
      const { error: metricsErr } = await supabase
        .from("campaign_metrics")
        .upsert(
          {
            campaign_id: campaign.id,
            total_sent: sent,
            delivered,
            opens: tracking.openCount,
            unique_opens: tracking.uniqueOpenCount,
            clicks: tracking.clickCount,
            unique_clicks: tracking.uniqueClickCount,
            unsubscribes: tracking.unsubscribeCount,
            bounces: tracking.hardBounceCount + tracking.softBounceCount,
            hard_bounces: tracking.hardBounceCount,
            soft_bounces: tracking.softBounceCount,
            spam_complaints: tracking.spamComplaintCount,
            revenue: 0,
            ...rates,
          },
          { onConflict: "campaign_id" }
        );

      if (metricsErr) {
        result.errors.push(`Metrics upsert failed for job ${job.id}: ${metricsErr.message}`);
      }

      result.campaignsSynced++;
    } catch (err) {
      result.errors.push(`Error processing job ${job.id}: ${String(err)}`);
      result.campaignsSkipped++;
    }
  }

  // 6. Calculate health scores for all synced campaigns
  const { data: campaignsWithMetrics } = await supabase
    .from("campaigns")
    .select(`
      id,
      campaign_metrics (
        open_rate, ctr, ctor,
        hard_bounces, total_sent,
        unsubscribe_rate, spam_complaint_rate,
        delivery_rate
      )
    `)
    .eq("user_id", userId);

  if (campaignsWithMetrics) {
    for (const camp of campaignsWithMetrics) {
      const m = Array.isArray(camp.campaign_metrics)
        ? camp.campaign_metrics[0]
        : camp.campaign_metrics;
      if (!m) continue;

      // Compute hard_bounce_rate directly: hard_bounces / total_sent
      const hardBounceRate =
        m.hard_bounces != null && m.total_sent > 0
          ? m.hard_bounces / m.total_sent
          : null;

      const hsResult = calculateHealthScore({
        hard_bounce_rate:    hardBounceRate,
        spam_complaint_rate: m.spam_complaint_rate ?? null,
        open_rate:           m.open_rate ?? null,
        ctr:                 m.ctr ?? null,
        ctor:                m.ctor ?? null,
        unsubscribe_rate:    m.unsubscribe_rate ?? null,
        delivery_rate:       m.delivery_rate ?? null,
      });

      // Fetch existing score to calculate delta
      const { data: existing } = await supabase
        .from("health_scores")
        .select("score")
        .eq("campaign_id", camp.id)
        .maybeSingle();

      const previousScore = existing?.score ?? null;
      const delta = previousScore !== null ? hsResult.score - previousScore : null;

      await supabase
        .from("health_scores")
        .upsert(
          {
            campaign_id:      camp.id,
            score:            hsResult.score,
            previous_score:   previousScore,
            delta,
            component_scores: hsResult.components,
            grade:            hsResult.grade,
          },
          { onConflict: "campaign_id" }
        );

      result.healthScoresCalculated++;
    }
  }

  // 7. Generate and persist insights for all synced campaigns
  const { data: campaignsForInsights } = await supabase
    .from("campaigns")
    .select(`
      id,
      sent_at,
      campaign_metrics (
        open_rate, ctr, ctor,
        bounce_rate, unsubscribe_rate,
        spam_complaint_rate, delivery_rate,
        total_sent
      ),
      deliverability_checks (
        spf, dkim, dmarc,
        sender_score, blocklist_clean, blocklists_hit
      )
    `)
    .eq("user_id", userId);

  if (campaignsForInsights) {
    for (const camp of campaignsForInsights) {
      const metrics = Array.isArray(camp.campaign_metrics)
        ? camp.campaign_metrics[0] ?? null
        : camp.campaign_metrics ?? null;
      const deliverability = Array.isArray(camp.deliverability_checks)
        ? camp.deliverability_checks[0] ?? null
        : camp.deliverability_checks ?? null;

      const insightRecords = generateInsights({
        campaignId: camp.id,
        metrics: metrics as Parameters<typeof generateInsights>[0]["metrics"],
        deliverability: deliverability as Parameters<typeof generateInsights>[0]["deliverability"],
        sentAt: camp.sent_at,
      });

      if (insightRecords.length === 0) continue;

      // Replace existing insights for this campaign
      await supabase.from("insight_results").delete().eq("campaign_id", camp.id);
      const { error: insErr } = await supabase.from("insight_results").insert(insightRecords);
      if (!insErr) result.insightsGenerated += insightRecords.length;
    }
  }

  // 8. Deliverability check (DNS lookup on from_domain, once per sync)
  if (ws.from_domain) {
    try {
      const dvResult = await checkDeliverability(ws.from_domain);

      // Get all campaign IDs for this user to write deliverability rows
      const { data: allCampaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("user_id", userId);

      if (allCampaigns && allCampaigns.length > 0) {
        const dvRows = allCampaigns.map((c) => ({
          campaign_id:     c.id,
          spf:             dvResult.spf,
          dkim:            dvResult.dkim,
          dmarc:           dvResult.dmarc,
          sender_score:    dvResult.sender_score,
          blocklist_clean: dvResult.blocklist_clean,
          blocklists_hit:  dvResult.blocklists_hit,
          checked_at:      new Date().toISOString(),
        }));

        await supabase
          .from("deliverability_checks")
          .upsert(dvRows, { onConflict: "campaign_id" });

        result.deliverabilityChecked = true;
      }
    } catch (err) {
      result.errors.push(`Deliverability check failed: ${String(err)}`);
    }
  }

  // 9. Populate benchmarks — rolling account averages applied to every campaign
  const { data: allMetrics } = await supabase
    .from("campaign_metrics")
    .select(`
      campaign_id,
      open_rate, ctr, ctor,
      bounce_rate, unsubscribe_rate,
      spam_complaint_rate, delivery_rate
    `)
    .in(
      "campaign_id",
      (await supabase.from("campaigns").select("id").eq("user_id", userId)).data?.map((c) => c.id) ?? []
    );

  if (allMetrics && allMetrics.length > 0) {
    const avg = (key: keyof typeof allMetrics[0]) => {
      const vals = allMetrics
        .map((m) => m[key] as number | null)
        .filter((v): v is number => v !== null && v > 0);
      return vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4)) : null;
    };

    const accountAverages = {
      acct_open_rate:     avg("open_rate"),
      acct_ctr:           avg("ctr"),
      acct_ctor:          avg("ctor"),
      acct_bounce_rate:   avg("bounce_rate"),
      acct_unsub_rate:    avg("unsubscribe_rate"),
      acct_spam_rate:     avg("spam_complaint_rate"),
      acct_delivery_rate: avg("delivery_rate"),
      // Industry defaults
      ind_open_rate:      0.21,
      ind_ctr:            0.025,
      ind_ctor:           0.11,
      ind_bounce_rate:    0.005,
      ind_unsub_rate:     0.002,
      ind_spam_rate:      0.0005,
      ind_delivery_rate:  0.97,
    };

    const benchmarkRows = allMetrics.map((m) => ({
      campaign_id: m.campaign_id,
      ...accountAverages,
    }));

    await supabase
      .from("benchmarks")
      .upsert(benchmarkRows, { onConflict: "campaign_id" });
  }

  // 10. Stamp last_synced_at
  await supabase
    .from("workspaces")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", ws.id);

  result.durationMs = Date.now() - start;
  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSFMCStatus(status: string): "draft" | "scheduled" | "sent" | "cancelled" {
  const s = status.toLowerCase();
  if (s.includes("sent") || s.includes("complete")) return "sent";
  if (s.includes("schedul")) return "scheduled";
  if (s.includes("cancel") || s.includes("error") || s.includes("skip")) return "cancelled";
  return "draft";
}

function computeRates(
  t: { openCount: number; uniqueOpenCount: number; clickCount: number; uniqueClickCount: number; hardBounceCount: number; softBounceCount: number; unsubscribeCount: number; spamComplaintCount: number },
  sent: number,
  delivered: number
) {
  const safe = (n: number, d: number) => (d > 0 ? parseFloat((n / d).toFixed(4)) : null);
  const totalBounces = t.hardBounceCount + t.softBounceCount;
  return {
    open_rate: safe(t.uniqueOpenCount, delivered),
    ctr: safe(t.uniqueClickCount, delivered),
    ctor: safe(t.uniqueClickCount, t.uniqueOpenCount),
    bounce_rate: safe(totalBounces, sent),
    unsubscribe_rate: safe(t.unsubscribeCount, delivered),
    spam_complaint_rate: safe(t.spamComplaintCount, delivered),
    delivery_rate: safe(delivered, sent),
  };
}
