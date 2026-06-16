import type { MediaAsset, PostDraft } from "@/lib/types";
import { validateAssetForPlatform } from "@/lib/assets/platform-assets";

function requireAsset(postDraft: PostDraft, mediaAssets: MediaAsset[]) {
  const validation = validateAssetForPlatform(postDraft, mediaAssets);
  if (!validation.ok || !validation.asset) {
    throw new Error(validation.error ?? "A valid generated asset is required.");
  }
  return validation.asset;
}

export function buildMetaPublishPayload(postDraft: PostDraft, mediaAssets: MediaAsset[], origin: string) {
  const asset = requireAsset(postDraft, mediaAssets);
  const assetUrl = new URL(asset.url, origin).toString();

  return {
    platform: postDraft.platform,
    message: postDraft.caption,
    url: assetUrl,
    published: true
  };
}

export function buildTikTokDraftPayload(postDraft: PostDraft, mediaAssets: MediaAsset[], origin: string) {
  const asset = requireAsset(postDraft, mediaAssets);
  const assetUrl = new URL(asset.url, origin).toString();

  return {
    platform: postDraft.platform,
    postInfo: {
      title: postDraft.videoScript.thumbnailText,
      description: postDraft.caption
    },
    sourceInfo: {
      source: "PULL_FROM_URL",
      photoCoverIndex: 0,
      mediaUrls: [assetUrl]
    }
  };
}
