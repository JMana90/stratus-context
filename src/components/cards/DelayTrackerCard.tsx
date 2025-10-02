import React from "react";
import SectionCard from "@/components/cards/SectionCard";
import { delayService, DelayRow } from "@/services/delayService";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const CATEGORIES = ["weather", "permit", "vendor", "other"] as const;

export default function DelayTrackerCard({ projectId, title }: { projectId: string; title?: string }) {
  const { toast } = useToast();
  const [reason, setReason] = React.useState("");
  const [category, setCategory] = React.useState<typeof CATEGORIES[number]>("weather");
  const [start, setStart] = React.useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [end, setEnd] = React.useState<string>("");

  const queryClient = useQueryClient();
  const { data: delays = [], isLoading } = useQuery({
    queryKey: ["project-delays", projectId],
    queryFn: () => delayService.list(projectId),
  });

  const { mutate: logDelay, isPending } = useMutation({
    mutationFn: (input: { project_id: string; reason: string; category: string; start_date: string; end_date: string | null; notes?: string; }) =>
      delayService.create(input),
    onSuccess: async () => {
      toast({ title: "Delay logged", description: "Your delay has been added." });
      setReason("");
      setEnd("");
      await queryClient.invalidateQueries({ queryKey: ["project-delays", projectId] });
    },
    onError: (e: any) => {
      toast({ title: "Failed to log delay", description: e?.message || "Please try again.", variant: "destructive" });
    },
  });

  return (
    <SectionCard title={title ?? "Delay Tracker"}>
      <div className="grid gap-2 md:grid-cols-2 mb-4">
        <select className="border rounded p-2" value={category} onChange={(e)=>setCategory(e.target.value as any)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="border rounded p-2" type="date" value={start} onChange={(e)=>setStart(e.target.value)} />
        <input className="border rounded p-2" type="date" value={end} onChange={(e)=>setEnd(e.target.value)} />
        <input className="border rounded p-2" type="text" placeholder="Reason / notes" value={reason} onChange={(e)=>setReason(e.target.value)} />
        <div className="md:col-span-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!reason || isPending}
            onClick={() =>
              logDelay({
                project_id: projectId,
                reason,
                category,
                start_date: start,
                end_date: end || null,
                notes: reason,
              })
            }
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"></span>
                Logging…
              </span>
            ) : (
              "Log Delay"
            )}
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {delays.map(d => (
          <li key={d.id} className="text-sm">
            <strong className="capitalize">{d.category}</strong> — {format(new Date(d.start_date), "MM/dd/yyyy")}
            {d.end_date && <> → {format(new Date(d.end_date), "MM/dd/yyyy")}</>}
            <div className="text-xs text-slate-500 dark:text-slate-400">{d.notes}</div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}