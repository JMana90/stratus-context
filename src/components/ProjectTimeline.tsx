import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { projectService } from "@/services/projectService";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";
import { PhaseTasksModal } from "./PhaseTasksModal";
import { differenceInDays } from "date-fns";
// ⬇️ Optional: get strong types from your generated Supabase types
import type { Database } from "@/integrations/supabase/types";

type PhaseRow = Database["public"]["Tables"]["project_phases"]["Row"];

interface ProjectTimelineProps {
  projectId: string;
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const [openPhaseId, setOpenPhaseId] = useState<string | null>(null);

  const {
    data: phases = [],
    isLoading,
    error,
  } = useQuery<PhaseRow[]>({
    queryKey: ["phases", projectId],
    queryFn: () => projectService.getPhasesForProject(projectId),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>Loading...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Project Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>Error loading timeline</CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = phases.map((p) => {
    const start = p.start_date ? new Date(p.start_date) : null;
    const end = p.end_date ? new Date(p.end_date) : null;
    const duration =
      start && end ? Math.max(0, differenceInDays(end, start)) : 0;

    return {
      id: p.id,
      name: p.name,
      duration,
      percent: Number(p.percent_complete || 0),
    };
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Project Timeline
        </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chartData.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No phases yet. Add one to get started.
            </p>
          )}

          {chartData.length > 0 && (
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 100, bottom: 10 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "duration") return [`${value} days`, "Duration"];
                      if (name === "percent") return [`${value}%`, "Complete"];
                      return value as string;
                    }}
                    labelFormatter={(label) => label as string}
                  />
                  <Bar
                    dataKey="duration"
                    fill="var(--primary)"
                    cursor="pointer"
                    onClick={(_, idx) => setOpenPhaseId(chartData[idx].id)}
                  >
                    <LabelList
                      dataKey="percent"
                      position="inside"
                      formatter={(v: any) => `${v}%`}
                      fill="#fff"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {openPhaseId && (
        <PhaseTasksModal
          projectId={projectId}
          phaseId={openPhaseId}
          onClose={() => setOpenPhaseId(null)}
        />
      )}
    </>
  );
}
