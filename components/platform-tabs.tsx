import type { Platform } from "@/lib/types";

export const platformTabs: { id: Platform; label: string }[] = [
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "Tiktok" },
  { id: "instagram", label: "Instagram" }
];

export function PlatformTabs({
  activePlatform,
  onChange,
  platforms
}: {
  activePlatform: Platform;
  onChange: (platform: Platform) => void;
  platforms?: Platform[];
}) {
  const visibleTabs = platforms?.length ? platformTabs.filter((tab) => platforms.includes(tab.id)) : platformTabs;

  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-1">
      {visibleTabs.map((tab) => {
        const isActive = activePlatform === tab.id;
        return (
          <button
            aria-pressed={isActive}
            className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium transition ${
              isActive ? "bg-[#ebebeb] text-ink" : "text-muted hover:bg-[#f8fafc] hover:text-ink"
            }`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
