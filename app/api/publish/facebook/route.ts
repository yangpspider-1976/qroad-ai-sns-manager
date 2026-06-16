import { NextResponse } from "next/server";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { publishFacebookTextPost } from "@/lib/platform/meta/facebook";

const publishSchema = z.object({
  postDraftId: z.string()
});

export async function POST(request: Request) {
  const parsed = publishSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dbDraft = await prisma.postDraft.findUnique({
    where: { id: parsed.data.postDraftId }
  });
  if (!dbDraft) {
    return NextResponse.json({ error: "Post draft not found." }, { status: 404 });
  }
  if (dbDraft.platform !== "facebook") {
    return NextResponse.json({ error: "Live Facebook publishing only supports Facebook drafts." }, { status: 400 });
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
      platform: "facebook"
    }
  });
  if (!account) {
    return NextResponse.json({ error: "Connect and select a Facebook Page in Integrations before publishing." }, { status: 409 });
  }

  const draft = mapPostDraft(dbDraft);
  const user = await getDemoUser();

  try {
    const published = await publishFacebookTextPost({
      postDraft: draft,
      pageId: account.externalAccountId,
      pageAccessToken: account.tokenEncrypted
    });

    const [log] = await prisma.$transaction([
      prisma.publishLog.create({
        data: {
          postDraftId: draft.id,
          platform: "facebook",
          platformPostId: published.id,
          status: "success",
          requestPayload: {
            live: true,
            provider: "meta",
            endpoint: "/feed",
            pageId: account.externalAccountId,
            pageName: account.accountName,
            message: [draft.caption, draft.hashtags.join(" ")].filter(Boolean).join("\n\n")
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
          action: "publish.facebook.success",
          entityType: "PostDraft",
          entityId: draft.id,
          metadata: { platformPostId: published.id, pageId: account.externalAccountId }
        }
      })
    ]);

    return NextResponse.json({
      result: { ok: true, platformPostId: published.id },
      log
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Facebook publishing failed.";
    const [log] = await prisma.$transaction([
      prisma.publishLog.create({
        data: {
          postDraftId: draft.id,
          platform: "facebook",
          status: "failed",
          requestPayload: {
            live: true,
            provider: "meta",
            endpoint: "/feed",
            pageId: account.externalAccountId,
            pageName: account.accountName
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
          action: "publish.facebook.failed",
          entityType: "PostDraft",
          entityId: draft.id,
          metadata: { error: message, pageId: account.externalAccountId }
        }
      })
    ]);

    return NextResponse.json({ error: message, log }, { status: 409 });
  }
}
