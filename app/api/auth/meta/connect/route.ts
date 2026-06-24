import { NextResponse } from "next/server";
import { publicUrl } from "@/lib/http/public-url";
import type { MetaConnectionIntent } from "@/lib/platform/meta/facebook";
import { buildMetaOAuthUrl } from "@/lib/platform/meta/facebook";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const intent = searchParams.get("intent") === "instagram" ? "instagram" : "facebook";
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  try {
    return NextResponse.redirect(buildMetaOAuthUrl(workspaceId, intent as MetaConnectionIntent));
  } catch (error) {
    // The user navigates here directly, so surface config errors in the UI
    // instead of returning raw JSON they can't read.
    const message = error instanceof Error ? error.message : "Meta OAuth is not configured.";
    return NextResponse.redirect(publicUrl(`/settings/integrations?meta=error&message=${encodeURIComponent(message)}`, request));
  }
}
