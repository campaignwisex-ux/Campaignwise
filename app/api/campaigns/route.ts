import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      campaign_metrics (
        total_sent,
        delivered,
        open_rate,
        ctr,
        ctor,
        bounce_rate,
        hard_bounces,
        soft_bounces,
        spam_complaint_rate,
        unsubscribe_rate,
        delivery_rate,
        spam_complaints
      ),
      health_scores (
        score,
        grade,
        delta,
        component_scores
      )
    `)
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten joined rows for easier consumption on the client
  const campaigns = (data ?? []).map((c) => {
    const m = Array.isArray(c.campaign_metrics) ? c.campaign_metrics[0] : c.campaign_metrics;
    const h = Array.isArray(c.health_scores) ? c.health_scores[0] : c.health_scores;
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      sent_at: c.sent_at,
      status: c.status,
      external_id: c.external_id,
      metrics: m ?? null,
      health_score: h ?? null,
    };
  });

  return NextResponse.json({ campaigns });
}
