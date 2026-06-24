import { NextResponse } from "next/server";
import { publicUrl } from "@/lib/http/public-url";
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
    // The user navigates here directly, so surface config errors in the UI.
    const message = error instanceof Error ? error.message : "Instagram Login is not configured.";
    return NextResponse.redirect(publicUrl(`/settings/integrations?instagram=error&message=${encodeURIComponent(message)}`, request));
  }
}
