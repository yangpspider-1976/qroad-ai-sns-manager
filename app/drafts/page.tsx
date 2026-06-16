"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { RiskBadge, StatusBadge } from "@/components/status-badge";
import { Shell } from "@/components/shell";
import { Button, ConfirmationModal, Notice, Panel, TableShell, fieldNoteClass, tableClass, tdClass, thClass } from "@/components/ui";
import { useSelectedWorkspaceId } from "@/components/workspace-switcher";
import { groupDraftsByBrief, platformListLabel } from "@/lib/draft-groups";
import type { PostDraft } from "@/lib/types";

export default function DraftsPage() {
  const selectedWorkspaceId = useSelectedWorkspaceId();
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [message, setMessage] = useState("Loading saved drafts...");
  const [selectedBriefIds, setSelectedBriefIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const draftGroups = groupDraftsByBrief(drafts);
  const allVisibleSelected = draftGroups.length > 0 && draftGroups.every((group) => selectedBriefIds.includes(group.id));
  const selectedGroups = draftGroups.filter((group) => selectedBriefIds.includes(group.id));

  useEffect(() => {
    async function loadDrafts() {
      const response = await fetch(`/api/post-drafts?workspaceId=${selectedWorkspaceId}`);
      if (!response.ok) {
        setDrafts([]);
        setMessage("Could not load saved drafts for the selected workspace.");
        return;
      }

      const data = await response.json();
      setDrafts(data.drafts);
      setSelectedBriefIds((current) => current.filter((id) => groupDraftsByBrief(data.drafts).some((group) => group.id === id)));
      setMessage(`Loaded ${groupDraftsByBrief(data.drafts).length} saved draft sets for the selected workspace.`);
    }

    void loadDrafts();
  }, [selectedWorkspaceId]);

  function toggleBrief(briefId: string) {
    setSelectedBriefIds((current) =>
      current.includes(briefId) ? current.filter((id) => id !== briefId) : [...current, briefId]
    );
  }

  function toggleAllVisible() {
    setSelectedBriefIds(allVisibleSelected ? [] : draftGroups.map((group) => group.id));
  }

  async function deleteSelectedDrafts() {
    const response = await fetch("/api/post-drafts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: selectedWorkspaceId, briefIds: selectedBriefIds })
    });

    if (!response.ok) {
      setMessage("Draft deletion failed.");
      setShowDeleteModal(false);
      return;
    }

    setDrafts((current) => current.filter((draft) => !selectedBriefIds.includes(draft.briefId)));
    setMessage(`Deleted ${selectedBriefIds.length} draft set${selectedBriefIds.length === 1 ? "" : "s"}.`);
    setSelectedBriefIds([]);
    setShowDeleteModal(false);
  }

  return (
    <Shell title="Drafts" subtitle="Browse saved generated content sets for the selected workspace.">
      <Panel>
        <div className="mb-4">
          <h2 className="m-0 text-lg font-bold">Saved Drafts</h2>
          <p className={fieldNoteClass}>
            Each draft set groups the platform variants generated from one content brief.
          </p>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className={fieldNoteClass}>
            {selectedBriefIds.length} draft set{selectedBriefIds.length === 1 ? "" : "s"} selected
          </span>
          <Button
            disabled={selectedBriefIds.length === 0}
            onClick={() => setShowDeleteModal(true)}
            type="button"
            variant="danger"
          >
            <Trash2 size={16} /> Delete
          </Button>
        </div>
        <TableShell>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={`${thClass} w-[52px]`}>
                  <input
                    aria-label="Select all draft sets"
                    checked={allVisibleSelected}
                    className="h-4 min-h-4 w-4 cursor-pointer rounded border-line p-0"
                    onChange={toggleAllVisible}
                    type="checkbox"
                  />
                </th>
                <th className={thClass}>Draft</th>
                <th className={thClass}>Platforms</th>
                <th className={thClass}>Statuses</th>
                <th className={thClass}>Risk</th>
                <th className={thClass}>Variants</th>
              </tr>
            </thead>
            <tbody>
              {draftGroups.map((group) => (
                <tr className="hover:bg-blue-50" key={group.id}>
                  <td className={tdClass}>
                    <input
                      aria-label={`Select ${group.title}`}
                      checked={selectedBriefIds.includes(group.id)}
                      className="h-4 min-h-4 w-4 cursor-pointer rounded border-line p-0"
                      onChange={() => toggleBrief(group.id)}
                      type="checkbox"
                    />
                  </td>
                  <td className={tdClass}>
                    <div className="grid gap-1">
                      <strong>{group.title}</strong>
                      <span className="text-xs text-muted">{group.id}</span>
                    </div>
                  </td>
                  <td className={tdClass}>{platformListLabel(group.platforms)}</td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-2">
                      {group.statuses.map((status) => (
                        <StatusBadge key={status} status={status} />
                      ))}
                    </div>
                  </td>
                  <td className={tdClass}>
                    <RiskBadge risk={group.highestRisk} />
                  </td>
                  <td className={tdClass}>
                    <span className="text-sm text-muted">{group.drafts.length} platform draft{group.drafts.length === 1 ? "" : "s"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
        {draftGroups.length === 0 ? <Notice className="mt-4">No saved draft sets are available for this workspace yet.</Notice> : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Notice className="grow">{message}</Notice>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white px-4 font-medium hover:border-slate-300 hover:bg-[#f8fafc]"
            href="/approvals"
          >
            Review selected drafts
          </Link>
        </div>
      </Panel>
      {showDeleteModal ? (
        <ConfirmationModal
          body={
            <div className="grid gap-3">
              <p className="m-0">
                {selectedBriefIds.length} draft set{selectedBriefIds.length === 1 ? "" : "s"} will be removed permanently.
              </p>
              <div className="rounded-lg border border-line bg-[#f8fafc] p-3">
                {selectedGroups.map((group) => (
                  <div className="py-1" key={group.id}>
                    <strong>{group.title}</strong>
                    <div className={fieldNoteClass}>{platformListLabel(group.platforms)}</div>
                  </div>
                ))}
              </div>
              <p className="m-0">This will also remove related platform variants, media asset records, approvals, schedules, logs, and metrics.</p>
            </div>
          }
          confirmLabel="Delete"
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => void deleteSelectedDrafts()}
          subtitle="Selected draft sets will be deleted from this workspace."
          title="Delete drafts"
        />
      ) : null}
    </Shell>
  );
}
