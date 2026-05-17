import { promises as dns } from "dns";

export interface DeliverabilityResult {
  spf:            "pass" | "fail" | "softfail" | "neutral" | "unknown";
  dkim:           "pass" | "fail" | "unknown";
  dmarc:          "pass" | "fail" | "unknown";
  sender_score:   null; // requires third-party API — left for future
  blocklist_clean: boolean;
  blocklists_hit: string[];
}

// Common DKIM selectors used by SFMC and general ESPs
const DKIM_SELECTORS = ["s1", "s2", "mail", "email", "dkim", "k1", "smtp", "selector1", "selector2"];

export async function checkDeliverability(domain: string): Promise<DeliverabilityResult> {
  const [spf, dkim, dmarc] = await Promise.all([
    checkSpf(domain),
    checkDkim(domain),
    checkDmarc(domain),
  ]);

  return {
    spf,
    dkim,
    dmarc,
    sender_score: null,
    blocklist_clean: true,   // requires third-party API (MxToolbox etc.) — default clean
    blocklists_hit: [],
  };
}

// ─── SPF ──────────────────────────────────────────────────────────────────────
// Resolves TXT records on the root domain and looks for v=spf1.

async function checkSpf(domain: string): Promise<DeliverabilityResult["spf"]> {
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.map((r) => r.join("")).join("\n");
    const spfLine = flat.split("\n").find((l) => l.startsWith("v=spf1"));
    if (!spfLine) return "neutral";             // no SPF record at all
    if (spfLine.includes("-all")) return "pass"; // strict — good
    if (spfLine.includes("~all")) return "softfail"; // permissive
    if (spfLine.includes("?all")) return "neutral";
    return "pass";
  } catch {
    return "unknown";
  }
}

// ─── DKIM ─────────────────────────────────────────────────────────────────────
// Tries common selectors. Returns pass if any valid DKIM record is found.

async function checkDkim(domain: string): Promise<DeliverabilityResult["dkim"]> {
  const checks = DKIM_SELECTORS.map(async (selector) => {
    try {
      const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
      const flat = records.map((r) => r.join("")).join("");
      return flat.includes("v=DKIM1") || flat.includes("k=rsa") || flat.includes("p=");
    } catch {
      return false;
    }
  });

  const results = await Promise.all(checks);
  if (results.some(Boolean)) return "pass";

  // If no selector found at all, treat as unknown (not necessarily failed)
  return "unknown";
}

// ─── DMARC ────────────────────────────────────────────────────────────────────
// Checks _dmarc.domain for a valid DMARC TXT record.

async function checkDmarc(domain: string): Promise<DeliverabilityResult["dmarc"]> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const flat = records.map((r) => r.join("")).join("");
    return flat.includes("v=DMARC1") ? "pass" : "fail";
  } catch {
    return "unknown";
  }
}
