import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import {
  instagramLoginConfigStatus,
  instagramLoginPublishingReady,
  instagramLoginScopes
} from "@/lib/platform/instagram/instagram";
import {
  metaConfigStatus,
  metaFacebookLoginScopesFor,
  metaOAuthScopesFor
} from "@/lib/platform/meta/facebook";

const selectSchema = z.object({
  workspaceId: z.string(),
  accountId: z.string(),
  accountType: z.enum(["facebook", "instagram"]).default("facebook")
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

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

  return NextResponse.json({
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
  });
}

export async function POST(request: Request) {
  const parsed = selectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.socialAccount.findFirst({
    where: {
      id: parsed.data.accountId,
      workspaceId: parsed.data.workspaceId,
      platform: parsed.data.accountType === "instagram" ? { in: ["instagram", "instagram_account"] } : { in: ["facebook", "facebook_page"] }
    }
  });
  if (!account) {
    return NextResponse.json(
      { error: parsed.data.accountType === "instagram" ? "Instagram account connection not found." : "Facebook Page connection not found." },
      { status: 404 }
    );
  }

  const user = await getDemoUser();
  const activePlatform = parsed.data.accountType;
  const inactivePlatform = parsed.data.accountType === "instagram" ? "instagram_account" : "facebook_page";
  const platformSet =
    parsed.data.accountType === "instagram" ? ["instagram", "instagram_account"] : ["facebook", "facebook_page"];
  await prisma.$transaction([
    prisma.socialAccount.updateMany({
      where: {
        workspaceId: parsed.data.workspaceId,
        platform: { in: platformSet }
      },
      data: { platform: inactivePlatform }
    }),
    prisma.socialAccount.update({
      where: { id: account.id },
      data: { platform: activePlatform }
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId: parsed.data.workspaceId,
        action: parsed.data.accountType === "instagram" ? "integration.meta.select_instagram" : "integration.meta.select_page",
        entityType: "SocialAccount",
        entityId: account.id,
        metadata: { accountId: account.externalAccountId, accountName: account.accountName }
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}
