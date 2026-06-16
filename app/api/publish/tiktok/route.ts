import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { uploadTikTokPhotoPost } from "@/lib/platform/tiktok/tiktok";

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

  try {
    const imageUrl = absolutePublicUrl(asset.url, request.url);
    const title = buildTitle(draft);
    const description = buildDescription(draft);
    const published = await uploadTikTokPhotoPost({
      accessToken: account.tokenEncrypted,
      title,
      description,
      imageUrls: [imageUrl]
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
            postMode: "MEDIA_UPLOAD",
            mediaType: "PHOTO",
            accountName: account.accountName,
            accountId: account.externalAccountId,
            title,
            description,
            imageUrls: [imageUrl]
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
          metadata: { publishId: published.publishId, accountId: account.externalAccountId, postMode: "MEDIA_UPLOAD" }
        }
      })
    ]);

    return NextResponse.json({
      result: { ok: true, platformPostId: published.publishId },
      log
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TikTok publishing failed.";
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
            postMode: "MEDIA_UPLOAD",
            mediaType: "PHOTO",
            accountName: account.accountName,
            accountId: account.externalAccountId
          },
          errorMessage: message
        }
      }),
      prisma.postDraft.update({
        where: { id: draft.id },
        data: { status: "failed" }
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
