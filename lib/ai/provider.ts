import { generateContentBriefVariants } from "@/lib/ai/mock-provider";
import { generateContentBriefVariantsWithOpenAi } from "@/lib/ai/openai-provider";
import type { AiGenerationResult, BrandProfile, ContentBrief } from "@/lib/types";

type GenerateInput = {
  brandProfile: BrandProfile;
  brief: ContentBrief;
};

export async function generateDrafts(input: GenerateInput): Promise<AiGenerationResult> {
  if (process.env.AI_PROVIDER === "openai") {
    return generateContentBriefVariantsWithOpenAi(input);
  }

  return generateContentBriefVariants(input);
}
