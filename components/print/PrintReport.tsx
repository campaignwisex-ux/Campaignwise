import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  total_sent: number; delivered: number;
  opens: number; unique_opens: number; clicks: number; unique_clicks: number;
  unsubscribes: number; hard_bounces: number; soft_bounces: number; spam_complaints: number;
  open_rate: number | null; ctr: number | null; ctor: number | null;
  bounce_rate: number | null; unsubscribe_rate: number | null;
  spam_complaint_rate: number | null; delivery_rate: number | null;
}
interface HealthScoreData {
  score: number; grade: string; delta: number | null; previous_score: number | null;
  component_scores: Record<string, number>;
}
interface Deliverability {
  spf: string; dkim: string; dmarc: string;
  sender_score: number | null; blocklist_clean: boolean;
}
interface InsightResult {
  id: string; layer: number; severity: string;
  diagnosis: string; recommendation: string;
  metric_key: string | null; metric_value: number | null; benchmark_value: number | null;
}
interface Benchmarks {
  acct_open_rate: number | null; acct_ctr: number | null; acct_ctor: number | null;
  acct_bounce_rate: number | null; acct_unsub_rate: number | null;
  acct_spam_rate: number | null; acct_delivery_rate: number | null;
}
interface Campaign {
  name: string; subject: string | null; sent_at: string | null;
  status: string; external_id: string | null;
}

export interface PrintReportProps {
  campaign: Campaign;
  metrics: Metrics | null;
  healthScore: HealthScoreData | null;
  insights: InsightResult[];
  deliverability: Deliverability | null;
  benchmarks: Benchmarks | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (v: number | null | undefined) => v != null ? `${(v * 100).toFixed(2)}%` : "—";
const num = (v: number | null | undefined) => v != null ? v.toLocaleString() : "—";

const IND = { open_rate: 0.21, ctr: 0.025, ctor: 0.11, bounce_rate: 0.005, unsub_rate: 0.002, spam_rate: 0.0005, delivery_rate: 0.97 };

const COMPONENT_LABELS: Record<string, string> = {
  hard_bounce: "Hard Bounce", spam_complaint: "Spam Complaints",
  open_rate: "Open Rate", ctr: "Click-Through Rate",
  unsubscribe: "Unsubscribes", ctor: "Click-to-Open", delivery: "Delivery Rate",
};
const COMPONENT_WEIGHTS: Record<string, string> = {
  hard_bounce: "20%", spam_complaint: "15%", open_rate: "20%",
  ctr: "15%", unsubscribe: "15%", ctor: "10%", delivery: "5%",
};

// ─── Inline styles ────────────────────────────────────────────────────────────
// All system fonts — no Tailwind, no web fonts.

const S = {
  page: {
    fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    fontSize: "11px",
    color: "#1A1A18",
    background: "#ffffff",
    width: "100%",
    maxWidth: "720px",
    margin: "0 auto",
    padding: "0 24px",
    lineHeight: 1.5,
  } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: "12px",
    marginBottom: "20px",
    borderBottom: "2px solid #2563EB",
  } as React.CSSProperties,

  section: {
    marginBottom: "20px",
    pageBreakInside: "avoid",
    breakInside: "avoid",
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#9B9B9B",
    marginBottom: "8px",
    paddingBottom: "4px",
    borderBottom: "1px solid #E8E6E0",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 0",
    borderBottom: "1px solid #F3F4F6",
  } as React.CSSProperties,

  label: { fontSize: "11px", color: "#6B6B6B" } as React.CSSProperties,
  value: { fontSize: "11px", fontWeight: 600, color: "#1A1A18", fontFamily: "'Courier New', Courier, monospace" } as React.CSSProperties,

  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    marginBottom: "16px",
  } as React.CSSProperties,

  statBox: {
    border: "1px solid #E8E6E0",
    borderRadius: "6px",
    padding: "8px",
    textAlign: "center" as const,
  },

  card: {
    border: "1px solid #E8E6E0",
    borderRadius: "6px",
    padding: "12px",
    marginBottom: "8px",
    pageBreakInside: "avoid",
    breakInside: "avoid",
  } as React.CSSProperties,

  footer: {
    marginTop: "40px",
    paddingTop: "10px",
    borderTop: "0.5px solid #E8E6E0",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "9px",
    color: "#9B9B9B",
  } as React.CSSProperties,
};

// ─── Component ────────────────────────────────────────────────────────────────

const PrintReport = React.forwardRef<HTMLDivElement, PrintReportProps>(
  ({ campaign, metrics: m, healthScore: hs, insights, deliverability: dv, benchmarks: bm }, ref) => {

  const printDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const sentDateStr = campaign.sent_at
    ? new Date(campaign.sent_at).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

  const bench = {
    open_rate:    bm?.acct_open_rate    ?? IND.open_rate,
    ctr:          bm?.acct_ctr          ?? IND.ctr,
    ctor:         bm?.acct_ctor         ?? IND.ctor,
    bounce_rate:  bm?.acct_bounce_rate  ?? IND.bounce_rate,
    unsub_rate:   bm?.acct_unsub_rate   ?? IND.unsub_rate,
    spam_rate:    bm?.acct_spam_rate    ?? IND.spam_rate,
    delivery_rate:bm?.acct_delivery_rate?? IND.delivery_rate,
  };

  const severityColor = (s: string) =>
    s === "critical" ? "#DC2626" : s === "warning" ? "#D97706" : s === "positive" ? "#16A34A" : "#2563EB";

  const MetricRow = ({ label, value, benchmark, note }: { label: string; value: string; benchmark?: string; note?: string }) => (
    <div style={S.row}>
      <div>
        <span style={S.label}>{label}</span>
        {note && <span style={{ fontSize: "10px", color: "#9B9B9B", marginLeft: "6px" }}>({note})</span>}
      </div>
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        {benchmark && <span style={{ fontSize: "10px", color: "#9B9B9B" }}>Benchmark: {benchmark}</span>}
        <span style={{ ...S.value, minWidth: "56px", textAlign: "right" }}>{value}</span>
      </div>
    </div>
  );

  return (
    <div ref={ref} style={S.page}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "18px", color: "#1B2B4B" }}>
            Campaign<span style={{ color: "#2563EB" }}>Wise</span>
          </div>
          <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px" }}>Know Why. Fix Fast.</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#1B2B4B", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Campaign Analysis Report
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#6B7280" }}>Generated: {printDate}</div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#1B2B4B", marginTop: "2px" }}>{campaign.name}</div>
        </div>
      </div>

      {/* ── Campaign info ───────────────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Campaign Details</div>
        <div style={{ ...S.card, marginBottom: "12px" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#1A1A18", marginBottom: "4px" }}>{campaign.name}</div>
          {campaign.subject && <div style={{ fontSize: "12px", color: "#6B6B6B", marginBottom: "6px" }}>"{campaign.subject}"</div>}
          <div style={{ fontSize: "10px", color: "#9B9B9B", marginBottom: "12px" }}>
            {campaign.status.toUpperCase()}{campaign.external_id ? ` · Job #${campaign.external_id}` : ""} · {sentDateStr}
          </div>
          <div style={S.statGrid}>
            {[
              { label: "Sent",      value: num(m?.total_sent) },
              { label: "Delivered", value: num(m?.delivered) },
              { label: "Opens",     value: num(m?.unique_opens) },
              { label: "Clicks",    value: num(m?.unique_clicks) },
            ].map(s => (
              <div key={s.label} style={S.statBox}>
                <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Courier New', monospace", color: "#1A1A18" }}>{s.value}</div>
                <div style={{ fontSize: "9px", color: "#9B9B9B", marginTop: "2px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Health score ─────────────────────────────────────────────── */}
      {hs && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Health Score</div>
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ fontSize: "36px", fontWeight: 700, fontFamily: "'Courier New', monospace", color: hs.score >= 70 ? "#16A34A" : hs.score >= 55 ? "#D97706" : "#DC2626", lineHeight: 1 }}>
                {hs.score}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1A1A18" }}>Grade {hs.grade}</div>
                {hs.delta != null && (
                  <div style={{ fontSize: "10px", color: hs.delta > 0 ? "#16A34A" : hs.delta < 0 ? "#DC2626" : "#9B9B9B" }}>
                    {hs.delta > 0 ? "▲" : hs.delta < 0 ? "▼" : "="} {Math.abs(hs.delta)} vs previous
                  </div>
                )}
              </div>
            </div>
            {Object.entries(COMPONENT_LABELS).map(([k, label]) => {
              const s = hs.component_scores[k] ?? 0;
              const color = s >= 70 ? "#16A34A" : s >= 50 ? "#D97706" : "#DC2626";
              return (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ fontSize: "11px", color: "#6B6B6B" }}>{label} <span style={{ color: "#D1D5DB" }}>({COMPONENT_WEIGHTS[k]})</span></span>
                  <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: "'Courier New', monospace", color }}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Layer 1: Delivery Health ─────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Layer 1 — Delivery Health</div>
        <div style={S.card}>
          {dv && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginBottom: "12px" }}>
              {(["SPF", "DKIM", "DMARC"] as const).map(key => {
                const val = key === "SPF" ? dv.spf : key === "DKIM" ? dv.dkim : dv.dmarc;
                const isPass = val === "pass";
                return (
                  <div key={key} style={{ border: `1px solid ${isPass ? "#BBF7D0" : "#FECACA"}`, borderRadius: "6px", padding: "8px", textAlign: "center", background: isPass ? "#F0FDF4" : "#FEF2F2" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#9B9B9B" }}>{key}</div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: isPass ? "#16A34A" : "#DC2626", marginTop: "2px", textTransform: "capitalize" }}>{val}</div>
                  </div>
                );
              })}
            </div>
          )}
          {dv?.sender_score != null && (
            <MetricRow label="Sender Score" value={`${dv.sender_score} / 100`} />
          )}
          <MetricRow label="Delivery Rate"       value={pct(m?.delivery_rate)}       benchmark={pct(bench.delivery_rate)} note="% that reached inbox" />
          <MetricRow label="Hard Bounce Rate"    value={pct(m?.bounce_rate)}         benchmark={pct(bench.bounce_rate)}   note="Permanent failures" />
          <MetricRow label="Spam Complaint Rate" value={pct(m?.spam_complaint_rate)} benchmark={pct(bench.spam_rate)}     note="Marked as spam" />
          {m && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginTop: "10px" }}>
              {[{ label: "Hard Bounces", v: num(m.hard_bounces) }, { label: "Soft Bounces", v: num(m.soft_bounces) }, { label: "Spam Complaints", v: num(m.spam_complaints) }].map(s => (
                <div key={s.label} style={{ ...S.statBox }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Courier New', monospace", color: "#1A1A18" }}>{s.v}</div>
                  <div style={{ fontSize: "9px", color: "#9B9B9B", marginTop: "2px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Layer 2: Engagement Quality ──────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Layer 2 — Engagement Quality</div>
        <div style={S.card}>
          <MetricRow label="Open Rate (unique)"  value={pct(m?.open_rate)}        benchmark={pct(bench.open_rate)}  note="Benchmark: 21%" />
          <MetricRow label="Click-Through Rate"  value={pct(m?.ctr)}              benchmark={pct(bench.ctr)}        note="Unique clicks ÷ delivered" />
          <MetricRow label="Click-to-Open Rate"  value={pct(m?.ctor)}             benchmark={pct(bench.ctor)}       note="Unique clicks ÷ opens" />
          <MetricRow label="Unsubscribe Rate"    value={pct(m?.unsubscribe_rate)} benchmark={pct(bench.unsub_rate)} note="% who opted out" />
          {m && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", marginTop: "10px" }}>
              {[{ label: "Total Opens", v: num(m.opens) }, { label: "Unique Opens", v: num(m.unique_opens) }, { label: "Total Clicks", v: num(m.clicks) }, { label: "Unsubscribes", v: num(m.unsubscribes) }].map(s => (
                <div key={s.label} style={{ ...S.statBox }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Courier New', monospace", color: "#1A1A18" }}>{s.v}</div>
                  <div style={{ fontSize: "9px", color: "#9B9B9B", marginTop: "2px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Layer 3: Execution Logic ─────────────────────────────────── */}
      {campaign.sent_at && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Layer 3 — Execution Logic</div>
          <div style={S.card}>
            {(() => {
              const d = new Date(campaign.sent_at!);
              const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
              const h = d.getHours(); const ap = h < 12 ? "AM" : "PM"; const h12 = h % 12 || 12;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const goodHour = (h >= 8 && h <= 10) || (h >= 13 && h <= 15);
              const label = isWeekend ? "Weekend send" : !goodHour ? "Off-peak hours" : "Optimal timing";
              const labelColor = (isWeekend || !goodHour) ? "#D97706" : "#16A34A";
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#1A1A18" }}>Sent {days[d.getDay()]} at {h12}:00 {ap}</span>
                    <span style={{ fontSize: "9px", fontWeight: 600, color: labelColor, background: labelColor + "18", border: `1px solid ${labelColor}30`, padding: "1px 6px", borderRadius: "9999px" }}>{label}</span>
                  </div>
                  {m && <div style={{ fontSize: "11px", color: "#6B6B6B" }}>Audience: {num(m.total_sent)} recipients · {num(m.delivered)} delivered ({pct(m.delivery_rate)} delivery rate)</div>}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Revenue Impact ───────────────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Revenue Impact</div>
        <div style={{ ...S.card, background: "#F9F8F5" }}>
          <div style={{ fontSize: "11px", color: "#9B9B9B", marginBottom: "8px" }}>🔒 Connect Salesforce CRM to unlock revenue attribution</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
            {["Pipeline influenced", "Opportunities created", "Revenue attributed", "Active deals at risk"].map(l => (
              <div key={l} style={{ ...S.statBox }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#D1D5DB" }}>—</div>
                <div style={{ fontSize: "9px", color: "#9B9B9B", marginTop: "2px" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Insights ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={S.sectionTitle}>Insights & Recommendations ({insights.length} findings)</div>
        {insights.length === 0 ? (
          <p style={{ fontSize: "11px", color: "#9B9B9B" }}>No insights generated yet.</p>
        ) : (
          [1, 2, 3].map(layer => {
            const li = insights.filter(i => i.layer === layer);
            if (!li.length) return null;
            const layerName = ["", "Delivery Health", "Engagement Quality", "Execution Logic"][layer];
            return (
              <div key={layer} style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9B9B9B", marginBottom: "6px" }}>
                  Layer {layer} — {layerName}
                </div>
                {li.map(ins => {
                  const bc = severityColor(ins.severity);
                  return (
                    <div key={ins.id} style={{
                      borderTop: "1px solid #E8E6E0",
                      borderRight: "1px solid #E8E6E0",
                      borderBottom: "1px solid #E8E6E0",
                      borderLeft: `3px solid ${bc}`,
                      borderRadius: "4px",
                      padding: "10px 12px",
                      marginBottom: "8px",
                      background: "#ffffff",
                      pageBreakInside: "avoid",
                      breakInside: "avoid",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: bc, background: bc + "15", border: `1px solid ${bc}30`, padding: "1px 6px", borderRadius: "9999px" }}>
                          {ins.severity}
                        </span>
                        <span style={{ fontSize: "9px", color: "#9B9B9B" }}>Layer {ins.layer}</span>
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#1A1A18", marginBottom: "3px", lineHeight: 1.4 }}>{ins.diagnosis}</div>
                      <div style={{ fontSize: "11px", color: "#6B6B6B", lineHeight: 1.5 }}>{ins.recommendation}</div>
                      {ins.metric_value != null && ins.benchmark_value != null && (
                        <div style={{ fontSize: "9px", color: "#9B9B9B", marginTop: "4px", fontFamily: "'Courier New', monospace" }}>
                          Actual: {pct(ins.metric_value)} · Benchmark: {pct(ins.benchmark_value)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div style={S.footer}>
        <span>Prepared by CampaignWise</span>
        <span>campaignwise.io</span>
        <span>Confidential — for internal use only</span>
      </div>

    </div>
  );
});

PrintReport.displayName = "PrintReport";
export default PrintReport;
