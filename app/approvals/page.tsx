"use client";

import { Check, ChevronDown, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DraftCard } from "@/components/draft-card";
import { Shell } from "@/components/shell";
import { Button, ConfirmationModal, Notice, Panel, fieldNoteClass, formActionsClass, sectionHeadingClass } from "@/components/ui";
import { useSelectedWorkspaceId } from "@/components/workspace-switcher";
import { groupDraftsByBrief, platformListLabel } from "@/lib/draft-groups";
import type { PostDraft, PostStatus } from "@/lib/types";

function statusListLabel(statuses: PostStatus[]) {
  return statuses.map((status) => status.replaceAll("_", " ")).join(", ");
}

export default function ApprovalsPage() {
  const selectedWorkspaceId = useSelectedWorkspaceId();
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [message, setMessage] = useState("Select an approval action to update the review queue.");
  const [pendingReject, setPendingReject] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const draftGroups = groupDraftsByBrief(drafts);
  const selectedGroup = draftGroups.find((group) => group.id === selectedGroupId);
  const selectedDraft = selectedGroup?.drafts[0];
  const selectedGroupApproved = selectedGroup?.drafts.every((draft) => draft.status === "approved" || draft.status === "scheduled") ?? false;

  useEffect(() => {
    async function loadDrafts() {
      const response = await fetch(`/api/post-drafts?workspaceId=${selectedWorkspaceId}`);
      if (!response.ok) return;
      const data = await response.json();
      const groups = groupDraftsByBrief(data.drafts);
      setDrafts(data.drafts);
      setSelectedGroupId((current) => (groups.some((group) => group.id === current) ? current : groups[0]?.id ?? ""));
      setMessage(`Loaded ${groups.length} draft sets for the selected workspace.`);
    }
    void loadDrafts();
  }, [selectedWorkspaceId]);

  async function transitionDraft(id: string, status: PostStatus, comment: string) {
    const approvalStatus =
      status === "approved" ? "approved" : status === "revision_requested" ? "changes_requested" : "rejected";
    const response = await fetch(`/api/post-drafts/${id}/approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: approvalStatus, comment })
    });
    if (!response.ok) {
      setMessage("Approval update failed.");
      return;
    }
    const data = await response.json();
    setDrafts((current) => current.map((draft) => (draft.id === id ? data.draft : draft)));
    setMessage(`${comment} Approval history and audit log were saved.`);
  }

  async function transitionDraftGroup(status: PostStatus, comment: string) {
    if (!selectedGroup) return;
    const results = await Promise.all(
      selectedGroup.drafts.map(async (draft) => {
        const approvalStatus =
          status === "approved" ? "approved" : status === "revision_requested" ? "changes_requested" : "rejected";
        const response = await fetch(`/api/post-drafts/${draft.id}/approval`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: approvalStatus, comment: `${draft.platform} ${comment}` })
        });
        return response.ok ? ((await response.json()) as { draft: PostDraft }).draft : null;
      })
    );
    const updatedDrafts = results.filter((draft): draft is PostDraft => Boolean(draft));
    if (updatedDrafts.length !== selectedGroup.drafts.length) {
      setMessage("Some approval updates failed.");
      return;
    }
    setDrafts((current) =>
      current.map((draft) => updatedDrafts.find((updatedDraft) => updatedDraft.id === draft.id) ?? draft)
    );
    setMessage(`Draft set ${comment} Approval history and audit logs were saved.`);
  }

  async function scheduleDraftGroup() {
    if (!selectedGroup || !scheduleAt) return;
    const response = await fetch("/api/post-drafts/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: selectedWorkspaceId,
        briefId: selectedGroup.id,
        runAt: new Date(scheduleAt).toISOString()
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Scheduling failed.");
      return;
    }
    const updatedDrafts = result.drafts as PostDraft[];
    setDrafts((current) =>
      current.map((draft) => updatedDrafts.find((updatedDraft) => updatedDraft.id === draft.id) ?? draft)
    );
    setMessage(`Draft set scheduled for ${new Date(scheduleAt).toLocaleString()}.`);
  }

  async function publishDraftGroupNow() {
    if (!selectedGroup) return;
    const publishableDrafts = selectedGroup.drafts.filter((draft) =>
      ["facebook", "instagram", "tiktok"].includes(draft.platform)
    );
    if (publishableDrafts.length === 0) {
      setMessage("This draft set has no publishable platform variant.");
      return;
    }
    const results = await Promise.all(
      publishableDrafts.map(async (draft) => {
        const response = await fetch(`/api/publish/${draft.platform}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postDraftId: draft.id })
        });
        const result = await response.json();
        return { draft, ok: response.ok, result };
      })
    );

    const failed = results.filter((result) => !result.ok);
    if (failed.length > 0) {
      setMessage(failed[0].result.result?.error ?? failed[0].result.error ?? "Publish now failed.");
      return;
    }

    setDrafts((current) =>
      current.map((draft) =>
        publishableDrafts.some((selectedDraft) => selectedDraft.id === draft.id) ? { ...draft, status: "published" } : draft
      )
    );
    setMessage("Published available platform variants.");
  }

  return (
    <Shell title="Approvals" subtitle="Review captions, asset instructions, scripts, and risk warnings before scheduling.">
      <div className="mb-4 max-w-[720px]">
        <label>
          Draft to review
          <span className="relative block">
            <select
              className="appearance-none pr-10"
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
            >
              {draftGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.title} - {platformListLabel(group.platforms)} ({statusListLabel(group.statuses)})
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              size={18}
            />
          </span>
        </label>
        {selectedGroup ? (
          <p className={`${fieldNoteClass} mt-3`}>Platforms: {platformListLabel(selectedGroup.platforms)}</p>
        ) : null}
      </div>
      <Panel>
        <div className={sectionHeadingClass}>
          <div>
            <h2 className="m-0 text-lg font-bold">Review Queue</h2>
            <p className={fieldNoteClass}>Scheduling is blocked until a draft reaches Approved status.</p>
          </div>
        </div>
        {selectedDraft ? (
          <div className="mb-4">
            <DraftCard
              draft={selectedDraft}
              platformDrafts={selectedGroup.drafts}
              showWarnings={false}
              titleOverride="Shared content"
            />
            <div className="mt-4 grid gap-3 rounded-lg border border-line bg-[#f8fafc] p-3.5 min-[921px]:grid-cols-[minmax(260px,360px)_auto]">
              <label>
                Schedule
                <input value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} type="datetime-local" />
              </label>
              <div className="flex items-end">
                <Button disabled={!selectedGroupApproved || !scheduleAt} onClick={() => void scheduleDraftGroup()} type="button">
                  Schedule approved draft
                </Button>
              </div>
              <p className={`${fieldNoteClass} min-[921px]:col-span-2`}>
                One shared schedule is applied to every platform variant in this draft set after approval.
              </p>
            </div>
            <div className={formActionsClass}>
              <Button onClick={() => void transitionDraftGroup("approved", "approved.")} type="button">
                <Check size={16} /> Approve draft set
              </Button>
              <Button disabled={!selectedGroupApproved} onClick={() => void publishDraftGroupNow()} type="button" variant="secondary">
                Publish now
              </Button>
              <Button
                onClick={() => void transitionDraftGroup("revision_requested", "sent back for revision.")}
                variant="secondary"
                type="button"
              >
                <RotateCcw size={16} /> Request changes
              </Button>
              <Button onClick={() => setPendingReject(true)} variant="danger" type="button">
                <X size={16} /> Reject
              </Button>
            </div>
          </div>
        ) : (
          <Notice className="mb-4">No drafts are available for approval in this workspace.</Notice>
        )}
      </Panel>
      {pendingReject && selectedGroup ? (
        <ConfirmationModal
          body="This will archive every platform variant in the selected draft set. It will not delete the original content brief or workspace data."
          confirmLabel="Reject"
          onCancel={() => setPendingReject(false)}
          onConfirm={() => {
            void transitionDraftGroup("archived", "rejected and archived.");
            setPendingReject(false);
          }}
          subtitle={`${selectedGroup.title} will be removed from active approval work.`}
          title="Reject draft"
        />
      ) : null}
    </Shell>
  );
}
