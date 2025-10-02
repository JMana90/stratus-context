// src/components/IndustryDashboard.tsx
import React, { useEffect, useState } from "react";
import { industryService } from "@/services/industryService";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";

type StatusSummaryRow = Database["public"]["Tables"]["status_summaries"]["Row"];

export function IndustryDashboard({ projectId }: { projectId: string }) {
  const [industry, setIndustry] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ key: string; items: string[] }>>([]);
  const [summaries, setSummaries] = useState<StatusSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const profile = await industryService.getIndustryProfile(projectId);
      const ind = profile?.industry ?? "general";
      setIndustry(ind);
      const t = await industryService.listTemplatesByIndustry(ind as any);
      setTemplates(t.map((row: any) => ({ key: row.key, items: row.items || [] })));
      const recent = await industryService.listRecentSummaries(projectId);
      setSummaries(recent);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const generate = async () => {
    setRunning(true);
    try {
      await industryService.generateStatusSummary(projectId);
      await load();
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="p-4 border rounded">Loading industry dashboard…</div>;

  return (
    <div className="p-4 border rounded space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Industry Dashboard ({industry})</h3>
        <Button onClick={generate} disabled={running}>
          {running ? "Summarizing…" : "Summarize Status"}
        </Button>
      </div>

      <section>
        <h4 className="font-semibold mb-2">Recommended Templates</h4>
        {templates.length === 0 ? (
          <p className="text-sm text-gray-500">No templates yet.</p>
        ) : (
          <ul className="list-disc list-inside">
            {templates.map((t) => (
              <li key={t.key}>
                <span className="font-medium">{t.key}</span>{" "}
                <span className="text-gray-500">({t.items.length} items)</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4 className="font-semibold mb-2">Recent Status Summaries</h4>
        {summaries.length === 0 ? (
          <p className="text-sm text-gray-500">No summaries yet.</p>
        ) : (
          <ul className="space-y-2">
            {summaries.map((s) => (
              <li key={s.id} className="border rounded p-3">
                <div className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</div>
                <div className="mt-1 whitespace-pre-wrap">{s.summary}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
