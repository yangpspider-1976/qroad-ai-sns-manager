import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { fetchLinkedInstagramAccount, metaOAuthScopesFor } from "@/lib/platform/meta/facebook";

const refreshSchema = z.object({
  workspaceId: z.string()
});

export async function POST(request: Request) {
  const parsed = refreshSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const workspaceId = parsed.data.workspaceId;

  const facebookAccounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId,
      platform: { in: ["facebook", "facebook_page"] }
    },
    orderBy: { platform: "asc" }
  });

  if (facebookAccounts.length === 0) {
    return NextResponse.json({ error: "Connect a Facebook Page first, then refresh Instagram discovery." }, { status: 409 });
  }

  const user = await getDemoUser();
  const discovered = [];
  const errors = [];

  await prisma.socialAccount.updateMany({
    where: {
      workspaceId,
      platform: { in: ["instagram", "instagram_account"] }
    },
    data: { platform: "instagram_account" }
  });

  for (const page of facebookAccounts) {
    try {
      const instagram = await fetchLinkedInstagramAccount(page.externalAccountId, page.tokenEncrypted);
      if (!instagram) continue;

      const existing = await prisma.socialAccount.findFirst({
        where: {
          workspaceId,
          externalAccountId: instagram.id,
          platform: { in: ["instagram", "instagram_account"] }
        }
      });
      const accountData: {
        workspaceId: string;
        platform: string;
        accountName: string;
        externalAccountId: string;
        tokenEncrypted: string;
        tokenExpiresAt: Date | null;
        scopes: {
          requestedScopes: string[];
          pageId: string;
          pageName: string;
          source: string;
        };
      } = {
        workspaceId,
        platform: discovered.length === 0 ? "instagram" : "instagram_account",
        accountName: instagram.username ?? instagram.name ?? page.accountName,
        externalAccountId: instagram.id,
        tokenEncrypted: page.tokenEncrypted,
        tokenExpiresAt: page.tokenExpiresAt,
        scopes: {
          requestedScopes: metaOAuthScopesFor("instagram"),
          pageId: page.externalAccountId,
          pageName: page.accountName,
          source: "facebook_page_refresh"
        }
      };

      const account = existing
        ? await prisma.socialAccount.update({ where: { id: existing.id }, data: accountData })
        : await prisma.socialAccount.create({ data: accountData });
      discovered.push(account);
    } catch (error) {
      errors.push({
        pageId: page.externalAccountId,
        pageName: page.accountName,
        error: error instanceof Error ? error.message : "Unable to inspect Page."
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId,
      action: "integration.instagram.refresh",
      entityType: "Workspace",
      entityId: workspaceId,
      metadata: { discoveredCount: discovered.length, errors }
    }
  });

  return NextResponse.json({
    discoveredCount: discovered.length,
    accounts: discovered.map((account) => ({
      id: account.id,
      instagramId: account.externalAccountId,
      username: account.accountName,
      active: account.platform === "instagram",
      tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
      scopes: account.scopes
    })),
    errors
  });
}
