// src/components/PhaseTasksModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { taskService } from "@/services/taskService";
import type { Database } from "@/integrations/supabase/types";

type TaskRow = Database["public"]["Tables"]["project_tasks"]["Row"];

interface PhaseTasksModalProps {
  projectId: string;
  phaseId: string;
  onClose: () => void;
}

export function PhaseTasksModal({ projectId, phaseId, onClose }: PhaseTasksModalProps) {
  const { data: tasks = [], isLoading, error } = useQuery<TaskRow[]>({
    queryKey: ["phase-tasks", phaseId],
    queryFn: () => taskService.listByPhase(phaseId), // <-- ONE ARG
    enabled: !!phaseId,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Phase Tasks</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && (
          <p className="text-sm text-red-500">
            Failed to load tasks. Please try again.
          </p>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        )}

        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between border rounded p-2">
              <span className="text-sm">
                {t.title}{" "}
                {t.due_date && (
                  <span className="text-muted-foreground">
                    (due {new Date(t.due_date).toLocaleDateString()})
                  </span>
                )}
              </span>
              <span className="text-xs uppercase text-muted-foreground">{t.status}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
          Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
