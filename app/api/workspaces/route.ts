import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser, prisma } from "@/lib/db/prisma";
import { mapBrandProfile } from "@/lib/db/mappers";

const createWorkspaceSchema = z.object({
  name: z.string().min(2),
  timezone: z.string().default("Asia/Manila")
});

export async function GET() {
  const workspaces = await prisma.workspace.findMany({
    include: { brandProfile: true, owner: true },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json({
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      timezone: workspace.timezone,
      status: workspace.status,
      ownerName: workspace.owner.name,
      brandProfile: workspace.brandProfile ? mapBrandProfile(workspace.brandProfile) : null
    }))
  });
}

export async function POST(request: Request) {
  const parsed = createWorkspaceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getDemoUser();
  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "admin"
        }
      },
      brandProfile: {
        create: {
          companyName: parsed.data.name,
          services: ["Social media management"],
          targetAudience: "Philippine SMEs and client businesses.",
          coreMessage: "Korean-standard execution plus Philippine-local digital marketing.",
          defaultCta: "Book a Free Digital Growth Audit and 15-minute consultation.",
          tone: "Professional, practical, trustworthy, not exaggerated.",
          languages: ["English", "Korean", "Taglish", "Filipino"],
          prohibitedTerms: ["guaranteed revenue", "100% success"]
        }
      },
      auditLogs: {
        create: {
          userId: user.id,
          action: "workspace.create",
          entityType: "Workspace",
          entityId: "pending",
          metadata: { name: parsed.data.name }
        }
      }
    },
    include: { brandProfile: true, owner: true }
  });

  await prisma.auditLog.updateMany({
    where: { workspaceId: workspace.id, entityId: "pending" },
    data: { entityId: workspace.id }
  });

  return NextResponse.json(
    {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        timezone: workspace.timezone,
        status: workspace.status,
        ownerName: workspace.owner.name,
        brandProfile: workspace.brandProfile ? mapBrandProfile(workspace.brandProfile) : null
      }
    },
    { status: 201 }
  );
}
