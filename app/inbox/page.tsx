import { MessageSquareReply } from "lucide-react";
import { Shell } from "@/components/shell";
import { Panel, TableShell, tableClass, tdClass, thClass } from "@/components/ui";
import { engagementItems } from "@/lib/mock-data";

export default function InboxPage() {
  return (
    <Shell title="Engagement Inbox" subtitle="Mock comment intake, lead classification, assignment, and safe reply suggestions.">
      <Panel>
        <TableShell>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Platform</th>
                  <th className={thClass}>Message</th>
                  <th className={thClass}>Lead</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Assigned</th>
                  <th className={thClass}>AI Reply Suggestion</th>
                </tr>
              </thead>
              <tbody>
                {engagementItems.map((item) => (
                  <tr className="hover:bg-blue-50" key={item.id}>
                    <td className={`${tdClass} capitalize`}>{item.platform}</td>
                    <td className={tdClass}>{item.message}</td>
                    <td className={tdClass}>
                      <span className={`inline-flex min-h-6 items-center rounded-full px-2 py-[3px] text-xs font-bold ${item.leadScore === "hot" ? "bg-[#fee2e2] text-danger" : "bg-[#fef3c7] text-warn"}`}>
                        {item.leadScore}
                      </span>
                    </td>
                    <td className={tdClass}>{item.status}</td>
                    <td className={tdClass}>{item.assignedTo}</td>
                    <td className={tdClass}>
                      <MessageSquareReply size={16} /> {item.suggestedReply}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </TableShell>
      </Panel>
    </Shell>
  );
}
