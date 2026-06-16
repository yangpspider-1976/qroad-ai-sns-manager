import { describe, expect, it } from "vitest";
import { detectRiskWarnings, generateContentBriefVariants } from "@/lib/ai/mock-provider";
import { qroadWorkspace, sampleBrief } from "@/lib/mock-data";

describe("AI mock generation", () => {
  it("returns structured platform drafts for the selected platforms", () => {
    const result = generateContentBriefVariants({
      brandProfile: qroadWorkspace.brandProfile,
      brief: sampleBrief
    });

    expect(result.platformDrafts).toHaveLength(3);
    expect(result.platformDrafts[0]).toHaveProperty("imageText.headline");
    expect(result.platformDrafts[0]).toHaveProperty("videoScript.scenes");
  });

  it("flags prohibited terms", () => {
    const warnings = detectRiskWarnings("We guarantee 100% success and instant sales.", [
      "100% success",
      "instant sales"
    ]);

    expect(warnings).toHaveLength(2);
  });
});
