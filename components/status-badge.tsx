import type { PostStatus, RiskLevel } from "@/lib/types";
import { riskBadgeClass, statusBadgeClass, statusLabel } from "@/lib/status";

export function StatusBadge({ status }: { status: PostStatus }) {
  return <span className={statusBadgeClass(status)}>{statusLabel(status)}</span>;
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className={riskBadgeClass(risk)}>{risk.toUpperCase()} risk</span>;
}
