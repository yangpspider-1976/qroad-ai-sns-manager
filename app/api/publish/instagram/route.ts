import { NextResponse } from "next/server";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import {
  instagramLoginPublishingReady,
  publishInstagramBusinessImagePost
} from "@/lib/platform/instagram/instagram";

const publishSchema = z.object({
  postDraftId: z.string()
});

function absolutePublicUrl(pathOrUrl: string, requestUrl: string) {
  const appUrl = process.env.APP_URL || new URL(requestUrl).origin;
  const url = new URL(pathOrUrl, appUrl);
  if (url.protocol !== "https:") {
    throw new Error("Instagram publishing requires a public HTTPS image URL. Localhost uploads can be reviewed but cannot be posted by Meta.");
  }
  if (["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Instagram publishing requires a public image URL. Localhost images are not reachable by Meta.");
  }
  return url.toString();
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

  const asset = dbDraft.mediaAssets[0];
  if (!asset) {
    return NextResponse.json({ error: "Upload an image before publishing to Instagram." }, { status: 409 });
  }

  const draft = mapPostDraft(dbDraft);
  const user = await getDemoUser();

  try {
    const imageUrl = absolutePublicUrl(asset.url, request.url);
    const published = await publishInstagramBusinessImagePost({
      postDraft: draft,
      instagramUserId: account.externalAccountId,
      accessToken: account.tokenEncrypted,
      imageUrl
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
            imageUrl
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
          metadata: { platformPostId: published.id, instagramUserId: account.externalAccountId }
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
            accountName: account.accountName
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
