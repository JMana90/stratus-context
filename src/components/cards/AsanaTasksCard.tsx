import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, Clock, User } from "lucide-react";
import { asanaService, AsanaTask } from "@/services/asanaService";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface AsanaTasksCardProps {
  projectId: string;
}

export default function AsanaTasksCard({ projectId }: AsanaTasksCardProps) {
  // Get the Asana project ID mapping for this project
  const { data: projectMapping } = useQuery({
    queryKey: ['project-asana-mapping', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_integrations')
        .select('settings, organization_integration_id')
        .eq('project_id', projectId)
        .eq('is_enabled', true)
        .single();

      if (!data) return null;

      // Check if the org integration exists and is active
      const { data: orgIntegration } = await supabase
        .from('organization_integrations')
        .select('is_active, provider_id')
        .eq('id', data.organization_integration_id)
        .eq('provider_id', 'asana')
        .single();

      if (!orgIntegration?.is_active) return null;

      return (data.settings as any)?.project_id as string | undefined;
    },
    enabled: !!projectId
  });

  // Fetch Asana tasks if we have a project ID mapping
  const { data: tasksResult, isLoading, error, refetch } = useQuery({
    queryKey: ['asana-tasks', projectMapping],
    queryFn: () => asanaService.listProjectTasks(projectMapping!),
    enabled: !!projectMapping,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const formatDueDate = (dueOn: string | null | undefined) => {
    if (!dueOn) return null;
    
    const due = new Date(dueOn);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    const isOverdue = dueDate < today;
    const isToday = dueDate.getTime() === today.getTime();
    
    const formatted = due.toLocaleDateString();
    
    return {
      formatted,
      isOverdue,
      isToday,
      className: isOverdue ? "text-red-600" : isToday ? "text-orange-600" : "text-muted-foreground"
    };
  };

  // No project mapping configured
  if (!projectMapping) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            Asana Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Connect your Asana project to see tasks here.
            </p>
            <Link to={`/integrations?project=${projectId}`}>
              <Button variant="outline" size="sm">
                Configure Asana Integration
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            Asana Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !tasksResult?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            Asana Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">
              {tasksResult?.error || "Failed to load Asana tasks"}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tasks = tasksResult.tasks || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          Asana Tasks
          <Badge variant="outline" className="ml-auto">
            {tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">
            No tasks found in this Asana project.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {tasks.map((task) => {
              const dueInfo = formatDueDate(task.due_on);
              
              return (
                <div
                  key={task.gid}
                  className={`p-3 rounded-lg border transition-colors ${
                    task.completed ? 'bg-muted/50' : 'bg-card hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {task.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-muted-foreground flex-shrink-0" />
                        )}
                        <span
                          className={`font-medium truncate ${
                            task.completed ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {task.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.assignee && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate">{task.assignee.name}</span>
                          </div>
                        )}
                        
                        {dueInfo && (
                          <div className={`flex items-center gap-1 ${dueInfo.className}`}>
                            <Clock className="h-3 w-3" />
                            <span>
                              {dueInfo.isToday ? 'Today' : dueInfo.isOverdue ? `Overdue (${dueInfo.formatted})` : dueInfo.formatted}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={() => window.open(task.permalink_url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}