import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id,
      name,
      subject,
      sent_at,
      status,
      external_id,
      user_id,
      campaign_metrics (
        total_sent,
        delivered,
        opens,
        unique_opens,
        clicks,
        unique_clicks,
        unsubscribes,
        bounces,
        hard_bounces,
        soft_bounces,
        spam_complaints,
        open_rate,
        ctr,
        ctor,
        bounce_rate,
        unsubscribe_rate,
        spam_complaint_rate,
        delivery_rate
      ),
      health_scores (
        score,
        grade,
        delta,
        previous_score,
        component_scores,
        calculated_at
      ),
      deliverability_checks (
        spf,
        dkim,
        dmarc,
        sender_score,
        blocklist_clean,
        blocklists_hit,
        checked_at
      ),
      insight_results (
        id,
        layer,
        severity,
        diagnosis,
        recommendation,
        metric_key,
        metric_value,
        benchmark_value,
        created_at
      ),
      benchmarks (
        acct_open_rate,
        acct_ctr,
        acct_ctor,
        acct_bounce_rate,
        acct_unsub_rate,
        acct_spam_rate,
        acct_delivery_rate,
        ind_open_rate,
        ind_ctr,
        ind_ctor,
        ind_bounce_rate,
        ind_unsub_rate,
        ind_spam_rate,
        ind_delivery_rate
      )
    `)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  // Flatten single-row relations
  const flat = (arr: unknown) => (Array.isArray(arr) ? arr[0] ?? null : arr ?? null);

  return NextResponse.json({
    campaign: {
      ...data,
      campaign_metrics:     flat(data.campaign_metrics),
      health_scores:        flat(data.health_scores),
      deliverability_checks: flat(data.deliverability_checks),
      benchmarks:           flat(data.benchmarks),
      insight_results:      Array.isArray(data.insight_results) ? data.insight_results : [],
    },
  });
}
