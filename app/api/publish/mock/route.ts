import { NextResponse } from "next/server";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { buildMetaPublishPayload, buildTikTokDraftPayload } from "@/lib/platform/publish-payload";
import { mockPublisher } from "@/lib/platform/mock/publisher";

const publishSchema = z.object({
  postDraftId: z.string()
});

export async function POST(request: Request) {
  const parsed = publishSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dbDraft = await prisma.postDraft.findUnique({
    where: { id: parsed.data.postDraftId },
    include: { mediaAssets: true }
  });
  if (!dbDraft) {
    return NextResponse.json({ error: "Post draft not found." }, { status: 404 });
  }
  const draft = mapPostDraft(dbDraft);

  const assets = dbDraft.mediaAssets.map((asset) => ({
    id: asset.id,
    workspaceId: asset.workspaceId,
    postDraftId: asset.postDraftId,
    type: asset.type as "image" | "video" | "thumbnail" | "designer_brief",
    url: asset.url,
    prompt: asset.prompt ?? "",
    width: asset.width,
    height: asset.height,
    status: asset.status as "generated" | "needs_design" | "approved"
  }));
  const result = await mockPublisher.publishPost(draft, assets);
  const platformPayload =
    result.ok
      ? draft.platform === "tiktok"
        ? buildTikTokDraftPayload(draft, assets, request.url)
        : buildMetaPublishPayload(draft, assets, request.url)
      : null;
  const user = await getDemoUser();
  const [log, updatedDraft] = await prisma.$transaction([
    prisma.publishLog.create({
      data: {
        postDraftId: draft.id,
        platform: draft.platform,
        platformPostId: result.platformPostId,
        status: result.ok ? "success" : "failed",
        requestPayload: {
          mock: true,
          postDraftId: draft.id,
          caption: draft.caption,
          assetUrls: result.assetUrls ?? [],
          absoluteAssetUrls: (result.assetUrls ?? []).map((url) => new URL(url, request.url).toString()),
          platformPayload
        },
        responsePayload: result,
        errorMessage: result.error
      }
    }),
    prisma.postDraft.update({
      where: { id: draft.id },
      data: { status: result.ok ? "published" : "failed" }
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId: draft.workspaceId,
        action: result.ok ? "publish.mock.success" : "publish.mock.failed",
        entityType: "PostDraft",
        entityId: draft.id,
        metadata: result
      }
    })
  ]);

  return NextResponse.json({ result, log }, { status: result.ok ? 200 : 409 });
}
