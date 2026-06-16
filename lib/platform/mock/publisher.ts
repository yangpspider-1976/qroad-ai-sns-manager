import type { MediaAsset, PostDraft } from "../../types";
import { validateAssetForPlatform } from "@/lib/assets/platform-assets";
import type { PublisherAdapter, PublishResult, ValidationResult } from "../adapter";

export const mockPublisher: PublisherAdapter = {
  platform: "mock",
  async validatePost(postDraft: PostDraft, mediaAssets: MediaAsset[]): Promise<ValidationResult> {
    const errors: string[] = [];
    if (postDraft.status !== "approved" && postDraft.status !== "scheduled") {
      errors.push("Post must be approved before publishing.");
    }
    if (!postDraft.caption.trim()) {
      errors.push("Caption is required.");
    }
    if (postDraft.qualityScore.riskLevel === "high") {
      errors.push("High-risk AI content needs revision before publishing.");
    }
    if (mediaAssets.length === 0) {
      errors.push("At least one asset or designer brief should be linked.");
    }
    const assetValidation = validateAssetForPlatform(postDraft, mediaAssets);
    if (!assetValidation.ok && assetValidation.error) {
      errors.push(assetValidation.error);
    }
    return { ok: errors.length === 0, errors };
  },
  async publishPost(postDraft: PostDraft, mediaAssets: MediaAsset[]): Promise<PublishResult> {
    const validation = await this.validatePost(postDraft, mediaAssets);
    if (!validation.ok) {
      return { ok: false, error: validation.errors.join(" ") };
    }
    const assetValidation = validateAssetForPlatform(postDraft, mediaAssets);
    return {
      ok: true,
      platformPostId: `mock_${postDraft.platform}_${postDraft.id}_${Date.now()}`,
      assetUrls: assetValidation.asset ? [assetValidation.asset.url] : []
    };
  }
};
