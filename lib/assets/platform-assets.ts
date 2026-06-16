import type { MediaAsset, Platform, PostDraft } from "@/lib/types";

export const platformAssetRequirements: Record<Platform, { width: number; height: number; label: string }> = {
  facebook: { width: 1200, height: 630, label: "Facebook feed image" },
  instagram: { width: 1080, height: 1080, label: "Instagram square image" },
  tiktok: { width: 1080, height: 1920, label: "TikTok vertical cover" }
};

export function validateAssetForPlatform(postDraft: PostDraft, mediaAssets: MediaAsset[]) {
  const requirement = platformAssetRequirements[postDraft.platform];
  const matchingAsset = mediaAssets.find(
    (asset) =>
      asset.width === requirement.width &&
      asset.height === requirement.height &&
      (asset.url.startsWith("/uploaded-assets/") || asset.url.startsWith("https://"))
  );

  if (!matchingAsset) {
    return {
      ok: false,
      error: `${requirement.label} asset must be ${requirement.width}x${requirement.height}.`
    };
  }

  return { ok: true, asset: matchingAsset };
}

export function platformAssetPrompt(postDraft: PostDraft) {
  const requirement = platformAssetRequirements[postDraft.platform];
  return [
    `${requirement.label} generated from shared image copy.`,
    `Headline: ${postDraft.imageText.headline}`,
    `Subtitle: ${postDraft.imageText.subtitle}`,
    `CTA: ${postDraft.imageText.buttonText}`
  ].join(" ");
}
