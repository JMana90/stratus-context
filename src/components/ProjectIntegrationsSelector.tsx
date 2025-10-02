import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Users, Zap, Slack, MessageSquare, TestTube } from "lucide-react";
import { integrationService, OrganizationIntegration, ProjectIntegration, startOAuth } from "@/services/integrationService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProjectIntegrationsSelectorProps {
  projectId: string;
  organizationId: string;
  onIntegrationsChange?: (integrations: ProjectIntegration[]) => void;
}

export function ProjectIntegrationsSelector({ 
  projectId, 
  organizationId, 
  onIntegrationsChange 
}: ProjectIntegrationsSelectorProps) {
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    type: '',
    provider: '',
    justification: ''
  });
  const [providerStatuses, setProviderStatuses] = useState<Record<string, "connected" | "needs-auth" | "error" | "idle">>({});
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [testing, setTesting] = useState(false);
  
  // Asana project mapping state
  const [asanaProjectId, setAsanaProjectId] = useState("");
  const [savingAsanaMapping, setSavingAsanaMapping] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: availableIntegrations = [] } = useQuery({
    queryKey: ['organization-integrations', organizationId],
    queryFn: () => integrationService.getOrganizationIntegrations(organizationId),
    enabled: !!organizationId
  });

  const { data: projectIntegrations = [] } = useQuery({
    queryKey: ['project-integrations', projectId],
    queryFn: () => integrationService.getProjectIntegrations(projectId),
    enabled: !!projectId
  });

  const { data: canManage = false } = useQuery({
    queryKey: ['can-manage-integrations', organizationId],
    queryFn: () => integrationService.canManageIntegrations(organizationId),
    enabled: !!organizationId
  });

  useEffect(() => {
    onIntegrationsChange?.(projectIntegrations);
  }, [projectIntegrations, onIntegrationsChange]);

  const assignIntegrationMutation = useMutation({
    mutationFn: ({ orgIntegrationId }: { orgIntegrationId: string }) =>
      integrationService.assignIntegrationToProject(projectId, orgIntegrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-integrations'] });
      toast({ title: "Integration added to project" });
    }
  });

  const updateProjectIntegrationMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProjectIntegration> }) =>
      integrationService.updateProjectIntegration(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-integrations'] });
    }
  });

  const removeIntegrationMutation = useMutation({
    mutationFn: integrationService.removeIntegrationFromProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-integrations'] });
      toast({ title: "Integration removed from project" });
    }
  });

  const requestIntegrationMutation = useMutation({
    mutationFn: integrationService.createIntegrationRequest,
    onSuccess: () => {
      setIsRequestDialogOpen(false);
      setNewRequest({ type: '', provider: '', justification: '' });
      toast({ title: "Integration request submitted" });
    }
  });

  const handleAssignIntegration = (orgIntegrationId: string) => {
    assignIntegrationMutation.mutate({ orgIntegrationId });
  };

  const handleToggleIntegration = (integration: ProjectIntegration) => {
    updateProjectIntegrationMutation.mutate({
      id: integration.id,
      updates: { is_enabled: !integration.is_enabled }
    });
  };

  const handleRequestIntegration = () => {
    if (!newRequest.type || !newRequest.provider || !user) return;

    requestIntegrationMutation.mutate({
      project_id: projectId,
      organization_id: organizationId,
      requested_by: user.id,
      integration_type: newRequest.type,
      provider_id: newRequest.provider,
      provider_name: newRequest.provider,
      justification: newRequest.justification
    });
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'slack': return <Slack className="h-4 w-4" />;
      case 'teams': return <MessageSquare className="h-4 w-4" />;
      case 'crm': return <Users className="h-4 w-4" />;
      case 'zapier': return <Zap className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const assignedIntegrationIds = new Set(
    projectIntegrations.map(pi => pi.organization_integration_id)
  );

  const unassignedIntegrations = availableIntegrations.filter(
    integration => integration.is_active && !assignedIntegrationIds.has(integration.id)
  );

  // OAuth providers for project selection
  const oauthProviders = [
    { key: 'salesforce', name: 'Salesforce', level: 'org' },
    { key: 'slack', name: 'Slack', level: 'org' },
    { key: 'google', name: 'Google', level: 'user' },
    { key: 'box', name: 'Box', level: 'org' },
  ];

  const checkProviderStatus = async (providerKey: string) => {
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_EDGE_URL ?? 
        `${window.location.origin}/functions/v1`;
      let statusUrl = "";
      
      if (providerKey === "google") {
        statusUrl = `${baseUrl}/google_oauth/status`;
      } else if (providerKey === "salesforce") {
        statusUrl = `${baseUrl}/salesforce_oauth/status?organizationId=${organizationId}`;
      } else if (providerKey === "slack") {
        statusUrl = `${baseUrl}/slack_oauth/status?organizationId=${organizationId}`;
      } else if (providerKey === "box") {
        statusUrl = `${baseUrl}/box_oauth/status?organizationId=${organizationId}`;
      } else {
        return;
      }
      
      const response = await fetch(statusUrl, {
        headers: providerKey === "google" ? {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        } : {}
      });
      
      const data = await response.json();
      
      setProviderStatuses(prev => ({ 
        ...prev, 
        [providerKey]: data.connected ? "connected" : "needs-auth"
      }));
      
    } catch (error) {
      console.error(`Error checking ${providerKey} status:`, error);
      setProviderStatuses(prev => ({ ...prev, [providerKey]: "error" }));
    }
  };

  const handleConnect = async (providerKey: string) => {
    try {
      const level = providerKey === "google" ? "user" : "org";
      const result = await startOAuth(providerKey as "salesforce" | "slack" | "google" | "box", level, projectId);
      if (result.status === "success") {
        toast({ title: "Authorization successful", description: `${providerKey} connected successfully` });
        queryClient.invalidateQueries({ queryKey: ['project-integrations', projectId] });
      } else {
        toast({ title: "Authorization failed", description: result.message || "Failed to authorize" });
      }
      await checkProviderStatus(providerKey);
    } catch (error) {
      toast({ title: "Connection failed", variant: "destructive" });
    }
  };

  const testSelectedProviders = async () => {
    if (selectedProviders.size === 0) return;
    setTesting(true);
    
    for (const providerKey of Array.from(selectedProviders)) {
      await checkProviderStatus(providerKey);
    }
    
    setTesting(false);
  };

  // Load existing Asana project mapping
  useEffect(() => {
    const loadAsanaMapping = async () => {
      try {
        const { data } = await supabase
          .from('project_integrations')
          .select('settings, organization_integration_id')
          .eq('project_id', projectId)
          .eq('is_enabled', true)
          .single();

        if (data) {
          // Check if it's an Asana integration
          const { data: orgIntegration } = await supabase
            .from('organization_integrations')
            .select('provider_id')
            .eq('id', data.organization_integration_id)
            .eq('provider_id', 'asana')
            .single();

          if (orgIntegration) {
            setAsanaProjectId((data.settings as any)?.project_id || "");
          }
        }
      } catch (error) {
        console.error('Failed to load Asana mapping:', error);
      }
    };

    if (projectId && availableIntegrations.some(i => i.provider_id === 'asana')) {
      loadAsanaMapping();
    }
  }, [projectId, availableIntegrations]);

  const handleSaveAsanaMapping = async () => {
    if (!asanaProjectId.trim()) {
      toast({ title: "Please enter an Asana Project ID", variant: "destructive" });
      return;
    }

    setSavingAsanaMapping(true);
    try {
      // Find the Asana org integration
      const asanaOrgIntegration = availableIntegrations.find(i => i.provider_id === 'asana' && i.is_active);
      if (!asanaOrgIntegration) {
        toast({ title: "Asana integration not found in organization", variant: "destructive" });
        return;
      }

      // Check if project integration already exists
      const { data: existingMapping } = await supabase
        .from('project_integrations')
        .select('id')
        .eq('project_id', projectId)
        .eq('organization_integration_id', asanaOrgIntegration.id)
        .single();

      if (existingMapping) {
        // Update existing mapping
        const { error } = await supabase
          .from('project_integrations')
          .update({
            settings: { project_id: asanaProjectId.trim() },
            is_enabled: true
          })
          .eq('id', existingMapping.id);

        if (error) throw error;
      } else {
        // Create new mapping
        const { error } = await supabase
          .from('project_integrations')
          .insert({
            project_id: projectId,
            organization_integration_id: asanaOrgIntegration.id,
            settings: { project_id: asanaProjectId.trim() },
            is_enabled: true
          });

        if (error) throw error;
      }

      toast({ title: "Asana project mapping saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['project-integrations', projectId] });
    } catch (error: any) {
      toast({ title: "Failed to save Asana mapping", description: error.message, variant: "destructive" });
    } finally {
      setSavingAsanaMapping(false);
    }
  };

  // Check status on mount
  useEffect(() => {
    const checkAllStatuses = async () => {
      for (const provider of oauthProviders) {
        await checkProviderStatus(provider.key);
      }
    };
    
    if (organizationId) {
      checkAllStatuses();
    }
  }, [organizationId]);

  // Listen for OAuth completion via postMessage
  React.useEffect(() => {
    function onOAuthComplete(ev: MessageEvent) {
      if (!ev?.data || ev.data.type !== "oauth-complete") return;
      const providerKey = ev.data.provider as "google" | "salesforce" | "slack" | "box";
      if (providerKey) {
        checkProviderStatus(providerKey);
      }
    }
    window.addEventListener("message", onOAuthComplete);
    return () => window.removeEventListener("message", onOAuthComplete);
  }, [checkProviderStatus]);

  const getStatusBadge = (providerKey: string) => {
    const status = providerStatuses[providerKey] || 'idle';
    const label = status === 'connected' ? 'Connected' : 
                  status === 'needs-auth' ? 'Needs login' : 
                  status === 'error' ? 'Error' : 'Idle';
    const variant: any = status === 'connected' ? 'default' : 
                        status === 'needs-auth' ? 'secondary' : 
                        status === 'error' ? 'destructive' : 'outline';
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Integrations</h3>
        <div className="flex gap-2">
          {unassignedIntegrations.length > 0 && canManage && (
            <Select onValueChange={handleAssignIntegration}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Add integration" />
              </SelectTrigger>
              <SelectContent>
                {unassignedIntegrations.map(integration => (
                  <SelectItem key={integration.id} value={integration.id}>
                    {integration.provider_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Request Integration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request New Integration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Integration Type</Label>
                  <Select value={newRequest.type} onValueChange={(value) => 
                    setNewRequest({ ...newRequest, type: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crm">CRM</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                      <SelectItem value="zapier">Zapier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Provider/Service</Label>
                  <input
                    className="w-full p-2 border rounded"
                    value={newRequest.provider}
                    onChange={(e) => setNewRequest({ ...newRequest, provider: e.target.value })}
                    placeholder="e.g., HubSpot, Salesforce"
                  />
                </div>
                
                <div>
                  <Label>Justification</Label>
                  <Textarea
                    value={newRequest.justification}
                    onChange={(e) => setNewRequest({ ...newRequest, justification: e.target.value })}
                    placeholder="Why do you need this integration for your project?"
                  />
                </div>
                
                <Button onClick={handleRequestIntegration} className="w-full">
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* OAuth Providers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Integration Providers</span>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={testSelectedProviders} 
              disabled={selectedProviders.size === 0 || testing}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing ? "Testing..." : "Test Selected"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {oauthProviders.map((provider) => (
              <div key={provider.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={selectedProviders.has(provider.key)}
                    onCheckedChange={(checked) => {
                      setSelectedProviders(prev => {
                        const next = new Set(prev);
                        if (checked) next.add(provider.key);
                        else next.delete(provider.key);
                        return next;
                      });
                      // Immediately check status when provider is selected
                      if (checked) {
                        checkProviderStatus(provider.key);
                      }
                    }}
                  />
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {provider.level === 'org' ? 'Organization-level' : 'User-level'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusBadge(provider.key)}
                  <Button 
                    size="sm" 
                    variant={providerStatuses[provider.key] === "connected" ? "outline" : "default"}
                    onClick={() => handleConnect(provider.key)}
                  >
                    {providerStatuses[provider.key] === "connected" ? "Reconnect" : "Connect"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {selectedProviders.size > 0 && (
            <div className="pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                Selected for testing: {Array.from(selectedProviders).join(', ')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asana Project Mapping */}
      {availableIntegrations.some(i => i.provider_id === 'asana' && i.is_active) && (
        <Card>
          <CardHeader>
            <CardTitle>Asana Project Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="asana-project-id">Asana Project ID</Label>
              <div className="flex gap-2">
                <Input
                  id="asana-project-id"
                  placeholder="Enter your Asana Project ID..."
                  value={asanaProjectId}
                  onChange={(e) => setAsanaProjectId(e.target.value)}
                  disabled={savingAsanaMapping}
                />
                <Button 
                  onClick={handleSaveAsanaMapping}
                  disabled={!asanaProjectId.trim() || savingAsanaMapping}
                >
                  {savingAsanaMapping ? "Saving..." : "Save"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Find your Project ID in the Asana URL: asana.com/0/<strong>PROJECT_ID</strong>/list
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {projectIntegrations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No integrations assigned to this project yet.</p>
            </CardContent>
          </Card>
        ) : (
          projectIntegrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getIntegrationIcon(integration.organization_integration?.integration_type || '')}
                    <span>{integration.organization_integration?.provider_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={integration.is_enabled ? "default" : "secondary"}>
                      {integration.is_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {canManage && (
                      <Switch 
                        checked={integration.is_enabled}
                        onCheckedChange={() => handleToggleIntegration(integration)}
                      />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {integration.organization_integration?.integration_type.toUpperCase()} Integration
                </p>
                {canManage && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => removeIntegrationMutation.mutate(integration.id)}
                  >
                    Remove from Project
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}