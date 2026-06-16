import { NextResponse } from "next/server";
import { z } from "zod";
import { mapBrandProfile } from "@/lib/db/mappers";
import { getDemoUser, prisma } from "@/lib/db/prisma";

const brandProfileSchema = z.object({
  companyName: z.string().min(2),
  services: z.array(z.string()).default([]),
  targetAudience: z.string().min(2),
  tone: z.string().min(2),
  defaultCta: z.string().min(2),
  prohibitedTerms: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  coreMessage: z.string().default("")
});

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params;
  const profile = await prisma.brandProfile.findUnique({ where: { workspaceId: id } });
  if (!profile) {
    return NextResponse.json({ error: "Brand profile not found." }, { status: 404 });
  }
  return NextResponse.json({ profile: mapBrandProfile(profile) });
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const parsed = brandProfileSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = await getDemoUser();
  const profile = await prisma.brandProfile.upsert({
    where: { workspaceId: id },
    update: parsed.data,
    create: {
      workspaceId: id,
      ...parsed.data
    }
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId: id,
      action: "brand_profile.update",
      entityType: "BrandProfile",
      entityId: profile.id,
      metadata: { companyName: profile.companyName }
    }
  });
  return NextResponse.json({ profile: mapBrandProfile(profile) });
}
