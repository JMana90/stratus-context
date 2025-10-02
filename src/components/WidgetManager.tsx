import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { INDUSTRY_WIDGETS, type WidgetId } from "@/config/industry-widgets";
import { useToast } from "@/hooks/use-toast";

const ALL_WIDGETS: { id: WidgetId; label: string }[] = [
  { id: "budget-overview", label: "Budget Overview" },
  { id: "project-contacts", label: "Project Contacts" },
  { id: "doc-repo", label: "Document Repository" },
  { id: "project-photos", label: "Project Photos" },
  { id: "delay-tracker", label: "Delay Tracker" },
  { id: "timeline", label: "Timeline" },
  { id: "meeting-minutes", label: "Meeting Minutes" },
];

interface WidgetManagerProps {
  projectId: string;
  currentWidgets: string[];
  onWidgetsUpdate: (widgets: string[]) => void;
}

export function WidgetManager({ projectId, currentWidgets, onWidgetsUpdate }: WidgetManagerProps) {
  const [open, setOpen] = React.useState(false);
  const [widgets, setWidgets] = React.useState<string[]>(currentWidgets);
  const [saving, setSaving] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setWidgets(currentWidgets);
  }, [currentWidgets]);

  const toggleWidget = (widgetId: string) => {
    setWidgets(prev => 
      prev.includes(widgetId)
        ? prev.filter(w => w !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { dashboardService } = await import("@/services/dashboardService");
      const dashboard = await dashboardService.getDashboard(projectId);
      
      if (dashboard) {
        await dashboardService.updateDashboard(projectId, { widgets: widgets });
      } else {
        await dashboardService.createDashboard({
          project_id: projectId,
          widgets: widgets,
        });
      }

      onWidgetsUpdate(widgets);
      toast({
        title: "Success",
        description: "Widget configuration saved successfully.",
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to save widgets:", error);
      toast({
        title: "Error",
        description: "Failed to save widget configuration.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Manage Widgets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Dashboard Widgets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure which widgets appear on your dashboard. Project Overview, Next Steps, and Action Items are always visible.
          </p>
          <div className="space-y-3">
            {ALL_WIDGETS.map(widget => (
              <div key={widget.id} className="flex items-center justify-between">
                <Label htmlFor={widget.id} className="text-sm font-normal">
                  {widget.label}
                </Label>
                <Switch
                  id={widget.id}
                  checked={widgets.includes(widget.id)}
                  onCheckedChange={() => toggleWidget(widget.id)}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}