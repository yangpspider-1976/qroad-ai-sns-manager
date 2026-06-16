import type { AiGenerationResult, BrandProfile, ContentBrief, Platform, PlatformDraft, RiskLevel } from "../types";

type GenerateInput = {
  brandProfile: BrandProfile;
  brief: ContentBrief;
};

const sharedTags = ["#DigitalMarketingPH", "#SocialMediaManagement", "#QROADPhilippines"];

const platformGuidance: Record<Platform, { layout: string; platformFit: number }> = {
  facebook: {
    layout: "clear paragraph format with a practical CTA",
    platformFit: 8
  },
  instagram: {
    layout: "short lines, save-friendly phrasing, and square image copy",
    platformFit: 9
  },
  tiktok: {
    layout: "short-form vertical video script with direct opening",
    platformFit: 9
  }
};

export function detectRiskWarnings(caption: string, prohibitedTerms: string[]) {
  const lowerCaption = caption.toLowerCase();
  return prohibitedTerms
    .filter((term) => lowerCaption.includes(term.toLowerCase()))
    .map((term) => `Contains prohibited claim: "${term}"`);
}

function qualityScore(caption: string, platform: Platform, brandProfile: BrandProfile) {
  const warnings = detectRiskWarnings(caption, brandProfile.prohibitedTerms);
  const hasCta = caption.toLowerCase().includes("audit") || caption.toLowerCase().includes("consultation");
  const riskLevel: RiskLevel = warnings.length > 0 ? "high" : caption.includes("guarantee") ? "medium" : "low";

  return {
    hook: platform === "tiktok" ? 9 : 8,
    clarity: caption.length > 80 ? 9 : 7,
    cta: hasCta ? 9 : 6,
    platformFit: platformGuidance[platform].platformFit,
    riskLevel,
    warnings: warnings.length > 0 ? warnings : ["No prohibited claims detected.", "Human review still required before approval."]
  };
}

function buildSharedContent(input: GenerateInput) {
  const { brandProfile, brief } = input;
  const hook = "Your social media should create trust before a sales conversation starts.";
  const caption = [
    hook,
    "",
    `${brandProfile.companyName} helps ${brief.audience.toLowerCase()} turn one content brief into platform-ready posts, localized captions, and designer-ready asset instructions.`,
    "",
    `For this campaign, the offer is simple: ${brief.offer}. We review what is working, what is unclear, and what content direction can support better lead generation.`,
    "",
    `${brandProfile.defaultCta}`
  ].join("\n");

  return {
    caption,
    hashtags: sharedTags,
    cta: brandProfile.defaultCta,
    imageText: {
      headline: brief.offer,
      subtitle: "Practical SNS audit for clearer monthly growth planning",
      buttonText: "Book Audit"
    },
    videoScript: {
      hook,
      scenes: [
        "Show a messy posting calendar with inconsistent topics.",
        "Cut to a clean monthly content plan organized by platform.",
        "Show captions localized into English, Korean, Filipino, and Taglish.",
        "End with the Free Digital Growth Audit CTA."
      ],
      voiceover:
        "Posting more is not always the answer. Start with a clear audit, then build a practical monthly SNS plan for your market.",
      thumbnailText: "Fix Your SNS Plan"
    }
  };
}

function buildDraft(platform: Platform, input: GenerateInput, sharedContent: ReturnType<typeof buildSharedContent>): PlatformDraft {
  return {
    platform,
    ...sharedContent,
    qualityScore: qualityScore(sharedContent.caption, platform, input.brandProfile)
  };
}

export function generateContentBriefVariants(input: GenerateInput): AiGenerationResult {
  const sharedContent = buildSharedContent(input);
  return {
    briefSummary: `${input.brief.objective} for ${input.brief.audience}, using ${input.brief.language}.`,
    platformDrafts: input.brief.platforms.map((platform) => buildDraft(platform, input, sharedContent))
  };
}
