// Industry benchmark defaults
export const INDUSTRY_BENCHMARKS = {
  open_rate:    0.21,
  ctr:          0.025,
  ctor:         0.11,
  bounce_rate:  0.005,
  unsub_rate:   0.002,
  spam_rate:    0.0005,
  delivery_rate: 0.97,
} as const;

// ─── Input / output types ─────────────────────────────────────────────────────

export interface InsightInput {
  campaignId: string;
  metrics: {
    open_rate:           number | null;
    ctr:                 number | null;
    ctor:                number | null;
    bounce_rate:         number | null;
    unsubscribe_rate:    number | null;
    spam_complaint_rate: number | null;
    delivery_rate:       number | null;
    total_sent:          number;
  } | null;
  deliverability: {
    spf:            string;
    dkim:           string;
    dmarc:          string;
    sender_score:   number | null;
    blocklist_clean: boolean;
    blocklists_hit: string[] | null;
  } | null;
  sentAt: string | null;
  benchmarks?: Partial<typeof INDUSTRY_BENCHMARKS>;
}

export interface InsightRecord {
  campaign_id:     string;
  layer:           1 | 2 | 3;
  severity:        "critical" | "warning" | "info" | "positive";
  diagnosis:       string;
  recommendation:  string;
  metric_key:      string | null;
  metric_value:    number | null;
  benchmark_value: number | null;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function generateInsights(input: InsightInput): InsightRecord[] {
  const results: InsightRecord[] = [];
  const { campaignId: cid, metrics: m, deliverability: dv, sentAt } = input;
  const b = { ...INDUSTRY_BENCHMARKS, ...input.benchmarks };

  const add = (r: Omit<InsightRecord, "campaign_id">) =>
    results.push({ campaign_id: cid, ...r });

  // ─── Layer 1: Delivery Health ───────────────────────────────────────────

  if (dv) {
    if (dv.spf === "fail" || dv.spf === "softfail") {
      add({
        layer: 1, severity: "critical",
        diagnosis: `SPF authentication is ${dv.spf === "softfail" ? "soft-failing" : "failing"} — ISPs may reject or spam-folder your emails`,
        recommendation: "Update your DNS SPF record to explicitly include SFMC's sending IP ranges. In SFMC Setup → Domain Management, confirm your SAP (Sender Authentication Package) is configured.",
        metric_key: "spf", metric_value: null, benchmark_value: null,
      });
    }

    if (dv.dkim === "fail") {
      add({
        layer: 1, severity: "critical",
        diagnosis: "DKIM signature is invalid or missing — a critical trust signal for inbox placement",
        recommendation: "Configure DKIM signing in SFMC Setup → Domain Management. If using a private domain, ensure CNAME records are published in DNS and SFMC has verified them.",
        metric_key: "dkim", metric_value: null, benchmark_value: null,
      });
    }

    if (dv.dmarc === "fail") {
      add({
        layer: 1, severity: "warning",
        diagnosis: "DMARC policy is not aligned — your domain is vulnerable to spoofing and some ISPs will quarantine mail",
        recommendation: "Publish a DMARC record with at least p=quarantine. Ensure both SPF and DKIM identifiers align with your From domain. Use a DMARC monitoring tool to review aggregate reports before moving to p=reject.",
        metric_key: "dmarc", metric_value: null, benchmark_value: null,
      });
    }

    if (!dv.blocklist_clean) {
      const lists = (dv.blocklists_hit ?? []).join(", ") || "unknown";
      add({
        layer: 1, severity: "critical",
        diagnosis: `Sending IP or domain is listed on ${dv.blocklists_hit?.length ?? 1} blocklist(s): ${lists}`,
        recommendation: "Pause sends immediately. Identify the cause (spam complaint spike, hard bounce flood, or compromised account). Submit removal requests to each blocklist and work with your deliverability team to remediate before resuming.",
        metric_key: "blocklist", metric_value: null, benchmark_value: null,
      });
    }

    if (dv.sender_score !== null) {
      if (dv.sender_score < 50) {
        add({
          layer: 1, severity: "critical",
          diagnosis: `Sender score of ${dv.sender_score}/100 is critically low — inbox placement is at serious risk`,
          recommendation: "Throttle send volume, remove unengaged contacts, reduce complaints, and rebuild your reputation over 60–90 days. Work with your SFMC CSM on a reputation recovery plan.",
          metric_key: "sender_score", metric_value: dv.sender_score, benchmark_value: 80,
        });
      } else if (dv.sender_score < 70) {
        add({
          layer: 1, severity: "warning",
          diagnosis: `Sender score of ${dv.sender_score}/100 is below the 70+ threshold for consistent inbox placement`,
          recommendation: "Focus on reducing spam complaints and hard bounces over the next 30 days. Temporarily reduce send frequency and suppression-list scope.",
          metric_key: "sender_score", metric_value: dv.sender_score, benchmark_value: 80,
        });
      }
    }
  }

  if (m) {
    // Delivery rate
    if (m.delivery_rate !== null) {
      if (m.delivery_rate < 0.90) {
        add({
          layer: 1, severity: "critical",
          diagnosis: `Delivery rate of ${p(m.delivery_rate)} means over 10% of emails never reached recipients`,
          recommendation: "Audit your list for stale addresses. Verify your IP and domain are not blocklisted. Review SFMC sending domain configuration and open a support ticket if the issue persists.",
          metric_key: "delivery_rate", metric_value: m.delivery_rate, benchmark_value: b.delivery_rate,
        });
      } else if (m.delivery_rate < b.delivery_rate) {
        add({
          layer: 1, severity: "warning",
          diagnosis: `Delivery rate of ${p(m.delivery_rate)} is below the ${p(b.delivery_rate)} benchmark`,
          recommendation: "Suppress bounced and invalid addresses. Ensure SPF, DKIM, and DMARC are all passing. Consider warming up a new IP if sending volume recently increased.",
          metric_key: "delivery_rate", metric_value: m.delivery_rate, benchmark_value: b.delivery_rate,
        });
      }
    }

    // Hard bounce rate
    if (m.bounce_rate !== null) {
      if (m.bounce_rate >= 0.02) {
        add({
          layer: 1, severity: "critical",
          diagnosis: `Hard bounce rate of ${p(m.bounce_rate)} exceeds 2% — ISPs will begin throttling or blocking your sending IP`,
          recommendation: "Immediately suppress all hard-bounced addresses. Audit your list source and implement double opt-in. Run an email validation pass on your entire list before the next send.",
          metric_key: "hard_bounce_rate", metric_value: m.bounce_rate, benchmark_value: b.bounce_rate,
        });
      } else if (m.bounce_rate > b.bounce_rate) {
        add({
          layer: 1, severity: "warning",
          diagnosis: `Hard bounce rate of ${p(m.bounce_rate)} is above the ${p(b.bounce_rate)} benchmark`,
          recommendation: "Suppress bounced addresses immediately after each send. Review list acquisition channels for low-quality sources. Consider adding email validation at point of capture.",
          metric_key: "hard_bounce_rate", metric_value: m.bounce_rate, benchmark_value: b.bounce_rate,
        });
      } else if (m.bounce_rate <= b.bounce_rate * 0.4) {
        add({
          layer: 1, severity: "positive",
          diagnosis: `Excellent bounce rate of ${p(m.bounce_rate)} — well below the ${p(b.bounce_rate)} benchmark`,
          recommendation: "Your list hygiene is strong. Maintain automated bounce suppression and continue monitoring after each send.",
          metric_key: "hard_bounce_rate", metric_value: m.bounce_rate, benchmark_value: b.bounce_rate,
        });
      }
    }

    // Spam complaint rate
    if (m.spam_complaint_rate !== null) {
      if (m.spam_complaint_rate >= 0.001) {
        add({
          layer: 1, severity: "critical",
          diagnosis: `Spam complaint rate of ${p(m.spam_complaint_rate)} exceeds Gmail's 0.1% threshold — inbox placement is being penalised now`,
          recommendation: "Pause sends and audit your list. Add a visible one-click unsubscribe link, increase preference centre options, and remove contacts who haven't opened in 90+ days. Irrelevant content or hidden unsubscribe links are the most common causes.",
          metric_key: "spam_complaint_rate", metric_value: m.spam_complaint_rate, benchmark_value: b.spam_rate,
        });
      } else if (m.spam_complaint_rate > b.spam_rate) {
        add({
          layer: 1, severity: "warning",
          diagnosis: `Spam complaint rate of ${p(m.spam_complaint_rate)} is trending above the ${p(b.spam_rate)} safe threshold`,
          recommendation: "Make your unsubscribe link prominent and consider adding a preference centre. Review subject lines for misleading content and segment your audience to ensure relevance.",
          metric_key: "spam_complaint_rate", metric_value: m.spam_complaint_rate, benchmark_value: b.spam_rate,
        });
      }
    }
  }

  // ─── Layer 2: Engagement Quality ───────────────────────────────────────────

  if (m) {
    // Open rate
    if (m.open_rate !== null) {
      if (m.open_rate < 0.10) {
        add({
          layer: 2, severity: "critical",
          diagnosis: `Open rate of ${p(m.open_rate)} is critically low — less than half the industry average`,
          recommendation: "Audit subject lines for spam trigger words and misleading copy. Remove unengaged contacts (no opens in 90 days). Test personalised subject lines and ensure your From name is recognisable to recipients.",
          metric_key: "open_rate", metric_value: m.open_rate, benchmark_value: b.open_rate,
        });
      } else if (m.open_rate < b.open_rate * 0.85) {
        add({
          layer: 2, severity: "warning",
          diagnosis: `Open rate of ${p(m.open_rate)} is below the ${p(b.open_rate)} industry benchmark`,
          recommendation: "Test personalised and curiosity-driven subject lines. Review your From name for brand recognition. Experiment with send time and preview text. A/B test subject lines on 20% of your list before the full send.",
          metric_key: "open_rate", metric_value: m.open_rate, benchmark_value: b.open_rate,
        });
      } else if (m.open_rate >= b.open_rate * 1.25) {
        add({
          layer: 2, severity: "positive",
          diagnosis: `Strong open rate of ${p(m.open_rate)} — ${Math.round((m.open_rate / b.open_rate - 1) * 100)}% above the industry benchmark`,
          recommendation: "Document the subject line formula, send time, and audience segment that achieved this. Apply it as your control template for future A/B tests.",
          metric_key: "open_rate", metric_value: m.open_rate, benchmark_value: b.open_rate,
        });
      }
    }

    // CTR
    if (m.ctr !== null) {
      if (m.ctr < 0.005) {
        add({
          layer: 2, severity: "critical",
          diagnosis: `CTR of ${p(m.ctr)} is critically low — your content is not driving any meaningful clicks`,
          recommendation: "Reduce the number of CTAs to one clear primary action. Move the CTA above the fold. Use action-oriented button copy ('Get your report' not 'Click here'). Ensure mobile rendering is correct — most opens are on mobile.",
          metric_key: "ctr", metric_value: m.ctr, benchmark_value: b.ctr,
        });
      } else if (m.ctr < b.ctr * 0.8) {
        add({
          layer: 2, severity: "warning",
          diagnosis: `CTR of ${p(m.ctr)} is below the ${p(b.ctr)} benchmark`,
          recommendation: "Test button vs text-link CTAs. Add urgency language. Personalise the destination landing page to match the email's offer. Check that the CTA renders well on mobile.",
          metric_key: "ctr", metric_value: m.ctr, benchmark_value: b.ctr,
        });
      } else if (m.ctr >= b.ctr * 1.4) {
        add({
          layer: 2, severity: "positive",
          diagnosis: `Excellent CTR of ${p(m.ctr)} — ${Math.round((m.ctr / b.ctr - 1) * 100)}% above benchmark`,
          recommendation: "Record the CTA format, placement, and copy. Use this as your control template for future sends.",
          metric_key: "ctr", metric_value: m.ctr, benchmark_value: b.ctr,
        });
      }
    }

    // CTOR
    if (m.ctor !== null) {
      if (m.ctor < 0.03) {
        add({
          layer: 2, severity: "critical",
          diagnosis: `CTOR of ${p(m.ctor)} signals a major subject-line-to-content mismatch — people open but immediately disengage`,
          recommendation: "Align the email body and CTA directly with the subject line promise. Simplify the layout to a single column with one message. Remove distracting secondary links and images that compete with the primary CTA.",
          metric_key: "ctor", metric_value: m.ctor, benchmark_value: b.ctor,
        });
      } else if (m.ctor < b.ctor * 0.75) {
        add({
          layer: 2, severity: "warning",
          diagnosis: `CTOR of ${p(m.ctor)} suggests the email content is not compelling enough once recipients open`,
          recommendation: "Shorten the email and lead with your strongest value proposition. Ensure your CTA is visible without scrolling. Review whether the offer matches your audience segment's interests.",
          metric_key: "ctor", metric_value: m.ctor, benchmark_value: b.ctor,
        });
      }
    }

    // Unsubscribe rate
    if (m.unsubscribe_rate !== null) {
      if (m.unsubscribe_rate >= 0.005) {
        add({
          layer: 2, severity: "critical",
          diagnosis: `Unsubscribe rate of ${p(m.unsubscribe_rate)} is critically high — your audience is actively rejecting this content`,
          recommendation: "Immediately review content relevance and permission basis. Add preference centre so contacts can reduce frequency rather than unsubscribing entirely. Audit your list for non-opt-in contacts.",
          metric_key: "unsubscribe_rate", metric_value: m.unsubscribe_rate, benchmark_value: b.unsub_rate,
        });
      } else if (m.unsubscribe_rate > b.unsub_rate * 1.5) {
        add({
          layer: 2, severity: "warning",
          diagnosis: `Unsubscribe rate of ${p(m.unsubscribe_rate)} is 50%+ above the ${p(b.unsub_rate)} benchmark`,
          recommendation: "Review content-audience fit for this segment. Consider adding frequency preference options. Ensure unengaged contacts are being suppressed before sending.",
          metric_key: "unsubscribe_rate", metric_value: m.unsubscribe_rate, benchmark_value: b.unsub_rate,
        });
      }
    }
  }

  // ─── Layer 3: Execution Logic ───────────────────────────────────────────────

  if (sentAt) {
    const d = new Date(sentAt);
    const day = d.getDay();
    const hour = d.getHours();
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const isWeekend = day === 0 || day === 6;
    const isPeak = (hour >= 8 && hour <= 10) || (hour >= 13 && hour <= 15);

    if (isWeekend) {
      add({
        layer: 3, severity: "warning",
        diagnosis: `Campaign was sent on ${days[day]} — weekend sends typically yield 15–20% lower engagement`,
        recommendation: "Reschedule future sends to Tuesday, Wednesday, or Thursday. If your audience data shows different patterns, use SFMC's send time optimisation to test across weekdays.",
        metric_key: "send_day", metric_value: day, benchmark_value: null,
      });
    } else if (!isPeak) {
      add({
        layer: 3, severity: "info",
        diagnosis: `Sent at ${hour}:00 — outside the 8–10am and 1–3pm peak engagement windows`,
        recommendation: "Test sends during 8–10am or 1–3pm in your audience's primary timezone. Use SFMC's Einstein Send Time Optimisation to personalise delivery time per subscriber.",
        metric_key: "send_hour", metric_value: hour, benchmark_value: null,
      });
    } else {
      add({
        layer: 3, severity: "positive",
        diagnosis: `Send time (${days[day]}, ${hour}:00) is within the optimal engagement window`,
        recommendation: "Maintain this schedule. Consider enabling SFMC Einstein Send Time Optimisation to refine timing at the individual subscriber level.",
        metric_key: "send_timing", metric_value: null, benchmark_value: null,
      });
    }
  }

  if (m && m.total_sent > 0) {
    if (m.total_sent > 100000) {
      add({
        layer: 3, severity: "info",
        diagnosis: `Large audience of ${m.total_sent.toLocaleString()} — a single unsegmented blast to this size risks high unsubscribes and complaints`,
        recommendation: "Split into 2–3 audience segments by engagement tier (active, lapsed, new). Segmented campaigns deliver 14% higher opens and 101% more clicks on average.",
        metric_key: "audience_size", metric_value: m.total_sent, benchmark_value: null,
      });
    } else if (m.total_sent < 500) {
      add({
        layer: 3, severity: "info",
        diagnosis: `Small audience of ${m.total_sent.toLocaleString()} — metrics may not be statistically reliable`,
        recommendation: "Treat this data as directional only. Combine insights across multiple similar campaigns or grow the segment before drawing firm conclusions.",
        metric_key: "audience_size", metric_value: m.total_sent, benchmark_value: null,
      });
    }
  }

  return results;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function p(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}
