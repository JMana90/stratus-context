import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Universal cards (always shown)
import { ProjectStatusCard } from "@/components/ProjectStatusCard";
import NextTaskCard from "@/components/NextTaskCard";
import ActionItemsCard from "@/components/ActionItemsCard";

// Optional widgets
import PlanUsageCard from "@/components/cards/PlanUsageCard";
import SectionCard from "@/components/cards/SectionCard";
import { DocumentRepository } from "@/components/DocumentRepository";
import ProjectPhotosCard from "@/components/cards/ProjectPhotosCard";
import DelayTrackerCard from "@/components/cards/DelayTrackerCard";
import { ProjectTimeline } from "@/components/ProjectTimeline";

// Some existing components (budget/contacts)
import BudgetOverview from "@/components/BudgetOverview";
import ContactsList from "@/components/ContactsList";

// Delete modal and button
import ProjectDeleteModal from "@/components/ProjectDeleteModal";
import { Button } from "@/components/ui/button";
import { Trash2, Settings, Home } from "lucide-react";
import { WidgetManager } from "@/components/WidgetManager";
import { WeeklyUpdateGenerator } from "@/components/reports/WeeklyUpdateGenerator";
import { TemplateManagerDialog } from "@/components/reports/TemplateManagerDialog";

import { projectService } from "@/services/projectService";
import { exportService } from "@/services/exportService";
import { dashboardLayoutService } from "@/services/dashboardLayoutService";
import type { WidgetId, IndustryKey } from "@/config/industry-widgets";

// Role-based dashboard widgets
import { TimelineAtRisk } from "@/components/dashboard/TimelineAtRisk";
import { ProjectContacts } from "@/components/contacts/ProjectContacts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard({
  projectId,
  onProjectDeleted,
}: {
  projectId: string;
  onProjectDeleted?: () => void;
}) {
  const [widgets, setWidgets] = React.useState<string[] | null>(null);
  const [industry, setIndustry] = React.useState<string>("general");
  const [loadingWidgets, setLoadingWidgets] = React.useState(true);
  const [projectName, setProjectName] = React.useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [projectIdToDelete, setProjectIdToDelete] = React.useState<string | null>(null);
  const [currentRole, setCurrentRole] = React.useState<string>('pm');
  const [showLayoutModal, setShowLayoutModal] = React.useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleWidgetsUpdate = (newWidgets: string[]) => {
    setWidgets(newWidgets);
  };

  const loadRoleBasedLayout = React.useCallback(async (role: string) => {
    try {
      const layout = await dashboardLayoutService.getLayout(projectId, role);
      if (layout?.layout_json?.widgets) {
        setWidgets(layout.layout_json.widgets);
      } else {
        // Use default widgets based on role
        const defaults = {
          pm: ['timelineAtRisk', 'contacts', 'minutes'],
          exec: ['timelineAtRisk'],
          qa_reg: ['timelineAtRisk', 'contacts'],
        };
        setWidgets(defaults[role as keyof typeof defaults] || ['timelineAtRisk']);
      }
    } catch (error) {
      console.error('Failed to load role-based layout:', error);
      // Use default widgets based on role
      const defaults = {
        pm: ['timelineAtRisk', 'contacts', 'minutes'],
        exec: ['timelineAtRisk'],
        qa_reg: ['timelineAtRisk', 'contacts'],
      };
      setWidgets(defaults[role as keyof typeof defaults] || ['timelineAtRisk']);
    }
  }, [projectId]);

  const handleRoleChange = (role: string) => {
    setCurrentRole(role);
    loadRoleBasedLayout(role);
  };

  const handleSaveLayout = async (selectedWidgets: string[]) => {
    try {
      await dashboardLayoutService.saveLayout(projectId, currentRole, selectedWidgets);
      setWidgets(selectedWidgets);
      setShowLayoutModal(false);
      toast({
        title: "Layout saved",
        description: `Dashboard layout saved for ${currentRole.toUpperCase()} role`,
      });
    } catch (error) {
      console.error('Failed to save layout:', error);
      toast({
        title: "Save failed",
        description: "Could not save dashboard layout",
        variant: "destructive",
      });
    }
  };
  
  React.useEffect(() => {
    let cancelled = false;
  
    (async () => {
      try {
        // get project name
        const { data: project } = await supabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .single();
        if (!cancelled && project) setProjectName(project.name || "");

        // get industry
        const { data: ip } = await supabase
          .from("industry_profiles")
          .select("industry")
          .eq("project_id", projectId)
          .maybeSingle();
        const ind = (ip?.industry ?? "general").toLowerCase();
        if (!cancelled) setIndustry(ind);
  
        // Load role-based layout instead of industry defaults
        if (!cancelled) {
          await loadRoleBasedLayout(currentRole);
        }
      } catch (e) {
        console.error("Load widgets failed:", e);
        if (!cancelled) setWidgets([]); // will show the “defaults” message
      } finally {
        if (!cancelled) setLoadingWidgets(false);
      }
    })();
  
    return () => { cancelled = true; };
  }, [projectId]);

  function renderWidget(id: string) {
    switch (id) {
      case "timelineAtRisk":
        return <TimelineAtRisk projectId={projectId} />;
      case "contacts":
        return <ProjectContacts projectId={projectId} />;
      case "documents":
        return (
          <SectionCard title="Documents">
            <DocumentRepository projectId={projectId} />
          </SectionCard>
        );
      case "minutes":
        const MeetingMinutesCardLazy = React.lazy(() => import("@/components/cards/MeetingMinutesCard"));
        return (
          <React.Suspense fallback={<div>Loading...</div>}>
            <MeetingMinutesCardLazy projectId={projectId} />
          </React.Suspense>
        );
      case "delayTracker":
        return <DelayTrackerCard projectId={projectId} />;
      // Legacy widget support
      case "budget-overview":
        return (
          <SectionCard title="Budget Overview">
            <BudgetOverview />
          </SectionCard>
        );
      case "project-contacts":
        return (
          <SectionCard title="Project Contacts">
            <ContactsList />
          </SectionCard>
        );
      case "doc-repo":
        return (
          <SectionCard title="Documents">
            <DocumentRepository projectId={projectId} />
          </SectionCard>
        );
      case "project-photos":
        return <ProjectPhotosCard projectId={projectId} />;
      case "delay-tracker":
        return <DelayTrackerCard projectId={projectId} />;
      case "timeline":
        return <ProjectTimeline projectId={projectId} />;
      case "asana-tasks":
        const AsanaTasksCard = React.lazy(() => import("@/components/cards/AsanaTasksCard"));
        return (
          <React.Suspense fallback={<div>Loading...</div>}>
            <AsanaTasksCard projectId={projectId} />
          </React.Suspense>
        );
      case "meeting-minutes":
        const MeetingMinutesCard = React.lazy(() => import("@/components/cards/MeetingMinutesCard"));
        return (
          <React.Suspense fallback={<div>Loading...</div>}>
            <MeetingMinutesCard projectId={projectId} />
          </React.Suspense>
        );
      default:
        console.warn("Unknown widget id:", id);
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Plan/usage (collapsible) */}
      <PlanUsageCard />

      {/* Header with role switcher and dashboard controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">{projectName || "Project Dashboard"}</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Role:</label>
            <Select value={currentRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pm">PM</SelectItem>
                <SelectItem value="exec">Exec</SelectItem>
                <SelectItem value="qa_reg">QA-Reg</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <WeeklyUpdateGenerator 
            projectId={projectId}
            projectName={projectName}
            organizationId={""} // Will be resolved from context
          />
          <TemplateManagerDialog
            projectId={projectId}
            organizationId={""} // Will be resolved from context
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLayoutModal(true)}
          >
            Customize Layout
          </Button>
          <Link to="/">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link to={`/integrations?project=${projectId}`}>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Manage Integrations
            </Button>
          </Link>
        </div>
      </div>

      {/* ALWAYS-ON ROW: Project Overview • Next Steps • Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SectionCard title="Project Overview">
          <ProjectStatusCard phases={[]} />
        </SectionCard>
        <SectionCard title="Next Steps">
          <NextTaskCard projectId={projectId} />
        </SectionCard>
        <SectionCard title="Action Items">
          <ActionItemsCard projectId={projectId} />
        </SectionCard>
      </div>

      {/* ROLE-BASED WIDGETS GRID */}
      {!loadingWidgets && widgets && widgets.length > 0 && (
        <div className="space-y-6">
          {widgets.map((id) => (
            <div key={id}>{renderWidget(id)}</div>
          ))}
        </div>
      )}

      {!loadingWidgets && (!widgets || widgets.length === 0) && (
        <SectionCard title="Dashboard" className="mt-4">
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground mb-4">
              No widgets configured for the <strong>{currentRole.toUpperCase()}</strong> role.
            </div>
            <Button onClick={() => setShowLayoutModal(true)}>
              Customize Layout
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Delete Project Section */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
              setProjectIdToDelete(projectId);   // <-- current dashboard projectId
              setShowDeleteModal(true);
            }}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </Button>
          </div>
        </div>
        
        {/* New ProjectDeleteModal usage — no onConfirm, pass projectId */}
        <ProjectDeleteModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setProjectIdToDelete(null);
          }}
          projectName={projectName ?? ""}
          isDeleting={isDeleting}
          onConfirm={async (opts) => {
            if (!projectIdToDelete) return;
            try {
              setIsDeleting(true);
          
              // 1) Export (optional)
              if (opts?.exportBeforeDelete) {
                await exportService.exportProjectSummary(projectIdToDelete, opts.format ?? "md");
              }

              // 2) Delete in Supabase (your cascade function handles children)
              await projectService.deleteProject(projectIdToDelete);

              // 3) Invalidate lists and navigate away to clear ?project
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["projects"] }),
                queryClient.invalidateQueries({ queryKey: ["user-projects"] }),
              ]);
              navigate("/", { replace: true });

              // 4) Notify parent to refresh local state
              onProjectDeleted?.();
            } catch (err: any) {
              console.error("Delete failed", err);
              toast({
                title: "Delete failed",
                description: err?.message ?? String(err),
                variant: "destructive",
              });
            } finally {
              setIsDeleting(false);
              setShowDeleteModal(false);
              setProjectIdToDelete(null);
            }
          }}
        />

      {/* Layout Customization Modal */}
      <Dialog open={showLayoutModal} onOpenChange={setShowLayoutModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize {currentRole.toUpperCase()} Layout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Select which widgets to show for the {currentRole.toUpperCase()} role:
            </div>
            <LayoutCustomizer
              currentWidgets={widgets || []}
              onSave={handleSaveLayout}
              onCancel={() => setShowLayoutModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );                                                     
}

// Layout Customizer Component
function LayoutCustomizer({ 
  currentWidgets, 
  onSave, 
  onCancel 
}: { 
  currentWidgets: string[]; 
  onSave: (widgets: string[]) => void;
  onCancel: () => void;
}) {
  const [selectedWidgets, setSelectedWidgets] = React.useState<string[]>(currentWidgets);

  const availableWidgets = [
    { id: 'timelineAtRisk', name: 'Timeline & At Risk' },
    { id: 'contacts', name: 'Contacts' },
    { id: 'documents', name: 'Documents' },
    { id: 'minutes', name: 'Meeting Minutes' },
    { id: 'delayTracker', name: 'Delay Tracker' },
  ];

  const toggleWidget = (widgetId: string) => {
    setSelectedWidgets(prev => 
      prev.includes(widgetId) 
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {availableWidgets.map(widget => (
          <div key={widget.id} className="flex items-center space-x-2">
            <Checkbox
              id={widget.id}
              checked={selectedWidgets.includes(widget.id)}
              onCheckedChange={() => toggleWidget(widget.id)}
            />
            <label htmlFor={widget.id} className="text-sm font-medium">
              {widget.name}
            </label>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(selectedWidgets)}>
          Save Layout
        </Button>
      </div>
    </div>
  );
}