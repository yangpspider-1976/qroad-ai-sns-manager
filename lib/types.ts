export type Platform = "facebook" | "instagram" | "tiktok";

export type UserRole = "admin" | "manager" | "operator" | "client_approver" | "viewer";

export type PostStatus =
  | "draft"
  | "ready_for_review"
  | "revision_requested"
  | "approved"
  | "scheduled"
  | "published"
  | "failed"
  | "archived";

export type RiskLevel = "low" | "medium" | "high";

export type BrandProfile = {
  companyName: string;
  services: string[];
  targetAudience: string;
  tone: string;
  defaultCta: string;
  prohibitedTerms: string[];
  languages: string[];
  coreMessage: string;
};

export type Workspace = {
  id: string;
  name: string;
  timezone: string;
  status: "active" | "paused";
  ownerName: string;
  brandProfile: BrandProfile;
};

export type ContentBrief = {
  id: string;
  workspaceId: string;
  objective: string;
  audience: string;
  offer: string;
  language: string;
  platforms: Platform[];
  tone: string;
  contentType: string;
  notes: string;
};

export type QualityScore = {
  hook: number;
  clarity: number;
  cta: number;
  platformFit: number;
  riskLevel: RiskLevel;
  warnings: string[];
};

export type PlatformDraft = {
  platform: Platform;
  caption: string;
  hashtags: string[];
  cta: string;
  imageText: {
    headline: string;
    subtitle: string;
    buttonText: string;
  };
  videoScript: {
    hook: string;
    scenes: string[];
    voiceover: string;
    thumbnailText: string;
  };
  qualityScore: QualityScore;
};

export type AiGenerationResult = {
  briefSummary: string;
  platformDrafts: PlatformDraft[];
};

export type PostDraft = PlatformDraft & {
  id: string;
  briefId: string;
  workspaceId: string;
  status: PostStatus;
  scheduledAt?: string;
  approvalComment?: string;
};

export type MediaAsset = {
  id: string;
  workspaceId: string;
  postDraftId: string;
  type: "image" | "video" | "thumbnail" | "designer_brief";
  url: string;
  prompt: string;
  width: number;
  height: number;
  status: "generated" | "needs_design" | "approved";
};

export type PublishJob = {
  id: string;
  postDraftId: string;
  platform: Platform;
  runAt: string;
  status: "queued" | "published" | "failed";
  retryCount: number;
  error?: string;
};

export type PublishLog = {
  id: string;
  postDraftId: string;
  platform: Platform;
  platformPostId?: string;
  status: "success" | "failed" | "blocked";
  errorMessage?: string;
  createdAt: string;
};

export type EngagementItem = {
  id: string;
  platform: Platform;
  postTitle: string;
  message: string;
  leadScore: "hot" | "warm" | "cold" | "spam" | "support";
  status: "new" | "assigned" | "responded" | "closed";
  assignedTo: string;
  suggestedReply: string;
};

export type PostMetric = {
  postDraftId: string;
  reach: number;
  impressions: number;
  engagement: number;
  comments: number;
  clicks: number;
  leads: number;
  collectedAt: string;
};
