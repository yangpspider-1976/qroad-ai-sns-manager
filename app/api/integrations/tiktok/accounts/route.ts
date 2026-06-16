import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { tiktokConfigStatus, tiktokOAuthScopes } from "@/lib/platform/tiktok/tiktok";

const selectSchema = z.object({
  workspaceId: z.string(),
  accountId: z.string()
});

const deleteSchema = z.object({
  workspaceId: z.string(),
  accountId: z.string()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId, platform: { in: ["tiktok", "tiktok_account"] } },
    orderBy: { createdAt: "asc" }
  });
  const status = tiktokConfigStatus();

  return NextResponse.json({
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
      platform: { in: ["tiktok", "tiktok_account"] }
    }
  });
  if (!account) {
    return NextResponse.json({ error: "TikTok account not found." }, { status: 404 });
  }

  const user = await getDemoUser();
  await prisma.$transaction([
    prisma.socialAccount.updateMany({
      where: { workspaceId: parsed.data.workspaceId, platform: { in: ["tiktok", "tiktok_account"] } },
      data: { platform: "tiktok_account" }
    }),
    prisma.socialAccount.update({
      where: { id: account.id },
      data: { platform: "tiktok" }
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId: parsed.data.workspaceId,
        action: "integration.tiktok.select",
        entityType: "SocialAccount",
        entityId: account.id,
        metadata: { openId: account.externalAccountId, displayName: account.accountName }
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.socialAccount.findFirst({
    where: {
      id: parsed.data.accountId,
      workspaceId: parsed.data.workspaceId,
      platform: { in: ["tiktok", "tiktok_account"] }
    }
  });
  if (!account) {
    return NextResponse.json({ error: "TikTok account not found." }, { status: 404 });
  }

  const user = await getDemoUser();
  await prisma.$transaction([
    prisma.socialAccount.delete({ where: { id: account.id } }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId: parsed.data.workspaceId,
        action: "integration.tiktok.disconnect",
        entityType: "SocialAccount",
        entityId: account.id,
        metadata: { openId: account.externalAccountId, displayName: account.accountName }
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}
