import type { PostStatus, RiskLevel } from "./types";

export function statusLabel(status: PostStatus) {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusBadgeClass(status: PostStatus) {
  const base = "inline-flex min-h-6 items-center gap-1.5 rounded-full px-2 py-[3px] text-xs font-bold";
  if (status === "approved" || status === "published") return `${base} bg-[#dcfce7] text-ok`;
  if (status === "failed" || status === "revision_requested") return `${base} bg-[#fee2e2] text-danger`;
  if (status === "scheduled" || status === "ready_for_review") return `${base} bg-[#fef3c7] text-warn`;
  return `${base} bg-blue-100 text-accent-dark`;
}

export function riskBadgeClass(risk: RiskLevel) {
  const base = "inline-flex min-h-6 items-center gap-1.5 rounded-full px-2 py-[3px] text-xs font-bold";
  if (risk === "high") return `${base} bg-[#fee2e2] text-danger`;
  if (risk === "medium") return `${base} bg-[#fef3c7] text-warn`;
  return `${base} bg-[#dcfce7] text-ok`;
}
