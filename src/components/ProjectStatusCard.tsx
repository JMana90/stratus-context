import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder } from "lucide-react";
import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type PhaseRow = Database['public']['Tables']['project_phases']['Row'];

interface ProjectStatusCardProps {
  phases: PhaseRow[];
  currentPhaseId?: string;
  onPhaseChange?: (phaseId: string) => void;
  isOwner?: boolean;
  budgetInfo?: string; // optional future use
}

export function ProjectStatusCard({
  phases,
  currentPhaseId,
  onPhaseChange,
  isOwner = false,
  budgetInfo
}: ProjectStatusCardProps) {
  const selectedPhase = phases.find(p => p.id === currentPhaseId);
  const [editingName, setEditingName] = useState(false);
  // If you still want to rename the project, you’ll need to pass projectName & a handler instead.

  return (
    <Card className="bg-card shadow-sm border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Folder className="h-4 w-4" />
          {/* Current Phase label */}
          <span className="uppercase tracking-wide text-xs text-muted-foreground">Current Phase:</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Phase dropdown (owner only) */}
        {isOwner && phases.length > 0 ? (
          <select
            className="bg-background border rounded px-2 py-1 text-foreground text-sm"
            value={currentPhaseId}
            onChange={(e) => onPhaseChange?.(e.target.value)}
          >
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <h3 className="text-2xl font-bold">
            {selectedPhase?.name ?? "—"}
          </h3>
        )}

        <p className="text-sm text-muted-foreground">
          {budgetInfo ? budgetInfo : "No budget info yet"}
        </p>
      </CardContent>
    </Card>
  );
}
