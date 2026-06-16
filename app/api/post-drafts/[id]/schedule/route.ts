import { NextResponse } from "next/server";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";

const scheduleSchema = z.object({
  runAt: z.string().datetime().optional()
});

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const parsed = scheduleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const draft = await prisma.postDraft.findUniqueOrThrow({ where: { id } });
  if (process.env.REQUIRE_APPROVAL_BEFORE_PUBLISH !== "false" && draft.status !== "approved") {
    return NextResponse.json({ error: "Scheduling is blocked because this post is not approved." }, { status: 409 });
  }

  const user = await getDemoUser();
  const runAt = parsed.data.runAt ? new Date(parsed.data.runAt) : new Date(Date.now() + 60 * 60 * 1000);
  const [job, updatedDraft] = await prisma.$transaction([
    prisma.publishJob.create({
      data: {
        postDraftId: id,
        platform: draft.platform,
        runAt,
        status: "queued"
      }
    }),
    prisma.postDraft.update({
      where: { id },
      data: { status: "scheduled", scheduledAt: runAt }
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId: draft.workspaceId,
        action: "post_draft.schedule",
        entityType: "PostDraft",
        entityId: id,
        metadata: { runAt: runAt.toISOString() }
      }
    })
  ]);

  return NextResponse.json({ job, draft: mapPostDraft(updatedDraft) });
}
