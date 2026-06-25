"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  CheckSquare,
  FileText,
  FolderKanban,
  Image,
  Inbox,
  LayoutDashboard,
  ListChecks,
  PenLine,
  Settings
} from "lucide-react";
import { WorkspaceSwitcher } from "./workspace-switcher";
import type { Workspace } from "@/lib/types";

const groups = [
  {
    label: "Operate",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/workspaces", label: "Workspaces", icon: FolderKanban },
      {
        href: "/content-studio?tab=brief",
        matchHref: "/content-studio",
        label: "Content Studio",
        icon: PenLine,
        children: [
          { href: "/content-studio?tab=brief", label: "Content Brief", tab: "brief" },
          { href: "/content-studio?tab=drafts", label: "Generated Drafts", tab: "drafts" }
        ]
      },
      { href: "/approvals", label: "Approvals", icon: CheckSquare },
      { href: "/drafts", label: "Drafts", icon: FileText },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/assets", label: "Assets", icon: Image }
    ]
  },
  {
    label: "Review",
    items: [
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/publishing-logs", label: "Publishing Logs", icon: ListChecks }
    ]
  },
  {
    label: "System",
    items: [{ href: "/settings/integrations", label: "Integrations", icon: Settings }]
  }
];

export function SidebarNav({
  initialWorkspaces,
  initialSelectedWorkspaceId
}: {
  initialWorkspaces?: Workspace[];
  initialSelectedWorkspaceId?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contentStudioTab = searchParams.get("tab") === "drafts" ? "drafts" : "brief";
  const isOnContentStudio = pathname === "/content-studio" || pathname.startsWith("/content-studio/");
  const [contentStudioExpanded, setContentStudioExpanded] = useState(isOnContentStudio);

  useEffect(() => {
    if (isOnContentStudio) {
      setContentStudioExpanded(true);
    }
  }, [isOnContentStudio]);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[264px] overflow-y-auto border-r border-[#e3e3e5] bg-white px-4 py-5 max-[920px]:static max-[920px]:h-auto max-[920px]:w-auto">
      <div className="mb-5 flex min-h-[42px] items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/qroad.png" alt="QROAD" width={36} height={36} className="shrink-0 rounded" />
        <div className="grid content-center gap-0.5">
          <strong className="text-base font-bold">QROAD AI SNS</strong>
          <span className="text-xs text-muted">Operations Manager</span>
        </div>
      </div>
      <WorkspaceSwitcher initialSelectedId={initialSelectedWorkspaceId} initialWorkspaces={initialWorkspaces} />
      <nav className="grid gap-3 max-[920px]:gap-3.5" aria-label="Main navigation">
        {groups.map((group) => (
          <div className="grid gap-[3px]" key={group.label}>
            <div className="px-3 pb-1.5 text-xs font-bold uppercase text-muted">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const matchHref = item.matchHref ?? item.href;
              const isActive = pathname === matchHref || pathname.startsWith(`${matchHref}/`);
              const isContentStudioGroup = Boolean(item.children);
              return (
                <div key={item.href}>
                  {isContentStudioGroup ? (
                    <button
                      aria-expanded={contentStudioExpanded}
                      className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left text-[#4e4e4e] hover:bg-[#f2f2f2]"
                      onClick={() => setContentStudioExpanded((current) => !current)}
                      type="button"
                    >
                      <Icon size={17} />
                      <span className="flex-1">{item.label}</span>
                      <ChevronDown
                        className={`transition-transform ${contentStudioExpanded ? "rotate-180" : ""}`}
                        size={15}
                      />
                    </button>
                  ) : (
                    <Link
                      className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[#4e4e4e] hover:bg-[#f2f2f2] ${
                        isActive ? "bg-[#ebebeb] text-ink" : ""
                      }`}
                      href={item.href}
                    >
                      <Icon size={17} />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  )}
                  {item.children && contentStudioExpanded ? (
                    <div className="ml-[28px] mt-1 grid gap-1 border-l border-line pl-5">
                      {item.children.map((child) => {
                        const childIsActive = contentStudioTab === child.tab;
                        return (
                          <Link
                            className={`ml-2 rounded-md px-3 py-2 text-sm text-[#5f6f86] hover:bg-[#f2f2f2] ${
                              childIsActive && isOnContentStudio ? "bg-[#ebebeb] text-ink" : ""
                            }`}
                            href={child.href}
                            key={child.href}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
