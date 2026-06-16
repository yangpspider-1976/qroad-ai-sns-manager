import { NextResponse } from "next/server";
import { buildInstagramLoginOAuthUrl } from "@/lib/platform/instagram/instagram";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  try {
    return NextResponse.redirect(buildInstagramLoginOAuthUrl(workspaceId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Instagram Login is not configured." },
      { status: 500 }
    );
  }
}
