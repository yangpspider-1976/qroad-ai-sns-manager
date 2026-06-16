"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
import { Button, Modal, Notice, Panel, TableShell, tableClass, tdClass, thClass } from "@/components/ui";
import type { Workspace } from "@/lib/types";

export function WorkspacesClient({ initialWorkspaces }: { initialWorkspaces: Workspace[] }) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [message, setMessage] = useState(`Loaded ${initialWorkspaces.length} workspace records from the local database.`);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("New Client Workspace");

  async function createWorkspace() {
    const name = workspaceName.trim();
    if (!name) return;
    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, timezone: "Asia/Manila" })
    });
    if (!response.ok) {
      setMessage("Workspace creation failed.");
      return;
    }
    const data = await response.json();
    setWorkspaces((current) => [...current, data.workspace]);
    setMessage(`Created workspace: ${name}`);
    setWorkspaceName("New Client Workspace");
    setIsCreateOpen(false);
  }

  return (
    <Shell
      title="Workspaces"
      subtitle="Separate each QROAD brand or client so content, approvals, and logs stay scoped."
      actions={
        <Button onClick={() => setIsCreateOpen(true)} type="button">
          <Plus size={16} /> New workspace
        </Button>
      }
    >
      <Panel>
        <TableShell>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Owner</th>
                <th className={thClass}>Timezone</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Brand CTA</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((workspace) => (
                <tr
                  className="cursor-pointer hover:bg-blue-50"
                  key={workspace.id}
                  onClick={() => router.push(`/workspaces/${workspace.id}/settings`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/workspaces/${workspace.id}/settings`);
                    }
                  }}
                  tabIndex={0}
                >
                  <td className={tdClass}>
                    <a href={`/workspaces/${workspace.id}/settings`}>
                      <strong>{workspace.name}</strong>
                    </a>
                  </td>
                  <td className={tdClass}>{workspace.ownerName}</td>
                  <td className={tdClass}>{workspace.timezone}</td>
                  <td className={tdClass}>
                    <span className="inline-flex min-h-6 items-center rounded-full bg-[#dcfce7] px-2 py-[3px] text-xs font-bold text-ok">
                      {workspace.status}
                    </span>
                  </td>
                  <td className={tdClass}>{workspace.brandProfile.defaultCta}</td>
                </tr>
              ))}
              {workspaces.length === 0 ? (
                <tr>
                  <td className={tdClass} colSpan={5}>
                    No workspaces found. Run <code>npm run seed</code> or create a workspace.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableShell>
        <Notice className="mt-4">{message}</Notice>
      </Panel>
      {isCreateOpen ? (
        <Modal
          footer={
            <>
              <Button onClick={() => setIsCreateOpen(false)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button onClick={createWorkspace} type="button">
                Create workspace
              </Button>
            </>
          }
          onClose={() => setIsCreateOpen(false)}
          subtitle="Create a separate workspace for a brand or client. This demo stores it in the local database."
          title="Create workspace"
        >
          <label>
            Workspace name
            <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
          </label>
        </Modal>
      ) : null}
    </Shell>
  );
}
