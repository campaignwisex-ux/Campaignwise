"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { useCountUp } from "@/lib/useCountUp";
import {
  ArrowRight, AlertTriangle, BarChart3, Mail,
  MousePointerClick, TrendingUp, TrendingDown,
  DollarSign, Loader2, Zap, Minus, Activity, CheckCircle2,
} from "lucide-react";
import { COMPONENT_LABELS, COMPONENT_WEIGHTS_DISPLAY } from "@/lib/healthscore";
import type { HealthScoreComponents } from "@/lib/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  hasCampaigns: boolean;
  stats: { activeCampaigns: number; avgOpenRate: number | null; avgCtr: number | null; avgCtor: number | null };
  healthScore: { score: number; grade: string; components: Record<string, number>; topIssue: string | null } | null;
  topCampaigns: CampaignRow[];
  bottomCampaigns: CampaignRow[];
  immediateWins: Win[];
  contactSaving: { unengagedCount: number; estimatedMonthlySaving: number } | null;
}

interface CampaignRow {
  id: string; name: string; openRate: number | null; ctr: number | null;
  score: number | null; grade: string | null; delta: number | null;
}

interface Win {
  id: string; type: "warning" | "opportunity"; title: string;
  description: string; recommendation: string; effort: "Low" | "Medium" | "High";
  layer: number; severity: string;
}

const pct = (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : "—";
const COMPONENT_KEYS = Object.keys(COMPONENT_LABELS) as (keyof HealthScoreComponents)[];

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, iconColor }: {
  label: string; value: string; icon: React.ElementType; iconColor: string;
}) {
  return (
    <div className="card card-hover p-7">
      <div className="flex items-start justify-between mb-3">
        <p className="label">{label}</p>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <p className="text-[28px] font-mono font-semibold leading-none mb-3" style={{ color: "#1A1A18" }}>{value}</p>
      <div className="h-[2px] w-6 rounded-full" style={{ background: "#2563EB" }} />
    </div>
  );
}

// ─── Health score ─────────────────────────────────────────────────────────────

function HealthScoreCard({ data }: { data: DashboardData["healthScore"] }) {
  const score = data?.score ?? 0;
  const counted = useCountUp(score, 1200, score > 0);
  const circ = 2 * Math.PI * 44;
  const dash = (score / 100) * circ;
  const ringColor = score >= 70 ? "#16A34A" : score >= 40 ? "#D97706" : "#DC2626";

  if (!data) return (
    <div className="card p-6 col-span-full lg:col-span-1 flex flex-col items-center justify-center gap-3 min-h-[200px]">
      <Zap size={20} style={{ color: "#E0DDD5" }} />
      <p className="text-[13px] text-center" style={{ color: "#9B9793" }}>No health score yet.<br />Sync your SFMC account.</p>
      <Link href="/settings" className="text-[12px] font-medium" style={{ color: "#2563EB" }}>Go to Settings →</Link>
    </div>
  );

  return (
    <div className="card p-6 col-span-full lg:col-span-1">
      <p className="label mb-5">Account Health Score</p>
      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative shrink-0">
          <svg width={108} height={108} viewBox="0 0 108 108">
            <circle cx={54} cy={54} r={44} fill="none" stroke="#E0DDD5" strokeWidth={8} />
            <circle cx={54} cy={54} r={44} fill="none" stroke={ringColor} strokeWidth={8}
              strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-mono font-semibold leading-none" style={{ color: "#1A1A18" }}>{counted}</span>
            <span className="text-[11px] font-medium mt-0.5" style={{ color: "#9B9793" }}>{data.grade}</span>
          </div>
        </div>

        {/* Components */}
        <div className="flex-1 space-y-2.5">
          {COMPONENT_KEYS.map(k => {
            const s = data.components[k] ?? 50;
            const fill = s >= 70 ? "#16A34A" : s >= 50 ? "#D97706" : "#DC2626";
            return (
              <div key={k}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[11px]" style={{ color: "#6B7280" }}>{COMPONENT_LABELS[k]}</span>
                  <span className="text-[11px] font-mono font-medium" style={{ color: "#1A1A18" }}>{s}</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: "6px", background: "#F3F4F6" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s}%`, background: fill }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.topIssue && (
        <div className="flex items-center gap-2 mt-5 px-3 py-2 rounded-lg" style={{ background: "#FEFCE8", border: "1px solid #FDE68A" }}>
          <AlertTriangle size={12} style={{ color: "#B45309" }} className="shrink-0" />
          <p className="text-[11px]" style={{ color: "#B45309" }}>{data.topIssue}</p>
        </div>
      )}
    </div>
  );
}

// ─── Immediate wins ───────────────────────────────────────────────────────────

function ImmediateWinsCard({ wins }: { wins: Win[] }) {
  const severityBorder = (sev: string) =>
    sev === "critical" ? "#B91C1C" : sev === "warning" ? "#B45309" : "#15803D";

  if (!wins.length) return (
    <div className="card p-6 col-span-full lg:col-span-2 flex items-center justify-center min-h-[200px]">
      <p className="text-[13px]" style={{ color: "#9B9793" }}>No insights yet — sync campaigns to surface wins.</p>
    </div>
  );

  return (
    <div className="card p-6 col-span-full lg:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <p className="label">Immediate Wins</p>
        <Link href="/campaigns" className="flex items-center gap-1 text-[12px] font-medium" style={{ color: "#2563EB" }}>
          View all <ArrowRight size={11} />
        </Link>
      </div>
      <div className="space-y-3">
        {wins.map(win => {
          const borderColor = win.severity === "critical" ? "#DC2626" : win.severity === "warning" ? "#D97706" : "#16A34A";
          const badgeBg    = win.severity === "critical" ? "#FEF2F2" : win.severity === "warning" ? "#FFFBEB" : "#F0FDF4";
          const badgeColor = win.severity === "critical" ? "#DC2626" : win.severity === "warning" ? "#D97706" : "#16A34A";
          return (
            <div key={win.id} className="flex gap-4 px-4 py-3.5 rounded-lg"
              style={{ background: "#FFFFFF", borderTop: "1px solid #E8E6E0", borderRight: "1px solid #E8E6E0", borderBottom: "1px solid #E8E6E0", borderLeft: `3px solid ${borderColor}` }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[13px] font-medium leading-tight" style={{ color: "#1A1A18" }}>{win.title}</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize"
                    style={{ background: badgeBg, color: badgeColor, border: `1px solid ${borderColor}30` }}>
                    {win.severity}
                  </span>
                </div>
                <p className="text-[12px] leading-snug" style={{ color: "#6B6B6B" }}>{win.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px]" style={{ color: "#9B9B9B" }}>Layer {win.layer} · {win.effort} effort</span>
                  <Link href="/campaigns" className="text-[11px] font-medium flex items-center gap-1" style={{ color: "#2563EB" }}>
                    View <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Campaign table ───────────────────────────────────────────────────────────

function CampaignTable({ title, campaigns, type }: { title: string; campaigns: CampaignRow[]; type: "top" | "bottom" }) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!campaigns.length) return (
    <div className="card p-6 flex items-center justify-center min-h-[160px]">
      <p className="text-[12px]" style={{ color: "#9B9793" }}>{title} — no data yet</p>
    </div>
  );

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="label">{title}</p>
        <Link href="/campaigns" className="text-[12px] font-medium" style={{ color: "#2563EB" }}>View all →</Link>
      </div>
      <div className="space-y-0">
        {campaigns.map(c => {
          const grade = c.grade ?? "F";
          const cls = { A: "badge-A", B: "badge-B", C: "badge-C", D: "badge-D", F: "badge-F" }[grade] ?? "badge-F";
          const isF = grade === "F";
          const rowBg = isF ? "#FEF2F2" : hovered === c.id ? "#F7F6F3" : "transparent";
          return (
            <Link key={c.id} href={`/campaigns/${c.id}`}
              onMouseEnter={() => setHovered(c.id)} onMouseLeave={() => setHovered(null)}
              className="flex items-center justify-between py-3 transition-all duration-100"
              style={{
                borderBottom: "1px solid #E8E6E0",
                borderLeft: hovered === c.id ? "2px solid #2563EB" : "2px solid transparent",
                paddingLeft: hovered === c.id ? "6px" : "0",
                background: rowBg,
                marginLeft: hovered === c.id ? "-6px" : "0",
              }}>
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "#1A1A18" }}>{c.name}</p>
                <p className="text-[11px] font-mono" style={{ color: "#9B9793" }}>OR {pct(c.openRate)} · CTR {pct(c.ctr)}</p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 ml-3">
                {c.score !== null && <span className="text-[13px] font-mono font-semibold" style={{ color: "#1A1A18" }}>{c.score}</span>}
                <span className={`${cls} text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border`}>{grade}</span>
                {c.delta !== null && c.delta !== 0
                  ? c.delta > 0 ? <TrendingUp size={12} style={{ color: "#15803D" }} /> : <TrendingDown size={12} style={{ color: "#B91C1C" }} />
                  : <Minus size={12} style={{ color: "#E0DDD5" }} />}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Contact saving ───────────────────────────────────────────────────────────

function ContactCostBanner({ saving }: { saving: DashboardData["contactSaving"] }) {
  if (!saving) return null;
  return (
    <div className="card p-5" style={{ borderLeft: "3px solid #2563EB" }}>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#EFF6FF" }}>
            <DollarSign size={16} style={{ color: "#2563EB" }} />
          </div>
          <div>
            <p className="text-[13px] font-medium" style={{ color: "#1A1A18" }}>
              Save <span className="font-mono" style={{ color: "#2563EB" }}>~${saving.estimatedMonthlySaving.toLocaleString()}/month</span> on contact costs
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "#63605B" }}>
              <span className="font-mono">{saving.unengagedCount.toLocaleString()}</span> hard-bounced or unsubscribed contacts are inflating your send volume.
            </p>
          </div>
        </div>
        <Link href="/campaigns"
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium text-white"
          style={{ background: "#2563EB" }}>
          View campaigns <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onSeedComplete }: { onSeedComplete: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");

  async function handleSeed() {
    setSeeding(true); setError("");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (!data.seeded) throw new Error("No campaigns created.");
      onSeedComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
      setSeeding(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
        <BarChart3 size={22} style={{ color: "#2563EB" }} />
      </div>
      <h2 className="text-[20px] font-semibold mb-2" style={{ color: "#1A1A18" }}>Welcome to CampaignWise</h2>
      <p className="text-[14px] mb-6 max-w-sm leading-relaxed" style={{ color: "#63605B" }}>
        Connect your SFMC account and run a sync — or load demo data to explore the product.
      </p>
      {error && <p className="text-[12px] mb-4" style={{ color: "#B91C1C" }}>{error}</p>}
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/settings"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium text-white"
          style={{ background: "#2563EB" }}>
          <Zap size={13} /> Connect SFMC
        </Link>
        <button onClick={handleSeed} disabled={seeding}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
          style={{ background: "#EDECEA", border: "1px solid #E0DDD5", color: "#63605B" }}>
          {seeding ? <Loader2 size={13} className="animate-spin" /> : <BarChart3 size={13} />}
          {seeding ? "Loading…" : "Load demo data"}
        </button>
      </div>
      <p className="text-[11px] mt-4" style={{ color: "#9B9793" }}>10 realistic campaigns with real health scores and insights.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/dashboard").then(r => r.json()).then(setData).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex flex-col min-h-screen" style={{ background: "#EDECEA" }}>
      <Header />
      <div className="flex-1 flex items-center justify-center gap-2">
        <Loader2 size={16} style={{ color: "#2563EB" }} className="animate-spin" />
        <p className="text-[13px]" style={{ color: "#9B9793" }}>Loading…</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#EDECEA" }}>
      <Header />
      <main className="flex-1 px-8 py-8 space-y-5 max-w-[1400px] w-full mx-auto">
        {!data?.hasCampaigns ? <EmptyState onSeedComplete={load} /> : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard label="Active Campaigns" value={String(data.stats.activeCampaigns)} icon={Activity} iconColor="#2563EB" />
              <StatCard label="Avg. Open Rate"   value={pct(data.stats.avgOpenRate)}        icon={Mail}              iconColor="#16A34A" />
              <StatCard label="Avg. CTR"         value={pct(data.stats.avgCtr)}             icon={MousePointerClick} iconColor="#9B9B9B" />
              <StatCard label="Avg. CTOR"        value={pct(data.stats.avgCtor)}            icon={BarChart3}         iconColor="#2563EB" />
            </div>

            {/* Health + Wins */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <HealthScoreCard data={data.healthScore} />
              <ImmediateWinsCard wins={data.immediateWins} />
            </div>

            {/* Top/Bottom */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CampaignTable title="Top Campaigns"    campaigns={data.topCampaigns}    type="top" />
              <CampaignTable title="Bottom Campaigns" campaigns={data.bottomCampaigns} type="bottom" />
            </div>

            <ContactCostBanner saving={data.contactSaving} />
          </>
        )}
      </main>
    </div>
  );
}
