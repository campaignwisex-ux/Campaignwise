export interface SFMCCredentials {
  clientId: string;
  clientSecret: string;
  subdomain: string;
  accountId?: string | null;
}

export interface SFMCToken {
  accessToken: string;
  restInstanceUrl: string;
  soapInstanceUrl: string;
  expiresAt: number; // epoch ms
}

export interface SFMCAccountInfo {
  accountId: number;
  name: string;
  email: string;
}

// Raw shape returned by a single job/send from the Jobs API
export interface SFMCSendJob {
  id: number;           // JobID
  name: string;         // EmailName
  subject: string;      // Subject
  status: string;       // Status: "Sent" | "Sending" | "Scheduled" | "Cancelled" etc.
  sentDate: string;     // SendDate ISO string
  sentCount: number;
  deliveredCount: number;
  openCount: number;
  uniqueOpenCount: number;
  clickCount: number;
  uniqueClickCount: number;
  hardBounceCount: number;
  softBounceCount: number;
  unsubscribeCount: number;
  spamComplaintCount: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function getSFMCToken(creds: SFMCCredentials): Promise<SFMCToken> {
  const url = `https://${creds.subdomain}.auth.marketingcloudapis.com/v2/token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      ...(creds.accountId ? { account_id: creds.accountId } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new SFMCError(`Token exchange failed (${res.status}): ${text}`, res.status);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    restInstanceUrl: data.rest_instance_url,
    soapInstanceUrl: data.soap_instance_url,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

// ─── Connection test ──────────────────────────────────────────────────────────

export async function testSFMCConnection(
  creds: SFMCCredentials
): Promise<{ ok: true; accountId: number; name: string } | { ok: false; error: string }> {
  try {
    const token = await getSFMCToken(creds);

    // Verify token by calling the platform info endpoint
    const res = await fetch(`${token.restInstanceUrl}/platform/v1/accounts/me`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Auth succeeded but account fetch failed (${res.status}): ${text}` };
    }

    const account = await res.json();
    return { ok: true, accountId: account.id, name: account.name };
  } catch (err) {
    if (err instanceof SFMCError) return { ok: false, error: err.message };
    return { ok: false, error: String(err) };
  }
}

// ─── Send jobs (campaign list) ────────────────────────────────────────────────

export async function fetchSendJobs(
  token: SFMCToken,
  { page = 1, pageSize = 50 }: { page?: number; pageSize?: number } = {}
): Promise<{ jobs: SFMCSendJob[]; total: number }> {
  const url =
    `${token.restInstanceUrl}/data/v1/send?` +
    new URLSearchParams({
      $page: String(page),
      $pageSize: String(pageSize),
      $orderBy: "SendDate DESC",
    });

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new SFMCError(`fetchSendJobs failed (${res.status}): ${text}`, res.status);
  }

  const data = await res.json();
  const items: SFMCSendJob[] = (data.items ?? []).map(normalizeSendJob);
  return { jobs: items, total: data.total ?? items.length };
}

// ─── Per-job tracking summary ─────────────────────────────────────────────────

export async function fetchJobTracking(
  token: SFMCToken,
  jobId: number
): Promise<Omit<SFMCSendJob, "id" | "name" | "subject" | "status" | "sentDate">> {
  const url = `${token.restInstanceUrl}/data/v1/send/${jobId}/tracking/summary`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new SFMCError(`fetchJobTracking failed (${res.status}): ${text}`, res.status);
  }

  const d = await res.json();
  return {
    sentCount: d.sent ?? 0,
    deliveredCount: d.delivered ?? d.sent ?? 0,
    openCount: d.opens ?? 0,
    uniqueOpenCount: d.uniqueOpens ?? 0,
    clickCount: d.clicks ?? 0,
    uniqueClickCount: d.uniqueClicks ?? 0,
    hardBounceCount: d.hardBounces ?? 0,
    softBounceCount: d.softBounces ?? 0,
    unsubscribeCount: d.unsubscribes ?? 0,
    spamComplaintCount: d.complaints ?? 0,
  };
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class SFMCError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "SFMCError";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSendJob(raw: Record<string, unknown>): SFMCSendJob {
  return {
    id: Number(raw.id ?? raw.JobID ?? 0),
    name: String(raw.emailName ?? raw.EmailName ?? raw.name ?? ""),
    subject: String(raw.subject ?? raw.Subject ?? ""),
    status: String(raw.status ?? raw.Status ?? ""),
    sentDate: String(raw.sendDate ?? raw.SendDate ?? raw.sentDate ?? ""),
    sentCount: Number(raw.sent ?? raw.SentCount ?? 0),
    deliveredCount: Number(raw.delivered ?? raw.DeliveredCount ?? raw.sent ?? 0),
    openCount: Number(raw.opens ?? raw.OpenCount ?? 0),
    uniqueOpenCount: Number(raw.uniqueOpens ?? raw.UniqueOpenCount ?? 0),
    clickCount: Number(raw.clicks ?? raw.ClickCount ?? 0),
    uniqueClickCount: Number(raw.uniqueClicks ?? raw.UniqueClickCount ?? 0),
    hardBounceCount: Number(raw.hardBounces ?? raw.HardBounceCount ?? 0),
    softBounceCount: Number(raw.softBounces ?? raw.SoftBounceCount ?? 0),
    unsubscribeCount: Number(raw.unsubscribes ?? raw.UnsubscribeCount ?? 0),
    spamComplaintCount: Number(raw.complaints ?? raw.ComplaintCount ?? 0),
  };
}
