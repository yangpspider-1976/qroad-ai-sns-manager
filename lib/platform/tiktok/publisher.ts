import type { PublisherAdapter, PublishResult, ValidationResult } from "../adapter";

export const tiktokPublisher: PublisherAdapter = {
  platform: "tiktok",
  async validatePost(): Promise<ValidationResult> {
    return {
      ok: false,
      errors: ["TikTok direct post is feature-flagged off. Use draft/upload or manual export first."]
    };
  },
  async publishPost(): Promise<PublishResult> {
    return {
      ok: false,
      error: "TikTok placeholder only. Direct posting requires Content Posting API approval."
    };
  }
};
