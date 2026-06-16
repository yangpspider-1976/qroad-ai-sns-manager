import { NextResponse } from "next/server";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";

const updateDraftSchema = z.object({
  caption: z.string().min(1).optional(),
  hashtags: z.array(z.string()).optional(),
  status: z.string().optional()
});

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const parsed = updateDraftSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = await getDemoUser();
  const draft = await prisma.postDraft.update({
    where: { id },
    data: parsed.data
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId: draft.workspaceId,
      action: "post_draft.update",
      entityType: "PostDraft",
      entityId: draft.id,
      metadata: parsed.data
    }
  });
  return NextResponse.json({ draft: mapPostDraft(draft) });
}
