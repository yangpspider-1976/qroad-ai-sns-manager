import type { Platform, PostDraft, PostStatus, RiskLevel } from "@/lib/types";

export type DraftGroup = {
  id: string;
  title: string;
  drafts: PostDraft[];
  platforms: Platform[];
  statuses: PostStatus[];
  highestRisk: RiskLevel;
};

const riskRank: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3
};

function platformLabel(platform: Platform) {
  return `${platform.charAt(0).toUpperCase()}${platform.slice(1)}`;
}

function highestRisk(drafts: PostDraft[]) {
  return drafts.reduce<RiskLevel>((current, draft) => {
    return riskRank[draft.qualityScore.riskLevel] > riskRank[current] ? draft.qualityScore.riskLevel : current;
  }, "low");
}

export function groupDraftsByBrief(drafts: PostDraft[]): DraftGroup[] {
  const groups = new Map<string, PostDraft[]>();

  drafts.forEach((draft) => {
    const current = groups.get(draft.briefId) ?? [];
    current.push(draft);
    groups.set(draft.briefId, current);
  });

  const baseGroups = Array.from(groups.entries()).map(([briefId, groupedDrafts], index) => {
    const platforms = groupedDrafts.map((draft) => draft.platform);
    return {
      id: briefId,
      title: groupedDrafts[0]?.imageText.headline ?? `Draft ${index + 1}`,
      drafts: groupedDrafts,
      platforms,
      statuses: Array.from(new Set(groupedDrafts.map((draft) => draft.status))),
      highestRisk: highestRisk(groupedDrafts)
    };
  });

  const titleCounts = baseGroups.reduce<Record<string, number>>((counts, group) => {
    counts[group.title] = (counts[group.title] ?? 0) + 1;
    return counts;
  }, {});
  const seenTitles: Record<string, number> = {};

  return baseGroups.map((group) => {
    const count = titleCounts[group.title] ?? 1;
    if (count === 1) return group;

    const seen = seenTitles[group.title] ?? 0;
    seenTitles[group.title] = seen + 1;
    const version = count - seen;

    return {
      ...group,
      title: `${group.title} v${version}`
    };
  });
}

export function platformListLabel(platforms: Platform[]) {
  return platforms.map(platformLabel).join(", ");
}
