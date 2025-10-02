import { useQuery } from "@tanstack/react-query";
import { taskService } from "@/services/taskService";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ActionItemsCardProps {
  projectId: string;
  onDraft?: (taskId: string) => void; // We'll use this to open a draft modal
}

export default function ActionItemsCard({ projectId, onDraft }: ActionItemsCardProps) {
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["action-items", projectId],
    queryFn: () => taskService.listByProject(projectId),
    enabled: !!projectId,
  });

  const pending = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return ad - bd;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Action Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <div className="text-sm text-red-500 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Failed to load
          </div>
        )}

        {!isLoading && pending.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No pending action items. Generate some with AI or add tasks to phases.
          </p>
        )}

        {pending.slice(0, 3).map((t) => (
          <div key={t.id} className="border rounded-md p-3 flex justify-between items-start">
          <div>
            <div className="font-medium">{t.title}</div>
            {t.due_date && (
              <div className="text-xs text-muted-foreground">
                Due {new Date(t.due_date).toLocaleString()}
              </div>
            )}
          </div>
          <Button size="sm" onClick={() => onDraft?.(t.id)}>
            Draft & Execute
          </Button>
        </div>
        ))}
      </CardContent>
    </Card>
  );
}
