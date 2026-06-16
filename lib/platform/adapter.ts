import type { MediaAsset, Platform, PostDraft, PublishLog } from "../types";

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

export type PublishResult = {
  ok: boolean;
  platformPostId?: string;
  error?: string;
  assetUrls?: string[];
};

export type SocialAccountRef = {
  platform: Platform;
  accountName: string;
  tokenReference: string;
};

export interface PublisherAdapter {
  platform: Platform | "mock";
  validatePost(postDraft: PostDraft, mediaAssets: MediaAsset[]): Promise<ValidationResult>;
  publishPost(
    postDraft: PostDraft,
    mediaAssets: MediaAsset[],
    socialAccount?: SocialAccountRef
  ): Promise<PublishResult>;
}

export function toPublishLog(postDraft: PostDraft, result: PublishResult): PublishLog {
  return {
    id: `log_${postDraft.id}_${Date.now()}`,
    postDraftId: postDraft.id,
    platform: postDraft.platform,
    platformPostId: result.platformPostId,
    status: result.ok ? "success" : "failed",
    errorMessage: result.error,
    createdAt: new Date().toISOString()
  };
}
