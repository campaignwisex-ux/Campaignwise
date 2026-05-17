"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpRight, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from "lucide-react";

interface CampaignMetrics { total_sent: number; open_rate: number | null; ctr: number | null; ctor: number | null; bounce_rate: number | null; }
interface HealthScore { score: number; grade: string; delta: number | null; }
interface Campaign { id: string; name: string; subject: string | null; sent_at: string | null; status: string; metrics: CampaignMetrics | null; health_score: HealthScore | null; }

type SortKey = "name" | "sent_at" | "total_sent" | "open_rate" | "ctr" | "ctor" | "bounce_rate" | "score";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "sent" | "scheduled" | "draft";

const pct = (v: number | null | undefined) => v != null ? `${(v * 100).toFixed(2)}%` : "—";
const num = (v: number | null | undefined) => v != null ? v.toLocaleString() : "—";

function MetricCell({ value, good, bad, higherIsBetter }: { value: number | null | undefined; good: number; bad: number; higherIsBetter: boolean }) {
  if (value == null) return <span className="font-mono text-[12px]" style={{ color: "#9B9793" }}>—</span>;
  let color = "#63605B";
  if (higherIsBetter) color = value >= good ? "#15803D" : value <= bad ? "#B91C1C" : "#B45309";
  else color = value <= good ? "#15803D" : value >= bad ? "#B91C1C" : "#B45309";
  return <span className="font-mono text-[12px] font-medium" style={{ color }}>{pct(value)}</span>;
}

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} style={{ color: "#E0DDD5" }} />;
  return dir === "asc" ? <ChevronUp size={11} style={{ color: "#2563EB" }} /> : <ChevronDown size={11} style={{ color: "#2563EB" }} />;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("sent_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns").then(r => r.json()).then(({ campaigns: d }) => setCampaigns(d ?? [])).finally(() => setLoading(false));
  }, []);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    let rows = campaigns;
    if (search.trim()) { const q = search.toLowerCase(); rows = rows.filter(c => c.name.toLowerCase().includes(q) || c.subject?.toLowerCase().includes(q)); }
    if (statusFilter !== "all") rows = rows.filter(c => c.status === statusFilter);
    return [...rows].sort((a, b) => {
      let av: number | string | null = null, bv: number | string | null = null;
      switch (sortKey) {
        case "name":       av = a.name;                        bv = b.name;                        break;
        case "sent_at":    av = a.sent_at ?? "";               bv = b.sent_at ?? "";               break;
        case "total_sent": av = a.metrics?.total_sent ?? 0;    bv = b.metrics?.total_sent ?? 0;    break;
        case "open_rate":  av = a.metrics?.open_rate ?? -1;    bv = b.metrics?.open_rate ?? -1;    break;
        case "ctr":        av = a.metrics?.ctr ?? -1;          bv = b.metrics?.ctr ?? -1;          break;
        case "ctor":       av = a.metrics?.ctor ?? -1;         bv = b.metrics?.ctor ?? -1;         break;
        case "bounce_rate":av = a.metrics?.bounce_rate ?? 999; bv = b.metrics?.bounce_rate ?? 999; break;
        case "score":      av = a.health_score?.score ?? -1;   bv = b.health_score?.score ?? -1;   break;
      }
      const cmp = av! < bv! ? -1 : av! > bv! ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [campaigns, search, statusFilter, sortKey, sortDir]);

  const stats = useMemo(() => {
    const w = campaigns.filter(c => c.metrics && c.metrics.total_sent > 0);
    const avg = (fn: (c: Campaign) => number | null | undefined) => { const v = w.map(fn).filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    return { total: campaigns.length, avgScore: w.length ? Math.round(w.reduce((s, c) => s + (c.health_score?.score ?? 0), 0) / w.length) : null, avgOpen: avg(c => c.metrics?.open_rate), avgCtr: avg(c => c.metrics?.ctr) };
  }, [campaigns]);

  const th = "px-4 py-3 text-left cursor-pointer select-none transition-colors duration-100";

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#EDECEA" }}>
      <Header title="Campaigns" subtitle="CampaignWise" />
      <main className="flex-1 px-8 py-6 max-w-[1400px] w-full mx-auto space-y-5">

        {!loading && campaigns.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Campaigns",  value: stats.total.toString() },
              { label: "Avg Health Score", value: stats.avgScore !== null ? String(stats.avgScore) : "—" },
              { label: "Avg Open Rate",    value: stats.avgOpen !== null ? pct(stats.avgOpen) : "—" },
              { label: "Avg CTR",          value: stats.avgCtr !== null ? pct(stats.avgCtr) : "—" },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <p className="label mb-2">{s.label}</p>
                <p className="text-[24px] font-mono font-semibold" style={{ color: "#1A1A18" }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[200px] max-w-xs"
            style={{ background: "#F7F6F2", border: "1px solid #E0DDD5" }}
            onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(37,99,235,0.4)"}
            onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = "#E0DDD5"}>
            <Search size={12} style={{ color: "#9B9793" }} />
            <input type="text" placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[13px] outline-none" style={{ color: "#1A1A18" }} />
          </div>

          <div className="flex items-center gap-0.5 p-1 rounded-lg" style={{ background: "#F7F6F2", border: "1px solid #E0DDD5" }}>
            {(["all", "sent", "scheduled", "draft"] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium capitalize transition-all duration-100"
                style={{ background: statusFilter === s ? "#2563EB" : "transparent", color: statusFilter === s ? "white" : "#9B9793" }}>
                {s}
              </button>
            ))}
          </div>

          <p className="ml-auto text-[12px] font-mono" style={{ color: "#9B9793" }}>{filtered.length} / {campaigns.length}</p>
        </div>

        {/* Table */}
        <div className="card overflow-hidden" style={{ padding: 0 }}>
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-2">
              <Loader2 size={16} style={{ color: "#2563EB" }} className="animate-spin" />
              <p className="text-[13px]" style={{ color: "#9B9793" }}>Loading…</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <AlertCircle size={20} style={{ color: "#E0DDD5" }} />
              <p className="text-[13px]" style={{ color: "#9B9793" }}>No campaigns yet</p>
              <Link href="/settings" className="text-[12px] font-medium" style={{ color: "#2563EB" }}>Connect SFMC →</Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-1">
              <p className="text-[13px]" style={{ color: "#9B9793" }}>No campaigns match your filters</p>
              <button onClick={() => { setSearch(""); setStatusFilter("all"); }} className="text-[12px] font-medium" style={{ color: "#2563EB" }}>Clear filters</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead style={{ background: "#EDECEA", borderBottom: "1px solid #E0DDD5" }}>
                  <tr>
                    {[
                      { key: "name",        label: "Campaign" },
                      { key: "sent_at",     label: "Send Date" },
                      { key: "total_sent",  label: "Sent" },
                      { key: "open_rate",   label: "Open Rate" },
                      { key: "ctr",         label: "CTR" },
                      { key: "ctor",        label: "CTOR" },
                      { key: "bounce_rate", label: "Bounce" },
                      { key: "score",       label: "Score" },
                    ].map(col => (
                      <th key={col.key} className={th} onClick={() => handleSort(col.key as SortKey)}>
                        <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.08em] uppercase" style={{ color: "#9B9793" }}>
                          {col.label} <SortIcon col={col.key as SortKey} sortKey={sortKey} dir={sortDir} />
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const grade = c.health_score?.grade ?? "F";
                    const cls = { A: "badge-A", B: "badge-B", C: "badge-C", D: "badge-D", F: "badge-F" }[grade] ?? "badge-F";
                    const isHov = hovered === c.id;
                    return (
                      <tr key={c.id}
                        onMouseEnter={() => setHovered(c.id)} onMouseLeave={() => setHovered(null)}
                        style={{ borderBottom: "1px solid #E0DDD5", background: isHov ? "#EDECEA" : "#F7F6F2", borderLeft: isHov ? "2px solid #2563EB" : "2px solid transparent", transition: "all 0.1s ease" }}>
                        <td className="px-4 py-3.5 max-w-[260px]">
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 capitalize"
                              style={{ background: c.status === "sent" ? "#ECFDF3" : "#EDECEA", color: c.status === "sent" ? "#15803D" : "#9B9793", border: `1px solid ${c.status === "sent" ? "#A7F3D0" : "#E0DDD5"}` }}>
                              {c.status}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium truncate" style={{ color: "#1A1A18" }}>{c.name}</p>
                              {c.subject && <p className="text-[11px] truncate" style={{ color: "#9B9793" }}>{c.subject}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[12px] font-mono" style={{ color: "#63605B" }}>
                            {c.sent_at ? new Date(c.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5"><span className="font-mono text-[12px]" style={{ color: "#63605B" }}>{num(c.metrics?.total_sent)}</span></td>
                        <td className="px-4 py-3.5"><MetricCell value={c.metrics?.open_rate} good={0.21} bad={0.10} higherIsBetter /></td>
                        <td className="px-4 py-3.5"><MetricCell value={c.metrics?.ctr} good={0.025} bad={0.005} higherIsBetter /></td>
                        <td className="px-4 py-3.5"><MetricCell value={c.metrics?.ctor} good={0.10} bad={0.03} higherIsBetter /></td>
                        <td className="px-4 py-3.5"><MetricCell value={c.metrics?.bounce_rate} good={0.005} bad={0.02} higherIsBetter={false} /></td>
                        <td className="px-4 py-3.5">
                          {c.health_score ? (
                            <div className="flex items-center gap-2">
                              <span className={`${cls} text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border`}>{grade} {c.health_score.score}</span>
                              {c.health_score.delta !== null && c.health_score.delta !== 0
                                ? c.health_score.delta > 0 ? <TrendingUp size={11} style={{ color: "#15803D" }} /> : <TrendingDown size={11} style={{ color: "#B91C1C" }} />
                                : <Minus size={11} style={{ color: "#E0DDD5" }} />}
                            </div>
                          ) : <span className="font-mono text-[12px]" style={{ color: "#E0DDD5" }}>—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link href={`/campaigns/${c.id}`}
                            className="flex items-center gap-1 text-[11px] font-medium transition-opacity"
                            style={{ color: "#2563EB", opacity: isHov ? 1 : 0 }}>
                            Analyse <ArrowUpRight size={10} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
