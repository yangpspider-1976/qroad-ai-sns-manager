"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Notice, Panel, TableShell, fieldNoteClass, sectionHeadingClass, tableClass, tdClass, thClass } from "@/components/ui";
import { useSelectedWorkspaceId } from "@/components/workspace-switcher";

type PublishLogRow = {
  id: string;
  platform: string;
  platformPostId?: string | null;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  postDraft: {
    caption: string;
    status: string;
  };
};

export default function PublishingLogsPage() {
  const selectedWorkspaceId = useSelectedWorkspaceId();
  const [logs, setLogs] = useState<PublishLogRow[]>([]);
  const [message, setMessage] = useState("Publishing logs are loaded from the local database.");

  async function loadLogs() {
    const response = await fetch(`/api/publish-logs?workspaceId=${selectedWorkspaceId}`);
    if (!response.ok) {
      setMessage("Failed to load publishing logs.");
      return;
    }
    const data = await response.json();
    setLogs(data.logs);
    setMessage(`Loaded ${data.logs.length} publishing log entries.`);
  }

  useEffect(() => {
    void loadLogs();
  }, [selectedWorkspaceId]);

  return (
    <Shell title="Publishing Logs" subtitle="Debug mock publishing results, failed jobs, and stored platform IDs.">
      <Panel>
        <div className={sectionHeadingClass}>
          <div>
            <h2 className="m-0 text-lg font-bold">Latest Logs</h2>
            <p className={fieldNoteClass}>All publish attempts are stored for operational review.</p>
          </div>
          <Button onClick={() => void loadLogs()} type="button" variant="secondary">
            <RefreshCw size={16} /> Refresh
          </Button>
        </div>
        <TableShell>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Created</th>
                <th className={thClass}>Platform</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Platform Post ID</th>
                <th className={thClass}>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr className="hover:bg-blue-50" key={log.id}>
                  <td className={tdClass}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td className={`${tdClass} capitalize`}>{log.platform}</td>
                  <td className={tdClass}>{log.status}</td>
                  <td className={tdClass}>{log.platformPostId ?? "None"}</td>
                  <td className={tdClass}>{log.errorMessage ?? "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
        <Notice className="mt-4">{message}</Notice>
      </Panel>
    </Shell>
  );
}
