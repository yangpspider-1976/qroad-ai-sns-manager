import type { PostDraft } from "../types";

export function canSchedulePost(postDraft: PostDraft, requireApproval = true) {
  if (!requireApproval) {
    return { ok: true, reason: undefined };
  }
  if (postDraft.status !== "approved") {
    return {
      ok: false,
      reason: "Scheduling is blocked because this post is not approved."
    };
  }
  if (postDraft.qualityScore.riskLevel === "high") {
    return {
      ok: false,
      reason: "Scheduling is blocked because this post has high-risk warnings."
    };
  }
  return { ok: true, reason: undefined };
}
