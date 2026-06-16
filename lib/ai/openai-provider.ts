import { z } from "zod";
import type { AiGenerationResult, BrandProfile, ContentBrief, Platform } from "@/lib/types";

type GenerateInput = {
  brandProfile: BrandProfile;
  brief: ContentBrief;
};

const platformSchema = z.enum(["facebook", "instagram", "tiktok"]);

const aiGenerationResultSchema = z.object({
  briefSummary: z.string().min(10),
  platformDrafts: z
    .array(
      z.object({
        platform: platformSchema,
        caption: z.string().min(20),
        hashtags: z.array(z.string().min(1)).min(1),
        cta: z.string().min(2),
        imageText: z.object({
          headline: z.string().min(2),
          subtitle: z.string().min(2),
          buttonText: z.string().min(2)
        }),
        videoScript: z.object({
          hook: z.string().min(2),
          scenes: z.array(z.string().min(2)).min(3),
          voiceover: z.string().min(10),
          thumbnailText: z.string().min(2)
        }),
        qualityScore: z.object({
          hook: z.number().int().min(1).max(10),
          clarity: z.number().int().min(1).max(10),
          cta: z.number().int().min(1).max(10),
          platformFit: z.number().int().min(1).max(10),
          riskLevel: z.enum(["low", "medium", "high"]),
          warnings: z.array(z.string()).min(1)
        })
      })
    )
    .min(1)
});

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["briefSummary", "platformDrafts"],
  properties: {
    briefSummary: { type: "string" },
    platformDrafts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["platform", "caption", "hashtags", "cta", "imageText", "videoScript", "qualityScore"],
        properties: {
          platform: { type: "string", enum: ["facebook", "instagram", "tiktok"] },
          caption: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          cta: { type: "string" },
          imageText: {
            type: "object",
            additionalProperties: false,
            required: ["headline", "subtitle", "buttonText"],
            properties: {
              headline: { type: "string" },
              subtitle: { type: "string" },
              buttonText: { type: "string" }
            }
          },
          videoScript: {
            type: "object",
            additionalProperties: false,
            required: ["hook", "scenes", "voiceover", "thumbnailText"],
            properties: {
              hook: { type: "string" },
              scenes: { type: "array", items: { type: "string" } },
              voiceover: { type: "string" },
              thumbnailText: { type: "string" }
            }
          },
          qualityScore: {
            type: "object",
            additionalProperties: false,
            required: ["hook", "clarity", "cta", "platformFit", "riskLevel", "warnings"],
            properties: {
              hook: { type: "integer", minimum: 1, maximum: 10 },
              clarity: { type: "integer", minimum: 1, maximum: 10 },
              cta: { type: "integer", minimum: 1, maximum: 10 },
              platformFit: { type: "integer", minimum: 1, maximum: 10 },
              riskLevel: { type: "string", enum: ["low", "medium", "high"] },
              warnings: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  }
};

function extractTextFromResponse(responseBody: unknown) {
  const body = responseBody as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: unknown; type?: string }> }>;
  };

  if (typeof body.output_text === "string") return body.output_text;

  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((contentText): contentText is string => typeof contentText === "string");

  return text ?? "";
}

function buildPrompt(input: GenerateInput) {
  return [
    "Create social media draft records for a human-reviewed SNS manager.",
    "Return one draft for each requested platform only.",
    "Generate the core content once, then reuse it across all platform records to save API usage and keep campaign messaging consistent.",
    "The following fields must be exactly identical in every platformDraft: caption, hashtags, cta, imageText, videoScript.",
    "Only the platform field and qualityScore.platformFit may differ based on platform layout requirements.",
    "Keep platform layout requirements in mind when scoring fit: Facebook paragraph post, Instagram visual/caption post, Tiktok vertical short-form script.",
    "Do not claim guaranteed revenue, guaranteed sales, or official awards unless the brand profile says so.",
    "Quality warnings must mention risky claims if present, otherwise say human review is still required.",
    "",
    `Brand profile: ${JSON.stringify(input.brandProfile)}`,
    `Content brief: ${JSON.stringify(input.brief)}`
  ].join("\n");
}

export async function generateContentBriefVariantsWithOpenAi(input: GenerateInput): Promise<AiGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            "You are a senior social media strategist for QROAD. Produce concise, review-ready JSON only."
        },
        { role: "user", content: buildPrompt(input) }
      ],
      max_output_tokens: 4000,
      text: {
        format: {
          type: "json_schema",
          name: "sns_generation_result",
          strict: true,
          schema: responseJsonSchema
        }
      }
    })
  });

  const responseBody = await response.json();
  if (!response.ok) {
    const message =
      typeof responseBody?.error?.message === "string"
        ? responseBody.error.message
        : "OpenAI generation request failed.";
    throw new Error(message);
  }

  const text = extractTextFromResponse(responseBody);
  const json = JSON.parse(text);
  const result = aiGenerationResultSchema.parse(json);
  const requestedPlatforms = new Set<Platform>(input.brief.platforms);
  const platformDrafts = result.platformDrafts.filter((draft) => requestedPlatforms.has(draft.platform));
  const sharedContent = platformDrafts[0];
  if (!sharedContent) {
    throw new Error("OpenAI did not return drafts for the requested platforms.");
  }

  return {
    briefSummary: result.briefSummary,
    platformDrafts: platformDrafts.map((draft) => ({
      ...draft,
      caption: sharedContent.caption,
      hashtags: sharedContent.hashtags,
      cta: sharedContent.cta,
      imageText: sharedContent.imageText,
      videoScript: sharedContent.videoScript
    }))
  };
}
