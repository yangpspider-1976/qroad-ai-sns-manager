import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fetchTikTokCreatorInfo } from "@/lib/platform/tiktok/tiktok";

// TikTok's UX guidelines require the creator to pick the post's privacy level
// from the options TikTok returns for their account. This endpoint surfaces
// the connected account's creator info + allowed privacy levels for the UI.
export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const account = await prisma.socialAccount.findFirst({
    where: { workspaceId, platform: "tiktok" }
  });
  if (!account) {
    return NextResponse.json({ error: "Connect a TikTok account first." }, { status: 409 });
  }

  try {
    const info = await fetchTikTokCreatorInfo(account.tokenEncrypted);
    return NextResponse.json({
      creatorUsername: info.creator_username ?? null,
      creatorNickname: info.creator_nickname ?? null,
      privacyLevelOptions: info.privacy_level_options ?? [],
      commentDisabled: info.comment_disabled ?? false,
      maxVideoPostDurationSec: info.max_video_post_duration_sec ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load TikTok creator info.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
