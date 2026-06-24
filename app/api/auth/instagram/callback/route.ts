import { NextResponse } from "next/server";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { publicUrl } from "@/lib/http/public-url";
import {
  exchangeInstagramLoginCode,
  exchangeInstagramLongLivedToken,
  fetchInstagramBusinessProfile,
  instagramLoginConfigStatus,
  instagramLoginScopes
} from "@/lib/platform/instagram/instagram";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const workspaceId = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDescription =
    url.searchParams.get("error_description") ?? url.searchParams.get("error_message") ?? url.searchParams.get("error_reason");

  if (errorParam) {
    return NextResponse.redirect(
      publicUrl(`/settings/integrations?instagram=error&message=${encodeURIComponent(errorDescription ?? errorParam)}`, request)
    );
  }
  if (!code || !workspaceId) {
    return NextResponse.redirect(
      publicUrl("/settings/integrations?instagram=error&message=Missing OAuth code or workspace state.", request)
    );
  }

  const status = instagramLoginConfigStatus();
  if (!status.configured) {
    return NextResponse.redirect(
      publicUrl(`/settings/integrations?instagram=error&message=${encodeURIComponent(`Missing ${status.missing.join(", ")}`)}`, request)
    );
  }

  try {
    const user = await getDemoUser();
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return NextResponse.redirect(publicUrl("/settings/integrations?instagram=error&message=Workspace not found.", request));
    }

    const shortToken = await exchangeInstagramLoginCode(code);
    const longToken = await exchangeInstagramLongLivedToken(shortToken.access_token);
    const profile = await fetchInstagramBusinessProfile(longToken.access_token, shortToken.user_id);
    const instagramUserId = profile.user_id ?? profile.id ?? String(shortToken.user_id ?? "");

    if (!instagramUserId) {
      throw new Error("Instagram profile did not return a user ID.");
    }

    const expiresAt =
      typeof longToken.expires_in === "number" ? new Date(Date.now() + longToken.expires_in * 1000) : null;
    const existing = await prisma.socialAccount.findFirst({
      where: {
        workspaceId,
        externalAccountId: instagramUserId,
        platform: { in: ["instagram", "instagram_account"] }
      }
    });

    await prisma.socialAccount.updateMany({
      where: { workspaceId, platform: { in: ["instagram", "instagram_account"] } },
      data: { platform: "instagram_account" }
    });

    const accountData = {
      workspaceId,
      platform: "instagram" as const,
      accountName: profile.username ?? instagramUserId,
      externalAccountId: instagramUserId,
      tokenEncrypted: longToken.access_token,
      tokenExpiresAt: expiresAt,
      scopes: {
        provider: "instagram_login",
        grantedScopes: shortToken.permissions ?? [],
        requestedScopes: instagramLoginScopes(),
        tokenType: longToken.token_type ?? null,
        accountType: profile.account_type ?? null,
        profileId: profile.id ?? null
      }
    };

    if (existing) {
      await prisma.socialAccount.update({ where: { id: existing.id }, data: accountData });
    } else {
      await prisma.socialAccount.create({ data: accountData });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId,
        action: "integration.instagram_login.connect",
        entityType: "Workspace",
        entityId: workspaceId,
        metadata: { instagramUserId, username: profile.username ?? null }
      }
    });

    return NextResponse.redirect(
      publicUrl(`/settings/integrations?instagram=connected&username=${encodeURIComponent(profile.username ?? "")}`, request)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Instagram Login connection failed.";
    return NextResponse.redirect(publicUrl(`/settings/integrations?instagram=error&message=${encodeURIComponent(message)}`, request));
  }
}
