import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ProjectLimitWarningProps {
  current: number;
  limit: number;
  plan: string;
}

export function ProjectLimitWarning({ current, limit, plan }: ProjectLimitWarningProps) {
  if (current < limit) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        Project limit reached for your {plan} plan. You have {current} of {limit} projects allowed.
        {plan === "free" && " Upgrade to Professional for up to 5 projects."}
      </AlertDescription>
    </Alert>
  );
}