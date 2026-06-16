import { NextResponse } from "next/server";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { exchangeTikTokCode, fetchTikTokUserInfo, tiktokConfigStatus, tiktokOAuthScopes } from "@/lib/platform/tiktok/tiktok";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const workspaceId = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?tiktok=error&message=${encodeURIComponent(errorDescription ?? errorParam)}`,
        request.url
      )
    );
  }
  if (!code || !workspaceId) {
    return NextResponse.redirect(
      new URL("/settings/integrations?tiktok=error&message=Missing OAuth code or workspace state.", request.url)
    );
  }

  const status = tiktokConfigStatus();
  if (!status.configured) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?tiktok=error&message=${encodeURIComponent(`Missing ${status.missing.join(", ")}`)}`,
        request.url
      )
    );
  }

  try {
    const user = await getDemoUser();
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return NextResponse.redirect(
        new URL("/settings/integrations?tiktok=error&message=Workspace not found.", request.url)
      );
    }

    const token = await exchangeTikTokCode(code);
    const userInfo = await fetchTikTokUserInfo(token.access_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    const existing = await prisma.socialAccount.findFirst({
      where: {
        workspaceId,
        externalAccountId: token.open_id,
        platform: { in: ["tiktok", "tiktok_account"] }
      }
    });

    const accountData = {
      workspaceId,
      platform: "tiktok" as const,
      accountName: userInfo?.display_name ?? token.open_id,
      externalAccountId: token.open_id,
      tokenEncrypted: token.access_token,
      tokenExpiresAt: expiresAt,
      scopes: {
        grantedScopes: token.scope,
        requestedScopes: tiktokOAuthScopes(),
        refreshToken: token.refresh_token,
        refreshExpiresIn: token.refresh_expires_in
      }
    };

    await prisma.socialAccount.updateMany({
      where: { workspaceId, platform: { in: ["tiktok", "tiktok_account"] } },
      data: { platform: "tiktok_account" }
    });

    if (existing) {
      await prisma.socialAccount.update({ where: { id: existing.id }, data: accountData });
    } else {
      await prisma.socialAccount.create({ data: accountData });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId,
        action: "integration.tiktok.connect",
        entityType: "Workspace",
        entityId: workspaceId,
        metadata: { openId: token.open_id, displayName: userInfo?.display_name }
      }
    });

    const appUrl = process.env.APP_URL ?? `http://localhost:3000`;
    return NextResponse.redirect(
      new URL(`/settings/integrations?tiktok=connected&displayName=${encodeURIComponent(userInfo?.display_name ?? "")}`, appUrl)
    );
  } catch (error) {
    const appUrl = process.env.APP_URL ?? `http://localhost:3000`;
    const message = error instanceof Error ? error.message : "TikTok connection failed.";
    return NextResponse.redirect(
      new URL(`/settings/integrations?tiktok=error&message=${encodeURIComponent(message)}`, appUrl)
    );
  }
}
