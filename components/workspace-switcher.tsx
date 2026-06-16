"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { Workspace } from "@/lib/types";

const selectedWorkspaceKey = "qroad:selected-workspace-id";
const selectedWorkspaceEvent = "qroad:selected-workspace-change";
const selectedWorkspaceCookie = "qroad_selected_workspace_id";

const fallbackWorkspaces: Workspace[] = [
  {
    id: "qroad-ph",
    name: "QROAD Philippines",
    timezone: "Asia/Manila",
    status: "active",
    ownerName: "QROAD Marketing Manager",
    brandProfile: {
      companyName: "QROAD Philippines",
      services: ["Social media management", "website development", "digital marketing"],
      targetAudience: "Philippine SMEs and Korean-owned businesses in the Philippines.",
      tone: "Professional, practical, trustworthy, not exaggerated.",
      defaultCta: "Book a Free Digital Growth Audit and 15-minute consultation.",
      prohibitedTerms: ["guaranteed revenue", "100% success"],
      languages: ["English", "Korean", "Taglish", "Filipino"],
      coreMessage: "Korean-standard execution plus Philippine-local digital marketing."
    }
  }
];

function getCookieWorkspaceId() {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${selectedWorkspaceCookie}=`));
  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

function setCookieWorkspaceId(workspaceId: string) {
  document.cookie = `${selectedWorkspaceCookie}=${encodeURIComponent(workspaceId)}; path=/; max-age=31536000; samesite=lax`;
}

export function getStoredWorkspaceId() {
  if (typeof window === "undefined") return "qroad-ph";
  return window.localStorage.getItem(selectedWorkspaceKey) ?? getCookieWorkspaceId() ?? "qroad-ph";
}

export function useSelectedWorkspaceId(initialWorkspaceId = "qroad-ph") {
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId);

  useEffect(() => {
    function syncWorkspaceId() {
      setWorkspaceId(getStoredWorkspaceId());
    }

    syncWorkspaceId();
    window.addEventListener("storage", syncWorkspaceId);
    window.addEventListener(selectedWorkspaceEvent, syncWorkspaceId);
    return () => {
      window.removeEventListener("storage", syncWorkspaceId);
      window.removeEventListener(selectedWorkspaceEvent, syncWorkspaceId);
    };
  }, []);

  return workspaceId;
}

export function WorkspaceSwitcher({
  initialWorkspaces = fallbackWorkspaces,
  initialSelectedId = "qroad-ph"
}: {
  initialWorkspaces?: Workspace[];
  initialSelectedId?: string;
}) {
  const hydratedWorkspaces = initialWorkspaces.length > 0 ? initialWorkspaces : fallbackWorkspaces;
  const [workspaces, setWorkspaces] = useState<Workspace[]>(hydratedWorkspaces);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedId);

  useEffect(() => {
    async function loadWorkspaces() {
      const response = await fetch("/api/workspaces");
      if (!response.ok) return;
      const data = await response.json();
      const nextWorkspaces = data.workspaces.filter((workspace: Workspace) => workspace.brandProfile);
      const storedId = getStoredWorkspaceId();
      const nextSelectedId = nextWorkspaces.some((workspace: Workspace) => workspace.id === storedId)
        ? storedId
        : nextWorkspaces[0]?.id ?? "qroad-ph";
      setWorkspaces(nextWorkspaces);
      setSelectedId(nextSelectedId);
      window.localStorage.setItem(selectedWorkspaceKey, nextSelectedId);
      setCookieWorkspaceId(nextSelectedId);
    }

    void loadWorkspaces();
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function selectWorkspace(workspaceId: string) {
    setSelectedId(workspaceId);
    window.localStorage.setItem(selectedWorkspaceKey, workspaceId);
    setCookieWorkspaceId(workspaceId);
    window.dispatchEvent(new Event(selectedWorkspaceEvent));
    setIsOpen(false);
  }

  return (
    <div className="relative mb-5" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-2 text-left shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-white">
          <Building2 size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted">Workspace</div>
          <div className="truncate text-sm font-semibold text-ink">{selectedWorkspace?.name ?? "Loading..."}</div>
        </div>
        <ChevronsUpDown className="shrink-0 text-muted" size={16} />
      </button>

      {isOpen ? (
        <div
          className="space-y-1 absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-lg border border-line bg-white p-2 shadow-[0_12px_34px_rgba(15,23,42,0.12),0_0_0_1px_rgba(0,0,0,0.04)]"
          role="listbox"
        >
          {workspaces.map((workspace) => {
            const isSelected = workspace.id === selectedId;
            return (
              <button
                aria-selected={isSelected}
                className={`flex min-h-10 w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                  isSelected ? "bg-[#f3f4f6] font-medium text-ink" : "text-ink hover:bg-[#f3f4f6]"
                }`}
                key={workspace.id}
                onClick={() => selectWorkspace(workspace.id)}
                role="option"
                type="button"
              >
                <span className="truncate">{workspace.name}</span>
                {isSelected ? <Check size={17} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <select
        aria-label="Select workspace"
        className="sr-only"
        value={selectedId}
        onChange={(event) => selectWorkspace(event.target.value)}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </div>
  );
}
