"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, ConfirmationModal, Notice, Panel, fieldNoteClass, formActionsClass, sectionHeadingClass } from "@/components/ui";
import { useSelectedWorkspaceId } from "@/components/workspace-switcher";
import type { PostDraft } from "@/lib/types";

export default function CalendarPage() {
  const selectedWorkspaceId = useSelectedWorkspaceId();
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [message, setMessage] = useState("Approved and scheduled drafts appear in this calendar.");
  const [pendingAction, setPendingAction] = useState<PostDraft | null>(null);
  const scheduledDrafts = drafts.filter((draft) => draft.scheduledAt);

  useEffect(() => {
    async function loadDrafts() {
      const response = await fetch(`/api/post-drafts?workspaceId=${selectedWorkspaceId}`);
      if (!response.ok) return;
      const data = await response.json();
      setDrafts(data.drafts);
      setMessage(`Loaded ${data.drafts.filter((draft: PostDraft) => draft.scheduledAt).length} scheduled calendar items.`);
    }
    void loadDrafts();
  }, [selectedWorkspaceId]);

  async function publishDraft(draft: PostDraft) {
    const response = await fetch("/api/publish/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postDraftId: draft.id })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.result?.error ?? result.error ?? "Mock publishing failed.");
      return;
    }
    setDrafts((current) => current.map((item) => (item.id === draft.id ? { ...item, status: "published" } : item)));
    setMessage(`Mock published ${draft.platform}: ${result.result.platformPostId}`);
  }

  return (
    <Shell title="Calendar" subtitle="Weekly planning view with approval-aware scheduling controls.">
      <Panel>
        <div className={sectionHeadingClass}>
          <div>
            <h2 className="m-0 text-lg font-bold">Publishing Week</h2>
            <p className={fieldNoteClass}>Schedule drafts from Approvals. This calendar only shows scheduled items.</p>
          </div>
        </div>
        {scheduledDrafts.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 min-[921px]:grid-cols-3">
            {scheduledDrafts.map((draft) => (
                <div className="min-h-[132px] rounded-lg border border-line bg-white p-3.5" key={draft.id}>
                  <strong>{new Date(draft.scheduledAt ?? "").toLocaleString()}</strong>
                  <div className="mt-3">
                    <StatusBadge status={draft.status} />
                  </div>
                  <p className={`${fieldNoteClass} mt-2.5 capitalize`}>
                    {draft.platform}: {draft.imageText.headline}
                  </p>
                  <Notice className="mt-3">
                    <Clock size={16} /> Scheduled from Approvals.
                  </Notice>
                  <div className={`${formActionsClass} justify-start`}>
                    <Button onClick={() => setPendingAction(draft)} type="button">
                      Mock publish
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <Notice>No scheduled drafts for the selected workspace yet.</Notice>
        )}
        <Notice className="mt-4">{message}</Notice>
      </Panel>
      {pendingAction ? (
        <ConfirmationModal
          body="This calls the mock publisher and creates a fake platform post ID. No live platform API will be called."
          confirmLabel="Mock publish"
          confirmVariant="danger"
          onCancel={() => setPendingAction(null)}
          onConfirm={() => {
            void publishDraft(pendingAction);
            setPendingAction(null);
          }}
          subtitle={`${pendingAction.platform} draft: ${pendingAction.videoScript.thumbnailText}`}
          title="Mock publish post"
        />
      ) : null}
    </Shell>
  );
}
