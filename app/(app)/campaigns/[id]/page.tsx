"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { useCountUp } from "@/lib/useCountUp";
import { useReactToPrint } from "react-to-print";
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2, ShieldCheck, ShieldX, Clock, Users, TrendingUp, TrendingDown, Minus, Download, Lock } from "lucide-react";
import type { HealthScoreComponents } from "@/lib/supabase/types";
import { COMPONENT_LABELS, COMPONENT_WEIGHTS_DISPLAY } from "@/lib/healthscore";
import PrintReport from "@/components/print/PrintReport";

interface Metrics {
  total_sent: number; delivered: number; opens: number; unique_opens: number;
  clicks: number; unique_clicks: number; unsubscribes: number; bounces: number;
  hard_bounces: number; soft_bounces: number; spam_complaints: number;
  open_rate: number | null; ctr: number | null; ctor: number | null;
  bounce_rate: number | null; unsubscribe_rate: number | null; spam_complaint_rate: number | null; delivery_rate: number | null;
}
interface HealthScoreData { score: number; grade: string; delta: number | null; previous_score: number | null; component_scores: HealthScoreComponents; }
interface Deliverability { spf: string; dkim: string; dmarc: string; sender_score: number | null; blocklist_clean: boolean; blocklists_hit: string[] | null; }
interface InsightResult { id: string; layer: number; severity: string; diagnosis: string; recommendation: string; metric_key: string | null; metric_value: number | null; benchmark_value: number | null; }
interface Benchmarks { acct_open_rate: number | null; acct_ctr: number | null; acct_ctor: number | null; acct_bounce_rate: number | null; acct_unsub_rate: number | null; acct_spam_rate: number | null; acct_delivery_rate: number | null; ind_open_rate: number | null; ind_ctr: number | null; ind_ctor: number | null; ind_bounce_rate: number | null; ind_unsub_rate: number | null; ind_spam_rate: number | null; ind_delivery_rate: number | null; }
interface Campaign { id: string; name: string; subject: string | null; sent_at: string | null; status: string; external_id: string | null; campaign_metrics: Metrics | null; health_scores: HealthScoreData | null; deliverability_checks: Deliverability | null; insight_results: InsightResult[]; benchmarks: Benchmarks | null; }

const IND = { open_rate: 0.21, ctr: 0.025, ctor: 0.11, bounce_rate: 0.005, unsub_rate: 0.002, spam_rate: 0.0005, delivery_rate: 0.97 };
const pct = (v: number | null | undefined) => v != null ? `${(v * 100).toFixed(2)}%` : "—";
const num = (v: number | null | undefined) => v != null ? v.toLocaleString() : "—";
const KEYS = Object.keys(COMPONENT_LABELS) as (keyof HealthScoreComponents)[];

// ─── Components ───────────────────────────────────────────────────────────────

function AnimatedScore({ score, grade }: { score: number; grade: string }) {
  const counted = useCountUp(score, 1200, score > 0);
  const color = score >= 85 ? "#15803D" : score >= 70 ? "#2563EB" : score >= 55 ? "#B45309" : "#B91C1C";
  return (
    <>
      <span className="text-[28px] font-mono font-semibold leading-none" style={{ color: "#1A1A18" }}>{counted}</span>
      <span className="text-[12px] font-medium mt-1" style={{ color: "#9B9793" }}>{grade}</span>
    </>
  );
}

function MetricRow({ label, value, benchmark, higherIsBetter, note }: { label: string; value: number | null; benchmark: number | null; higherIsBetter: boolean; note?: string; }) {
  const ok = value == null || benchmark == null ? "none"
    : higherIsBetter ? (value >= benchmark ? "pass" : value >= benchmark * 0.6 ? "warn" : "fail")
    : (value <= benchmark ? "pass" : value <= benchmark * 2 ? "warn" : "fail");
  const icon = ok === "pass" ? <CheckCircle2 size={13} style={{ color: "#15803D" }} />
    : ok === "warn" ? <AlertTriangle size={13} style={{ color: "#B45309" }} />
    : ok === "fail" ? <XCircle size={13} style={{ color: "#B91C1C" }} />
    : <Minus size={13} style={{ color: "#E0DDD5" }} />;
  const valColor = ok === "pass" ? "#15803D" : ok === "warn" ? "#B45309" : ok === "fail" ? "#B91C1C" : "#63605B";

  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #E0DDD5" }}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <div>
          <p className="text-[13px] font-medium" style={{ color: "#1A1A18" }}>{label}</p>
          {note && <p className="text-[11px]" style={{ color: "#9B9793" }}>{note}</p>}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        {benchmark != null && <span className="text-[11px] font-mono" style={{ color: "#9B9793" }}>Benchmark: {pct(benchmark)}</span>}
        <span className="text-[13px] font-mono font-semibold w-16 text-right" style={{ color: valColor }}>{pct(value)}</span>
      </div>
    </div>
  );
}

function AuthCheck({ label, status }: { label: string; status: string }) {
  const isPass = status === "pass", isUnknown = status === "unknown";
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-lg"
      style={{ background: isUnknown ? "#EDECEA" : isPass ? "#ECFDF3" : "#FEF2F2", border: `1px solid ${isUnknown ? "#E0DDD5" : isPass ? "#A7F3D0" : "#FECACA"}` }}>
      {isUnknown ? <ShieldCheck size={18} style={{ color: "#9B9793" }} /> : isPass ? <ShieldCheck size={18} style={{ color: "#15803D" }} /> : <ShieldX size={18} style={{ color: "#B91C1C" }} />}
      <p className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "#9B9793" }}>{label}</p>
      <span className="text-[10px] font-medium capitalize" style={{ color: isUnknown ? "#9B9793" : isPass ? "#15803D" : "#B91C1C" }}>{status}</span>
    </div>
  );
}

function InsightCard({ insight }: { insight: InsightResult }) {
  const leftColor = insight.severity === "critical" ? "#DC2626" : insight.severity === "warning" ? "#D97706" : insight.severity === "positive" ? "#16A34A" : "#2563EB";
  const labelColor = leftColor;
  const layerName = ["", "Delivery", "Engagement", "Execution"][insight.layer] ?? "";
  return (
    <div className="print-insight-card px-4 py-3.5 rounded-lg" style={{ background: "#FFFFFF", borderTop: "1px solid #E8E6E0", borderRight: "1px solid #E8E6E0", borderBottom: "1px solid #E8E6E0", borderLeft: `3px solid ${leftColor}` }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: labelColor }}>{insight.severity}</span>
        <span className="text-[9px]" style={{ color: "#9B9793" }}>Layer {insight.layer} — {layerName}</span>
      </div>
      <p className="text-[12px] font-medium leading-snug mb-1" style={{ color: "#1A1A18" }}>{insight.diagnosis}</p>
      <p className="text-[11px] leading-snug" style={{ color: "#63605B" }}>{insight.recommendation}</p>
      {insight.metric_value != null && insight.benchmark_value != null && (
        <p className="text-[10px] mt-1.5 font-mono" style={{ color: "#9B9793" }}>
          Actual: {pct(insight.metric_value)} · Benchmark: {pct(insight.benchmark_value)}
        </p>
      )}
    </div>
  );
}

function LayerSection({ title, layer, children }: { title: string; layer: number; children: React.ReactNode }) {
  const layerColors = ["", "#7C3AED", "#2563EB", "#15803D"];
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid #E0DDD5" }}>
        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ background: `${layerColors[layer]}14`, color: layerColors[layer], border: `1px solid ${layerColors[layer]}30` }}>
          Layer {layer}
        </span>
        <h2 className="text-[14px] font-semibold" style={{ color: "#1A1A18" }}>{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(({ campaign: d }) => setCampaign(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex flex-col min-h-screen" style={{ background: "#EDECEA" }}>
      <Header title="Campaign Analysis" subtitle="CampaignWise" />
      <div className="flex-1 flex items-center justify-center gap-2">
        <Loader2 size={16} style={{ color: "#2563EB" }} className="animate-spin" />
        <p className="text-[13px]" style={{ color: "#9B9793" }}>Loading analysis…</p>
      </div>
    </div>
  );

  if (error || !campaign) return (
    <div className="flex flex-col min-h-screen" style={{ background: "#EDECEA" }}>
      <Header title="Campaign Analysis" subtitle="CampaignWise" />
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <XCircle size={24} style={{ color: "#B91C1C" }} />
        <p className="text-[13px]" style={{ color: "#63605B" }}>{error || "Campaign not found"}</p>
        <Link href="/campaigns" className="text-[12px] font-medium" style={{ color: "#2563EB" }}>← Back to campaigns</Link>
      </div>
    </div>
  );

  const m = campaign.campaign_metrics;
  const hs = campaign.health_scores;
  const dv = campaign.deliverability_checks;
  const bm = campaign.benchmarks;
  const insights = campaign.insight_results ?? [];

  const bench = {
    open_rate:     bm?.acct_open_rate    ?? IND.open_rate,
    ctr:           bm?.acct_ctr          ?? IND.ctr,
    ctor:          bm?.acct_ctor         ?? IND.ctor,
    bounce_rate:   bm?.acct_bounce_rate  ?? IND.bounce_rate,
    unsub_rate:    bm?.acct_unsub_rate   ?? IND.unsub_rate,
    spam_rate:     bm?.acct_spam_rate    ?? IND.spam_rate,
    delivery_rate: bm?.acct_delivery_rate?? IND.delivery_rate,
  };

  const score = hs?.score ?? 0;
  const circ = 2 * Math.PI * 44;
  const dash = (score / 100) * circ;
  const ringColor = score >= 85 ? "#15803D" : score >= 70 ? "#2563EB" : score >= 55 ? "#B45309" : "#B91C1C";

  const sentTime = campaign.sent_at ? (() => {
    const d = new Date(campaign.sent_at!);
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const h = d.getHours(); const ap = h < 12 ? "AM" : "PM"; const h12 = h % 12 || 12;
    const dow = d.getDay();
    return { day: days[dow], time: `${h12}:00 ${ap}`, goodDay: dow >= 1 && dow <= 5, isWeekend: dow === 0 || dow === 6, goodHour: (h >= 8 && h <= 10) || (h >= 13 && h <= 15) };
  })() : null;

  const printDate = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#EDECEA" }}>
      {/* Print-only header — hidden on screen, shown when printing */}
      <div className="print-header" style={{ display: "none", padding: "0 0 0 0", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: "10px", marginBottom: "10px", borderBottom: "2px solid #2563EB" }}>
          {/* Left: brand */}
          <div>
            <div style={{ fontWeight: 700, fontSize: "20px", color: "#1B2B4B", fontFamily: "DM Sans, sans-serif", lineHeight: 1.2 }}>
              Campaign<span style={{ color: "#2563EB" }}>Wise</span>
            </div>
            <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>Know Why. Fix Fast.</div>
          </div>
          {/* Center: title */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#1B2B4B", letterSpacing: "0.08em", textTransform: "uppercase" }}>Campaign Analysis Report</div>
          </div>
          {/* Right: date + campaign name */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#6B7280" }}>Generated: {printDate}</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#1B2B4B", marginTop: "2px" }}>{campaign.name}</div>
          </div>
        </div>
      </div>

      <Header title={campaign.name} subtitle="Campaign Analysis" />
      <main className="flex-1 px-8 py-6 max-w-[1400px] w-full mx-auto space-y-5">

        {/* Back + Hero */}
        <div>
          <div className="flex items-center gap-1.5 text-[12px] mb-4">
            <Link href="/dashboard" style={{ color: "#9B9793", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#2563EB")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9B9793")}>Dashboard</Link>
            <span style={{ color: "#D1D5DB" }}>›</span>
            <Link href="/campaigns" style={{ color: "#9B9793", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#2563EB")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9B9793")}>Campaigns</Link>
            <span style={{ color: "#D1D5DB" }}>›</span>
            <span style={{ color: "#1A1A18", fontWeight: 500 }}>{campaign.name}</span>
          </div>

          <div className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded capitalize"
                    style={{ background: campaign.status === "sent" ? "#ECFDF3" : "#EDECEA", color: campaign.status === "sent" ? "#15803D" : "#9B9793", border: `1px solid ${campaign.status === "sent" ? "#A7F3D0" : "#E0DDD5"}` }}>
                    {campaign.status}
                  </span>
                  {campaign.external_id && <span className="text-[11px] font-mono" style={{ color: "#9B9793" }}>Job #{campaign.external_id}</span>}
                </div>
                <h1 className="text-[20px] font-semibold leading-tight mb-1" style={{ color: "#1A1A18" }}>{campaign.name}</h1>
                {campaign.subject && <p className="text-[13px]" style={{ color: "#63605B" }}>"{campaign.subject}"</p>}
                {campaign.sent_at && (
                  <p className="text-[12px] mt-2 flex items-center gap-1.5" style={{ color: "#9B9793" }}>
                    <Clock size={11} />
                    {new Date(campaign.sent_at).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <div className="flex items-start gap-6 shrink-0">
                <div className="flex items-center gap-6">
                  {[{ label: "Sent", value: num(m?.total_sent) }, { label: "Delivered", value: num(m?.delivered) }, { label: "Opens", value: num(m?.unique_opens) }, { label: "Clicks", value: num(m?.unique_clicks) }].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-[18px] font-mono font-semibold" style={{ color: "#1A1A18" }}>{s.value}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#9B9793" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => handlePrint()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
                  style={{ background: "#F7F6F3", border: "1px solid #E8E6E0", color: "#6B6B6B" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#2563EB"; (e.currentTarget as HTMLElement).style.color = "#2563EB"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E6E0"; (e.currentTarget as HTMLElement).style.color = "#6B6B6B"; }}>
                  <Download size={13} /> Download Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left */}
          <div className="xl:col-span-2 space-y-5">

            {/* Health Score */}
            {hs ? (
              <div className="card p-6">
                <p className="label mb-5">Health Score</p>
                <div className="flex items-start gap-6">
                  <div className="relative shrink-0">
                    <svg width={108} height={108} viewBox="0 0 108 108">
                      <circle cx={54} cy={54} r={44} fill="none" stroke="#E0DDD5" strokeWidth={8} />
                      <circle cx={54} cy={54} r={44} fill="none" stroke={ringColor} strokeWidth={8}
                        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <AnimatedScore score={score} grade={hs.grade} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {KEYS.map(k => {
                      const s = hs.component_scores[k] ?? 0;
                      const c = s >= 70 ? "#15803D" : s >= 50 ? "#D97706" : "#DC2626";
                      return (
                        <div key={k}>
                          <div className="flex justify-between mb-1">
                            <span className="text-[11px]" style={{ color: "#9B9793" }}>{COMPONENT_LABELS[k]} <span style={{ color: "#E0DDD5" }}>({COMPONENT_WEIGHTS_DISPLAY[k]})</span></span>
                            <span className="text-[11px] font-mono font-semibold" style={{ color: c }}>{s}</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: "#EDECEA" }}>
                            <div className="h-full rounded-full" style={{ width: `${s}%`, background: c }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {hs.delta != null && (
                  <div className="flex items-center gap-2 mt-4 text-[12px] font-medium" style={{ color: hs.delta > 0 ? "#15803D" : hs.delta < 0 ? "#B91C1C" : "#9B9793" }}>
                    {hs.delta > 0 ? <TrendingUp size={12} /> : hs.delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {hs.delta > 0 ? "+" : ""}{hs.delta} vs previous
                    {hs.previous_score != null && <span className="font-normal font-mono" style={{ color: "#9B9793" }}>(was {hs.previous_score})</span>}
                  </div>
                )}
              </div>
            ) : null}

            {/* Layer 1 */}
            <LayerSection title="Delivery Health" layer={1}>
              {dv ? (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <AuthCheck label="SPF" status={dv.spf} />
                  <AuthCheck label="DKIM" status={dv.dkim} />
                  <AuthCheck label="DMARC" status={dv.dmarc} />
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg" style={{ background: "#EDECEA", border: "1px solid #E0DDD5" }}>
                  <Info size={12} style={{ color: "#9B9793" }} className="shrink-0" />
                  <p className="text-[12px]" style={{ color: "#9B9793" }}>SPF / DKIM / DMARC available after sync with from_domain configured.</p>
                </div>
              )}
              {dv?.sender_score != null && (
                <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-lg" style={{ background: "#EDECEA", border: "1px solid #E0DDD5" }}>
                  <span className="text-[12px]" style={{ color: "#63605B" }}>Sender Score</span>
                  <span className="text-[14px] font-mono font-semibold" style={{ color: dv.sender_score >= 80 ? "#15803D" : dv.sender_score >= 60 ? "#B45309" : "#B91C1C" }}>{dv.sender_score} / 100</span>
                </div>
              )}
              <MetricRow label="Delivery Rate" value={m?.delivery_rate ?? null} benchmark={bench.delivery_rate} higherIsBetter note="% that reached the inbox" />
              <MetricRow label="Hard Bounce Rate" value={m?.bounce_rate ?? null} benchmark={bench.bounce_rate} higherIsBetter={false} note="Permanent failures" />
              <MetricRow label="Spam Complaint Rate" value={m?.spam_complaint_rate ?? null} benchmark={bench.spam_rate} higherIsBetter={false} note="Marked as spam" />
              {m && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[{ label: "Hard Bounces", value: num(m.hard_bounces) }, { label: "Soft Bounces", value: num(m.soft_bounces) }, { label: "Spam Complaints", value: num(m.spam_complaints) }].map(s => (
                    <div key={s.label} className="p-3 rounded-lg text-center" style={{ background: "#EDECEA", border: "1px solid #E0DDD5" }}>
                      <p className="text-[18px] font-mono font-semibold" style={{ color: "#1A1A18" }}>{s.value}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#9B9793" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </LayerSection>

            {/* Layer 2 */}
            <LayerSection title="Engagement Quality" layer={2}>
              <MetricRow label="Open Rate (unique)" value={m?.open_rate ?? null} benchmark={bench.open_rate} higherIsBetter note="Industry benchmark: 21%" />
              <MetricRow label="Click-Through Rate" value={m?.ctr ?? null} benchmark={bench.ctr} higherIsBetter note="Unique clicks ÷ delivered" />
              <MetricRow label="Click-to-Open Rate" value={m?.ctor ?? null} benchmark={bench.ctor} higherIsBetter note="Unique clicks ÷ unique opens" />
              <MetricRow label="Unsubscribe Rate" value={m?.unsubscribe_rate ?? null} benchmark={bench.unsub_rate} higherIsBetter={false} note="% who opted out" />
              {m && (
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {[{ label: "Total Opens", value: num(m.opens) }, { label: "Unique Opens", value: num(m.unique_opens) }, { label: "Total Clicks", value: num(m.clicks) }, { label: "Unsubscribes", value: num(m.unsubscribes) }].map(s => (
                    <div key={s.label} className="p-3 rounded-lg text-center" style={{ background: "#EDECEA", border: "1px solid #E0DDD5" }}>
                      <p className="text-[18px] font-mono font-semibold" style={{ color: "#1A1A18" }}>{s.value}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#9B9793" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </LayerSection>

            {/* Layer 3 */}
            <LayerSection title="Execution Logic" layer={3}>
              <div className="space-y-3">
                {sentTime && (
                  <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: "#EDECEA", border: "1px solid #E0DDD5" }}>
                    <Clock size={13} style={{ color: "#9B9793" }} className="shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-[13px] font-medium" style={{ color: "#1A1A18" }}>Sent {sentTime.day} at {sentTime.time}</p>
                        {sentTime.goodDay && sentTime.goodHour
                          ? <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ background: "#ECFDF3", color: "#15803D", border: "1px solid #BBF7D0" }}>Optimal timing</span>
                          : sentTime.isWeekend
                          ? <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ background: "#FEFCE8", color: "#B45309", border: "1px solid #FDE68A" }}>Weekend send</span>
                          : <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ background: "#FEFCE8", color: "#B45309", border: "1px solid #FDE68A" }}>Off-peak hours</span>}
                      </div>
                      <p className="text-[12px]" style={{ color: "#63605B" }}>
                        {sentTime.isWeekend ? "Weekend sends see lower engagement. Consider Mon–Fri." : "Mon–Fri sends yield higher engagement."}{" "}
                        {sentTime.goodHour ? "Send time aligns with peak windows (8–10am, 1–3pm)." : "Consider sending 8–10am or 1–3pm."}
                      </p>
                    </div>
                  </div>
                )}
                {m && (
                  <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: "#EDECEA", border: "1px solid #E0DDD5" }}>
                    <Users size={13} style={{ color: "#9B9793" }} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: "#1A1A18" }}>
                        Audience: <span className="font-mono">{num(m.total_sent)}</span> recipients
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: "#63605B" }}>
                        {m.delivered && m.total_sent ? `${num(m.delivered)} delivered (${pct(m.delivery_rate)} delivery rate)` : "Delivery data not available."}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                  <Info size={13} style={{ color: "#2563EB" }} className="shrink-0 mt-0.5" />
                  <p className="text-[12px]" style={{ color: "#1D4ED8" }}>Sync more campaigns to unlock frequency and fatigue analysis across your audience segments.</p>
                </div>
              </div>
            </LayerSection>

            {/* Recommended Actions */}
            {insights.filter(i => i.severity !== "positive").length > 0 && (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="px-6 py-4" style={{ borderBottom: "1px solid #E8E6E0" }}>
                  <h2 className="text-[14px] font-semibold" style={{ color: "#1A1A18" }}>Recommended Actions</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: "#9B9B9B" }}>Prioritised fixes based on impact and effort</p>
                </div>
                <div className="px-6 py-4 space-y-3">
                  {insights
                    .filter(i => i.severity !== "positive")
                    .sort((a, b) => {
                      const order = { critical: 0, warning: 1, info: 2 };
                      return (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3);
                    })
                    .slice(0, 5)
                    .map((ins, idx) => {
                      const priority = ins.severity === "critical" ? "Immediate" : ins.severity === "warning" ? "This week" : "Next campaign";
                      const priorityColor = ins.severity === "critical" ? { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" } : ins.severity === "warning" ? { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" } : { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" };
                      const effortMap: Record<string, string> = { hard_bounce_rate: "Low", spam_complaint_rate: "Low", open_rate: "Low", ctr: "Low", ctor: "Low", send_day: "Low", send_hour: "Low", unsubscribe_rate: "Low", blocklist: "High", spf: "High", dkim: "High" };
                      const effort = effortMap[ins.metric_key ?? ""] ?? "Medium";
                      return (
                        <div key={ins.id} className="flex gap-4 p-4 rounded-lg" style={{ borderLeft: "3px solid #2563EB", border: "1px solid #E8E6E0", borderLeftWidth: 3, borderLeftColor: "#2563EB" } as React.CSSProperties}>
                          <span className="text-[20px] font-mono font-bold shrink-0 w-8 leading-none" style={{ color: "#E8E6E0" }}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <p className="text-[13px] font-semibold leading-snug" style={{ color: "#1A1A18" }}>{ins.diagnosis}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: priorityColor.bg, color: priorityColor.color, border: `1px solid ${priorityColor.border}` }}>{priority}</span>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#F7F6F3", color: "#6B6B6B", border: "1px solid #E8E6E0" }}>{effort}</span>
                              </div>
                            </div>
                            <p className="text-[12px] leading-snug" style={{ color: "#6B6B6B" }}>{ins.recommendation}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Revenue Impact */}
            <div className="revenue-impact-section card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #E8E6E0" }}>
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold" style={{ color: "#1A1A18" }}>Revenue Impact</h2>
                  <Lock size={13} style={{ color: "#9B9B9B" }} />
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: "#9B9B9B" }}>Connect Salesforce CRM to unlock</p>
              </div>
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {["Pipeline influenced", "Opportunities created", "Revenue attributed", "Active deals at risk"].map(label => (
                    <div key={label} className="p-4 rounded-lg text-center" style={{ background: "#F7F6F3", border: "1px solid #E8E6E0" }}>
                      <div className="flex items-center justify-center mb-2">
                        <Lock size={14} style={{ color: "#D1D5DB" }} />
                      </div>
                      <p className="text-[20px] font-mono font-semibold mb-1" style={{ color: "#D1D5DB" }}>—</p>
                      <p className="text-[10px]" style={{ color: "#9B9B9B" }}>{label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[12px] mb-4" style={{ color: "#9B9B9B" }}>
                  See which contacts from this campaign became opportunities and which are in active sales conversations.
                </p>
                <Link href="/settings"
                  className="no-print inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium"
                  style={{ background: "#F7F6F3", border: "1px solid #E8E6E0", color: "#6B6B6B" }}>
                  Connect Salesforce CRM →
                </Link>
              </div>
            </div>

            {/* Print-only insights — in document flow, hidden on screen */}
            <div className="print-insights-section" style={{ display: "none" }}>
              <div style={{ borderTop: "2px solid #2563EB", paddingTop: "16px", marginTop: "4px" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#1A1A18", marginBottom: "4px" }}>Insights & Recommendations</p>
                <p style={{ fontSize: "11px", color: "#9B9B9B", marginBottom: "12px" }}>{insights.length} finding{insights.length !== 1 ? "s" : ""}</p>
                {insights.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#9B9B9B" }}>No insights generated yet.</p>
                ) : (
                  [1, 2, 3].map(layer => {
                    const li = insights.filter(i => i.layer === layer);
                    if (!li.length) return null;
                    const layerName = ["", "Delivery Health", "Engagement Quality", "Execution Logic"][layer];
                    return (
                      <div key={layer} style={{ marginBottom: "12px" }}>
                        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B9B9B", marginBottom: "6px" }}>
                          Layer {layer} — {layerName}
                        </p>
                        {li.map(ins => {
                          const bc = ins.severity === "critical" ? "#DC2626" : ins.severity === "warning" ? "#D97706" : ins.severity === "positive" ? "#16A34A" : "#2563EB";
                          const lc = ins.severity === "critical" ? "#DC2626" : ins.severity === "warning" ? "#D97706" : ins.severity === "positive" ? "#16A34A" : "#2563EB";
                          return (
                            <div key={ins.id} className="print-insight-card" style={{ borderTop: "1px solid #E8E6E0", borderRight: "1px solid #E8E6E0", borderBottom: "1px solid #E8E6E0", borderLeft: `3px solid ${bc}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "6px", background: "#ffffff" }}>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "3px" }}>
                                <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: lc, background: lc + "18", border: `1px solid ${lc}30`, padding: "1px 6px", borderRadius: "9999px" }}>{ins.severity}</span>
                                <span style={{ fontSize: "9px", color: "#9B9B9B" }}>Layer {ins.layer}</span>
                              </div>
                              <p style={{ fontSize: "11px", fontWeight: 600, color: "#1A1A18", marginBottom: "2px" }}>{ins.diagnosis}</p>
                              <p style={{ fontSize: "10px", color: "#6B6B6B", lineHeight: 1.4 }}>{ins.recommendation}</p>
                              {ins.metric_value != null && ins.benchmark_value != null && (
                                <p style={{ fontSize: "9px", color: "#9B9B9B", marginTop: "3px", fontFamily: "'Courier New', monospace" }}>
                                  Actual: {(ins.metric_value * 100).toFixed(2)}% · Benchmark: {(ins.benchmark_value * 100).toFixed(2)}%
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right: Insights — screen only, hidden in print */}
          <div className="screen-insights">
            <div className="card sticky top-20" style={{ padding: 0, overflow: "hidden" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #E0DDD5" }}>
                <p className="text-[14px] font-semibold" style={{ color: "#1A1A18" }}>Insights & Recommendations</p>
                <p className="text-[12px] mt-0.5" style={{ color: "#9B9793" }}>
                  <span className="font-mono">{insights.length}</span> finding{insights.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="insights-container px-5 py-4 space-y-2.5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {insights.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: "#EFF6FF" }}>
                      <Info size={15} style={{ color: "#2563EB" }} />
                    </div>
                    <p className="text-[13px] font-medium mb-1" style={{ color: "#1A1A18" }}>No insights yet</p>
                    <p className="text-[12px]" style={{ color: "#9B9793" }}>Generated after each sync.</p>
                  </div>
                ) : (
                  [1, 2, 3].map(layer => {
                    const li = insights.filter(i => i.layer === layer);
                    if (!li.length) return null;
                    return (
                      <div key={layer}>
                        <p className="label mb-2">Layer {layer} — {["", "Delivery", "Engagement", "Execution"][layer]}</p>
                        <div className="space-y-2">{li.map(ins => <InsightCard key={ins.id} insight={ins} />)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden PrintReport — rendered off-screen, used by react-to-print */}
      <div style={{ position: "absolute", top: "-99999px", left: "-99999px", width: "720px" }}>
        <PrintReport
          ref={printRef}
          campaign={campaign}
          metrics={m}
          healthScore={hs ? { ...hs, component_scores: hs.component_scores as unknown as Record<string, number> } : null}
          insights={insights}
          deliverability={dv}
          benchmarks={bm}
        />
      </div>
    </div>
  );
}
