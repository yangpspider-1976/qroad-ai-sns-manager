"use client";

import { Camera, Check, Music2, PlugZap, RefreshCcw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Notice, Panel, fieldNoteClass, sectionHeadingClass } from "@/components/ui";
import { useSelectedWorkspaceId } from "@/components/workspace-switcher";
import type { Workspace } from "@/lib/types";

type FacebookAccount = {
  id: string;
  pageId: string;
  pageName: string;
  active: boolean;
  tokenExpiresAt: string | null;
  scopes: unknown;
};

type InstagramAccount = {
  id: string;
  instagramId: string;
  username: string;
  active: boolean;
  tokenExpiresAt: string | null;
  scopes: unknown;
};

type TikTokAccount = {
  id: string;
  openId: string;
  displayName: string;
  active: boolean;
  tokenExpiresAt: string | null;
  scopes: unknown;
};

type TikTokAccountsData = {
  configured: boolean;
  missing: string[];
  scopes: string[];
  accounts: TikTokAccount[];
};

type MetaAccountsData = {
  configured: boolean;
  missing: string[];
  requestedScopes: string[];
  facebookScopes?: string[];
  instagramScopes?: string[];
  instagramStandaloneScopes?: string[];
  instagramConfiguredScopes?: string[];
  instagramMissing?: string[];
  instagramEnabled: boolean;
  instagramPublishingReady?: boolean;
  accounts: FacebookAccount[];
  instagramAccounts: InstagramAccount[];
};

type InstagramDiagnosticsPage = {
  pageId: string;
  pageName: string;
  active: boolean;
  ok: boolean;
  found: boolean;
  instagramId: string | null;
  username: string | null;
  returnedFields: string[];
  error: string | null;
  errorCode: number | null;
  errorSubcode: number | null;
  errorType: string | null;
  status: number | null;
  recommendation: string;
};

export function IntegrationsClient({
  initialMetaAccounts,
  initialTikTokAccounts,
  initialMessage,
  initialSelectedWorkspaceId,
  initialWorkspaces
}: {
  initialMetaAccounts: MetaAccountsData;
  initialTikTokAccounts: TikTokAccountsData;
  initialMessage: string;
  initialSelectedWorkspaceId: string;
  initialWorkspaces: Workspace[];
}) {
  const selectedWorkspaceId = useSelectedWorkspaceId(initialSelectedWorkspaceId);
  const [message, setMessage] = useState(initialMessage);
  const [configured, setConfigured] = useState(initialMetaAccounts.configured);
  const [missing, setMissing] = useState<string[]>(initialMetaAccounts.missing);
  const [facebookScopes, setFacebookScopes] = useState<string[]>(initialMetaAccounts.facebookScopes ?? initialMetaAccounts.requestedScopes);
  const [instagramScopes, setInstagramScopes] = useState<string[]>(initialMetaAccounts.instagramScopes ?? []);
  const [instagramStandaloneScopes, setInstagramStandaloneScopes] = useState<string[]>(initialMetaAccounts.instagramStandaloneScopes ?? []);
  const [instagramMissing, setInstagramMissing] = useState<string[]>(initialMetaAccounts.instagramMissing ?? []);
  const [instagramEnabled, setInstagramEnabled] = useState(initialMetaAccounts.instagramEnabled);
  const [instagramPublishingReady, setInstagramPublishingReady] = useState(Boolean(initialMetaAccounts.instagramPublishingReady));
  const [accounts, setAccounts] = useState<FacebookAccount[]>(initialMetaAccounts.accounts);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>(initialMetaAccounts.instagramAccounts);
  const [isRefreshingInstagram, setIsRefreshingInstagram] = useState(false);
  const [isDiagnosingInstagram, setIsDiagnosingInstagram] = useState(false);
  const [instagramDiagnostics, setInstagramDiagnostics] = useState<InstagramDiagnosticsPage[]>([]);
  const activeAccount = accounts.find((account) => account.active);
  const activeInstagramAccount = instagramAccounts.find((account) => account.active);

  const [tiktokConfigured, setTiktokConfigured] = useState(initialTikTokAccounts.configured);
  const [tiktokMissing, setTiktokMissing] = useState<string[]>(initialTikTokAccounts.missing);
  const [tiktokScopes, setTiktokScopes] = useState<string[]>(initialTikTokAccounts.scopes);
  const [tiktokAccounts, setTiktokAccounts] = useState<TikTokAccount[]>(initialTikTokAccounts.accounts);
  const activeTikTokAccount = tiktokAccounts.find((a) => a.active);

  async function loadMetaAccounts() {
    const response = await fetch(`/api/integrations/meta/accounts?workspaceId=${selectedWorkspaceId}`);
    if (!response.ok) return;
    const data = await response.json();
    setConfigured(Boolean(data.configured));
    setMissing(Array.isArray(data.missing) ? data.missing : []);
    setFacebookScopes(Array.isArray(data.facebookScopes) ? data.facebookScopes : Array.isArray(data.requestedScopes) ? data.requestedScopes : []);
    setInstagramScopes(Array.isArray(data.instagramScopes) ? data.instagramScopes : []);
    setInstagramStandaloneScopes(Array.isArray(data.instagramStandaloneScopes) ? data.instagramStandaloneScopes : []);
    setInstagramMissing(Array.isArray(data.instagramMissing) ? data.instagramMissing : []);
    setInstagramEnabled(Boolean(data.instagramEnabled));
    setInstagramPublishingReady(Boolean(data.instagramPublishingReady));
    setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
    setInstagramAccounts(Array.isArray(data.instagramAccounts) ? data.instagramAccounts : []);
  }

  async function loadTikTokAccounts() {
    const response = await fetch(`/api/integrations/tiktok/accounts?workspaceId=${selectedWorkspaceId}`);
    if (!response.ok) return;
    const data = await response.json();
    setTiktokConfigured(Boolean(data.configured));
    setTiktokMissing(Array.isArray(data.missing) ? data.missing : []);
    setTiktokScopes(Array.isArray(data.scopes) ? data.scopes : []);
    setTiktokAccounts(Array.isArray(data.accounts) ? data.accounts : []);
  }

  useEffect(() => {
    void loadMetaAccounts();
    void loadTikTokAccounts();
  }, [selectedWorkspaceId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const meta = params.get("meta");
    if (meta === "connected") {
      const intent = params.get("intent") ?? "facebook";
      const pages = params.get("pages") ?? "0";
      const ig = params.get("ig") ?? "0";
      setMessage(
        intent === "instagram"
          ? `Connected Instagram and loaded ${ig} professional account${ig === "1" ? "" : "s"}.`
          : `Connected Facebook and loaded ${pages} Page${pages === "1" ? "" : "s"}.`
      );
      void loadMetaAccounts();
    }
    if (meta === "error") {
      setMessage(params.get("message") ?? "Meta connection failed.");
    }
    const instagram = params.get("instagram");
    if (instagram === "connected") {
      const username = params.get("username") ?? "";
      setMessage(`Instagram connected${username ? ` as @${username}` : ""}.`);
      void loadMetaAccounts();
    }
    if (instagram === "error") {
      setMessage(params.get("message") ?? "Instagram connection failed.");
    }
    const tiktok = params.get("tiktok");
    if (tiktok === "connected") {
      const displayName = params.get("displayName") ?? "";
      setMessage(`TikTok connected${displayName ? ` as ${displayName}` : ""}.`);
      void loadTikTokAccounts();
    }
    if (tiktok === "error") {
      setMessage(params.get("message") ?? "TikTok connection failed.");
    }
  }, []);

  async function deleteTikTokAccount(accountId: string) {
    const response = await fetch("/api/integrations/tiktok/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: selectedWorkspaceId, accountId })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error ?? "Unable to disconnect TikTok account.");
      return;
    }
    setMessage("TikTok account disconnected.");
    await loadTikTokAccounts();
  }

  async function selectTikTokAccount(accountId: string) {
    const response = await fetch("/api/integrations/tiktok/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: selectedWorkspaceId, accountId })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error ?? "Unable to select TikTok account.");
      return;
    }
    setMessage("Selected TikTok account for this workspace.");
    await loadTikTokAccounts();
  }

  async function selectMetaAccount(accountId: string, accountType: "facebook" | "instagram") {
    const response = await fetch("/api/integrations/meta/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: selectedWorkspaceId, accountId, accountType })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error ?? "Unable to select Meta account.");
      return;
    }
    setMessage(accountType === "instagram" ? "Selected Instagram account for this workspace." : "Selected Facebook Page for this workspace.");
    await loadMetaAccounts();
  }

  async function refreshInstagramAccounts() {
    setIsRefreshingInstagram(true);
    const response = await fetch("/api/integrations/meta/instagram/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: selectedWorkspaceId })
    });
    const result = await response.json().catch(() => ({}));
    setIsRefreshingInstagram(false);
    if (!response.ok) {
      setMessage(result.error ?? "Unable to refresh Instagram accounts.");
      return;
    }
    await loadMetaAccounts();
    const count = Number(result.discoveredCount ?? 0);
    const errors = Array.isArray(result.errors) ? result.errors : [];
    const errorSummary =
      errors.length > 0
        ? ` ${errors
            .map((error: { pageName?: string; error?: string }) => `${error.pageName ?? "Page"}: ${error.error ?? "Unable to inspect Page."}`)
            .join(" ")}`
        : "";
    setMessage(
      count > 0
        ? `Found ${count} Instagram professional account${count === 1 ? "" : "s"} from connected Facebook Pages.`
        : `No Instagram professional account was found on the connected Facebook Pages.${errorSummary}`
    );
  }

  async function runInstagramDiagnostics() {
    setIsDiagnosingInstagram(true);
    const response = await fetch("/api/integrations/meta/instagram/diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: selectedWorkspaceId })
    });
    const result = await response.json().catch(() => ({}));
    setIsDiagnosingInstagram(false);
    if (!response.ok) {
      setMessage(result.error ?? "Unable to run Instagram diagnostics.");
      return;
    }

    const pages = Array.isArray(result.pages) ? result.pages : [];
    setInstagramDiagnostics(pages);
    const foundCount = Number(result.foundCount ?? 0);
    setMessage(
      foundCount > 0
        ? `Instagram is visible from ${foundCount} connected Facebook Page${foundCount === 1 ? "" : "s"}. Click Find from Pages to save it.`
        : "Diagnostics finished: Meta did not return an Instagram account from the connected Facebook Page token."
    );
  }

  return (
    <Shell
      title="Integrations"
      subtitle="Official API connection status, mock mode, and live-publishing readiness."
      initialSelectedWorkspaceId={initialSelectedWorkspaceId}
      initialWorkspaces={initialWorkspaces}
    >
      <Panel>
        <div className={sectionHeadingClass}>
          <div>
            <h2 className="m-0 text-lg font-bold">Platform Adapters</h2>
            <p className={fieldNoteClass}>The same workflow can use mock, Meta, or TikTok adapters behind one interface.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[921px]:grid-cols-4">
          <div className="rounded-lg border border-line bg-white p-3.5">
            <span className="inline-flex min-h-6 items-center rounded-full bg-[#dcfce7] px-2 py-[3px] text-xs font-bold text-ok">Enabled</span>
            <h2 className="text-lg font-bold">Mock Publisher</h2>
            <p>Creates fake platform post IDs and publish logs without calling live APIs.</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-3.5">
            <span
              className={`inline-flex min-h-6 items-center rounded-full px-2 py-[3px] text-xs font-bold ${
                activeAccount ? "bg-[#dcfce7] text-ok" : configured ? "bg-[#dbeafe] text-accent" : "bg-[#fef3c7] text-warn"
              }`}
            >
              {activeAccount ? "Connected" : configured ? "Ready to connect" : "Needs env"}
            </span>
            <h2 className="text-lg font-bold">Facebook Pages</h2>
            <p>Connect managed Facebook Pages for text publishing through Publish now.</p>
            <Button
              disabled={!configured}
              onClick={() => {
                window.location.href = `/api/auth/meta/connect?workspaceId=${selectedWorkspaceId}&intent=facebook`;
              }}
              type="button"
            >
              <PlugZap size={16} /> Connect Facebook
            </Button>
            {!configured ? <p className={fieldNoteClass}>Missing: {missing.join(", ") || "Meta environment variables"}</p> : null}
            {configured ? <p className={fieldNoteClass}>Scopes: {facebookScopes.join(", ")}</p> : null}
          </div>
          <div className="rounded-lg border border-line bg-white p-3.5">
            <span
              className={`inline-flex min-h-6 items-center rounded-full px-2 py-[3px] text-xs font-bold ${
                activeInstagramAccount ? "bg-[#dcfce7] text-ok" : instagramEnabled && configured ? "bg-[#dbeafe] text-accent" : "bg-[#fef3c7] text-warn"
              }`}
            >
              {activeInstagramAccount ? "Connected" : instagramEnabled ? "Ready to connect" : "Needs env"}
            </span>
            <h2 className="text-lg font-bold">Instagram Professional</h2>
            <p>Connect directly with Instagram Login for Business. Facebook Page discovery is not required for this flow.</p>
            <Button
              disabled={!instagramEnabled}
              onClick={() => {
                window.location.href = `/api/auth/instagram/connect?workspaceId=${selectedWorkspaceId}`;
              }}
              type="button"
            >
              <Camera size={16} /> Connect Instagram
            </Button>
            {!instagramEnabled ? (
              <p className={fieldNoteClass}>Missing: {instagramMissing.join(", ") || "Instagram Login environment variables"}</p>
            ) : null}
            {instagramEnabled && instagramStandaloneScopes.length > 0 ? (
              <p className={fieldNoteClass}>Scopes: {instagramStandaloneScopes.join(", ")}</p>
            ) : null}
            {activeInstagramAccount ? (
              <p className={fieldNoteClass}>
                Publishing: {instagramPublishingReady ? "Ready" : "Needs approved Instagram publishing scope and public HTTPS media URLs"}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-line bg-white p-3.5">
            <span
              className={`inline-flex min-h-6 items-center rounded-full px-2 py-[3px] text-xs font-bold ${
                activeTikTokAccount ? "bg-[#dcfce7] text-ok" : tiktokConfigured ? "bg-[#dbeafe] text-accent" : "bg-[#fef3c7] text-warn"
              }`}
            >
              {activeTikTokAccount ? "Connected" : tiktokConfigured ? "Ready to connect" : "Needs env"}
            </span>
            <h2 className="text-lg font-bold">TikTok Posting API</h2>
            <p>Connect a TikTok account for draft upload. Direct post requires Content Posting API approval.</p>
            {tiktokConfigured ? (
              <Button
                onClick={() => { window.location.href = `/api/auth/tiktok/connect?workspaceId=${selectedWorkspaceId}`; }}
                type="button"
              >
                <Music2 size={16} /> Connect TikTok
              </Button>
            ) : (
              <Button
                onClick={() => setMessage("Add TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, and TIKTOK_REDIRECT_URI to your .env to enable TikTok connection.")}
                type="button"
                variant="secondary"
              >
                <ShieldAlert size={16} /> Review requirements
              </Button>
            )}
            {!tiktokConfigured ? <p className={fieldNoteClass}>Missing: {tiktokMissing.join(", ") || "TikTok environment variables"}</p> : null}
            {tiktokConfigured ? <p className={fieldNoteClass}>Scopes: {tiktokScopes.join(", ")}</p> : null}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 min-[921px]:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-3.5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-bold">Connected Facebook Pages</h2>
              <p className={fieldNoteClass}>Only the selected Page is used by Publish now.</p>
            </div>
            <Button onClick={() => void loadMetaAccounts()} type="button" variant="secondary">
              <RefreshCcw size={16} /> Refresh
            </Button>
          </div>
          {accounts.length > 0 ? (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-[#f8fafc] px-3 py-2"
                  key={account.id}
                >
                  <div>
                    <div className="font-semibold">{account.pageName}</div>
                    <div className={fieldNoteClass}>Page ID: {account.pageId}</div>
                  </div>
                  {account.active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-1 text-xs font-bold text-ok">
                      <Check size={14} /> Selected
                    </span>
                  ) : (
                    <Button onClick={() => void selectMetaAccount(account.id, "facebook")} type="button" variant="secondary">
                      Select Page
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-muted">No Facebook Pages connected for this workspace yet.</p>
          )}
        </div>
        <div className="rounded-lg border border-line bg-white p-3.5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-bold">Connected Instagram Accounts</h2>
              <p className={fieldNoteClass}>Direct Instagram Login accounts used for image publishing.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex min-h-6 items-center rounded-full px-2 py-[3px] text-xs font-bold ${
                  activeInstagramAccount ? "bg-[#dcfce7] text-ok" : "bg-[#fef3c7] text-warn"
                }`}
              >
                {activeInstagramAccount ? "Connected" : "Needs connection"}
              </span>
              <Button onClick={() => void loadMetaAccounts()} type="button" variant="secondary">
                <RefreshCcw size={16} /> Refresh
              </Button>
            </div>
          </div>
          {instagramAccounts.length > 0 ? (
            <div className="space-y-2">
              {instagramAccounts.map((account) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-[#f8fafc] px-3 py-2"
                  key={account.id}
                >
                  <div>
                    <div className="font-semibold">@{account.username}</div>
                    <div className={fieldNoteClass}>Instagram ID: {account.instagramId}</div>
                  </div>
                  {account.active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-1 text-xs font-bold text-ok">
                      <Check size={14} /> Selected
                    </span>
                  ) : (
                    <Button onClick={() => void selectMetaAccount(account.id, "instagram")} type="button" variant="secondary">
                      Select account
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="m-0 text-muted">No Instagram account connected for this workspace yet.</p>
              <p className={`${fieldNoteClass} mt-2`}>
                Add Instagram Login credentials in your .env, then click Connect Instagram above.
              </p>
            </div>
          )}
          {instagramDiagnostics.length > 0 ? (
            <div className="mt-3 space-y-2">
              {instagramDiagnostics.map((page) => (
                <div className="rounded-lg border border-line bg-[#f8fafc] px-3 py-2" key={page.pageId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">{page.pageName}</div>
                    <span
                      className={`inline-flex min-h-6 items-center rounded-full px-2 py-[3px] text-xs font-bold ${
                        page.found ? "bg-[#dcfce7] text-ok" : page.ok ? "bg-[#fef3c7] text-warn" : "bg-[#fee2e2] text-danger"
                      }`}
                    >
                      {page.found ? "IG found" : page.ok ? "No IG field" : "API error"}
                    </span>
                  </div>
                  <p className={`${fieldNoteClass} mt-1`}>
                    Returned fields: {page.returnedFields.length > 0 ? page.returnedFields.join(", ") : "none"}
                  </p>
                  {page.username ? <p className={`${fieldNoteClass} mt-1`}>Instagram: @{page.username}</p> : null}
                  {page.error ? (
                    <p className={`${fieldNoteClass} mt-1`}>
                      Error: {page.error}
                      {page.errorCode ? ` (code ${page.errorCode}${page.errorSubcode ? `, subcode ${page.errorSubcode}` : ""})` : ""}
                    </p>
                  ) : null}
                  <p className={`${fieldNoteClass} mt-1`}>{page.recommendation}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="rounded-lg border border-line bg-white p-3.5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg font-bold">Connected TikTok Accounts</h2>
                <p className={fieldNoteClass}>Draft upload mode only. Direct post requires Content Posting API approval from TikTok.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex min-h-6 items-center rounded-full px-2 py-0.75 text-xs font-bold ${
                    activeTikTokAccount ? "bg-[#dcfce7] text-ok" : "bg-[#fef3c7] text-warn"
                  }`}
                >
                  {activeTikTokAccount ? "Connected" : "Needs connection"}
                </span>
                <Button onClick={() => void loadTikTokAccounts()} type="button" variant="secondary">
                  <RefreshCcw size={16} /> Refresh
                </Button>
              </div>
            </div>
            {tiktokAccounts.length > 0 ? (
              <div className="space-y-2">
                {tiktokAccounts.map((account) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-[#f8fafc] px-3 py-2"
                    key={account.id}
                  >
                    <div>
                      <div className="font-semibold">{account.displayName}</div>
                      <div className={fieldNoteClass}>Open ID: {account.openId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-1 text-xs font-bold text-ok">
                          <Check size={14} /> Selected
                        </span>
                      ) : (
                        <Button onClick={() => void selectTikTokAccount(account.id)} type="button" variant="secondary">
                          Select account
                        </Button>
                      )}
                      <Button
                        onClick={() => { if (confirm(`Disconnect ${account.displayName} from this workspace?`)) void deleteTikTokAccount(account.id); }}
                        type="button"
                        variant="secondary"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="m-0 text-muted">No TikTok account connected for this workspace yet.</p>
                <p className={`${fieldNoteClass} mt-2`}>
                  Add TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, and TIKTOK_REDIRECT_URI to your .env, then click Connect TikTok above.
                </p>
              </div>
            )}
          </div>
        </div>
        <Notice className="mt-4">{message}</Notice>
      </Panel>
    </Shell>
  );
}
