import { cookies } from "next/headers";
import { IntegrationsClient } from "@/components/integrations-client";
import { mapBrandProfile } from "@/lib/db/mappers";
import { prisma } from "@/lib/db/prisma";
import {
  instagramLoginConfigStatus,
  instagramLoginPublishingReady,
  instagramLoginScopes
} from "@/lib/platform/instagram/instagram";
import {
  metaConfigStatus,
  metaFacebookLoginScopesFor,
  metaOAuthScopesFor,
} from "@/lib/platform/meta/facebook";
import { tiktokConfigStatus, tiktokOAuthScopes } from "@/lib/platform/tiktok/tiktok";
import type { Workspace } from "@/lib/types";

export const dynamic = "force-dynamic";

const selectedWorkspaceCookie = "qroad_selected_workspace_id";

async function getInitialWorkspaces(): Promise<Workspace[]> {
  const workspaces = await prisma.workspace.findMany({
    include: { brandProfile: true, owner: true },
    orderBy: { createdAt: "asc" }
  });

  return workspaces
    .filter((workspace) => workspace.brandProfile)
    .map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      timezone: workspace.timezone,
      status: workspace.status === "paused" ? "paused" : "active",
      ownerName: workspace.owner.name,
      brandProfile: mapBrandProfile(workspace.brandProfile!)
    }));
}

async function getInitialMetaAccounts(workspaceId: string) {
  const accounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId,
      platform: { in: ["facebook", "facebook_page", "instagram", "instagram_account"] }
    },
    orderBy: { createdAt: "asc" }
  });
  const status = metaConfigStatus();
  const instagramStatus = instagramLoginConfigStatus();
  const facebookAccounts = accounts.filter((account) => account.platform === "facebook" || account.platform === "facebook_page");
  const instagramAccounts = accounts.filter((account) => account.platform === "instagram" || account.platform === "instagram_account");

  return {
    configured: status.configured,
    missing: status.missing,
    requestedScopes: metaFacebookLoginScopesFor("facebook"),
    facebookScopes: metaFacebookLoginScopesFor("facebook"),
    instagramScopes: metaFacebookLoginScopesFor("instagram"),
    instagramStandaloneScopes: instagramLoginScopes(),
    instagramConfiguredScopes: metaOAuthScopesFor("instagram"),
    instagramMissing: instagramStatus.missing,
    instagramEnabled: instagramStatus.configured,
    instagramPublishingReady: instagramLoginPublishingReady(),
    accounts: facebookAccounts.map((account) => ({
      id: account.id,
      pageId: account.externalAccountId,
      pageName: account.accountName,
      active: account.platform === "facebook",
      tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
      scopes: account.scopes
    })),
    instagramAccounts: instagramAccounts.map((account) => {
      const scopesObj = (account.scopes as Record<string, unknown>) ?? {};
      return {
        id: account.id,
        instagramId: account.externalAccountId,
        username: account.accountName,
        active: account.platform === "instagram",
        enabled: scopesObj.enabled !== false,
        tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
        scopes: account.scopes
      };
    })
  };
}

async function getInitialTikTokAccounts(workspaceId: string) {
  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId, platform: { in: ["tiktok", "tiktok_account"] } },
    orderBy: { createdAt: "asc" }
  });
  const status = tiktokConfigStatus();
  return {
    configured: status.configured,
    missing: status.missing,
    scopes: tiktokOAuthScopes(),
    accounts: accounts.map((account) => ({
      id: account.id,
      openId: account.externalAccountId,
      displayName: account.accountName,
      active: account.platform === "tiktok",
      tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
      scopes: account.scopes
    }))
  };
}

export default async function IntegrationsPage() {
  const initialWorkspaces = await getInitialWorkspaces();
  const storedWorkspaceId = (await cookies()).get(selectedWorkspaceCookie)?.value;
  const initialSelectedWorkspaceId = initialWorkspaces.some((workspace) => workspace.id === storedWorkspaceId)
    ? storedWorkspaceId!
    : initialWorkspaces[0]?.id ?? "qroad-ph";
  const [initialMetaAccounts, initialTikTokAccounts] = await Promise.all([
    getInitialMetaAccounts(initialSelectedWorkspaceId),
    getInitialTikTokAccounts(initialSelectedWorkspaceId)
  ]);

  return (
    <IntegrationsClient
      initialMessage="Facebook can publish text now. Instagram publishing needs public asset hosting."
      initialMetaAccounts={initialMetaAccounts}
      initialTikTokAccounts={initialTikTokAccounts}
      initialSelectedWorkspaceId={initialSelectedWorkspaceId}
      initialWorkspaces={initialWorkspaces}
    />
  );
}
