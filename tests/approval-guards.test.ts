import { describe, expect, it } from "vitest";
import { postDrafts } from "@/lib/mock-data";
import { canSchedulePost } from "@/lib/scheduler/guards";

describe("approval scheduling guards", () => {
  it("allows approved posts", () => {
    const draft = postDrafts.find((item) => item.status === "approved");
    expect(draft).toBeDefined();
    expect(canSchedulePost(draft!).ok).toBe(true);
  });

  it("blocks unapproved posts", () => {
    const draft = postDrafts.find((item) => item.status === "ready_for_review");
    expect(draft).toBeDefined();
    expect(canSchedulePost(draft!).ok).toBe(false);
  });
});
