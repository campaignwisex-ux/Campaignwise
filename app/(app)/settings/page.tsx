"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, Zap, ExternalLink, AlertTriangle, Trash2, FlaskConical, RefreshCw } from "lucide-react";

interface Workspace { id: string; subdomain: string; client_id: string; bu_name: string | null; account_id: string | null; from_domain: string | null; is_active: boolean; last_synced_at: string | null; }
type SaveState = "idle" | "saving" | "saved" | "error";
type TestState = "idle" | "testing" | "ok" | "fail";
type SyncState = "idle" | "syncing" | "done" | "error";
type DisconnectState = "idle" | "confirming" | "disconnecting";

const input = "w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all";
const inputStyle = { border: "1px solid #E0DDD5", color: "#1A1A18" };
const label = "block text-[11px] font-medium tracking-[0.06em] uppercase mb-1.5";

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [subdomain, setSubdomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [buName, setBuName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [fromDomain, setFromDomain] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [testState, setTestState] = useState<TestState>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncResult, setSyncResult] = useState<{ campaignsSynced: number; healthScoresCalculated: number; insightsGenerated: number; deliverabilityChecked: boolean; errors: string[]; durationMs: number } | null>(null);
  const [disconnectState, setDisconnectState] = useState<DisconnectState>("idle");

  useEffect(() => {
    fetch("/api/workspace").then(r => r.json()).then(({ workspace: ws }) => {
      if (ws) { setWorkspace(ws); setSubdomain(ws.subdomain ?? ""); setClientId(ws.client_id ?? ""); setBuName(ws.bu_name ?? ""); setAccountId(ws.account_id ?? ""); setFromDomain(ws.from_domain ?? ""); }
    }).finally(() => setLoading(false));
  }, []);

  const canSave = subdomain.trim() && clientId.trim() && (clientSecret.trim() || workspace !== null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaveState("saving"); setSaveError("");
    try {
      const res = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain, client_id: clientId, client_secret: clientSecret, bu_name: buName, account_id: accountId, from_domain: fromDomain }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setWorkspace(data.workspace); setClientSecret(""); setSaveState("saved"); setTimeout(() => setSaveState("idle"), 3000);
    } catch (err) { setSaveError(err instanceof Error ? err.message : "Save failed"); setSaveState("error"); }
  }

  async function handleTest() {
    setTestState("testing"); setTestMessage("");
    try {
      const res = await fetch("/api/workspace/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clientSecret.trim() ? { subdomain, client_id: clientId, client_secret: clientSecret, account_id: accountId } : {}) });
      const data = await res.json();
      if (data.ok) { setTestState("ok"); setTestMessage(`Connected to account: ${data.name} (ID: ${data.accountId})`); }
      else { setTestState("fail"); setTestMessage(data.error ?? "Connection failed"); }
    } catch { setTestState("fail"); setTestMessage("Network error"); }
    setTimeout(() => setTestState("idle"), 8000);
  }

  async function handleSync() {
    setSyncState("syncing"); setSyncResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data); setSyncState(data.campaignsSynced > 0 || !data.errors?.length ? "done" : "error");
      if (workspace) setWorkspace({ ...workspace, last_synced_at: new Date().toISOString() });
    } catch { setSyncState("error"); setSyncResult({ campaignsSynced: 0, healthScoresCalculated: 0, insightsGenerated: 0, deliverabilityChecked: false, errors: ["Network error"], durationMs: 0 }); }
  }

  async function handleDisconnect() {
    if (disconnectState === "idle") { setDisconnectState("confirming"); return; }
    setDisconnectState("disconnecting");
    await fetch("/api/workspace", { method: "DELETE" });
    setWorkspace(null); setSubdomain(""); setClientId(""); setClientSecret(""); setBuName(""); setAccountId(""); setFromDomain("");
    setDisconnectState("idle");
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#EDECEA" }}>
      <Header title="Settings" subtitle="CampaignWise" />
      <main className="flex-1 px-8 py-8 max-w-3xl w-full mx-auto space-y-5">

        <div>
          <h2 className="text-[20px] font-semibold mb-1" style={{ color: "#1A1A18" }}>Integrations</h2>
          <p className="text-[14px]" style={{ color: "#63605B" }}>Connect your Salesforce Marketing Cloud account to start analysing campaigns.</p>
        </div>

        {/* SFMC Card */}
        <div className="card" style={{ padding: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #E0DDD5" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                <Zap size={14} style={{ color: "#2563EB" }} />
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "#1A1A18" }}>Salesforce Marketing Cloud</p>
                <p className="text-[12px]" style={{ color: "#9B9793" }}>OAuth server-to-server connected app</p>
              </div>
            </div>
            {loading ? <Loader2 size={13} style={{ color: "#9B9793" }} className="animate-spin" /> : (
              <div className="flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full"
                style={workspace ? { background: "#ECFDF3", color: "#15803D", border: "1px solid #BBF7D0" } : { background: "#EDECEA", color: "#9B9793", border: "1px solid #E0DDD5" }}>
                <span className={`w-1.5 h-1.5 rounded-full ${workspace ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                {workspace ? "Connected" : "Not connected"}
              </div>
            )}
          </div>

          {/* Help */}
          <div className="px-6 py-3 flex items-start gap-2.5" style={{ background: "#FEFCE8", borderBottom: "1px solid #FDE68A" }}>
            <AlertTriangle size={12} style={{ color: "#B45309" }} className="shrink-0 mt-0.5" />
            <p className="text-[12px]" style={{ color: "#63605B" }}>
              You need a <span style={{ color: "#1A1A18" }} className="font-medium">Server-to-Server OAuth connected app</span> in SFMC. Setup → Apps → API Integration.{" "}
              <a href="https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/setup-app-credentials.html" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium" style={{ color: "#2563EB" }}>
                Docs <ExternalLink size={9} />
              </a>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Subdomain */}
              <div className="sm:col-span-2">
                <label className={label} style={{ color: "#9B9793" }}>Subdomain <span style={{ color: "#B91C1C" }}>*</span></label>
                <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #E0DDD5" }}
                  onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(37,99,235,0.4)"}
                  onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = "#E0DDD5"}>
                  <span className="flex items-center px-3 text-[11px] shrink-0" style={{ background: "#EDECEA", color: "#9B9793", borderRight: "1px solid #E0DDD5" }}>https://</span>
                  <input type="text" value={subdomain} onChange={e => setSubdomain(e.target.value)} placeholder="mc563abc123def" required
                    className="flex-1 px-3 py-2.5 text-[13px] outline-none" style={{ background: "#F7F6F2", color: "#1A1A18" }} />
                  <span className="flex items-center px-3 text-[11px] shrink-0" style={{ background: "#EDECEA", color: "#9B9793", borderLeft: "1px solid #E0DDD5" }}>.auth.marketingcloudapis.com</span>
                </div>
              </div>

              <div>
                <label className={label} style={{ color: "#9B9793" }}>Client ID <span style={{ color: "#B91C1C" }}>*</span></label>
                <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxx" required
                  className={input} style={inputStyle}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = "rgba(37,99,235,0.4)"}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = "#E0DDD5"} />
              </div>

              <div>
                <label className={label} style={{ color: "#9B9793" }}>
                  Client Secret <span style={{ color: "#B91C1C" }}>*</span>
                  {workspace && <span className="ml-2 font-normal normal-case tracking-normal" style={{ color: "#15803D" }}>(saved)</span>}
                </label>
                <div className="relative">
                  <input type={showSecret ? "text" : "password"} value={clientSecret} onChange={e => setClientSecret(e.target.value)}
                    placeholder={workspace ? "••••••••••••" : "Enter client secret"} required={!workspace}
                    className={`${input} pr-9`} style={inputStyle}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = "rgba(37,99,235,0.4)"}
                    onBlur={e => (e.target as HTMLElement).style.borderColor = "#E0DDD5"} />
                  <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#9B9793" }}>
                    {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={label} style={{ color: "#9B9793" }}>Business Unit Name</label>
                <input type="text" value={buName} onChange={e => setBuName(e.target.value)} placeholder="e.g. Acme Corp"
                  className={input} style={inputStyle}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = "rgba(37,99,235,0.4)"}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = "#E0DDD5"} />
              </div>

              <div>
                <label className={label} style={{ color: "#9B9793" }}>Account ID (MID)</label>
                <input type="text" value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="e.g. 7280123"
                  className={input} style={inputStyle}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = "rgba(37,99,235,0.4)"}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = "#E0DDD5"} />
              </div>

              <div className="sm:col-span-2">
                <label className={label} style={{ color: "#9B9793" }}>From Domain</label>
                <input type="text" value={fromDomain} onChange={e => setFromDomain(e.target.value)} placeholder="e.g. mail.acmecorp.com"
                  className={input} style={inputStyle}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = "rgba(37,99,235,0.4)"}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = "#E0DDD5"} />
                <p className="mt-1.5 text-[11px]" style={{ color: "#9B9793" }}>Used for SPF / DKIM / DMARC checks. Found in SFMC Sender Authentication Package.</p>
              </div>
            </div>

            {saveState === "error" && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                <XCircle size={13} style={{ color: "#B91C1C" }} className="shrink-0" />
                <p className="text-[12px]" style={{ color: "#B91C1C" }}>{saveError}</p>
              </div>
            )}

            {(testState === "ok" || testState === "fail") && testMessage && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg"
                style={{ background: testState === "ok" ? "#ECFDF3" : "#FEF2F2", border: `1px solid ${testState === "ok" ? "#A7F3D0" : "#FECACA"}` }}>
                {testState === "ok" ? <CheckCircle2 size={13} style={{ color: "#15803D" }} /> : <XCircle size={13} style={{ color: "#B91C1C" }} />}
                <p className="text-[12px]" style={{ color: testState === "ok" ? "#15803D" : "#B91C1C" }}>{testMessage}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                {workspace && (
                  <button type="button" onClick={handleDisconnect} disabled={disconnectState === "disconnecting"}
                    className="flex items-center gap-2 text-[12px] font-medium px-4 py-2.5 rounded-lg transition-colors"
                    style={{ background: disconnectState === "confirming" ? "#FEF2F2" : "#EDECEA", border: `1px solid ${disconnectState === "confirming" ? "#FECACA" : "#E0DDD5"}`, color: disconnectState === "confirming" ? "#B91C1C" : "#9B9793" }}>
                    {disconnectState === "disconnecting" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    {disconnectState === "confirming" ? "Confirm disconnect" : "Disconnect"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleTest} disabled={!canSave || testState === "testing"}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-40"
                  style={{ background: "#EDECEA", border: "1px solid #E0DDD5", color: "#63605B" }}>
                  {testState === "testing" ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />}
                  {testState === "testing" ? "Testing…" : "Test connection"}
                </button>
                <button type="submit" disabled={!canSave || saveState === "saving"}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white disabled:opacity-50"
                  style={{ background: "#2563EB" }}>
                  {saveState === "saving" && <Loader2 size={12} className="animate-spin" />}
                  {saveState === "saved" && <CheckCircle2 size={12} />}
                  {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved!" : workspace ? "Update" : "Save & connect"}
                </button>
              </div>
            </div>
          </form>

          {workspace?.last_synced_at && (
            <div className="px-6 py-3" style={{ borderTop: "1px solid #E0DDD5", background: "#EDECEA" }}>
              <p className="text-[11px] font-mono" style={{ color: "#9B9793" }}>
                Last synced: {new Date(workspace.last_synced_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          )}
        </div>

        {/* Sync card */}
        {workspace && (
          <div className="card" style={{ padding: 0 }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #E0DDD5" }}>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "#1A1A18" }}>Data Sync</p>
                <p className="text-[12px] mt-0.5" style={{ color: "#9B9793" }}>Pull campaigns and tracking data from SFMC.</p>
              </div>
              <button onClick={handleSync} disabled={syncState === "syncing"}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium text-white disabled:opacity-60"
                style={{ background: "#2563EB" }}>
                <RefreshCw size={12} className={syncState === "syncing" ? "animate-spin" : ""} />
                {syncState === "syncing" ? "Syncing…" : "Sync now"}
              </button>
            </div>
            <div className="px-6 py-4">
              {syncState === "idle" && (
                <p className="text-[12px]" style={{ color: "#9B9793" }}>
                  {workspace.last_synced_at
                    ? `Last synced ${new Date(workspace.last_synced_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. Click Sync now to fetch the latest.`
                    : "No data synced yet. Click Sync now to import your SFMC campaigns."}
                </p>
              )}
              {syncState === "syncing" && (
                <div className="flex items-center gap-2 py-1">
                  <Loader2 size={13} style={{ color: "#2563EB" }} className="animate-spin shrink-0" />
                  <p className="text-[13px]" style={{ color: "#63605B" }}>Fetching campaigns and metrics from SFMC…</p>
                </div>
              )}
              {syncState === "done" && syncResult && (
                <div className="flex items-start gap-2.5 p-4 rounded-lg" style={{ background: "#ECFDF3", border: "1px solid #BBF7D0" }}>
                  <CheckCircle2 size={13} style={{ color: "#15803D" }} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: "#15803D" }}>
                      Sync complete — <span className="font-mono">{syncResult.campaignsSynced}</span> campaign{syncResult.campaignsSynced !== 1 ? "s" : ""} synced
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#63605B" }}>
                      <span className="font-mono">{syncResult.healthScoresCalculated}</span> health scores · <span className="font-mono">{syncResult.insightsGenerated}</span> insights{syncResult.deliverabilityChecked ? " · Deliverability checked" : ""} · <span className="font-mono">{(syncResult.durationMs / 1000).toFixed(1)}s</span>
                    </p>
                  </div>
                </div>
              )}
              {syncState === "error" && syncResult && (
                <div className="flex items-start gap-2.5 p-4 rounded-lg" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                  <XCircle size={13} style={{ color: "#B91C1C" }} className="shrink-0 mt-0.5" />
                  <p className="text-[12px]" style={{ color: "#B91C1C" }}>{syncResult.errors[0] ?? "Sync failed"}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
