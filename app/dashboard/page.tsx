"use client";

import { CalendarDays, CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { Notice, Panel, StatCard, TableShell, fieldNoteClass, sectionHeadingClass, tableClass, tdClass, thClass } from "@/components/ui";
import { useSelectedWorkspaceId } from "@/components/workspace-switcher";
import type { PostDraft, Workspace } from "@/lib/types";

type PublishLogRow = {
  id: string;
  status: string;
};

export default function DashboardPage() {
  const selectedWorkspaceId = useSelectedWorkspaceId();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [publishLogs, setPublishLogs] = useState<PublishLogRow[]>([]);

  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
  const subtitle = selectedWorkspace
    ? `Weekly operations overview for ${selectedWorkspace.name}.`
    : "Weekly operations overview for the selected workspace.";

  const scheduledCount = useMemo(() => drafts.filter((draft) => draft.status === "scheduled").length, [drafts]);
  const publishedCount = useMemo(() => publishLogs.filter((log) => log.status === "success").length, [publishLogs]);
  const failedLogs = useMemo(
    () => publishLogs.filter((log) => log.status === "failed" || log.status === "blocked"),
    [publishLogs]
  );

  useEffect(() => {
    async function loadDashboardData() {
      const [workspaceResponse, draftsResponse, logsResponse] = await Promise.all([
        fetch("/api/workspaces"),
        fetch(`/api/post-drafts?workspaceId=${selectedWorkspaceId}`),
        fetch(`/api/publish-logs?workspaceId=${selectedWorkspaceId}`)
      ]);

      if (workspaceResponse.ok) {
        const data = await workspaceResponse.json();
        setWorkspaces(data.workspaces);
      }
      if (draftsResponse.ok) {
        const data = await draftsResponse.json();
        setDrafts(data.drafts);
      }
      if (logsResponse.ok) {
        const data = await logsResponse.json();
        setPublishLogs(data.logs);
      }
    }

    void loadDashboardData();
  }, [selectedWorkspaceId]);

  return (
    <Shell title="Dashboard" subtitle={subtitle}>
      <section className="grid grid-cols-1 gap-4 min-[921px]:grid-cols-4">
        <StatCard label="Active workspaces" value={workspaces.length} />
        <StatCard label="Drafts in workflow" value={drafts.length} />
        <StatCard label="Scheduled jobs" value={scheduledCount} />
        <StatCard label="Mock published" value={publishedCount} />
      </section>

      <Panel className="mt-5">
        <div className={sectionHeadingClass}>
          <div>
            <h2 className="m-0 text-lg font-bold">Upcoming Posts</h2>
            <p className={fieldNoteClass}>Approved or scheduled drafts for {selectedWorkspace?.name ?? "this workspace"}.</p>
          </div>
          <a
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 font-medium text-ink hover:border-slate-300 hover:bg-[#f8fafc]"
            href="/calendar"
          >
            <CalendarDays size={16} /> Open calendar
          </a>
        </div>
        <TableShell>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Platform</th>
                <th className={thClass}>Caption Hook</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => (
                <tr className="hover:bg-blue-50" key={draft.id}>
                  <td className={`${tdClass} capitalize`}>{draft.platform}</td>
                  <td className={tdClass}>{draft.videoScript.hook}</td>
                  <td className={tdClass}>
                    <StatusBadge status={draft.status} />
                  </td>
                  <td className={tdClass}>{draft.scheduledAt ?? "Not scheduled"}</td>
                </tr>
              ))}
              {drafts.length === 0 ? (
                <tr>
                  <td className={tdClass} colSpan={4}>
                    No drafts yet for the selected workspace.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableShell>
      </Panel>

      <Panel className="mt-5">
        <div className={sectionHeadingClass}>
          <div>
            <h2 className="m-0 text-lg font-bold">Safety Snapshot</h2>
            <p className={fieldNoteClass}>Approval gates and API-readiness indicators for the selected workspace.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[921px]:grid-cols-3">
          <Notice>
            <CheckCircle2 size={16} /> Mock publishing enabled.
          </Notice>
          <Notice>
            <Clock3 size={16} /> Approval required before publishing.
          </Notice>
          <Notice tone={failedLogs.length > 0 ? "warning" : "info"}>
            <TriangleAlert size={16} /> {failedLogs.length} blocked or failed log entries.
          </Notice>
        </div>
      </Panel>
    </Shell>
  );
}
