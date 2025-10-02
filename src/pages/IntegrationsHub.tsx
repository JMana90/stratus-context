import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import ProviderCard from "@/components/integrations/ProviderCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { startOAuth } from "@/services/integrationService";
import { ArrowLeft } from "lucide-react";

interface IntegrationStatus {
  provider: string;
  status: "connected" | "needs-auth" | "error";
  level: "org" | "user";
}

export default function IntegrationsHub() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("project");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [loadingProviders, setLoadingProviders] = useState<Set<string>>(new Set());
  const [authorizingProviders, setAuthorizingProviders] = useState<Set<string>>(new Set());
  const [slackChannel, setSlackChannel] = useState("");
  const [salesforceRecordId, setSalesforceRecordId] = useState("");

  // Fetch integration statuses
  const { data: integrationStatuses = [], isLoading } = useQuery({
    queryKey: ["integration-statuses"],
    queryFn: async (): Promise<IntegrationStatus[]> => {
      try {
        // Get current user and organization
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("Not authenticated");

        // Get user's organization
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (!org) {
          return [
            { provider: "salesforce", status: "needs-auth", level: "org" },
            { provider: "slack", status: "needs-auth", level: "user" },
            { provider: "google", status: "needs-auth", level: "user" },
            { provider: "outlook", status: "needs-auth", level: "user" }
          ];
        }

        // Check integration connections
        const { data: connections } = await supabase
          .from("integration_connections")
          .select("provider, status")
          .eq("organization_id", org.id);

        const statuses: IntegrationStatus[] = [
          {
            provider: "salesforce",
            status: connections?.find(c => c.provider === "salesforce")?.status === "connected" 
              ? "connected" : "needs-auth",
            level: "org"
          },
          {
            provider: "slack", 
            status: connections?.find(c => c.provider === "slack")?.status === "connected"
              ? "connected" : "needs-auth",
            level: "user"
          },
          {
            provider: "google",
            status: connections?.find(c => c.provider === "google")?.status === "connected"
              ? "connected" : "needs-auth", 
            level: "user"
          },
          {
            provider: "outlook",
            status: connections?.find(c => c.provider === "outlook")?.status === "connected"
              ? "connected" : "needs-auth",
            level: "user"
          }
        ];

        return statuses;
      } catch (error) {
        console.error("Failed to load integration statuses:", error);
        return [
          { provider: "salesforce", status: "needs-auth", level: "org" },
          { provider: "slack", status: "needs-auth", level: "user" },
          { provider: "google", status: "needs-auth", level: "user" },
          { provider: "outlook", status: "needs-auth", level: "user" }
        ];
      }
    },
  });

  // Load project mappings if project is specified
  const { data: projectMappings } = useQuery({
    queryKey: ["project-mappings", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return {};
      
      // TODO: Replace with actual mapping fetch
      return {
        slack: { channel: "" },
        salesforce: { recordId: "" }
      };
    },
  });

  // Listen for OAuth completion
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e?.data?.type === 'oauth-finished') {
        // Clear authorizing state for the provider
        setAuthorizingProviders(prev => {
          const next = new Set(prev);
          next.delete(e.data.provider);
          return next;
        });
        
        // Refresh integration status badges with project context
        queryClient.invalidateQueries({ queryKey: ['integration-statuses'] });
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: ['integration-statuses', projectId] });
        }
        
        toast({
          title: "Authorization Complete",
          description: `${e.data.provider} has been connected successfully.`,
        });
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [queryClient, toast, projectId]);

  React.useEffect(() => {
    if (projectMappings) {
      setSlackChannel(projectMappings.slack?.channel || "");
      setSalesforceRecordId(projectMappings.salesforce?.recordId || "");
    }
  }, [projectMappings]);

  const handleAuthorize = async (provider: string, level: "org" | "user") => {
    try {
      setAuthorizingProviders(prev => new Set(prev).add(provider));
      const result = await startOAuth(provider as 'salesforce' | 'slack' | 'google' | 'outlook', level, projectId || undefined);
      if (result.status === "success") {
        toast({ title: "Authorization successful", description: `${provider} connected successfully` });
        queryClient.invalidateQueries({ queryKey: ['integration-status'] });
      } else {
        toast({ title: "Authorization failed", description: result.message || "Failed to authorize" });
      }
    } catch (error: any) {
      setAuthorizingProviders(prev => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
      toast({
        title: "Authorization Failed",
        description: error.message || `Failed to connect ${provider}`,
        variant: "destructive",
      });
    }
  };

  const handleTest = async (provider: string, level: "org" | "user") => {
    setLoadingProviders(prev => new Set(prev).add(`${provider}-test`));
    
    try {
      // TODO: Replace with actual integration service test
      toast({ title: "Testing integration...", description: "Feature coming soon" });
    } catch (error: any) {
      toast({
        title: "Test Failed", 
        description: error.message || `Failed to test ${provider}`,
        variant: "destructive",
      });
    } finally {
      setLoadingProviders(prev => {
        const next = new Set(prev);
        next.delete(`${provider}-test`);
        return next;
      });
    }
  };

  const saveProjectMapping = useMutation({
    mutationFn: async ({ provider, settings }: { provider: string, settings: Record<string, any> }) => {
      if (!projectId) throw new Error("No project selected");
      // TODO: Implement project mapping
      toast({ title: "Mapping saved", description: "Project mapping functionality coming soon" });
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

    try {
      // TODO: Implement Slack test
      toast({ title: "Slack Test", description: "Testing functionality coming soon" });
    } catch (error: any) {
      toast({
        title: "Post Failed",
        description: error.message,
        variant: "destructive",
      });
    }
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

    try {
      // TODO: Implement Salesforce test
      toast({ title: "Salesforce Test", description: "Testing functionality coming soon" });
    } catch (error: any) {
      toast({
        title: "Fetch Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Integrations Hub</h1>
            <p className="text-muted-foreground">Manage your connected services and project mappings</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <LoadingSkeleton key={i} lines={3} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getProviderStatus = (provider: string) => {
    return integrationStatuses.find(s => s.provider === provider) || 
           { provider, status: "needs-auth" as const, level: "user" as const };
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Integrations Hub</h1>
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

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProviderCard
            provider="salesforce"
            level="org"
            title="Salesforce"
            description="Connect your CRM for contacts and opportunities"
            status={getProviderStatus("salesforce").status}
            onAuthorize={() => handleAuthorize("salesforce", "org")}
            onTest={() => handleTest("salesforce", "org")}
            isLoading={authorizingProviders.has("salesforce") || loadingProviders.has("salesforce-auth") || loadingProviders.has("salesforce-test")}
          />
          
          <ProviderCard
            provider="slack"
            level="user"
            title="Slack"
            description="Send notifications and updates to your team"
            status={getProviderStatus("slack").status}
            onAuthorize={() => handleAuthorize("slack", "user")}
            onTest={() => handleTest("slack", "user")}
            isLoading={authorizingProviders.has("slack") || loadingProviders.has("slack-auth") || loadingProviders.has("slack-test")}
          />
          
          <ProviderCard
            provider="google"
            level="user"
            title="Gmail"
            description="Access emails and calendar integration"
            status={getProviderStatus("google").status}
            onAuthorize={() => handleAuthorize("google", "user")}
            onTest={() => handleTest("google", "user")}
            isLoading={authorizingProviders.has("google") || loadingProviders.has("google-auth") || loadingProviders.has("google-test")}
          />
          
          <ProviderCard
            provider="outlook"
            level="user"
            title="Outlook"
            description="Integrate with Microsoft Office suite"
            status={getProviderStatus("outlook").status}
            onAuthorize={() => handleAuthorize("outlook", "user")}
            onTest={() => handleTest("outlook", "user")}
            isLoading={authorizingProviders.has("outlook") || loadingProviders.has("outlook-auth") || loadingProviders.has("outlook-test")}
          />
        </div>

        {/* Project Mapping Panel */}
        {projectId && (
          <>
            <Separator />
            
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Project Mapping</h2>
                <p className="text-sm text-muted-foreground">
                  Configure how this project connects to your integrated services
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
                        disabled={getProviderStatus("slack").status !== "connected"}
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
                        disabled={!slackChannel || getProviderStatus("slack").status !== "connected"}
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
                        disabled={getProviderStatus("salesforce").status !== "connected"}
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
                        disabled={!salesforceRecordId || getProviderStatus("salesforce").status !== "connected"}
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
  );
}