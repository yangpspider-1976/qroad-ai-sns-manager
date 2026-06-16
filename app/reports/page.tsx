"use client";

import { FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, ConfirmationModal, Notice, Panel, StatCard, TableShell, fieldNoteClass, sectionHeadingClass, tableClass, tdClass, thClass } from "@/components/ui";
import { useSelectedWorkspaceId } from "@/components/workspace-switcher";
import { postDrafts, postMetrics } from "@/lib/mock-data";

type ReportMetric = (typeof postMetrics)[number] & {
  postDraft?: {
    videoScript?: {
      thumbnailText?: string;
    };
  };
};

export default function ReportsPage() {
  const selectedWorkspaceId = useSelectedWorkspaceId();
  const [message, setMessage] = useState("Export a lightweight HTML report for client review.");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [metrics, setMetrics] = useState<ReportMetric[]>(postMetrics);
  const [recommendation, setRecommendation] = useState(
    "Continue practical audit content, then test proof-based variants with client-safe examples and a clear consultation CTA."
  );
  const totals = useMemo(
    () =>
      metrics.reduce(
    (acc, metric) => ({
      reach: acc.reach + metric.reach,
      engagement: acc.engagement + metric.engagement,
      leads: acc.leads + metric.leads
    }),
    { reach: 0, engagement: 0, leads: 0 }
      ),
    [metrics]
  );

  useEffect(() => {
    async function loadReport() {
      const response = await fetch(`/api/reports?workspaceId=${selectedWorkspaceId}`);
      if (!response.ok) return;
      const data = await response.json();
      setMetrics(data.metrics);
      setRecommendation(data.recommendation);
      setMessage("Loaded report metrics from database.");
    }
    void loadReport();
  }, [selectedWorkspaceId]);

  function exportReport() {
    const rows = metrics
      .map((metric) => {
        const draft = postDrafts.find((item) => item.id === metric.postDraftId);
        const title = metric.postDraft?.videoScript?.thumbnailText ?? draft?.videoScript.thumbnailText ?? "Post";
        return `<tr><td>${title}</td><td>${metric.reach}</td><td>${metric.engagement}</td><td>${metric.leads}</td></tr>`;
      })
      .join("");
    const html = `<!doctype html><title>QROAD Monthly SNS Report</title><h1>QROAD Monthly SNS Report</h1><p>Total reach: ${totals.reach}</p><p>Total leads: ${totals.leads}</p><table border="1" cellpadding="8"><tr><th>Post</th><th>Reach</th><th>Engagement</th><th>Leads</th></tr>${rows}</table>`;
    const link = document.createElement("a");
    link.download = "qroad-sns-report.html";
    link.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    link.click();
    setMessage("Exported qroad-sns-report.html.");
  }

  return (
    <Shell title="Reports" subtitle="Performance summary and next-action recommendations for managers and clients.">
      <div className="grid grid-cols-1 gap-4 min-[921px]:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Panel>
          <div className={sectionHeadingClass}>
            <div>
              <h2 className="m-0 text-lg font-bold">Post Performance</h2>
              <p className={fieldNoteClass}>Manual/mock metrics for early MVP validation.</p>
            </div>
            <Button onClick={() => setIsExportOpen(true)} type="button" variant="secondary">
              <FileText size={16} /> Export report
            </Button>
          </div>
          <TableShell>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Post</th>
                    <th className={thClass}>Reach</th>
                    <th className={thClass}>Engagement</th>
                    <th className={thClass}>Clicks</th>
                    <th className={thClass}>Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => {
                    const draft = postDrafts.find((item) => item.id === metric.postDraftId);
                    const title = metric.postDraft?.videoScript?.thumbnailText ?? draft?.videoScript.thumbnailText ?? "Post";
                    return (
                      <tr key={metric.postDraftId}>
                        <td className={tdClass}>{title}</td>
                        <td className={tdClass}>{metric.reach.toLocaleString()}</td>
                        <td className={tdClass}>{metric.engagement.toLocaleString()}</td>
                        <td className={tdClass}>{metric.clicks.toLocaleString()}</td>
                        <td className={tdClass}>{metric.leads}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          </TableShell>
        </Panel>
        <Panel>
          <h2 className="m-0 text-lg font-bold">AI Summary</h2>
          <div className="mt-4 grid gap-4">
            <StatCard label="Total reach" value={totals.reach.toLocaleString()} />
            <StatCard label="Total engagement" value={totals.engagement.toLocaleString()} />
            <StatCard label="Lead signals" value={totals.leads} />
            <Notice>
              {recommendation}
            </Notice>
            <Notice>{message}</Notice>
          </div>
        </Panel>
      </div>
      {isExportOpen ? (
        <ConfirmationModal
          body="This creates a lightweight HTML report with the current mock performance metrics and AI recommendation."
          confirmLabel="Export report"
          confirmVariant="primary"
          onCancel={() => setIsExportOpen(false)}
          onConfirm={() => {
            exportReport();
            setIsExportOpen(false);
          }}
          subtitle="The report file will be downloaded locally."
          title="Export monthly report"
        />
      ) : null}
    </Shell>
  );
}
