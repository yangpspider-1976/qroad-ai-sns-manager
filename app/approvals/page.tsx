"use client";

import { Check, ChevronDown, Loader2, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DraftCard } from "@/components/draft-card";
import { Shell } from "@/components/shell";
import { Button, ConfirmationModal, Modal, Notice, Panel, fieldNoteClass, formActionsClass, sectionHeadingClass } from "@/components/ui";
import { useSelectedWorkspaceId } from "@/components/workspace-switcher";
import { groupDraftsByBrief, platformListLabel } from "@/lib/draft-groups";
import type { PostDraft, PostStatus } from "@/lib/types";

type PlatformPublishResult = {
  platform: string;
  ok: boolean;
  platformPostId?: string;
  error?: string;
};

type PublishOutcome = {
  ok: boolean;
  results: PlatformPublishResult[];
};

function statusListLabel(statuses: PostStatus[]) {
  return statuses.map((status) => status.replaceAll("_", " ")).join(", ");
}

export default function ApprovalsPage() {
  const selectedWorkspaceId = useSelectedWorkspaceId();
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [message, setMessage] = useState("Select an approval action to update the review queue.");
  const [pendingReject, setPendingReject] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishOutcome, setPublishOutcome] = useState<PublishOutcome | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [selectedGroupHasImage, setSelectedGroupHasImage] = useState(false);
  const draftGroups = groupDraftsByBrief(drafts);
  const selectedGroup = draftGroups.find((group) => group.id === selectedGroupId);
  const selectedDraft = selectedGroup?.drafts[0];
  const selectedGroupApproved = selectedGroup?.drafts.every((draft) => draft.status === "approved" || draft.status === "scheduled") ?? false;
  const selectedGroupRequiresImage = selectedGroup?.drafts.some((draft) => ["instagram", "tiktok"].includes(draft.platform)) ?? false;
  const publishBlocked = selectedGroupRequiresImage && !selectedGroupHasImage;

  useEffect(() => {
    async function loadAssets() {
      if (!selectedGroup || !selectedWorkspaceId) {
        setSelectedGroupHasImage(false);
        return;
      }
      const response = await fetch(`/api/media-assets?workspaceId=${selectedWorkspaceId}&briefId=${selectedGroup.id}`);
      if (!response.ok) { setSelectedGroupHasImage(false); return; }
      const data = await response.json();
      setSelectedGroupHasImage(Array.isArray(data.assets) && data.assets.length > 0);
    }
    void loadAssets();
  }, [selectedGroupId, selectedWorkspaceId]);

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

    setIsPublishing(true);

    const rawResults = await Promise.all(
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

    setIsPublishing(false);

    const platformResults: PlatformPublishResult[] = rawResults.map(({ draft, ok, result }) => ({
      platform: draft.platform,
      ok,
      platformPostId: ok ? (result.result?.platformPostId ?? undefined) : undefined,
      error: ok ? undefined : (result.error ?? "Publish failed.")
    }));

    const allOk = platformResults.every((r) => r.ok);
    setPublishOutcome({ ok: allOk, results: platformResults });

    if (allOk) {
      setDrafts((current) =>
        current.map((draft) =>
          publishableDrafts.some((d) => d.id === draft.id) ? { ...draft, status: "published" } : draft
        )
      );
    }
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
              <Button disabled={!selectedGroupApproved || publishBlocked} onClick={() => void publishDraftGroupNow()} type="button" variant="secondary">
                Publish now
              </Button>
              {publishBlocked ? (
                <span className={fieldNoteClass}>Upload an image first — Instagram and TikTok require one before publishing.</span>
              ) : null}
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
        {message ? <Notice className="mt-2">{message}</Notice> : null}
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
      {isPublishing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(16,35,31,0.42)] p-6">
          <div className="flex w-[min(380px,100%)] flex-col items-center gap-5 rounded-lg bg-white text-center shadow-[0_18px_60px_rgba(16,35,31,0.22)]" style={{ padding: "40px" }}>
            <Loader2 className="animate-spin text-accent" size={44} />
            <div>
              <div className="text-lg font-semibold text-ink">Publishing...</div>
              <div className="mt-1 text-sm text-muted">Please wait while your content is being sent to the selected platform.</div>
            </div>
          </div>
        </div>
      ) : null}
      {publishOutcome ? (
        <Modal
          title={publishOutcome.ok ? "Published successfully" : "Some platforms failed"}
          subtitle={publishOutcome.ok ? "Your content is now live on all selected platforms." : "Review the results below."}
          onClose={() => setPublishOutcome(null)}
          footer={<Button onClick={() => setPublishOutcome(null)} type="button">Close</Button>}
        >
          <div className="flex flex-col gap-3">
            {publishOutcome.results.map((result) => (
              <div
                key={result.platform}
                className={result.ok
                  ? "flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3"
                  : "flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3"}
              >
                {result.ok ? (
                  <Check className="mt-0.5 shrink-0 text-green-700" size={16} />
                ) : (
                  <X className="mt-0.5 shrink-0 text-red-700" size={16} />
                )}
                <div>
                  <div className="font-semibold capitalize">{result.platform}</div>
                  {result.ok && result.platformPostId ? (
                    <div className="mt-0.5 text-xs text-muted">Post ID: {result.platformPostId}</div>
                  ) : null}
                  {!result.ok && result.error ? (
                    <div className="mt-0.5 text-xs text-red-700">{result.error}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </Shell>
  );
}
