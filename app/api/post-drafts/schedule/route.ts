import { NextResponse } from "next/server";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";

const scheduleDraftSetSchema = z.object({
  workspaceId: z.string(),
  briefId: z.string(),
  runAt: z.string().datetime()
});

export async function POST(request: Request) {
  const parsed = scheduleDraftSetSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { briefId, runAt, workspaceId } = parsed.data;
  const runAtDate = new Date(runAt);
  const drafts = await prisma.postDraft.findMany({
    where: { briefId, workspaceId }
  });

  if (drafts.length === 0) {
    return NextResponse.json({ error: "Draft set not found." }, { status: 404 });
  }

  const notApproved = drafts.filter((draft) => draft.status !== "approved" && draft.status !== "scheduled");
  if (process.env.REQUIRE_APPROVAL_BEFORE_PUBLISH !== "false" && notApproved.length > 0) {
    return NextResponse.json({ error: "Scheduling is blocked until every platform variant is approved." }, { status: 409 });
  }

  const highRisk = drafts.filter((draft) => {
    const qualityScore = draft.qualityScore as { riskLevel?: string };
    return qualityScore.riskLevel === "high";
  });
  if (highRisk.length > 0) {
    return NextResponse.json({ error: "Scheduling is blocked because the draft set contains high-risk warnings." }, { status: 409 });
  }

  const user = await getDemoUser();
  const draftIds = drafts.map((draft) => draft.id);
  await prisma.$transaction([
    prisma.publishJob.deleteMany({
      where: {
        postDraftId: { in: draftIds },
        status: { in: ["queued", "failed"] }
      }
    }),
    ...drafts.map((draft) =>
      prisma.publishJob.create({
        data: {
          postDraftId: draft.id,
          platform: draft.platform,
          runAt: runAtDate,
          status: "queued"
        }
      })
    ),
    prisma.postDraft.updateMany({
      where: { id: { in: draftIds } },
      data: { status: "scheduled", scheduledAt: runAtDate }
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId,
        action: "draft_set.schedule",
        entityType: "ContentBrief",
        entityId: briefId,
        metadata: { runAt: runAtDate.toISOString(), draftIds }
      }
    })
  ]);

  const updatedDrafts = await prisma.postDraft.findMany({
    where: { id: { in: draftIds } },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json({ drafts: updatedDrafts.map(mapPostDraft) });
}
