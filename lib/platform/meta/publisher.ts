import type { MediaAsset, PostDraft } from "../../types";
import type { PublisherAdapter, PublishResult, ValidationResult } from "../adapter";

export const metaPublisher: PublisherAdapter = {
  platform: "facebook",
  async validatePost(postDraft: PostDraft, _mediaAssets: MediaAsset[]): Promise<ValidationResult> {
    if (postDraft.platform === "tiktok") {
      return { ok: false, errors: ["Meta adapter only supports Facebook and Instagram workflows."] };
    }
    return { ok: false, errors: ["Live Meta publishing is disabled until OAuth and App Review are configured."] };
  },
  async publishPost(): Promise<PublishResult> {
    return {
      ok: false,
      error: "Meta placeholder only. Use official Graph API with OAuth tokens after mock workflow validation."
    };
  }
};
