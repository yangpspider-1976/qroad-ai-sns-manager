import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDrafts } from "@/lib/ai/provider";
import { mapBrandProfile } from "@/lib/db/mappers";
import { prisma } from "@/lib/db/prisma";
import { qroadWorkspace } from "@/lib/mock-data";

const generateSchema = z.object({
  workspaceId: z.string().default("qroad-ph"),
  objective: z.string().min(5),
  audience: z.string().min(3),
  offer: z.string().min(2),
  language: z.string().min(2),
  platforms: z.array(z.enum(["facebook", "instagram", "tiktok"])).min(1),
  tone: z.string().default("Professional"),
  contentType: z.string().default("Lead generation post"),
  notes: z.string().default("")
});

export async function POST(request: Request) {
  const parsed = generateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: parsed.data.workspaceId },
    include: { brandProfile: true }
  });
  const brandProfile = workspace?.brandProfile ? mapBrandProfile(workspace.brandProfile) : qroadWorkspace.brandProfile;
  const inputBrief = {
    id: `brief_${Date.now()}`,
    workspaceId: parsed.data.workspaceId,
    objective: parsed.data.objective,
    audience: parsed.data.audience,
    offer: parsed.data.offer,
    language: parsed.data.language,
    platforms: parsed.data.platforms,
    tone: parsed.data.tone,
    contentType: parsed.data.contentType,
    notes: parsed.data.notes
  };

  let result;
  try {
    result = await generateDrafts({
      brandProfile,
      brief: inputBrief
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI generation failed." },
      { status: 502 }
    );
  }

  const previewBriefId = `preview_${Date.now()}`;

  return NextResponse.json({
    ...result,
    briefId: previewBriefId,
    saved: false,
    platformDrafts: result.platformDrafts.map((draft, index) => ({
      ...draft,
      id: `${previewBriefId}_${draft.platform}_${index}`,
      briefId: previewBriefId,
      workspaceId: inputBrief.workspaceId,
      status: "draft"
    }))
  });
}
