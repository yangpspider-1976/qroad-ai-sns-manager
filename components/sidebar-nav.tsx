"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
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
      { href: "/content-studio", label: "Content Studio", icon: PenLine },
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
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[#4e4e4e] hover:bg-[#f2f2f2] ${
                    isActive ? "bg-[#ebebeb] text-ink" : ""
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
