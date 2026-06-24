import { NextResponse } from "next/server";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { publicUrl } from "@/lib/http/public-url";
import {
  exchangeCodeForLongLivedToken,
  fetchManagedFacebookPages,
  fetchMetaUserIdentity,
  metaConfigStatus,
  metaOAuthScopesFor,
  metaUsesBusinessLogin
} from "@/lib/platform/meta/facebook";

function parseMetaState(state: string | null) {
  if (!state) return { workspaceId: null, intent: "facebook" as const };
  const [workspaceId, rawIntent] = state.split(":");
  return {
    workspaceId: workspaceId || null,
    intent: rawIntent === "instagram" ? ("instagram" as const) : ("facebook" as const)
  };
}

function buildNoPagesMessage(url: URL, identity: { id: string; name: string } | null) {
  const grantedScopes = url.searchParams.get("granted_scopes");
  const deniedScopes = url.searchParams.get("denied_scopes");
  const details = [
    identity ? `Signed in as ${identity.name || identity.id}.` : null,
    grantedScopes ? `Granted scopes: ${grantedScopes}.` : null,
    deniedScopes ? `Denied scopes: ${deniedScopes}.` : null
  ].filter(Boolean);

  const guidance = metaUsesBusinessLogin()
    ? "In the Facebook dialog, pick the business portfolio and explicitly select the QROAD Philippines Page, and confirm the Login for Business configuration lists that Page as an asset with pages_show_list, pages_read_engagement, and pages_manage_posts."
    : "Sign in with a Facebook account that has an admin/editor role on the QROAD Philippines Page, and select that Page when the dialog asks which Pages to share. If the Meta app is still in Development mode, that account must also have a role (admin/developer/tester) on the app.";

  return ["No managed Facebook Pages were returned for this account.", ...details, guidance].join(" ");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const { workspaceId, intent } = parseMetaState(url.searchParams.get("state"));
  const errorMessage = url.searchParams.get("error_message");

  if (errorMessage) {
    return NextResponse.redirect(publicUrl(`/settings/integrations?meta=error&message=${encodeURIComponent(errorMessage)}`, request));
  }
  if (!code || !workspaceId) {
    return NextResponse.redirect(publicUrl("/settings/integrations?meta=error&message=Missing OAuth code or workspace state.", request));
  }

  const status = metaConfigStatus();
  if (!status.configured) {
    return NextResponse.redirect(
      publicUrl(`/settings/integrations?meta=error&message=${encodeURIComponent(`Missing ${status.missing.join(", ")}`)}`, request)
    );
  }

  try {
    const user = await getDemoUser();
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return NextResponse.redirect(publicUrl("/settings/integrations?meta=error&message=Workspace not found.", request));
    }

    const token = await exchangeCodeForLongLivedToken(code);
    const pages = await fetchManagedFacebookPages(token.accessToken, { includeInstagram: intent === "instagram" });
    if (pages.length === 0) {
      const identity = await fetchMetaUserIdentity(token.accessToken);
      return NextResponse.redirect(
        publicUrl(`/settings/integrations?meta=error&message=${encodeURIComponent(buildNoPagesMessage(url, identity))}`, request)
      );
    }

    const expiresAt = token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000) : null;
    if (intent === "facebook") {
      await prisma.socialAccount.updateMany({
        where: {
          workspaceId,
          platform: { in: ["facebook", "facebook_page"] }
        },
        data: { platform: "facebook_page" }
      });
    } else {
      await prisma.socialAccount.updateMany({
        where: {
          workspaceId,
          platform: { in: ["instagram", "instagram_account"] }
        },
        data: { platform: "instagram_account" }
      });
    }

    let instagramCount = 0;
    for (const [index, page] of pages.entries()) {
      const existingPage = await prisma.socialAccount.findFirst({
        where: {
          workspaceId,
          externalAccountId: page.id,
          platform: { in: ["facebook", "facebook_page"] }
        }
      });
      const pageData = {
        workspaceId,
        platform: intent === "facebook" && index === 0 ? "facebook" : existingPage?.platform ?? "facebook_page",
        accountName: page.name,
        externalAccountId: page.id,
        tokenEncrypted: page.access_token,
        tokenExpiresAt: expiresAt,
        scopes: {
          pageTasks: page.tasks ?? [],
          requestedScopes: metaOAuthScopesFor(intent),
          source: intent === "instagram" ? "instagram_connect" : "facebook_connect"
        }
      };
      if (existingPage) {
        await prisma.socialAccount.update({ where: { id: existingPage.id }, data: pageData });
      } else {
        await prisma.socialAccount.create({ data: pageData });
      }

      const linkedInstagram = page.instagram_business_account ?? page.connected_instagram_account;
      if (intent === "instagram" && linkedInstagram) {
        const instagram = linkedInstagram;
        const existingInstagram = await prisma.socialAccount.findFirst({
          where: {
            workspaceId,
            externalAccountId: instagram.id,
            platform: { in: ["instagram", "instagram_account"] }
          }
        });
        const instagramData = {
          workspaceId,
          platform: instagramCount === 0 ? "instagram" : "instagram_account",
          accountName: instagram.username ?? instagram.name ?? page.name,
          externalAccountId: instagram.id,
          tokenEncrypted: page.access_token,
          tokenExpiresAt: expiresAt,
          scopes: {
            requestedScopes: metaOAuthScopesFor("instagram"),
            pageId: page.id,
            pageName: page.name,
            pageTasks: page.tasks ?? []
          }
        };
        if (existingInstagram) {
          await prisma.socialAccount.update({ where: { id: existingInstagram.id }, data: instagramData });
        } else {
          await prisma.socialAccount.create({ data: instagramData });
        }
        instagramCount += 1;
      }
    }

    if (intent === "instagram" && instagramCount === 0) {
      return NextResponse.redirect(
        publicUrl(
          "/settings/integrations?meta=error&message=No Instagram professional account was found on the selected Facebook Pages.",
          request
        )
      );
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId,
        action: intent === "instagram" ? "integration.instagram.connect" : "integration.facebook.connect",
        entityType: "Workspace",
        entityId: workspaceId,
        metadata: { pageCount: pages.length, instagramCount }
      }
    });

    return NextResponse.redirect(
      publicUrl(`/settings/integrations?meta=connected&intent=${intent}&pages=${pages.length}&ig=${instagramCount}`, request)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta connection failed.";
    return NextResponse.redirect(publicUrl(`/settings/integrations?meta=error&message=${encodeURIComponent(message)}`, request));
  }
}
