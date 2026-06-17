import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser, prisma } from "@/lib/db/prisma";

const byAccountSchema = z.object({
  workspaceId: z.string(),
  accountId: z.string()
});

const patchSchema = z.object({
  workspaceId: z.string(),
  accountId: z.string(),
  enabled: z.boolean()
});

export async function DELETE(request: Request) {
  const parsed = byAccountSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.socialAccount.findFirst({
    where: {
      id: parsed.data.accountId,
      workspaceId: parsed.data.workspaceId,
      platform: { in: ["instagram", "instagram_account"] }
    }
  });
  if (!account) {
    return NextResponse.json({ error: "Instagram account not found." }, { status: 404 });
  }

  const user = await getDemoUser();
  await prisma.$transaction([
    prisma.socialAccount.delete({ where: { id: account.id } }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId: parsed.data.workspaceId,
        action: "integration.instagram.disconnect",
        entityType: "SocialAccount",
        entityId: account.id,
        metadata: { instagramId: account.externalAccountId, username: account.accountName }
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.socialAccount.findFirst({
    where: {
      id: parsed.data.accountId,
      workspaceId: parsed.data.workspaceId,
      platform: { in: ["instagram", "instagram_account"] }
    }
  });
  if (!account) {
    return NextResponse.json({ error: "Instagram account not found." }, { status: 404 });
  }

  const existingScopes = (account.scopes as Record<string, unknown>) ?? {};
  const user = await getDemoUser();

  await prisma.$transaction([
    prisma.socialAccount.update({
      where: { id: account.id },
      data: { scopes: { ...existingScopes, enabled: parsed.data.enabled } }
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId: parsed.data.workspaceId,
        action: parsed.data.enabled ? "integration.instagram.enable" : "integration.instagram.disable",
        entityType: "SocialAccount",
        entityId: account.id,
        metadata: { instagramId: account.externalAccountId, username: account.accountName }
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}
