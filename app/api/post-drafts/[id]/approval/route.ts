import { NextResponse } from "next/server";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";

const approvalSchema = z.object({
  status: z.enum(["approved", "rejected", "changes_requested"]),
  comment: z.string().default("")
});

const statusMap = {
  approved: "approved",
  rejected: "archived",
  changes_requested: "revision_requested"
};

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const parsed = approvalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = await getDemoUser();
  const existingDraft = await prisma.postDraft.findUniqueOrThrow({ where: { id } });
  const approval = await prisma.approval.create({
    data: {
      postDraftId: id,
      reviewerId: user.id,
      status: parsed.data.status,
      comment: parsed.data.comment,
      approvedAt: parsed.data.status === "approved" ? new Date() : null
    }
  });
  const draft = await prisma.postDraft.update({
    where: { id },
    data: { status: statusMap[parsed.data.status] }
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId: existingDraft.workspaceId,
      action: `post_draft.${parsed.data.status}`,
      entityType: "PostDraft",
      entityId: id,
      metadata: { approvalId: approval.id, comment: parsed.data.comment }
    }
  });
  return NextResponse.json({ approval, draft: mapPostDraft(draft) });
}
