import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";

const platformSchema = z.enum(["facebook", "instagram", "tiktok"]);

const saveDraftSetSchema = z.object({
  workspaceId: z.string(),
  brief: z.object({
    objective: z.string().min(5),
    audience: z.string().min(3),
    offer: z.string().min(2),
    language: z.string().min(2),
    platforms: z.array(platformSchema).min(1),
    tone: z.string().default("Professional"),
    contentType: z.string().default("Lead generation post"),
    notes: z.string().default("")
  }),
  platformDrafts: z.array(
    z.object({
      platform: platformSchema,
      caption: z.string(),
      hashtags: z.array(z.string()),
      cta: z.string(),
      imageText: z.unknown(),
      videoScript: z.unknown(),
      qualityScore: z.unknown()
    })
  )
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") ?? undefined;
  const drafts = await prisma.postDraft.findMany({
    where: workspaceId ? { workspaceId } : undefined,
    include: {
      mediaAssets: true,
      approvals: { orderBy: { createdAt: "desc" } },
      publishJobs: { orderBy: { createdAt: "desc" } },
      publishLogs: { orderBy: { createdAt: "desc" } }
    },
    orderBy: { updatedAt: "desc" }
  });
  return NextResponse.json({ drafts: drafts.map(mapPostDraft), rawDrafts: drafts });
}

export async function POST(request: Request) {
  const parsed = saveDraftSetSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getDemoUser();
  const { brief, platformDrafts, workspaceId } = parsed.data;
  const storedBrief = await prisma.contentBrief.create({
    data: {
      workspaceId,
      objective: brief.objective,
      audience: brief.audience,
      offer: brief.offer,
      language: brief.language,
      platforms: brief.platforms,
      tone: brief.tone,
      contentType: brief.contentType,
      notes: brief.notes
    }
  });

  const storedDrafts = [];
  for (const draft of platformDrafts) {
    const storedDraft = await prisma.postDraft.create({
        data: {
          briefId: storedBrief.id,
          workspaceId,
          platform: draft.platform,
          caption: draft.caption,
          hashtags: draft.hashtags,
          cta: draft.cta,
          imageText: draft.imageText as Prisma.InputJsonValue,
          videoScript: draft.videoScript as Prisma.InputJsonValue,
          qualityScore: draft.qualityScore as Prisma.InputJsonValue,
          status: "draft"
        }
      });
    storedDrafts.push(storedDraft);
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId,
      action: "draft_set.save",
      entityType: "ContentBrief",
      entityId: storedBrief.id,
      metadata: { platforms: brief.platforms, draftCount: storedDrafts.length }
    }
  });

  return NextResponse.json({
    briefId: storedBrief.id,
    platformDrafts: storedDrafts.map(mapPostDraft)
  });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const briefIds = Array.isArray(body?.briefIds)
    ? body.briefIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    : [];
  const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : undefined;

  if (!workspaceId || briefIds.length === 0) {
    return NextResponse.json({ error: "workspaceId and at least one briefId are required." }, { status: 400 });
  }

  const user = await getDemoUser();
  const drafts = await prisma.postDraft.findMany({
    where: {
      workspaceId,
      briefId: { in: briefIds }
    },
    select: { id: true, briefId: true }
  });
  const draftIds = drafts.map((draft) => draft.id);
  const scopedBriefIds = Array.from(new Set(drafts.map((draft) => draft.briefId)));

  if (scopedBriefIds.length === 0) {
    return NextResponse.json({ deletedCount: 0 });
  }

  await prisma.$transaction([
    prisma.postMetric.deleteMany({ where: { postDraftId: { in: draftIds } } }),
    prisma.publishLog.deleteMany({ where: { postDraftId: { in: draftIds } } }),
    prisma.publishJob.deleteMany({ where: { postDraftId: { in: draftIds } } }),
    prisma.approval.deleteMany({ where: { postDraftId: { in: draftIds } } }),
    prisma.mediaAsset.deleteMany({ where: { postDraftId: { in: draftIds } } }),
    prisma.postDraft.deleteMany({ where: { id: { in: draftIds } } }),
    prisma.contentBrief.deleteMany({ where: { id: { in: scopedBriefIds }, workspaceId } }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId,
        action: "drafts.delete",
        entityType: "ContentBrief",
        entityId: scopedBriefIds.join(","),
        metadata: { briefIds: scopedBriefIds, draftCount: draftIds.length }
      }
    })
  ]);

  return NextResponse.json({ deletedCount: scopedBriefIds.length, deletedBriefIds: scopedBriefIds });
}
