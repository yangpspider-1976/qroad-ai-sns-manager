import { NextResponse } from "next/server";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { publicOrigin } from "@/lib/http/public-url";
import {
  instagramLoginPublishingReady,
  publishInstagramBusinessImagePost
} from "@/lib/platform/instagram/instagram";

const publishSchema = z.object({
  postDraftId: z.string()
});

function absolutePublicUrl(pathOrUrl: string, request: Request) {
  const url = new URL(pathOrUrl, publicOrigin(request));
  if (url.protocol !== "https:") {
    throw new Error("Instagram publishing requires a public HTTPS image URL. Localhost uploads can be reviewed but cannot be posted by Meta.");
  }
  if (["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Instagram publishing requires a public image URL. Localhost images are not reachable by Meta.");
  }
  return url.toString();
}

function isInstagramSupportedImage(url: string) {
  return /\.(jpe?g|png|webp)(?:\?|$)/i.test(url);
}

export async function POST(request: Request) {
  const parsed = publishSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!instagramLoginPublishingReady()) {
    return NextResponse.json(
      { error: "Instagram publishing needs INSTAGRAM_SCOPES to include instagram_business_basic and instagram_business_content_publish." },
      { status: 409 }
    );
  }

  const dbDraft = await prisma.postDraft.findUnique({
    where: { id: parsed.data.postDraftId },
    include: {
      mediaAssets: {
        where: { type: "image" },
        orderBy: { createdAt: "desc" }
      }
    }
  });
  if (!dbDraft) {
    return NextResponse.json({ error: "Post draft not found." }, { status: 404 });
  }
  if (dbDraft.platform !== "instagram") {
    return NextResponse.json({ error: "Live Instagram publishing only supports Instagram drafts." }, { status: 400 });
  }
  if (dbDraft.status !== "approved" && dbDraft.status !== "scheduled") {
    return NextResponse.json({ error: "Post must be approved before publishing." }, { status: 409 });
  }
  if (!dbDraft.caption.trim()) {
    return NextResponse.json({ error: "Caption is required." }, { status: 409 });
  }

  const account = await prisma.socialAccount.findFirst({
    where: {
      workspaceId: dbDraft.workspaceId,
      platform: "instagram"
    }
  });
  if (!account) {
    return NextResponse.json({ error: "Connect and select an Instagram account in Integrations before publishing." }, { status: 409 });
  }

  const accountScopes = (account.scopes as Record<string, unknown>) ?? {};
  if (accountScopes.enabled === false) {
    return NextResponse.json(
      { error: "This Instagram account is disabled for posting. Enable it in Integrations to publish." },
      { status: 409 }
    );
  }

  const publishableAssets = dbDraft.mediaAssets.filter((asset) => isInstagramSupportedImage(asset.url));
  if (!publishableAssets.length) {
    return NextResponse.json({ error: "Upload an image before publishing to Instagram." }, { status: 409 });
  }

  const draft = mapPostDraft(dbDraft);
  const user = await getDemoUser();
  let imageUrls: string[] = [];

  try {
    imageUrls = publishableAssets.map((a) => absolutePublicUrl(a.url, request));
    const published = await publishInstagramBusinessImagePost({
      postDraft: draft,
      instagramUserId: account.externalAccountId,
      accessToken: account.tokenEncrypted,
      imageUrls
    });

    const [log] = await prisma.$transaction([
      prisma.publishLog.create({
        data: {
          postDraftId: draft.id,
          platform: "instagram",
          platformPostId: published.id,
          status: "success",
          requestPayload: {
            live: true,
            provider: "meta",
            endpoint: "/media_publish",
            instagramUserId: account.externalAccountId,
            accountName: account.accountName,
            imageUrls,
            mediaType: published.mediaType,
            usedImageUrls: published.usedImageUrls
          },
          responsePayload: published
        }
      }),
      prisma.postDraft.update({
        where: { id: draft.id },
        data: { status: "published" }
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          workspaceId: draft.workspaceId,
          action: "publish.instagram.success",
          entityType: "PostDraft",
          entityId: draft.id,
          metadata: { platformPostId: published.id, instagramUserId: account.externalAccountId, mediaType: published.mediaType }
        }
      })
    ]);

    return NextResponse.json({
      result: { ok: true, platformPostId: published.id },
      log
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Instagram publishing failed.";
    const [log] = await prisma.$transaction([
      prisma.publishLog.create({
        data: {
          postDraftId: draft.id,
          platform: "instagram",
          status: "failed",
          requestPayload: {
            live: true,
            provider: "meta",
            endpoint: "/media_publish",
            instagramUserId: account.externalAccountId,
            accountName: account.accountName,
            imageUrls
          },
          errorMessage: message
        }
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          workspaceId: draft.workspaceId,
          action: "publish.instagram.failed",
          entityType: "PostDraft",
          entityId: draft.id,
          metadata: { error: message, instagramUserId: account.externalAccountId }
        }
      })
    ]);

    return NextResponse.json({ error: message, log }, { status: 409 });
  }
}
