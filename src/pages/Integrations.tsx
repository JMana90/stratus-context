import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { organizationService } from "@/services/organizationService";
import { OrganizationIntegrations } from "@/components/OrganizationIntegrations";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOAuth, checkProviderStatus, isOrgLevel, isUserLevel } from "@/services/integrationService";

// --- add just below existing imports ---
type NormalizedStatus = {
  provider: 'slack' | 'google' | 'outlook' | 'salesforce' | 'box';
  level: 'user' | 'org';
  status: 'connected' | 'needs-auth' | 'error';
  detail?: string | null;
  account?: string | null;
};

const isConnected = (s?: NormalizedStatus) => s?.status === 'connected';
const badgeText = (s?: NormalizedStatus) =>
  s ? (s.status === 'connected' ? 'Connected' : s.status === 'needs-auth' ? 'Needs auth' : 'Error') : 'Needs auth';
const badgeVariant = (s?: NormalizedStatus) =>
  s?.status === 'connected' ? 'default' : s?.status === 'error' ? 'destructive' : 'secondary';

export default function IntegrationsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const projectId = searchParams.get('projectId');
  const mode = searchParams.get('mode');
  
  const [organizationId, setOrganizationId] = useState<string>();
  const [slackChannel, setSlackChannel] = useState("");
  const [salesforceRecordId, setSalesforceRecordId] = useState("");
  const [userConnections, setUserConnections] = useState<Record<string, NormalizedStatus>>({});
  
  const { data: organization } = useQuery({
    queryKey: ['organization'],
    queryFn: organizationService.getCurrentUserOrganization,
    enabled: !!user
  });

  // Set organization ID when loaded
  useEffect(() => {
    if (organization?.id) {
      setOrganizationId(organization.id);
    }
  }, [organization]);

  // Load user-level connection statuses
  useEffect(() => {
    const loadUserConnections = async () => {
      if (!user) return;
  
      const providers: Array<NormalizedStatus['provider']> = ['slack', 'google', 'outlook'];
      const connections: Record<string, NormalizedStatus> = {};
  
      for (const provider of providers) {
        try {
          // checkProviderStatus now returns the normalized object
          const status = await checkProviderStatus(provider as any);
          // Ensure provider/level are set (defensive, in case backend omitted them)
          connections[provider] = {
            provider,
            level: 'user',
            status: status?.status ?? 'needs-auth',
            account: status?.account ?? null,
            detail: status?.detail ?? null,
          };
        } catch (error: any) {
          console.error(`Error checking ${provider} status:`, error);
          connections[provider] = {
            provider,
            level: 'user',
            status: 'error',
            account: null,
            detail: 'status check failed',
          };
        }
      }
      setUserConnections(connections);
    };
  
    loadUserConnections();
  }, [user]);


  // Load project mappings if project is specified
  const { data: projectMappings } = useQuery({
    queryKey: ["project-mappings", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return {};
      
      const { data } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId);
      
      return {
        slack: (data?.find(d => (d.settings as any)?.channel)?.settings as any) || { channel: "" },
        salesforce: (data?.find(d => (d.settings as any)?.recordId)?.settings as any) || { recordId: "" }
      };
    },
  });

  React.useEffect(() => {
    if (projectMappings) {
      setSlackChannel((projectMappings.slack as any)?.channel || "");
      setSalesforceRecordId((projectMappings.salesforce as any)?.recordId || "");
    }
  }, [projectMappings]);

  // Listen for OAuth completion
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e?.data?.type === 'OAUTH_RESULT') {
        const { provider, status, message } = e.data;
        
        if (status === "success") {
          toast({ title: "Authorization successful", description: `${provider} connected successfully` });
          
          // Refresh statuses
          if (isUserLevel(provider)) {
            checkProviderStatus(provider as any).then((result: NormalizedStatus) => {
              setUserConnections(prev => ({ ...prev, [provider]: result }));
            });
          }
          queryClient.invalidateQueries({ queryKey: ['organization'] });
        } else {
          toast({ title: "Authorization failed", description: message || "Failed to authorize", variant: "destructive" });
        }
      }
    }
    
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [queryClient, toast]);

  const handleAuthorize = async (provider: string) => {
    try {
      const level = isOrgLevel(provider) ? 'org' : 'user';
      const orgId = isOrgLevel(provider) ? organizationId : undefined;
      
      const result = await startOAuth(provider as any, level, projectId || undefined, orgId);
      
      if (result.status === "success") {
        toast({ title: "Authorization successful", description: `${provider} connected successfully` });
        
        // Refresh user connections for user-level providers
        if (isUserLevel(provider)) {
          const status = await checkProviderStatus(provider as any);
          setUserConnections(prev => ({ ...prev, [provider]: status }));
        }
        
        queryClient.invalidateQueries({ queryKey: ['organization'] });
      } else {
        toast({ title: "Authorization failed", description: result.message || "Failed to authorize", variant: "destructive" });
      }
    } catch (error: any) {
      toast({
        title: "Authorization Failed",
        description: error.message || `Failed to connect ${provider}`,
        variant: "destructive",
      });
    }
  };

  const saveProjectMapping = useMutation({
    mutationFn: async ({ provider, settings }: { provider: string, settings: Record<string, any> }) => {
      if (!projectId) throw new Error("No project selected");
      
      const { error } = await supabase
        .from('project_integrations')
        .upsert({
          project_id: projectId,
          organization_integration_id: `${organization?.id}-${provider}`, // placeholder
          settings,
          configuration: settings
        }, {
          onConflict: 'project_id,organization_integration_id'
        });
      
      if (error) throw error;
    },
    onSuccess: (_, { provider }) => {
      toast({
        title: "Mapping Saved",
        description: `${provider} project mapping has been saved.`,
      });
      queryClient.invalidateQueries({ queryKey: ["project-mappings", projectId] });
    },
    onError: (error: any, { provider }) => {
      toast({
        title: "Save Failed",
        description: error.message || `Failed to save ${provider} mapping`,
        variant: "destructive",
      });
    },
  });

  const handleSaveSlackMapping = () => {
    saveProjectMapping.mutate({
      provider: "slack",
      settings: { channel: slackChannel }
    });
  };

  const handleSaveSalesforceMapping = () => {
    saveProjectMapping.mutate({
      provider: "salesforce", 
      settings: { recordId: salesforceRecordId }
    });
  };

  const handleTestSlackPost = async () => {
    if (!slackChannel) {
      toast({
        title: "Channel Required",
        description: "Please save a Slack channel first",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Slack Test", description: "Testing functionality coming soon" });
  };

  const handleTestSalesforceRecord = async () => {
    if (!salesforceRecordId) {
      toast({
        title: "Record ID Required",
        description: "Please save a Salesforce record ID first",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Salesforce Test", description: "Testing functionality coming soon" });
  };

  if (!organization) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-4">
          <div>Loading organization...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Integrations</h1>
              <Button variant="outline" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
            <p className="text-muted-foreground">
              Manage your connected services and project mappings
              {projectId && ` for project ${projectId}`}
            </p>
          </div>

          {/* Org-level connectors: Salesforce, Asana */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Organization Connectors</h2>
            <OrganizationIntegrations organizationId={organizationId || ""} />
          </div>

          {/* User-level connectors */}
          <div>
            <h2 className="text-lg font-semibold mb-4">User Connectors</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Slack */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    Slack
                    <Badge variant={badgeVariant(userConnections.slack)}>
                      {badgeText(userConnections.slack)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Send notifications and updates to your team</p>
              
                  {isConnected(userConnections.slack) ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        Connected as {userConnections.slack?.account || "User"}
                      </p>
                      <Button size="sm" variant="outline" onClick={() => navigate('/integrations')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage connection
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => handleAuthorize('slack')}>
                      Authorize
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Google/Gmail */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    Gmail
                    <Badge variant={badgeVariant(userConnections.google)}>
                      {badgeText(userConnections.google)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Access emails and calendar integration</p>
              
                  {isConnected(userConnections.google) ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        Connected as {userConnections.google?.account || "User"}
                      </p>
                      <Button size="sm" variant="outline" onClick={() => navigate('/integrations')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage connection
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => handleAuthorize('google')}>
                      Authorize
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Outlook */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    Outlook
                    <Badge variant={badgeVariant(userConnections.outlook)}>
                      {badgeText(userConnections.outlook)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Integrate with Microsoft Office suite</p>
              
                  {isConnected(userConnections.outlook) ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        Connected as {userConnections.outlook?.account || "User"}
                      </p>
                      <Button size="sm" variant="outline" onClick={() => navigate('/integrations')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage connection
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => handleAuthorize('outlook')}>
                      Authorize
                    </Button>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>

          {/* Project Mapping */}
          {projectId && (
            <>
              <Separator />
              
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Project Mapping</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure how this project connects to your integrated services. User-level tools (Gmail/Outlook) are connected once per user and apply to all projects.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Slack Channel Mapping */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Slack Channel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="slack-channel">Channel Name</Label>
                        <Input
                          id="slack-channel"
                          value={slackChannel}
                          onChange={(e) => setSlackChannel(e.target.value)}
                          placeholder="general"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleSaveSlackMapping}
                          disabled={!slackChannel || saveProjectMapping.isPending}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleTestSlackPost}
                          disabled={!slackChannel}
                        >
                          Test Post
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Salesforce Record Mapping */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Salesforce Record</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="sf-record">Record/Opportunity ID</Label>
                        <Input
                          id="sf-record"
                          value={salesforceRecordId}
                          onChange={(e) => setSalesforceRecordId(e.target.value)}
                          placeholder="0061234567890ABC"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleSaveSalesforceMapping}
                          disabled={!salesforceRecordId || saveProjectMapping.isPending}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleTestSalesforceRecord}
                          disabled={!salesforceRecordId}
                        >
                          Test Fetch
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
