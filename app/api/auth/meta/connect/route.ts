import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Meta OAuth is not configured." }, { status: 500 });
  }
}
