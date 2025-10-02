import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Settings, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { subscriptionService } from '@/services/subscriptionService';
import Dashboard from '@/components/Dashboard';

// Adapters for services that may not be available
const projectAdapter = {
  async getUserProjects(userId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', userId)
      .neq('status', 'deleted')
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    return data || [];
  }
};

const organizationAdapter = {
  async getUserOrganization(userId: string) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }
};

const integrationAdapter = {
  async fetchIntegrationStatus(orgId: string, userId: string) {
    const { data, error } = await supabase
      .from('integration_connections')
      .select('provider, status')
      .eq('organization_id', orgId);
    
    if (error) throw error;
    
    const connections = data || [];
    return {
      salesforce: connections.find(c => c.provider === 'salesforce')?.status === 'connected',
      slack: connections.find(c => c.provider === 'slack')?.status === 'connected',
      gmail: connections.find(c => c.provider === 'google' || c.provider === 'gmail')?.status === 'connected',
      outlook: connections.find(c => c.provider === 'outlook')?.status === 'connected'
    };
  },

  async startOAuth(provider: string, level: 'org' | 'user') {
    const { startOAuth } = await import('@/services/integrationService');
    return startOAuth(provider as any, level);
    // Placeholder for OAuth initiation
    console.log(`Starting OAuth for ${provider} at ${level} level`);
  }
};

const taskAdapter = {
  async getUrgentTasks(options: { limit: number }) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        projects!inner(name)
      `)
      .neq('status', 'done')
      .lte('due_date', today + 'T23:59:59')
      .order('due_date', { ascending: true })
      .limit(options.limit);
    
    if (error) throw error;
    return data || [];
  }
};

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectId } = useParams();
  
  const [user, setUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any>({});
  const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreateProject, setCanCreateProject] = useState(true);
  const [hasIntegrations, setHasIntegrations] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Handle project selection from URL params
  useEffect(() => {
    const queryProjectId = searchParams.get('project');
    if (queryProjectId && projects.length > 0) {
      // Find and select the project, then remove the param and navigate to /projects/:id
      const project = projects.find(p => p.id === queryProjectId);
      if (project) {
        // Remove the project param from URL and navigate to the canonical route
        searchParams.delete('project');
        setSearchParams(searchParams);
        navigate(`/projects/${queryProjectId}`, { replace: true });
      }
    }
  }, [projects, searchParams, setSearchParams, navigate]);

  // Check if we have a valid projectId from the route
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        toast({
          title: "Project not found",
          description: "The project you're looking for doesn't exist or you don't have access to it.",
          variant: "destructive"
        });
        navigate('/', { replace: true });
      }
    }
  }, [projectId, projects, navigate, toast]);

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        navigate('/auth');
        return;
      }
      
      setUser(user);

      // Get organization
      const org = await organizationAdapter.getUserOrganization(user.id);
      if (!org) {
        toast({
          title: "Setup Required",
          description: "Please complete your organization setup first.",
        });
        navigate('/onboarding');
        return;
      }
      setOrganization(org);

      // Get projects
      const userProjects = await projectAdapter.getUserProjects(user.id);
      setProjects(userProjects);

      // Check project creation limits
      try {
        const usage = await subscriptionService.getUsageStats(org.id);
        setCanCreateProject(usage.currentProjects < usage.maxProjects);
      } catch (error) {
        console.warn('Unable to check project limits:', error);
        setCanCreateProject(true);
      }

      // Get integration status
      if (org) {
        try {
          const status = await integrationAdapter.fetchIntegrationStatus(org.id, user.id);
          setIntegrations(status);
          
          // Check if any integrations are connected
          const hasAnyConnection = Object.values(status).some(connected => connected);
          setHasIntegrations(hasAnyConnection);
        } catch (error) {
          console.warn('Unable to load integration status:', error);
          setHasIntegrations(false);
        }
      }

      // Get urgent tasks
      try {
        const tasks = await taskAdapter.getUrgentTasks({ limit: 5 });
        setUrgentTasks(tasks);
      } catch (error) {
        console.warn('Unable to load urgent tasks:', error);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewProject = async () => {
    const ok = await subscriptionService.ensureCanCreateProject().catch(() => false);
    if (!ok) {
      toast({ 
        variant: "destructive", 
        title: "Project limit reached", 
        description: "Upgrade plan to create more projects." 
      });
      return;
    }
    navigate('/onboarding', { state: { from: 'new-project' } });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If we have a projectId, render the Dashboard
  if (projectId && projects.length > 0) {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      return <Dashboard projectId={projectId} />;
    }
  }

  const lastProjectId = projects?.[0]?.id;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </h1>
            <p className="text-muted-foreground mt-2">
              Here's an overview of your projects and activities
            </p>
          </div>
          <Link to="/integrations">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Integrations
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Integration Setup Banner */}
          {!hasIntegrations && (
            <div className="col-span-full">
              <Alert className="border-primary/20 bg-primary/5">
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>Get more out of your projects by connecting your favorite tools.</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/integrations?mode=wizard')}
                    >
                      Set up integrations
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* My Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                My Projects
                <Button 
                  size="sm" 
                  onClick={handleNewProject}
                  disabled={!canCreateProject}
                  title={!canCreateProject ? "Upgrade plan to create more projects" : undefined}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No projects yet</p>
                  <Button onClick={handleNewProject} className="mb-2">
                    Create Project
                  </Button>
                  <div>
                    <Link to="/integrations" className="text-sm text-primary hover:underline">
                      Set up integrations first
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <Link 
                          to={`/projects/${project.id}`}
                          className="font-medium text-foreground hover:text-primary truncate block"
                        >
                          {project.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(project.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                  {projects.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{projects.length - 5} more projects
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Get Set Up */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Get Set Up
                <Link to={`/integrations${lastProjectId ? `?projectId=${lastProjectId}` : ''}`}>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Salesforce (Org) */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Salesforce (Org)</span>
                  <Badge variant={integrations.salesforce ? "default" : "secondary"}>
                    {integrations.salesforce ? "Connected" : "Needs auth"}
                  </Badge>
                </div>

                {/* Slack (Me) */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Slack (Me)</span>
                  <Badge variant={integrations.slack ? "default" : "secondary"}>
                    {integrations.slack ? "Connected" : "Needs auth"}
                  </Badge>
                </div>

                {/* Gmail (Me) */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Gmail (Me)</span>
                  <Badge variant={integrations.gmail ? "default" : "secondary"}>
                    {integrations.gmail ? "Connected" : "Needs auth"}
                  </Badge>
                </div>

                {/* Outlook (Me) */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Outlook (Me)</span>
                  <Badge variant={integrations.outlook ? "default" : "secondary"}>
                    {integrations.outlook ? "Connected" : "Needs auth"}
                  </Badge>
                </div>

                {/* Asana (Org) */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Asana (Org)</span>
                  <Badge variant="secondary">
                    Needs auth
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Urgent Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Urgent Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {urgentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No urgent tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {urgentTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Calendar className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {new Date(task.due_date).toLocaleDateString()}
                          </Badge>
                          {task.projects && (
                            <span className="text-xs text-muted-foreground truncate">
                              {task.projects.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}