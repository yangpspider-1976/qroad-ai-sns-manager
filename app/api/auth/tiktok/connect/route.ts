import { NextResponse } from "next/server";
import { buildTikTokOAuthUrl } from "@/lib/platform/tiktok/tiktok";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  try {
    return NextResponse.redirect(buildTikTokOAuthUrl(workspaceId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TikTok OAuth is not configured." },
      { status: 500 }
    );
  }
}
