import React from "react";
import { useQuery } from "@tanstack/react-query";
import { taskService } from "@/services/taskService";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

type NextTaskCardProps = {
  projectId?: string;          // optional; we fall back to ?project=
  onAddTask?: () => void;
};

export default function NextTaskCard({ projectId, onAddTask }: NextTaskCardProps) {
  // Fallback to ?project=<id> if prop is not provided
  const urlProjectId = React.useMemo(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      return qs.get("project") || undefined;
    } catch {
      return undefined;
    }
  }, []);
  const effectiveProjectId = projectId ?? urlProjectId;

  const { data: nextTask, isLoading, isError } = useQuery({
    queryKey: ["next-task", effectiveProjectId],
    queryFn: () => taskService.getNextTask(effectiveProjectId!),
    enabled: !!effectiveProjectId, // only run when we actually have an id
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Next Task
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* No project selected */}
        {!effectiveProjectId && (
          <p className="text-sm text-muted-foreground">
            Select a project to see your next task.
          </p>
        )}

        {/* Loading */}
        {effectiveProjectId && isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {/* Empty / error state */}
        {effectiveProjectId && !isLoading && (isError || !nextTask) && (
          <div className="text-sm text-muted-foreground">
            No pending tasks. Create one?
            {onAddTask && (
              <div className="mt-2">
                <Button onClick={onAddTask} variant="outline" size="sm">
                  + Add Task
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Happy path */}
        {effectiveProjectId && !isLoading && nextTask && (
          <div className="space-y-1">
            <div className="text-lg font-semibold">{nextTask.title}</div>
            {nextTask.due_date && (
              <div className="text-xs text-muted-foreground">
                Due {new Date(nextTask.due_date).toLocaleDateString()}
              </div>
            )}
            <div className="text-xs text-muted-foreground">{nextTask.status}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
