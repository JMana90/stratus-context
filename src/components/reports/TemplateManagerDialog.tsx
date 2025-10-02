import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { TemplateManager } from "@/components/reports/TemplateManager";

interface TemplateManagerDialogProps {
  projectId: string;
  organizationId: string;
}

export function TemplateManagerDialog({ projectId, organizationId }: TemplateManagerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Templates</DialogTitle>
        </DialogHeader>
        <TemplateManager
          projectId={projectId}
          organizationId={organizationId}
          onClose={() => setIsOpen(false)}
          onSaved={() => {
            // Keep dialog open to show saved template in list
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
