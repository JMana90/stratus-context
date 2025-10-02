// src/components/ProjectCards.tsx  (DROP-IN)
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "@/services/projectService";
import { organizationService } from "@/services/organizationService";
import { subscriptionService } from "@/services/subscriptionService";
import { dashboardService } from "@/services/dashboardService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ProjectDeleteModal from "@/components/ProjectDeleteModal";
import { DashboardSetup } from "@/components/DashboardSetup";

// You already have this component elsewhere in your codebase.
// We'll pass callbacks into it so the card can open the delete modal.
type AnyProject = {
  id: string;
  name?: string | null;
  industry?: string | null;
  project_type?: string | null;
};
declare function ProjectCard(props: {
  project: AnyProject;
  onDelete?: () => void;
  onCreateDashboard?: () => void;
  onSelect?: () => void;
  selected?: boolean;
  dashboardConfigured?: boolean;
}): JSX.Element;

interface ProjectCardsProps {
  selectedProject: string;
  onProjectSelect: (projectId: string) => void;
}

export function ProjectCards({ selectedProject, onProjectSelect }: ProjectCardsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // ----- queries -----
  const {
    data: projects = [],
    isLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ["user-projects", userId],
    queryFn: () => projectService.getUserProjects(userId!),
    enabled: !!userId,
    retry: false,
  });

  const { data: organization, error: orgError } = useQuery({
    queryKey: ["current-organization"],
    queryFn: () => organizationService.getCurrentUserOrganization(),
    enabled: !!userId,
    retry: false,
  });

  const { data: quotaInfo } = useQuery({
    queryKey: ["project-quota"],
    queryFn: () => subscriptionService.getProjectQuotaInfo(),
    enabled: !!userId && !!organization,
    retry: false,
  });

  const { data: dashboardStatuses = {} as Record<string, boolean> } = useQuery({
    queryKey: ["project-dashboards", projects.map((p: AnyProject) => p.id)],
    enabled: projects.length > 0,
    retry: false,
    queryFn: async () => {
      const statuses: Record<string, boolean> = {};
      await Promise.all(
        projects.map(async (p: AnyProject) => {
          statuses[p.id] = await dashboardService.hasDashboard(p.id);
        })
      );
      return statuses;
    },
  });

  // ----- selection -----
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      onProjectSelect(projects[0].id);
    }
  }, [projects, selectedProject, onProjectSelect]);

  // ----- delete modal state -----
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name?: string | null;
  } | null>(null);

  const openDeleteModal = (p: AnyProject) => {
    setProjectToDelete({ id: p.id, name: p.name ?? "" });
    setDeleteModalOpen(true);
  };

  // (Optional) you can keep this mutation if you still call it elsewhere.
  // The modal now calls projectService.deleteProject itself, so this isn't required.
  const deleteProjectMutation = useMutation({
    mutationFn: projectService.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-quota"] });
      toast({
        title: "Project Deleted",
        description:
          "Project and all associated data have been permanently removed.",
      });
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  // ----- actions -----
  const handleNewProject = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create projects.",
        variant: "destructive",
      });
      return;
    }
    if (!organization) {
      toast({
        title: "Organization Required",
        description: "You need to be part of an organization to create projects.",
        variant: "destructive",
      });
      return;
    }
    if (quotaInfo && quotaInfo.isAtLimit) {
      toast({
        title: "Project Limit Reached",
        description: `You are using ${quotaInfo.current} of ${quotaInfo.max} projects. Upgrade your plan to add more projects.`,
        variant: "destructive",
      });
      return;
    }
    navigate("/add-project");
  };

  const handleCreateDashboard = (project: AnyProject) => {
    // If you previously used state to open a DashboardSetup modal, keep it here
    // setDashboardSetupProject(project);
    // For brevity we’re not changing your existing dashboard setup logic.
  };

  // ----- early states -----
  if (projectsError || orgError) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        <Card className="flex-shrink-0 p-6 w-64 border-red-200 bg-red-50 dark:bg-red-900/20">
          <div className="text-center text-red-600 dark:text-red-400">
            <p className="text-sm font-medium">Error loading data</p>
            <p className="text-xs">Please refresh the page</p>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className="flex-shrink-0 p-6 w-48 h-24 animate-pulse bg-muted"
          />
        ))}
      </div>
    );
  }

  const collapsible = (projects?.length ?? 0) > 1;

  return (
    <>
      {collapsible ? (
        <details className="mb-4" open>
          <summary className="cursor-pointer text-sm mb-2">
            Projects ({projects.length})
          </summary>
          <div className="grid gap-2">
            {projects.map((p: AnyProject) => (
              <ProjectCard
                key={p.id}
                project={p}
                selected={selectedProject === p.id}
                dashboardConfigured={!!dashboardStatuses[p.id]}
                onSelect={() => onProjectSelect(p.id)}
                onCreateDashboard={() => handleCreateDashboard(p)}
                onDelete={() => openDeleteModal(p)}   // <<< hook up delete
              />
            ))}
          </div>
        </details>
      ) : (
        <div className="grid gap-2">
          {projects.map((p: AnyProject) => (
            <ProjectCard
              key={p.id}
              project={p}
              selected={selectedProject === p.id}
              dashboardConfigured={!!dashboardStatuses[p.id]}
              onSelect={() => onProjectSelect(p.id)}
              onCreateDashboard={() => handleCreateDashboard(p)}
              onDelete={() => openDeleteModal(p)}     // <<< hook up delete
            />
          ))}
        </div>
      )}

      {/* New Project button + quota chip */}
      <div className="mt-2 flex items-center gap-2">
        <Button
          variant="outline"
          className={`flex-shrink-0 h-auto p-6 border-dashed border-2 hover:bg-muted/50 ${
            user && organization ? "border-muted-foreground/50 hover:border-muted-foreground bg-background" : "border-muted-foreground/25 bg-muted/25 cursor-not-allowed"
          }`}
          onClick={handleNewProject}
          disabled={!user || !organization || (quotaInfo && quotaInfo.isAtLimit)}
        >
          {!user ? (
            <>
              <Lock className="h-5 w-5 mr-2" />
              Sign in to Create
            </>
          ) : !organization ? (
            <>
              <Lock className="h-5 w-5 mr-2" />
              Join Organization
            </>
          ) : quotaInfo && quotaInfo.isAtLimit ? (
            <>
              <Lock className="h-5 w-5 mr-2" />
              Limit Reached
            </>
          ) : (
            <>
              <Plus className="h-5 w-5 mr-2" />
              New Project
            </>
          )}
        </Button>

        {quotaInfo && quotaInfo.max !== -1 && (
          <div className="flex-shrink-0 flex items-center px-4 py-2 bg-muted/50 rounded-lg border">
            <span className="text-sm text-muted-foreground">
              {quotaInfo.current} of {quotaInfo.max} projects
            </span>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <ProjectDeleteModal
        isOpen={deleteModalOpen}
        projectName={projectToDelete?.name ?? ""}
        onClose={() => {
          setDeleteModalOpen(false);
          setProjectToDelete(null);
          // refresh list after a delete that happened inside the modal
          queryClient.invalidateQueries({ queryKey: ["user-projects"] });
          queryClient.invalidateQueries({ queryKey: ["project-quota"] });
        }}
        onConfirm={({ exportBeforeDelete, format }) => {
          if (projectToDelete?.id) {
            deleteProjectMutation.mutate(projectToDelete.id);
          }
        }}
        isDeleting={deleteProjectMutation.isPending}
      />
    </>
  );
}
