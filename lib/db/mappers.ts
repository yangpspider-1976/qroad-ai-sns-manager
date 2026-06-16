import type { BrandProfile, Platform, PostDraft, PostStatus, QualityScore } from "@/lib/types";

type JsonRecord = Record<string, unknown>;

export function jsonArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function mapBrandProfile(profile: {
  companyName: string;
  services: unknown;
  targetAudience: string;
  tone: string;
  defaultCta: string;
  prohibitedTerms: unknown;
  languages: unknown;
  coreMessage: string;
}): BrandProfile {
  return {
    companyName: profile.companyName,
    services: jsonArray(profile.services),
    targetAudience: profile.targetAudience,
    tone: profile.tone,
    defaultCta: profile.defaultCta,
    prohibitedTerms: jsonArray(profile.prohibitedTerms),
    languages: jsonArray(profile.languages),
    coreMessage: profile.coreMessage
  };
}

export function mapPostDraft(draft: {
  id: string;
  briefId: string;
  workspaceId: string;
  platform: string;
  caption: string;
  hashtags: unknown;
  cta: string;
  imageText: unknown;
  videoScript: unknown;
  qualityScore: unknown;
  status: string;
  scheduledAt?: Date | null;
}): PostDraft {
  return {
    id: draft.id,
    briefId: draft.briefId,
    workspaceId: draft.workspaceId,
    platform: draft.platform as Platform,
    caption: draft.caption,
    hashtags: jsonArray(draft.hashtags),
    cta: draft.cta,
    imageText: draft.imageText as PostDraft["imageText"],
    videoScript: draft.videoScript as PostDraft["videoScript"],
    qualityScore: draft.qualityScore as QualityScore,
    status: draft.status as PostStatus,
    scheduledAt: draft.scheduledAt?.toISOString()
  };
}

export function asJsonRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonRecord) : {};
}
