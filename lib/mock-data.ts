import type {
  ContentBrief,
  EngagementItem,
  MediaAsset,
  PostDraft,
  PostMetric,
  PublishJob,
  PublishLog,
  Workspace
} from "./types";
import { generateContentBriefVariants } from "./ai/mock-provider";

export const qroadWorkspace: Workspace = {
  id: "qroad-ph",
  name: "QROAD Philippines",
  timezone: "Asia/Manila",
  status: "active",
  ownerName: "QROAD Marketing",
  brandProfile: {
    companyName: "QROAD Philippines",
    services: [
      "Social media management",
      "Website development",
      "Digital marketing",
      "Influencer support",
      "Online store support"
    ],
    targetAudience:
      "Philippine SMEs, Korean-owned businesses in the Philippines, K-brands, game/content/e-commerce companies.",
    tone: "Professional, practical, trustworthy, not exaggerated.",
    defaultCta: "Book a Free Digital Growth Audit and 15-minute consultation.",
    prohibitedTerms: [
      "guaranteed revenue",
      "100% success",
      "instant sales",
      "official award-winning"
    ],
    languages: ["English", "Korean", "Taglish", "Filipino"],
    coreMessage: "Korean-standard execution plus Philippine-local digital marketing."
  }
};

export const workspaces: Workspace[] = [
  qroadWorkspace,
  {
    ...qroadWorkspace,
    id: "kbrand-launch",
    name: "K-Brand Launch PH",
    ownerName: "Client Success",
    brandProfile: {
      ...qroadWorkspace.brandProfile,
      companyName: "K-Brand Launch PH",
      defaultCta: "Request a localized launch plan."
    }
  }
];

export const sampleBrief: ContentBrief = {
  id: "brief-001",
  workspaceId: "qroad-ph",
  objective: "Generate qualified consultation leads for monthly SNS management packages.",
  audience: "SME owners and Korean-owned businesses operating in the Philippines.",
  offer: "Free Digital Growth Audit",
  language: "English with light Taglish phrasing",
  platforms: ["facebook", "instagram", "tiktok"],
  tone: "Practical, clear, and consultative",
  contentType: "Lead generation post",
  notes: "Avoid exaggerated performance promises. Mention operational consistency."
};

const generated = generateContentBriefVariants({
  brandProfile: qroadWorkspace.brandProfile,
  brief: sampleBrief
});

export const postDrafts: PostDraft[] = generated.platformDrafts.map((draft, index) => ({
  ...draft,
  id: `draft-${index + 1}`,
  briefId: sampleBrief.id,
  workspaceId: sampleBrief.workspaceId,
  status: index === 0 ? "approved" : index === 1 ? "ready_for_review" : "scheduled",
  scheduledAt: index === 2 ? "2026-06-12T09:30:00+08:00" : undefined,
  approvalComment: index === 0 ? "Approved for next week campaign testing." : undefined
}));

export const mediaAssets: MediaAsset[] = postDrafts.map((draft, index) => ({
  id: `asset-${index + 1}`,
  workspaceId: draft.workspaceId,
  postDraftId: draft.id,
  type: "designer_brief",
  url: `/assets/${draft.platform}-growth-audit.png`,
  prompt: `${draft.imageText.headline}. ${draft.imageText.subtitle}. Use QROAD teal, clean service layout, and one CTA button.`,
  width: draft.platform === "tiktok" ? 1080 : draft.platform === "facebook" ? 1200 : 1080,
  height: draft.platform === "tiktok" ? 1920 : draft.platform === "facebook" ? 630 : 1080,
  status: index === 1 ? "needs_design" : "generated"
}));

export const publishJobs: PublishJob[] = [
  {
    id: "job-001",
    postDraftId: "draft-3",
    platform: "tiktok",
    runAt: "2026-06-12T09:30:00+08:00",
    status: "queued",
    retryCount: 0
  }
];

export const publishLogs: PublishLog[] = [
  {
    id: "log-001",
    postDraftId: "draft-1",
    platform: "facebook",
    platformPostId: "mock_facebook_20260611_001",
    status: "success",
    createdAt: "2026-06-11T10:10:00+08:00"
  },
  {
    id: "log-002",
    postDraftId: "draft-2",
    platform: "instagram",
    status: "blocked",
    errorMessage: "Post is ready for review but not approved.",
    createdAt: "2026-06-11T10:12:00+08:00"
  }
];

export const engagementItems: EngagementItem[] = [
  {
    id: "eng-001",
    platform: "facebook",
    postTitle: "Free Digital Growth Audit",
    message: "How much is monthly management for a small cafe page?",
    leadScore: "hot",
    status: "new",
    assignedTo: "Marketing Manager",
    suggestedReply:
      "Thanks for asking. We can start with a quick audit of your page and recommend a package based on your posting needs and goals."
  },
  {
    id: "eng-002",
    platform: "instagram",
    postTitle: "Korean-standard execution",
    message: "Can you support Korean and English captions?",
    leadScore: "warm",
    status: "assigned",
    assignedTo: "Content Operator",
    suggestedReply:
      "Yes, QROAD can prepare English, Korean, Filipino, and Taglish variants depending on your target audience."
  }
];

export const postMetrics: PostMetric[] = [
  {
    postDraftId: "draft-1",
    reach: 4280,
    impressions: 6120,
    engagement: 318,
    comments: 24,
    clicks: 91,
    leads: 7,
    collectedAt: "2026-06-11T12:00:00+08:00"
  },
  {
    postDraftId: "draft-3",
    reach: 2880,
    impressions: 3900,
    engagement: 246,
    comments: 18,
    clicks: 54,
    leads: 4,
    collectedAt: "2026-06-11T12:00:00+08:00"
  }
];
