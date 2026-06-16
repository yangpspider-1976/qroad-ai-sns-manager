import { describe, expect, it } from "vitest";
import { mediaAssets, postDrafts } from "@/lib/mock-data";
import { mockPublisher } from "@/lib/platform/mock/publisher";

describe("mock publisher", () => {
  it("publishes approved posts with linked assets", async () => {
    const draft = postDrafts.find((item) => item.status === "approved");
    expect(draft).toBeDefined();

    const result = await mockPublisher.publishPost(
      draft!,
      mediaAssets.filter((asset) => asset.postDraftId === draft!.id)
    );

    expect(result.ok).toBe(true);
    expect(result.platformPostId).toContain("mock_");
  });

  it("blocks posts that have not been approved", async () => {
    const draft = postDrafts.find((item) => item.status === "ready_for_review");
    expect(draft).toBeDefined();

    const result = await mockPublisher.publishPost(
      draft!,
      mediaAssets.filter((asset) => asset.postDraftId === draft!.id)
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("approved");
  });
});
