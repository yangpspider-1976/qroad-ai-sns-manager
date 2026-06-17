import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { fetchTikTokCreatorInfo, uploadTikTokPhotoPost } from "@/lib/platform/tiktok/tiktok";

const publishSchema = z.object({
  postDraftId: z.string()
});

function absolutePublicUrl(pathOrUrl: string, requestUrl: string) {
  const appUrl = process.env.APP_URL || new URL(requestUrl).origin;
  const url = new URL(pathOrUrl, appUrl);
  if (url.protocol !== "https:") {
    throw new Error("TikTok image upload requires a public HTTPS image URL. Set APP_URL to your ngrok HTTPS URL while testing.");
  }
  if (["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("TikTok cannot pull localhost images. Set APP_URL to a public HTTPS URL and upload the image again if needed.");
  }
  return url.toString();
}

function buildTitle(draft: ReturnType<typeof mapPostDraft>) {
  return draft.imageText?.headline || draft.cta || "SNS post";
}

function buildDescription(draft: ReturnType<typeof mapPostDraft>) {
  return [draft.caption, draft.hashtags.join(" ")].filter(Boolean).join("\n\n");
}

function tiktokPostMode() {
  return process.env.TIKTOK_POST_MODE === "MEDIA_UPLOAD" ? "MEDIA_UPLOAD" : "DIRECT_POST";
}

function scopeList(scopes: unknown) {
  if (typeof scopes !== "object" || scopes === null || Array.isArray(scopes)) return [];
  const grantedScopes = (scopes as { grantedScopes?: unknown }).grantedScopes;
  if (Array.isArray(grantedScopes)) return grantedScopes.filter((scope): scope is string => typeof scope === "string");
  if (typeof grantedScopes === "string") {
    return grantedScopes
      .split(/[,\s]+/)
      .map((scope) => scope.trim())
      .filter(Boolean);
  }
  return [];
}

function preferredPrivacyLevel(options: string[]) {
  const configured = process.env.TIKTOK_PRIVACY_LEVEL?.trim();
  if (configured && options.includes(configured)) return configured;
  if (options.includes("SELF_ONLY")) return "SELF_ONLY";
  if (options.includes("PUBLIC_TO_EVERYONE")) return "PUBLIC_TO_EVERYONE";
  return options[0];
}

function explainTikTokError(message: string, imageUrl?: string) {
  if (message.toLowerCase().includes("url ownership verification")) {
    const origin = imageUrl ? new URL(imageUrl).origin : process.env.APP_URL;
    return `TikTok rejected the image URL because ${origin} is not verified in the TikTok developer app URL properties. Add the domain or URL prefix in TikTok Developer Portal, or use a verified permanent asset host.`;
  }
  if (message.toLowerCase().includes("content-sharing-guidelines")) {
    return "TikTok rejected the Direct Post request against its content sharing guidelines. For unaudited apps, use SELF_ONLY privacy and make sure the connected TikTok account is private while testing. After changing privacy or account visibility, try publishing again.";
  }
  return message;
}

export async function POST(request: Request) {
  const parsed = publishSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
  if (dbDraft.platform !== "tiktok") {
    return NextResponse.json({ error: "TikTok publishing only supports TikTok drafts." }, { status: 400 });
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
      platform: "tiktok"
    }
  });
  if (!account) {
    return NextResponse.json({ error: "Connect a TikTok account in Integrations before publishing." }, { status: 409 });
  }

  const asset = dbDraft.mediaAssets[0];
  if (!asset) {
    return NextResponse.json({ error: "Upload an image before publishing to TikTok." }, { status: 409 });
  }

  const draft = mapPostDraft(dbDraft);
  const user = await getDemoUser();
  const postMode = tiktokPostMode();
  const grantedScopes = scopeList(account.scopes);
  let imageUrl: string;

  try {
    imageUrl = absolutePublicUrl(asset.url, request.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "TikTok image URL validation failed.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  try {
    const title = buildTitle(draft);
    const description = buildDescription(draft);
    if (postMode === "DIRECT_POST" && !grantedScopes.includes("video.publish")) {
      throw new Error("TikTok Direct Post requires reconnecting TikTok with the video.publish scope.");
    }

    const creatorInfo = postMode === "DIRECT_POST" ? await fetchTikTokCreatorInfo(account.tokenEncrypted) : null;
    const privacyLevel =
      postMode === "DIRECT_POST" ? preferredPrivacyLevel(creatorInfo?.privacy_level_options ?? []) : undefined;

    if (postMode === "DIRECT_POST" && !privacyLevel) {
      throw new Error("TikTok did not return any valid privacy level options for Direct Post.");
    }

    const published = await uploadTikTokPhotoPost({
      accessToken: account.tokenEncrypted,
      title,
      description,
      imageUrls: [imageUrl],
      postMode,
      privacyLevel,
      disableComment: creatorInfo?.comment_disabled ?? false,
      autoAddMusic: process.env.TIKTOK_AUTO_ADD_MUSIC === "true",
      brandContentToggle: process.env.TIKTOK_BRAND_CONTENT === "true",
      brandOrganicToggle: process.env.TIKTOK_BRAND_ORGANIC === "true"
    });

    const [log] = await prisma.$transaction([
      prisma.publishLog.create({
        data: {
          postDraftId: draft.id,
          platform: "tiktok",
          platformPostId: published.publishId,
          status: "success",
          requestPayload: {
            live: true,
            provider: "tiktok",
            endpoint: "/v2/post/publish/content/init/",
            postMode,
            mediaType: "PHOTO",
            accountName: account.accountName,
            accountId: account.externalAccountId,
            title,
            description,
            imageUrls: [imageUrl],
            privacyLevel,
            creatorUsername: creatorInfo?.creator_username,
            creatorNickname: creatorInfo?.creator_nickname
          },
          responsePayload: published.raw as Prisma.InputJsonValue
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
          action: "publish.tiktok.success",
          entityType: "PostDraft",
          entityId: draft.id,
          metadata: { publishId: published.publishId, accountId: account.externalAccountId, postMode, privacyLevel }
        }
      })
    ]);

    return NextResponse.json({
      result: { ok: true, platformPostId: published.publishId },
      log
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "TikTok publishing failed.";
    const message = explainTikTokError(rawMessage, imageUrl);
    const [log] = await prisma.$transaction([
      prisma.publishLog.create({
        data: {
          postDraftId: draft.id,
          platform: "tiktok",
          status: "failed",
          requestPayload: {
            live: true,
            provider: "tiktok",
            endpoint: "/v2/post/publish/content/init/",
            postMode,
            mediaType: "PHOTO",
            accountName: account.accountName,
            accountId: account.externalAccountId,
            imageUrls: [imageUrl]
          },
          errorMessage: message
        }
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          workspaceId: draft.workspaceId,
          action: "publish.tiktok.failed",
          entityType: "PostDraft",
          entityId: draft.id,
          metadata: { error: message, accountId: account.externalAccountId }
        }
      })
    ]);

    return NextResponse.json({ error: message, log }, { status: 409 });
  }
}
