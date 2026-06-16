import { NextResponse } from "next/server";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import {
  exchangeCodeForLongLivedToken,
  fetchManagedFacebookPages,
  metaConfigStatus,
  metaOAuthScopesFor
} from "@/lib/platform/meta/facebook";

function parseMetaState(state: string | null) {
  if (!state) return { workspaceId: null, intent: "facebook" as const };
  const [workspaceId, rawIntent] = state.split(":");
  return {
    workspaceId: workspaceId || null,
    intent: rawIntent === "instagram" ? ("instagram" as const) : ("facebook" as const)
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const { workspaceId, intent } = parseMetaState(url.searchParams.get("state"));
  const errorMessage = url.searchParams.get("error_message");

  if (errorMessage) {
    return NextResponse.redirect(new URL(`/settings/integrations?meta=error&message=${encodeURIComponent(errorMessage)}`, request.url));
  }
  if (!code || !workspaceId) {
    return NextResponse.redirect(new URL("/settings/integrations?meta=error&message=Missing OAuth code or workspace state.", request.url));
  }

  const status = metaConfigStatus();
  if (!status.configured) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?meta=error&message=${encodeURIComponent(`Missing ${status.missing.join(", ")}`)}`, request.url)
    );
  }

  try {
    const user = await getDemoUser();
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return NextResponse.redirect(new URL("/settings/integrations?meta=error&message=Workspace not found.", request.url));
    }

    const token = await exchangeCodeForLongLivedToken(code);
    const pages = await fetchManagedFacebookPages(token.accessToken, { includeInstagram: intent === "instagram" });
    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL("/settings/integrations?meta=error&message=No managed Facebook Pages were returned for this account.", request.url)
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
        new URL(
          "/settings/integrations?meta=error&message=No Instagram professional account was found on the selected Facebook Pages.",
          request.url
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
      new URL(`/settings/integrations?meta=connected&intent=${intent}&pages=${pages.length}&ig=${instagramCount}`, request.url)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta connection failed.";
    return NextResponse.redirect(new URL(`/settings/integrations?meta=error&message=${encodeURIComponent(message)}`, request.url));
  }
}
