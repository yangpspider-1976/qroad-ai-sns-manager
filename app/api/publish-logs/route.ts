import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") ?? undefined;
  const logs = await prisma.publishLog.findMany({
    where: workspaceId ? { postDraft: { workspaceId } } : undefined,
    include: { postDraft: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return NextResponse.json({ logs });
}
