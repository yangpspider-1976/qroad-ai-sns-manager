import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") ?? undefined;
  const metrics = await prisma.postMetric.findMany({
    where: workspaceId ? { postDraft: { workspaceId } } : undefined,
    include: { postDraft: true },
    orderBy: { collectedAt: "desc" }
  });
  const totals = metrics.reduce(
    (acc, metric) => ({
      reach: acc.reach + metric.reach,
      impressions: acc.impressions + metric.impressions,
      engagement: acc.engagement + metric.engagement,
      comments: acc.comments + metric.comments,
      clicks: acc.clicks + metric.clicks,
      leads: acc.leads + metric.leads
    }),
    { reach: 0, impressions: 0, engagement: 0, comments: 0, clicks: 0, leads: 0 }
  );
  return NextResponse.json({
    totals,
    metrics,
    recommendation:
      "Continue practical audit content, then test proof-based variants with client-safe examples and a clear consultation CTA."
  });
}
