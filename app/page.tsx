"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ImageOff, Clock, AlertCircle, Layers, BarChart2, Zap,
  FileText, Shield, TrendingUp, Cpu, CheckCircle2, ExternalLink,
  Menu, X, ArrowRight, Loader2, Plug, ChevronRight,
} from "lucide-react";

// ─── Scroll reveal ────────────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ─── Counter ──────────────────────────────────────────────────────────────────

function useCounter(target: number, triggered: boolean, duration = 1500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!triggered) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [triggered, target, duration]);
  return val;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const btn = {
  primary: {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontSize: 15, fontWeight: 600, color: "#fff", background: "#2563EB",
    padding: "13px 26px", borderRadius: 8, textDecoration: "none",
    border: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans)",
    transition: "transform 150ms ease, box-shadow 150ms ease",
  } as React.CSSProperties,
  ghost: {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontSize: 15, fontWeight: 500, color: "#1A1A18",
    padding: "13px 20px", borderRadius: 8, textDecoration: "none",
    border: "none", cursor: "pointer", background: "transparent",
    fontFamily: "var(--font-dm-sans)",
  } as React.CSSProperties,
};

const hoverPrimary = (el: HTMLElement, on: boolean) => {
  el.style.transform = on ? "scale(1.02)" : "scale(1)";
  el.style.boxShadow = on ? "0 4px 20px rgba(37,99,235,0.25)" : "none";
};

// ─── NAV ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const links = [
    { label: "Product", href: "#product" },
    { label: "Vision", href: "#vision" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ];

  const navLink: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: "#6B7280", textDecoration: "none", transition: "color 100ms" };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "0 32px",
      background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: scrolled ? "1px solid #E8E6E0" : "1px solid transparent",
      transition: "all 200ms ease",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A18", letterSpacing: "-0.02em", lineHeight: 1 }}>
            Campaign<span style={{ color: "#2563EB" }}>Wise</span>
          </span>
          <span style={{ fontSize: 10, fontWeight: 500, color: "#9B9B9B", letterSpacing: "0.06em" }}>KNOW WHY. FIX FAST.</span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: isDesktop ? "flex" : "none", gap: 32, alignItems: "center" }}>
          {links.map(l => (
            <a key={l.label} href={l.href} style={navLink}
              onMouseEnter={e => (e.currentTarget.style.color = "#2563EB")}
              onMouseLeave={e => (e.currentTarget.style.color = "#6B7280")}>
              {l.label}
            </a>
          ))}
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isDesktop && (
            <Link href="/sign-in" style={navLink}
              onMouseEnter={e => (e.currentTarget.style.color = "#2563EB")}
              onMouseLeave={e => (e.currentTarget.style.color = "#6B7280")}>
              Sign in
            </Link>
          )}
          <a href="#contact" style={btn.primary}
            onMouseEnter={e => hoverPrimary(e.currentTarget as HTMLElement, true)}
            onMouseLeave={e => hoverPrimary(e.currentTarget as HTMLElement, false)}
            onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = "scale(0.98)"}
            onMouseUp={e => hoverPrimary(e.currentTarget as HTMLElement, true)}>
            Get early access
          </a>
          {!isDesktop && (
            <button onClick={() => setOpen(o => !o)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#1A1A18", padding: 4, display: "flex" }}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: "#fff", borderTop: "1px solid #E8E6E0", padding: "12px 0 16px" }}>
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)}
              style={{ display: "block", padding: "10px 32px", fontSize: 15, fontWeight: 500, color: "#1A1A18", textDecoration: "none" }}>
              {l.label}
            </a>
          ))}
          <div style={{ padding: "10px 32px" }}>
            <Link href="/sign-in" style={{ fontSize: 15, color: "#6B7280", textDecoration: "none" }}>Sign in</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Product mockup ───────────────────────────────────────────────────────────

function Mockup() {
  return (
    <div style={{ maxWidth: 860, margin: "60px auto 0", padding: "0 24px" }}>
      <div style={{ background: "#1B2B4B", borderRadius: 12, padding: "12px 12px 0", transform: "perspective(1200px) rotateX(4deg)", transformOrigin: "top center" }}>
        {/* Chrome */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#FF5F57","#FFBD2E","#28CA41"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
            campaignwise.io/campaigns/black-friday
          </div>
        </div>
        {/* Content */}
        <div style={{ background: "#EDECEA", borderRadius: "8px 8px 0 0", position: "relative", overflow: "hidden" }}>
          {/* App header */}
          <div style={{ background: "#fff", borderBottom: "1px solid #E8E6E0", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 9, color: "#9B9B9B", marginBottom: 2, letterSpacing: "0.06em", textTransform: "uppercase" }}>Campaign Analysis</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Black Friday Flash Sale</div>
              <div style={{ fontSize: 10, color: "#9B9B9B", marginTop: 1 }}>Job #JOB-BF-001 · Sent Nov 29, 2024</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#15803D", background: "#ECFDF3", border: "1px solid #A7F3D0", padding: "4px 10px", borderRadius: 6, fontFamily: "monospace" }}>100 · A</span>
          </div>
          {/* Metrics */}
          <div style={{ background: "#fff", margin: "12px 16px 0", borderRadius: 8, border: "1px solid #E8E6E0", padding: "10px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, textAlign: "center" }}>
              {[["42,800","Sent"],["42,586","Delivered"],["16,466","Opens"],["3,514","Clicks"]].map(([v,l]) => (
                <div key={l}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A18", fontFamily: "monospace" }}>{v}</div>
                  <div style={{ fontSize: 9, color: "#9B9B9B", marginTop: 1 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Insights */}
          <div style={{ padding: "10px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "#fff", border: "1px solid #E8E6E0", borderLeft: "3px solid #16A34A", borderRadius: 6, padding: "9px 12px" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0", padding: "1px 6px", borderRadius: 9999 }}>POSITIVE</span>
                <span style={{ fontSize: 9, color: "#9B9B9B" }}>Layer 2 — Engagement</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1A1A18", marginBottom: 2 }}>Open rate of 38.67%, exceeding the industry benchmark by 84%</div>
              <div style={{ fontSize: 10, color: "#6B6B6B" }}>Document the subject line formula and apply it as your control template for future sends.</div>
              <div style={{ fontSize: 9, color: "#9B9B9B", marginTop: 3, fontFamily: "monospace" }}>Actual: 38.67% · Benchmark: 21.00%</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #E8E6E0", borderLeft: "3px solid #D97706", borderRadius: 6, padding: "9px 12px" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#D97706", background: "#FFFBEB", border: "1px solid #FDE68A", padding: "1px 6px", borderRadius: 9999 }}>WARNING</span>
                <span style={{ fontSize: 9, color: "#9B9B9B" }}>Layer 1 — Delivery</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1A1A18", marginBottom: 2 }}>Hard bounce rate of 0.50% is approaching the 2% critical threshold</div>
              <div style={{ fontSize: 10, color: "#6B6B6B" }}>Suppress bounced addresses immediately after each send to protect sender reputation.</div>
            </div>
          </div>
          {/* Fade */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(transparent, #EDECEA)", pointerEvents: "none" }} />
        </div>
      </div>
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function Hero() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);
  const c1 = useCounter(44, go);
  const c2 = useCounter(35, go);
  const c3 = useCounter(3, go);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGo(true); obs.disconnect(); } }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section style={{ paddingTop: 144, paddingBottom: 80, background: "#F7F6F3", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(37,99,235,0.07), transparent)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", position: "relative" }}>

        {/* Badge */}
        <div className="reveal" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "6px 14px", marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563EB", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#2563EB" }}>Now in early access · SFMC and Braze</span>
        </div>

        {/* Headline */}
        <h1 className="reveal" style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 600, lineHeight: 1.15, margin: "0 auto 20px", letterSpacing: "-0.02em", maxWidth: 740 }}>
          <span style={{ color: "#1A1A18" }}>Your campaigns tell a story.</span><br />
          <span style={{ color: "#2563EB" }}>CampaignWise reads it for you.</span>
        </h1>

        {/* Sub */}
        <p className="reveal" style={{ fontSize: 18, color: "#6B7280", maxWidth: 580, margin: "0 auto 36px", lineHeight: 1.65 }}>
          The campaign intelligence platform for marketing operations teams running SFMC, Braze, HubSpot, and Klaviyo.
          Connect your CRM and data warehouse for complete revenue attribution. Surface the root cause of every
          campaign result and the precise actions to take next.
        </p>

        {/* CTAs */}
        <div className="reveal" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
          <a href="#contact" style={btn.primary}
            onMouseEnter={e => hoverPrimary(e.currentTarget as HTMLElement, true)}
            onMouseLeave={e => hoverPrimary(e.currentTarget as HTMLElement, false)}
            onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = "scale(0.98)"}
            onMouseUp={e => hoverPrimary(e.currentTarget as HTMLElement, true)}>
            Request early access <ArrowRight size={15} />
          </a>
          <a href="#product" style={{ ...btn.ghost, gap: 8 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.gap = "12px"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.gap = "8px"; }}>
            See how it works ↓
          </a>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="reveal" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          {[
            { n: c1, label: "insight rules" },
            { n: c2, label: "campaigns analyzed" },
            { n: c3, label: "diagnostic layers" },
          ].map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {i > 0 && <span style={{ color: "#D1D5DB" }}>·</span>}
              <span style={{ fontSize: 11, color: "#9B9B9B" }}>
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1A1A18", fontSize: 13 }}>{s.n}</span>{" "}{s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Mockup */}
        <div className="reveal"><Mockup /></div>
      </div>
    </section>
  );
}

// ─── PLATFORM STRIP ───────────────────────────────────────────────────────────

function PlatformStrip() {
  const Pill = ({ label }: { label: string }) => (
    <span style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", background: "#fff", border: "1px solid #E8E6E0", padding: "6px 12px", borderRadius: 8, whiteSpace: "nowrap" as const }}>
      {label}
    </span>
  );
  return (
    <section style={{ background: "#fff", borderTop: "1px solid #E8E6E0", borderBottom: "1px solid #E8E6E0", padding: "36px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ textAlign: "center", fontSize: 14, color: "#6B7280", fontWeight: 400, marginBottom: 24 }}>
          Built to connect with your entire marketing and data stack.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "MARKETING AUTOMATION", pills: ["Salesforce Marketing Cloud","Braze","HubSpot","Klaviyo","Marketo","Eloqua","Iterable","ActiveCampaign"] },
            { label: "CRM AND DATA", pills: ["Salesforce CRM","HubSpot CRM","Snowflake","Databricks","Google BigQuery","Amazon S3","Microsoft Dynamics"] },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#9B9B9B", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", minWidth: 140 }}>{row.label}</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {row.pills.map(p => <Pill key={p} label={p} />)}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#6B7280", marginTop: 20, lineHeight: 1.5 }}>
          Now MCP compatible. Connect any MCP-compliant marketing platform without custom integration code.
        </p>
      </div>
    </section>
  );
}

// ─── PROBLEM ──────────────────────────────────────────────────────────────────

const PROBLEMS = [
  { Icon: ImageOff, title: "Analytics is just a screenshot", body: "Most teams export a dashboard, paste it into a slide, and call it analysis. No trend data. No root cause. No action plan. A static export that is obsolete before the next campaign launches." },
  { Icon: Clock,    title: "2 to 6 hours per campaign review", body: "Post-send analysis is manual, repetitive, and inconsistent across teams. By the time the review is complete, the next campaign has already launched without the benefit of those findings." },
  { Icon: AlertCircle, title: "Platforms surface numbers, not answers", body: "Your marketing platform tells you what happened. It does not explain why your open rate declined 38 percent, or what your hard bounce rate means for inbox placement next quarter." },
];

function Problem() {
  return (
    <section id="product" style={{ padding: "96px 24px", background: "#F7F6F3", scrollMarginTop: 64 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <p className="reveal" style={{ fontSize: 11, fontWeight: 500, color: "#2563EB", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>The Problem</p>
          <h2 className="reveal" style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 600, color: "#1A1A18", maxWidth: 580, margin: "0 auto", lineHeight: 1.3 }}>
            Marketing ops teams are flying blind after every send.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20 }}>
          {PROBLEMS.map(({ Icon, title, body }) => (
            <div key={title} className="reveal" style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: 28, transition: "border-color 200ms ease, transform 200ms ease", cursor: "default" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(37,99,235,0.4)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E6E0"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <Icon size={22} style={{ color: "#2563EB" }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18", marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SOLUTION ─────────────────────────────────────────────────────────────────

const SOLUTIONS = [
  { Icon: Layers,    title: "Three diagnostic layers", body: "Delivery health, engagement quality, and execution logic are analyzed automatically across every campaign send. No configuration required." },
  { Icon: BarChart2, title: "Dual benchmarking",        body: "Every metric is benchmarked against your account history and industry averages in parallel. The context that makes every operational decision defensible." },
  { Icon: Zap,       title: "Specific, actionable findings", body: "Not a generic alert that open rate is low. A precise diagnosis: open rate declined 38 percent, this segment received four sends in 14 days, and the spam complaint rate has crossed the Gmail threshold. With the recommended corrective action." },
];

function Solution() {
  return (
    <section style={{ padding: "96px 24px", background: "#EFF6FF" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <p className="reveal" style={{ fontSize: 11, fontWeight: 500, color: "#2563EB", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>The Solution</p>
          <h2 className="reveal" style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 600, color: "#1A1A18", maxWidth: 640, margin: "0 auto", lineHeight: 1.3 }}>
            CampaignWise delivers senior analyst-quality diagnostics on every campaign, automatically.
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 700, margin: "0 auto" }}>
          {SOLUTIONS.map(({ Icon, title, body }) => (
            <div key={title} className="reveal" style={{ display: "flex", gap: 20, background: "#fff", border: "1px solid #BFDBFE", borderRadius: 12, padding: 24, transition: "border-color 200ms ease, transform 200ms ease", cursor: "default" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(37,99,235,0.5)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#BFDBFE"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={22} style={{ color: "#2563EB" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18", marginBottom: 6 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FEATURES ─────────────────────────────────────────────────────────────────

const FEATURES = [
  { Icon: FileText, title: "Campaign Health Score",      body: "A composite 0 to 100 score per campaign, weighted across delivery, engagement, and execution quality. Track performance trends over time and identify what is improving and what requires immediate attention." },
  { Icon: Shield,   title: "Deliverability Intelligence", body: "SPF, DKIM, DMARC, sender score, and blocklist status are verified automatically after every sync. Identify domain reputation risks before they affect inbox placement and pipeline." },
  { Icon: TrendingUp, title: "Revenue Impact",           body: "Connect Salesforce CRM to measure which campaigns influenced pipeline creation, generated opportunities, and contributed to closed revenue. Give marketing a seat at the revenue table.", soon: true },
  { Icon: Cpu,      title: "Intelligent Agents",          body: "Automated agents that suppress over-messaged segments, alert sales representatives when marketing is contacting accounts in active deals, and flag deliverability risks before the next send executes.", soon: true },
];

const CONNECTIONS = [
  { from: "SFMC", to: "Salesforce CRM", benefit: "Measure campaign influence on pipeline and closed revenue" },
  { from: "Braze", to: "Snowflake", benefit: "Run diagnostics directly against your data warehouse" },
  { from: "HubSpot", to: "BigQuery", benefit: "Unified attribution reporting across your full stack" },
];

function Features() {
  return (
    <section id="vision" style={{ padding: "96px 24px", background: "#F7F6F3", scrollMarginTop: 64 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <p className="reveal" style={{ fontSize: 11, fontWeight: 500, color: "#2563EB", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>What It Does</p>
          <h2 className="reveal" style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 600, color: "#1A1A18", maxWidth: 560, margin: "0 auto", lineHeight: 1.3 }}>
            From raw send data to analyst-quality insight, in seconds.
          </h2>
        </div>

        {/* 2×2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, marginBottom: 20 }}>
          {FEATURES.map(({ Icon, title, body, soon }) => (
            <div key={title} className="reveal" style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: 28, transition: "border-color 200ms ease, transform 200ms ease", cursor: "default" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(37,99,235,0.4)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E6E0"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={20} style={{ color: "#2563EB" }} />
                </div>
                {soon && <span style={{ fontSize: 10, fontWeight: 600, color: "#D97706", background: "#FFFBEB", border: "1px solid #FDE68A", padding: "3px 8px", borderRadius: 9999 }}>Coming soon</span>}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18", marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7 }}>{body}</p>
            </div>
          ))}
        </div>

        {/* Full-width 5th card */}
        <div className="reveal" style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: 28, transition: "border-color 200ms ease", cursor: "default" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(37,99,235,0.4)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E8E6E0"}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plug size={20} style={{ color: "#2563EB" }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18" }}>Connects to your entire stack</h3>
              </div>
              <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, marginBottom: 16 }}>
                CampaignWise is platform-agnostic by design. Connect your marketing automation platform,
                CRM, and data warehouse to create a unified intelligence layer across your entire stack.
                No migration. No new platforms to learn. Intelligence applied directly to your existing infrastructure.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Marketing Automation","CRM and Sales","Data Warehouse","Analytics"].map(p => (
                  <span key={p} style={{ fontSize: 12, fontWeight: 500, color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "5px 10px", borderRadius: 8 }}>{p}</span>
                ))}
              </div>
            </div>

            {/* Connection callouts */}
            <div style={{ flex: "1 1 280px", borderLeft: "1px solid #E8E6E0", paddingLeft: 24 }}>
              {CONNECTIONS.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < CONNECTIONS.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A18" }}>{c.from}</span>
                    <span style={{ color: "#2563EB" }}>+</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A18" }}>{c.to}</span>
                  </div>
                  <ChevronRight size={14} style={{ color: "#2563EB", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#6B7280" }}>{c.benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── VISION / ABOUT ───────────────────────────────────────────────────────────

const PHASES = [
  { phase: "Phase 1", title: "Campaign Intelligence",      body: "Connect SFMC or Braze. Receive automated diagnostic intelligence on every campaign send, from day one.",                       status: "Live now",  statusBg: "#DCFCE7", statusColor: "#16A34A", statusBorder: "#A7F3D0" },
  { phase: "Phase 2", title: "Revenue Attribution",        body: "Connect Salesforce or HubSpot CRM. Measure campaign influence on pipeline creation and contribution to closed revenue.",        status: "2026",      statusBg: "#FFFBEB", statusColor: "#D97706", statusBorder: "#FDE68A" },
  { phase: "Phase 3", title: "Data Warehouse Intelligence", body: "Connect Snowflake, BigQuery, or Databricks. Zero-copy architecture. Your data never leaves your infrastructure.",              status: "Roadmap",   statusBg: "#EFF6FF", statusColor: "#2563EB", statusBorder: "#BFDBFE" },
  { phase: "Phase 4", title: "Agentic Orchestration",      body: "Automated agents that execute on insights. Suppression workflows, real-time alerting, and coordinated action across marketing and sales.", status: "Future", statusBg: "rgba(255,255,255,0.08)", statusColor: "#94A3B8", statusBorder: "rgba(255,255,255,0.15)" },
];

function Vision() {
  return (
    <section id="about" style={{
      padding: "96px 24px", background: "#1B2B4B", position: "relative", scrollMarginTop: 64,
      backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
      backgroundSize: "48px 48px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Text block */}
        <div style={{ maxWidth: 680, marginBottom: 52 }}>
          <p className="reveal" style={{ fontSize: 11, fontWeight: 500, color: "#60A5FA", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>Our Vision</p>
          <h2 className="reveal" style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 600, color: "#fff", lineHeight: 1.25, marginBottom: 28 }}>
            We are building the revenue intelligence layer for marketing.
          </h2>
          {[
            "CampaignWise started with a single observation. Marketing teams at enterprise organizations spending six figures on automation platforms were still analyzing campaigns by exporting screenshots into PowerPoint.",
            "The root cause is structural. Platforms are built to execute campaigns, not to analyze them. CampaignWise is the intelligence layer that sits on top of your existing stack and surfaces what happened, why it happened, and the specific actions to take next.",
            "Built by a Salesforce Marketing Cloud architect with hands-on delivery experience across enterprise retail, automotive, and technology. CampaignWise encodes the diagnostic knowledge of a senior campaign analyst into a product that any marketing operations team can deploy and use on day one.",
          ].map((p, i) => (
            <p key={i} className="reveal" style={{ fontSize: 17, color: "#94A3B8", lineHeight: 1.75, marginBottom: 18 }}>{p}</p>
          ))}
        </div>

        {/* 2×2 phase cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          {PHASES.map(({ phase, title, body, status, statusBg, statusColor, statusBorder }) => (
            <div key={phase} className="reveal" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 24, transition: "border-color 200ms ease", cursor: "default" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)"}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#60A5FA", letterSpacing: "0.08em", textTransform: "uppercase" }}>{phase}</p>
                <span style={{ fontSize: 10, fontWeight: 600, color: statusColor, background: statusBg, border: `1px solid ${statusBorder}`, padding: "2px 8px", borderRadius: 9999 }}>{status}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── EARLY ACCESS FORM ────────────────────────────────────────────────────────

function EarlyAccess() {
  const [form, setForm] = useState({ name: "", email: "", company: "", platform: "", challenge: "" });
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const iStyle: React.CSSProperties = {
    width: "100%", height: 44, border: "1px solid #E8E6E0", borderRadius: 8,
    padding: "0 14px", fontSize: 14, color: "#1A1A18", background: "#fff",
    outline: "none", fontFamily: "var(--font-dm-sans)", boxSizing: "border-box",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#2563EB"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.10)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#E8E6E0"; e.target.style.boxShadow = "none";
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading"); setErrMsg("");
    try {
      const res = await fetch("/api/early-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error ?? "Something went wrong."); setStatus("error"); return; }
      setStatus("success");
    } catch { setErrMsg("Network error. Please try again."); setStatus("error"); }
  }

  return (
    <section id="contact" style={{ padding: "96px 24px", background: "#F7F6F3", scrollMarginTop: 64 }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="reveal" style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: 40 }}>
          {status === "success" ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <CheckCircle2 size={48} style={{ color: "#16A34A", margin: "0 auto 20px", display: "block" }} />
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A18", marginBottom: 10 }}>You are on the list.</h3>
              <p style={{ fontSize: 15, color: "#6B7280" }}>We will reach out personally within 48 hours.</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 11, fontWeight: 500, color: "#2563EB", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Early Access</p>
              <h2 style={{ fontSize: 28, fontWeight: 600, color: "#1A1A18", marginBottom: 10, lineHeight: 1.25 }}>Be first. Shape the product.</h2>
              <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 28, lineHeight: 1.65 }}>
                We are personally onboarding the first 20 accounts. Every customer receives a dedicated setup call and a complimentary campaign audit with the founder.
              </p>
              <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} required style={iStyle} onFocus={onFocus} onBlur={onBlur} />
                <input type="email" placeholder="Work email" value={form.email} onChange={e => setForm(f => ({...f,email:e.target.value}))} required style={iStyle} onFocus={onFocus} onBlur={onBlur} />
                <input placeholder="Company name" value={form.company} onChange={e => setForm(f => ({...f,company:e.target.value}))} required style={iStyle} onFocus={onFocus} onBlur={onBlur} />
                <select value={form.platform} onChange={e => setForm(f => ({...f,platform:e.target.value}))} required
                  style={{ ...iStyle, color: form.platform ? "#1A1A18" : "#9B9B9B", cursor: "pointer" }}
                  onFocus={onFocus} onBlur={onBlur}>
                  <option value="" disabled>Platform</option>
                  {["Salesforce Marketing Cloud","Braze","HubSpot","Klaviyo","Marketo","Eloqua","Iterable","Other"].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <textarea placeholder="Your biggest campaign challenge (optional). For example: our re-engagement campaigns consistently underperform but we cannot identify the root cause."
                  value={form.challenge} onChange={e => setForm(f => ({...f,challenge:e.target.value}))} rows={3}
                  style={{ ...iStyle, height: "auto", padding: "10px 14px", resize: "vertical", lineHeight: 1.5 } as React.CSSProperties}
                  onFocus={onFocus} onBlur={onBlur} />

                {status === "error" && errMsg && (
                  <p style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", padding: "10px 14px", borderRadius: 8, margin: 0 }}>{errMsg}</p>
                )}

                <button type="submit" disabled={status === "loading"}
                  style={{ width: "100%", height: 48, background: status === "loading" ? "#93C5FD" : "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: status === "loading" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "var(--font-dm-sans)", marginTop: 4, transition: "transform 150ms ease, box-shadow 150ms ease" }}
                  onMouseEnter={e => { if (status !== "loading") hoverPrimary(e.currentTarget as HTMLElement, true); }}
                  onMouseLeave={e => hoverPrimary(e.currentTarget as HTMLElement, false)}>
                  {status === "loading" ? (<><Loader2 size={16} className="animate-spin" /> Submitting…</>) : "Request early access →"}
                </button>
                <p style={{ fontSize: 11, color: "#9B9B9B", textAlign: "center", margin: 0 }}>
                  No outbound sequences. No sales pressure. A direct conversation about your campaigns.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function Footer() {
  const lnk: React.CSSProperties = { fontSize: 14, color: "#94A3B8", textDecoration: "none", display: "block", marginBottom: 10, transition: "color 100ms" };
  return (
    <footer style={{ background: "#1B2B4B", padding: "48px 24px", borderTop: "1px solid rgba(255,255,255,0.10)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 32 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Campaign<span style={{ color: "#60A5FA" }}>Wise</span></div>
          <div style={{ fontSize: 12, color: "#60A5FA", marginBottom: 16 }}>Know Why. Fix Fast.</div>
          <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>© 2026 SB Consulting. All rights reserved.<br />Built with ♥ in India</p>
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Product</p>
          {[["Features","#vision"],["Vision","#about"],["Early Access","#contact"]].map(([l,h]) => (
            <a key={l} href={h} style={lnk} onMouseEnter={e => (e.currentTarget.style.color="#fff")} onMouseLeave={e => (e.currentTarget.style.color="#94A3B8")}>{l}</a>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Legal</p>
          {[["Privacy Policy","#"],["Terms of Service","#"]].map(([l,h]) => (
            <a key={l} href={h} style={lnk} onMouseEnter={e => (e.currentTarget.style.color="#fff")} onMouseLeave={e => (e.currentTarget.style.color="#94A3B8")}>{l}</a>
          ))}
          <a href="#" style={{ ...lnk, display: "inline-flex", alignItems: "center", gap: 6 }}
            onMouseEnter={e => (e.currentTarget.style.color="#fff")} onMouseLeave={e => (e.currentTarget.style.color="#94A3B8")}>
            <ExternalLink size={14} /> LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  useScrollReveal();
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <PlatformStrip />
        <Problem />
        <Solution />
        <Features />
        <Vision />
        <EarlyAccess />
      </main>
      <Footer />
    </>
  );
}
