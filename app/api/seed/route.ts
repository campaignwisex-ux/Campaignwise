import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateHealthScore } from "@/lib/healthscore";
import { generateInsights } from "@/lib/insights";

// ─── Seed campaigns ───────────────────────────────────────────────────────────
// Realistic SFMC campaigns with varied performance profiles.

const SEED_CAMPAIGNS = [
  {
    external_id: "JOB-10001",
    name: "Black Friday Flash Sale",
    subject: "⚡ 48 hours only — up to 60% off",
    sent_at: "2024-11-29T09:00:00Z",   // Friday, 9am — good timing
    total_sent: 42800,
    hard_bounces: 86,   // 0.2%
    soft_bounces: 128,
    spam_complaints: 9, // 0.02%
    unique_opens: 16466, // 38.5%
    unique_clicks: 3514, // 8.2%
    unsubscribes: 43,
  },
  {
    external_id: "JOB-10002",
    name: "Welcome Series — Email 1",
    subject: "Welcome! Here's everything you need to get started",
    sent_at: "2024-11-15T10:00:00Z",   // Friday, 10am — good
    total_sent: 5200,
    hard_bounces: 10,   // 0.19%
    soft_bounces: 15,
    spam_complaints: 1,
    unique_opens: 2704,  // 52%
    unique_clicks: 648,  // 12.5%
    unsubscribes: 6,
  },
  {
    external_id: "JOB-10003",
    name: "VIP Member Monthly — November",
    subject: "Your exclusive VIP update for November",
    sent_at: "2024-11-05T09:30:00Z",   // Tuesday, 9:30am — good
    total_sent: 8900,
    hard_bounces: 18,   // 0.2%
    soft_bounces: 27,
    spam_complaints: 4,
    unique_opens: 3916,  // 44%
    unique_clicks: 872,  // 9.8%
    unsubscribes: 9,
  },
  {
    external_id: "JOB-10004",
    name: "Product Launch — Winter Collection",
    subject: "Introducing: The Winter 2024 Collection",
    sent_at: "2024-10-22T14:00:00Z",   // Tuesday, 2pm — good
    total_sent: 31500,
    hard_bounces: 63,   // 0.2%
    soft_bounces: 95,
    spam_complaints: 16,
    unique_opens: 9765,  // 31%
    unique_clicks: 1638, // 5.2%
    unsubscribes: 63,
  },
  {
    external_id: "JOB-10005",
    name: "Loyalty Rewards Update",
    subject: "You've earned new rewards — redeem before Dec 31",
    sent_at: "2024-10-08T09:00:00Z",   // Tuesday, 9am — good
    total_sent: 18200,
    hard_bounces: 55,   // 0.3%
    soft_bounces: 73,
    spam_complaints: 9,
    unique_opens: 4004,  // 22%
    unique_clicks: 564,  // 3.1%
    unsubscribes: 36,
  },
  {
    external_id: "JOB-10006",
    name: "September Monthly Newsletter",
    subject: "What's new at Acme — September edition",
    sent_at: "2024-09-03T08:30:00Z",   // Tuesday, 8:30am — good
    total_sent: 28600,
    hard_bounces: 114,  // 0.4%
    soft_bounces: 172,
    spam_complaints: 57,  // 0.2% — elevated
    unique_opens: 5148,   // 18%
    unique_clicks: 600,   // 2.1%
    unsubscribes: 143,    // 0.5% — high
  },
  {
    external_id: "JOB-10007",
    name: "Weekend Flash Promo — Oct 15",
    subject: "This weekend only: free shipping on everything",
    sent_at: "2024-10-13T11:00:00Z",   // Sunday, 11am — bad day
    total_sent: 35400,
    hard_bounces: 177,  // 0.5% — borderline
    soft_bounces: 212,
    spam_complaints: 71,  // 0.2%
    unique_opens: 4956,   // 14%
    unique_clicks: 495,   // 1.4%
    unsubscribes: 177,    // 0.5%
  },
  {
    external_id: "JOB-10008",
    name: "Q3 Product Newsletter",
    subject: "Q3 product updates and what's coming next",
    sent_at: "2024-09-24T22:00:00Z",   // Tuesday, 10pm — bad time
    total_sent: 24100,
    hard_bounces: 747,  // 3.1% — critical
    soft_bounces: 482,
    spam_complaints: 24,
    unique_opens: 2218,  // 9.2% — critical
    unique_clicks: 193,  // 0.8%
    unsubscribes: 120,
  },
  {
    external_id: "JOB-10009",
    name: "Promo Blast — October 22",
    subject: "LAST CHANCE: Sale ends tonight",
    sent_at: "2024-10-22T07:00:00Z",   // Tuesday, 7am — off-peak
    total_sent: 41200,
    hard_bounces: 494,  // 1.2%
    soft_bounces: 330,
    spam_complaints: 412, // 1.0% — critical
    unique_opens: 4697,   // 11.4%
    unique_clicks: 453,   // 1.1%
    unsubscribes: 330,    // 0.8% — critical
  },
  {
    external_id: "JOB-10010",
    name: "Re-engagement Drip — Wave 3",
    subject: "We miss you — here's 20% off to come back",
    sent_at: "2024-09-10T15:00:00Z",   // Tuesday, 3pm — good time
    total_sent: 12800,
    hard_bounces: 640,  // 5% — critical
    soft_bounces: 384,
    spam_complaints: 128, // 1% — critical
    unique_opens: 998,    // 7.8% — critical
    unique_clicks: 51,    // 0.4% — critical
    unsubscribes: 384,    // 3% — critical
  },
];

// ─── POST /api/seed ───────────────────────────────────────────────────────────

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // 1. Ensure profile exists — use userId as a unique email fallback so there's no conflict
  const seedEmail = `seed-${userId}@campaignwise.demo`;
  const { error: profileErr } = await supabase.from("profiles").upsert(
    { id: userId, email: seedEmail, full_name: "Demo User", company_name: "SB Consulting" },
    { onConflict: "id" }
  );
  if (profileErr) {
    return NextResponse.json({ error: `Profile upsert failed: ${profileErr.message}` }, { status: 500 });
  }

  // 2. Upsert a demo workspace
  const { data: ws } = await supabase
    .from("workspaces")
    .upsert(
      {
        user_id: userId,
        platform: "sfmc",
        subdomain: "demo-mc123456",
        client_id: "demo-client-id",
        client_secret_enc: "demo:demo:demo",
        bu_name: "SB Consulting Demo BU",
        account_id: "7280123",
        from_domain: "mail.sbconsulting.com",
        is_active: true,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,subdomain" }
    )
    .select("id")
    .single();

  const workspaceId = ws?.id ?? null;

  // 3. Wipe existing seed data for this user and insert fresh
  await supabase.from("campaigns").delete().eq("user_id", userId);

  const results: { name: string; score: number; grade: string; insights: number }[] = [];

  for (const seed of SEED_CAMPAIGNS) {
    const sent = seed.total_sent;
    const totalBounces = seed.hard_bounces + seed.soft_bounces;
    const delivered = sent - totalBounces;

    const open_rate           = parseFloat((seed.unique_opens / delivered).toFixed(4));
    const ctr                 = parseFloat((seed.unique_clicks / delivered).toFixed(4));
    const ctor                = parseFloat((seed.unique_clicks / seed.unique_opens).toFixed(4));
    const bounce_rate         = parseFloat((totalBounces / sent).toFixed(4));
    const hard_bounce_rate    = parseFloat((seed.hard_bounces / sent).toFixed(4));
    const unsubscribe_rate    = parseFloat((seed.unsubscribes / delivered).toFixed(4));
    const spam_complaint_rate = parseFloat((seed.spam_complaints / delivered).toFixed(4));
    const delivery_rate       = parseFloat((delivered / sent).toFixed(4));

    // Plain insert — no conflict needed since we wiped above
    const { data: camp, error: campErr } = await supabase
      .from("campaigns")
      .insert({
        user_id:      userId,
        workspace_id: workspaceId,
        external_id:  seed.external_id,
        name:         seed.name,
        subject:      seed.subject,
        status:       "sent",
        sent_at:      seed.sent_at,
        platform_id:  null,
      })
      .select("id")
      .single();

    if (campErr || !camp) {
      console.error("Campaign insert failed:", campErr?.message);
      continue;
    }

    // Upsert metrics
    await supabase.from("campaign_metrics").insert({
      campaign_id:        camp.id,
      total_sent:         sent,
      delivered,
      opens:              Math.round(seed.unique_opens * 1.3),
      unique_opens:       seed.unique_opens,
      clicks:             Math.round(seed.unique_clicks * 1.15),
      unique_clicks:      seed.unique_clicks,
      unsubscribes:       seed.unsubscribes,
      bounces:            totalBounces,
      hard_bounces:       seed.hard_bounces,
      soft_bounces:       seed.soft_bounces,
      spam_complaints:    seed.spam_complaints,
      revenue:            0,
      open_rate,
      ctr,
      ctor,
      bounce_rate,
      unsubscribe_rate,
      spam_complaint_rate,
      delivery_rate,
    });

    // Calculate health score using real engine
    const hs = calculateHealthScore({
      hard_bounce_rate,
      spam_complaint_rate,
      open_rate,
      ctr,
      ctor,
      unsubscribe_rate,
      delivery_rate,
    });

    await supabase.from("health_scores").insert({
      campaign_id:      camp.id,
      score:            hs.score,
      previous_score:   null,
      delta:            null,
      component_scores: hs.components,
      grade:            hs.grade,
    });

    // Generate insights using real engine
    const insights = generateInsights({
      campaignId: camp.id,
      metrics: {
        open_rate,
        ctr,
        ctor,
        bounce_rate: hard_bounce_rate,
        unsubscribe_rate,
        spam_complaint_rate,
        delivery_rate,
        total_sent: sent,
      },
      deliverability: null,
      sentAt: seed.sent_at,
    });

    if (insights.length > 0) {
      await supabase.from("insight_results").delete().eq("campaign_id", camp.id);
      await supabase.from("insight_results").insert(insights);
    }

    await supabase.from("benchmarks").insert({
      campaign_id:        camp.id,
      acct_open_rate:     0.2480,
      acct_ctr:           0.0420,
      acct_ctor:          0.1080,
      acct_bounce_rate:   0.0048,
      acct_unsub_rate:    0.0021,
      acct_spam_rate:     0.0003,
      acct_delivery_rate: 0.9901,
      ind_open_rate:      0.2100,
      ind_ctr:            0.0250,
      ind_ctor:           0.1100,
      ind_bounce_rate:    0.0050,
      ind_unsub_rate:     0.0020,
      ind_spam_rate:      0.0005,
      ind_delivery_rate:  0.9700,
    });

    await supabase.from("deliverability_checks").insert({
      campaign_id:     camp.id,
      spf:             "pass",
      dkim:            "pass",
      dmarc:           "pass",
      sender_score:    84,
      blocklist_clean: true,
      blocklists_hit:  [],
    });

    results.push({ name: seed.name, score: hs.score, grade: hs.grade, insights: insights.length });
  }

  return NextResponse.json({
    seeded: results.length,
    campaigns: results,
  });
}

// DELETE /api/seed — wipe all seeded data for this user
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  await supabase.from("campaigns").delete().eq("user_id", userId);
  await supabase.from("workspaces").delete().eq("user_id", userId);

  return NextResponse.json({ ok: true });
}
