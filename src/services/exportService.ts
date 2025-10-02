// src/services/exportService.ts
import { supabase } from "@/integrations/supabase/client";

type Snapshot = {
  project: { id: string; name: string | null; created_at?: string | null };
  phases: any[];
  tasks: any[];
  documents: any[];
  photos: any[];
  delays: any[];
  phase_costs?: any[]; // optional table
};

async function buildSnapshot(projectId: string): Promise<Snapshot> {
  const results = await Promise.allSettled([
    supabase.from("projects").select("id,name,created_at").eq("id", projectId).single(),
    supabase.from("project_phases").select("*").eq("project_id", projectId).order("order_index", { ascending: true }),
    supabase.from("project_tasks").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    supabase.from("documents").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    supabase.from("project_photos").select("*").eq("project_id", projectId).order("taken_at", { ascending: true }),
    supabase.from("project_delays").select("*").eq("project_id", projectId).order("start_date", { ascending: true }),
    // Optional table: phase_costs
    (supabase as any).from("phase_costs").select("*").eq("project_id", projectId),
  ]);

  const safe = <T>(i: number, fallback: T) =>
    results[i].status === "fulfilled" && !(results[i] as any).value.error
      ? ((results[i] as any).value.data as T)
      : fallback;

  const project = safe<{ id: string; name: string | null; created_at?: string | null }>(0, { id: projectId, name: null });
  const phases   = safe<any[]>(1, []);
  const tasks    = safe<any[]>(2, []);
  const documents= safe<any[]>(3, []);
  const photos   = safe<any[]>(4, []);
  const delays   = safe<any[]>(5, []);
  const phase_costs = safe<any[]>(6, []);

  return { project, phases, tasks, documents, photos, delays, phase_costs };
}

async function getInsights(snapshot: Snapshot): Promise<string[] | null> {
  try {
    const resp = await fetch("/.netlify/functions/lovable-llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Provide at most 6 succinct insights or recommendations for future similar projects.",
        snapshot,
      }),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const text: string | undefined = json.generatedText || json.text || json.content;
    if (Array.isArray(json.insights)) {
      return (json.insights as string[]).slice(0, 6);
    }
    if (text) {
      const lines = String(text)
        .split(/\r?\n/)
        .map((l: string) => l.replace(/^[-•\d+.\)\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 6);
      return lines.length ? lines : null;
    }
    return null;
  } catch {
    return null;
  }
}

function toMarkdown(s: Snapshot, insights?: string[]): string {
  const esc = (v: any) => (v === null || v === undefined ? "" : String(v));
  const lines: string[] = [];
  lines.push(`# Project Summary — ${esc(s.project.name) || s.project.id}`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  // Phases summary
  lines.push("## Phases");
  if (!s.phases.length) lines.push("- (none)");
  else s.phases.forEach((p: any) => lines.push(`- **${esc(p.name)}** (${esc(p.start_date)} → ${esc(p.end_date)}), ${esc(p.percent_complete)}%`));
  lines.push("");

  // Timeline
  lines.push("## Timeline");
  if (!s.phases.length) {
    lines.push("- (no timeline data)");
  } else {
    const dates = s.phases.map((p: any) => ({ s: p.start_date ? new Date(p.start_date) : null, e: p.end_date ? new Date(p.end_date) : null }));
    const starts = dates.map(d => d.s).filter(Boolean) as Date[];
    const ends = dates.map(d => d.e).filter(Boolean) as Date[];
    const plannedStart = starts.length ? new Date(Math.min(...starts.map(d => d.getTime()))) : null;
    const plannedEnd = ends.length ? new Date(Math.max(...ends.map(d => d.getTime()))) : null;
    const avgPct = Math.round(
      s.phases
        .map((p: any) => (typeof p.percent_complete === "number" ? p.percent_complete : parseFloat(p.percent_complete || "0")))
        .filter((n: number) => !Number.isNaN(n))
        .reduce((a: number, b: number, _, arr: number[]) => a + b / arr.length, 0)
    );
    lines.push(`- Planned: ${plannedStart ? plannedStart.toISOString().slice(0, 10) : "n/a"} → ${plannedEnd ? plannedEnd.toISOString().slice(0, 10) : "n/a"}`);
    lines.push(`- Actual progress: ~${Number.isFinite(avgPct) ? avgPct : 0}% complete`);
  }
  lines.push("");

  // Costs
  lines.push("## Costs");
  const costs = (s.phase_costs || []) as any[];
  if (!costs.length) {
    lines.push("- (no cost data)");
  } else {
    let totalForecast = 0;
    let totalActual = 0;
    for (const c of costs) {
      const phaseName = s.phases.find((p: any) => p.id === c.phase_id)?.name || c.phase_id || "Unassigned";
      const forecast = Number(c.forecast ?? c.estimated ?? 0);
      const actual = Number(c.actual ?? c.spent ?? 0);
      if (Number.isFinite(forecast)) totalForecast += forecast;
      if (Number.isFinite(actual)) totalActual += actual;
      lines.push(`- ${phaseName}: forecast ${isNaN(forecast) ? "n/a" : forecast.toLocaleString()} vs actual ${isNaN(actual) ? "n/a" : actual.toLocaleString()}`);
    }
    lines.push(`- Total: forecast ${totalForecast.toLocaleString()} vs actual ${totalActual.toLocaleString()}`);
  }
  lines.push("");

  // Tasks
  lines.push("## Tasks");
  if (!s.tasks.length) lines.push("- (none)");
  else s.tasks.forEach((t: any) => lines.push(`- [${esc(t.status)}] ${esc(t.title)} — due ${esc(t.due_date) || "n/a"}`));
  lines.push("");

  // Documents
  lines.push("## Documents");
  if (!s.documents.length) lines.push("- (none)");
  else s.documents.forEach((d: any) => lines.push(`- ${esc(d.name)} ${d.category ? `(cat: ${esc(d.category)})` : ""}`));
  lines.push("");

  // Photos
  lines.push("## Photos");
  lines.push(s.photos.length ? `- ${s.photos.length} photo(s)` : "- (none)");
  lines.push("");

  // Delays by Phase
  lines.push("## Delays by Phase");
  if (!s.delays.length) {
    lines.push("- (none)");
  } else {
    const byPhase: Record<string, any[]> = {};
    for (const d of s.delays) {
      const phaseId = (d as any).phase_id || null;
      const name = phaseId ? (s.phases.find((p: any) => p.id === phaseId)?.name || "Unknown phase") : "Unassigned";
      const key = name;
      byPhase[key] = byPhase[key] || [];
      byPhase[key].push(d);
    }
    Object.entries(byPhase).forEach(([phaseName, arr]) => {
      lines.push(`- ${phaseName}: ${arr.length} delay(s)`);
    });
  }
  lines.push("");

  // Insights
  if (insights && insights.length) {
    lines.push("## Insights");
    insights.forEach((i) => lines.push(`- ${i}`));
    lines.push("");
  }

  return lines.join("\n");
}


function triggerDownload(filename: string, mime: string, data: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const exportService = {
  async exportProjectSummary(projectId: string, format: "md" | "json" = "md") {
    const snapshot = await buildSnapshot(projectId);

    if (format === "json") {
      triggerDownload(
        `project-${projectId}-summary.json`,
        "application/json;charset=utf-8",
        JSON.stringify(snapshot, null, 2)
      );
      return;
    }

    // default: markdown with optional AI insights
    const insights = await getInsights(snapshot);
    const md = toMarkdown(snapshot, insights ?? undefined);
    triggerDownload(`project-${projectId}-summary.md`, "text/markdown;charset=utf-8", md);
  },
};