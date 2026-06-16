import { NextResponse } from "next/server";
import { z } from "zod";
import { mapPostDraft } from "@/lib/db/mappers";
import { prisma } from "@/lib/db/prisma";

const updateDraftSetSchema = z.object({
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([])
});

type RouteProps = {
  params: Promise<{ briefId: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const { briefId } = await params;
  const parsed = updateDraftSetSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.postDraft.updateMany({
    where: { briefId },
    data: {
      caption: parsed.data.caption,
      hashtags: parsed.data.hashtags
    }
  });

  const drafts = await prisma.postDraft.findMany({
    where: { briefId },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json({ drafts: drafts.map(mapPostDraft) });
}
