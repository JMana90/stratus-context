import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Users, Zap, Slack, MessageSquare, Trash2, Plus, Mail } from "lucide-react";
import { asanaService } from "@/services/asanaService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CRM_PROVIDERS, crmService } from "@/services/crmService";
import { integrationService, OrganizationIntegration, IntegrationRequest, startOAuth } from "@/services/integrationService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationService } from "@/services/organizationService";
import { supabase } from "@/integrations/supabase/client";

interface OrganizationIntegrationsProps {
  organizationId: string;
}

export function OrganizationIntegrations({ organizationId }: OrganizationIntegrationsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    type: '',
    provider: '',
    configuration: {}
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Selection and testing state (additive)
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [statuses, setStatuses] = React.useState<Record<string, "connected" | "needs-auth" | "error" | "idle">>({});
  const [testing, setTesting] = React.useState(false);
  
  // Asana PAT setup state
  const [showAsanaSetup, setShowAsanaSetup] = React.useState(false);
  const [asanaPAT, setAsanaPAT] = React.useState("");
  const [asanaLoading, setAsanaLoading] = React.useState(false);

  const providerRows = [
    { id: 'salesforce', name: 'Salesforce' },
    { id: 'slack', name: 'Slack' },
    { id: 'google', name: 'Google' },
    { id: 'outlook', name: 'Outlook' },
    { id: 'asana', name: 'Asana' },
    { id: 'box', name: 'Box' },
  ] as const;

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const statusBadge = (id: string) => {
    const s = (statuses[id] ?? 'idle') as "connected" | "needs-auth" | "error" | "idle";
    const label = s === 'connected' ? 'Connected' : s === 'needs-auth' ? 'Needs login' : s === 'error' ? 'Error' : 'Idle';
    const variant: any = s === 'connected' ? 'default' : s === 'needs-auth' ? 'secondary' : s === 'error' ? 'destructive' : 'outline';
    return <Badge variant={variant}>{label}</Badge>;
  };

  const normalizeProviderKey = (k: string) =>
  k === "gmail" ? "google" : k;
  
  const handleConnect = async (providerKey: string) => {
    try {
      if (providerKey === "asana") {
        // Handle Asana differently - show input for PAT
        setShowAsanaSetup(true);
        return;
      }

      const key = normalizeProviderKey(providerKey) as "salesforce" | "slack" | "google" | "outlook" | "box";
      const level = (providerKey === "salesforce" || providerKey === "asana" || providerKey === "box") ? "org" : "user";
      const orgId = (providerKey === "salesforce" || providerKey === "asana" || providerKey === "box") ? organizationId : undefined;
      
      const result = await startOAuth(key, level, orgId);
      if (result.status === "success") {
        toast({ title: "Authorization successful", description: `${key} connected successfully` });
        queryClient.invalidateQueries({ queryKey: ['integration-status'] });
      } else {
        toast({ title: "Authorization failed", description: result.message || "Failed to authorize" });
      }
      await checkProviderStatus(providerKey);
      
    } catch (error) {
      toast({ title: "Connection failed", variant: "destructive" });
    }
  };

  const checkProviderStatus = async (providerKey: string) => {
    try {
      if (providerKey === "asana") {
        // Check if Asana integration exists in organization_integrations
        const { data } = await supabase
          .from('organization_integrations')
          .select('is_active, configuration')
          .eq('organization_id', organizationId)
          .eq('provider_id', 'asana')
          .single();

        if (data?.is_active && (data?.configuration as any)?.pat) {
          setStatuses(prev => ({ ...prev, asana: "connected" }));
        } else {
          setStatuses(prev => ({ ...prev, asana: "needs-auth" }));
        }
        return;
      }

      const key = normalizeProviderKey(providerKey);
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      let statusUrl = "";

      
      if (key === "google") {
        statusUrl = `${baseUrl}/google_oauth/status`;
      } else if (key === "salesforce") {
        statusUrl = `${baseUrl}/salesforce_oauth/status?organizationId=${organizationId}`;
      } else if (key === "slack") {
        statusUrl = `${baseUrl}/slack_oauth/status`;
      } else if (key === "outlook") {
        statusUrl = `${baseUrl}/outlook_oauth/status`;
      } else if (key === "box") {
        statusUrl = `${baseUrl}/box_oauth/status?organizationId=${organizationId}`;
      } else {
        return;
      }
      
      const response = await fetch(statusUrl, {
        headers: (providerKey === "google" || providerKey === "slack" || providerKey === "outlook" || providerKey === "box" || providerKey === "salesforce") ? {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        } : {}
      });
      
      const data = await response.json();
      
      // Handle both normalized status format and legacy connected boolean
      const isConnected = 
        (typeof data?.status === 'string' && data.status === 'connected') ||
        (data?.connected === true);
      
      setStatuses(prev => ({ 
        ...prev, 
        [providerKey]: isConnected ? "connected" : "needs-auth"
      }));
      
    } catch (error) {
      console.error(`Error checking ${providerKey} status:`, error);
      setStatuses(prev => ({ ...prev, [providerKey]: "error" }));
    }
  };

  // Check status on mount
  useEffect(() => {
    const checkAllStatuses = async () => {
      for (const provider of ['salesforce', 'slack', 'google', 'outlook', 'asana', 'box']) {
        await checkProviderStatus(provider);
      }
    };
    
    if (organizationId) {
      checkAllStatuses();
    }
  }, [organizationId]);

  const handleAsanaSetup = async () => {
    if (!asanaPAT.trim()) {
      toast({ title: "Please enter your Asana Personal Access Token", variant: "destructive" });
      return;
    }

    setAsanaLoading(true);
    try {
      // First, test the connection
      const testResult = await asanaService.testConnection();
      if (!testResult.success) {
        toast({ title: "Invalid token", description: testResult.error, variant: "destructive" });
        return;
      }

      // Save the PAT to organization_integrations
      const { data, error } = await supabase
        .from('organization_integrations')
        .upsert({
          organization_id: organizationId,
          provider_id: 'asana',
          provider_name: 'Asana',
          integration_type: 'project_management',
          configuration: { pat: asanaPAT.trim() },
          is_active: true,
          created_by: user?.id
        }, {
          onConflict: 'organization_id,provider_id'
        });

      if (error) throw error;

      toast({ title: "Asana connected successfully", description: `Welcome, ${testResult.user?.name}!` });
      setStatuses(prev => ({ ...prev, asana: "connected" }));
      setShowAsanaSetup(false);
      setAsanaPAT("");
    } catch (error: any) {
      toast({ title: "Failed to save Asana integration", description: error.message, variant: "destructive" });
    } finally {
      setAsanaLoading(false);
    }
  };

  const handleTestAsana = async () => {
    if (!asanaPAT.trim()) {
      toast({ title: "Please enter your Asana Personal Access Token", variant: "destructive" });
      return;
    }

    setAsanaLoading(true);
    try {
      // Temporarily save PAT to test
      const { error: tempError } = await supabase
        .from('organization_integrations')
        .upsert({
          organization_id: organizationId,
          provider_id: 'asana',
          provider_name: 'Asana',
          integration_type: 'project_management',
          configuration: { pat: asanaPAT.trim() },
          is_active: true,
          created_by: user?.id
        }, {
          onConflict: 'organization_id,provider_id'
        });

      if (tempError) throw tempError;

      const testResult = await asanaService.testConnection();
      if (testResult.success) {
        toast({ title: "Connection successful", description: `Hello, ${testResult.user?.name}!` });
      } else {
        toast({ title: "Connection failed", description: testResult.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    } finally {
      setAsanaLoading(false);
    }
  };

  const handleDisconnect = async (providerKey: string) => {
    try {
      if (providerKey === "asana") {
        const { error } = await supabase
          .from('organization_integrations')
          .update({ is_active: false })
          .eq('organization_id', organizationId)
          .eq('provider_id', 'asana');

        if (error) throw error;

        setStatuses(prev => ({ ...prev, asana: "needs-auth" }));
        toast({ title: "Asana disconnected from organization" });
        return;
      }

      // TODO: Implement disconnect endpoints for other providers
      setStatuses(prev => {
        const updated = { ...prev };
        delete updated[providerKey];
        return updated;
      });
      toast({ title: `${providerKey} disconnected from organization` });
    } catch (error) {
      toast({ title: "Disconnect failed", variant: "destructive" });
    }
  };

  const runTest = async () => {
    if (selected.size === 0) return;
    setTesting(true);
    
    for (const id of Array.from(selected)) {
      await checkProviderStatus(id);
    }
    
    setTesting(false);
  };

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['organization-integrations', organizationId],
    queryFn: () => integrationService.getOrganizationIntegrations(organizationId),
    enabled: !!organizationId
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['integration-requests', organizationId],
    queryFn: () => integrationService.getIntegrationRequests(organizationId),
    enabled: !!organizationId
  });

  const { data: canManage = false } = useQuery({
    queryKey: ['can-manage-integrations', organizationId],
    queryFn: () => integrationService.canManageIntegrations(organizationId),
    enabled: !!organizationId
  });

  const { data: canDirectlyAdd = false } = useQuery({
    queryKey: ['can-directly-add-integrations', organizationId],
    queryFn: () => integrationService.canDirectlyAddIntegrations(organizationId),
    enabled: !!organizationId
  });

  const createIntegrationMutation = useMutation({
    mutationFn: integrationService.createOrganizationIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-integrations'] });
      setIsAddDialogOpen(false);
      setNewIntegration({ type: '', provider: '', configuration: {} });
      toast({ title: "Integration added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add integration", variant: "destructive" });
    }
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<OrganizationIntegration> }) =>
      integrationService.updateOrganizationIntegration(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-integrations'] });
      toast({ title: "Integration updated successfully" });
    }
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: integrationService.deleteOrganizationIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-integrations'] });
      toast({ title: "Integration removed successfully" });
    }
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<IntegrationRequest> }) =>
      integrationService.updateIntegrationRequest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-requests'] });
    }
  });

  const handleAddIntegration = async () => {
    if (!newIntegration.type || !newIntegration.provider || !user) return;

    const providers = getProvidersForType(newIntegration.type);
    const providerData = providers.find(p => p.id === newIntegration.provider) || 
      { id: newIntegration.provider, name: newIntegration.provider };

    if (canDirectlyAdd) {
      // Add integration directly
      createIntegrationMutation.mutate({
        organization_id: organizationId,
        integration_type: newIntegration.type as any,
        provider_id: newIntegration.provider,
        provider_name: providerData.name,
        configuration: newIntegration.configuration,
        is_active: true,
        created_by: user.id
      });
    } else {
      // Create integration request
      try {
        await integrationService.createIntegrationRequest({
          organization_id: organizationId,
          project_id: organizationId, // Temporary fallback
          integration_type: newIntegration.type,
          provider_id: newIntegration.provider,
          provider_name: providerData.name,
          requested_by: user.id
        });
        
        queryClient.invalidateQueries({ queryKey: ['integration-requests'] });
        setIsAddDialogOpen(false);
        setNewIntegration({ type: '', provider: '', configuration: {} });
        toast({ title: "Integration request submitted for approval" });
      } catch (error) {
        toast({ title: "Failed to submit request", variant: "destructive" });
      }
    }
  };

  const handleToggleIntegration = (integration: OrganizationIntegration) => {
    updateIntegrationMutation.mutate({
      id: integration.id,
      updates: { is_active: !integration.is_active }
    });
  };

  const handleApproveRequest = async (request: IntegrationRequest) => {
    // First create the integration
    if (!user) return;
    
    try {
      await integrationService.createOrganizationIntegration({
        organization_id: organizationId,
        integration_type: request.integration_type as any,
        provider_id: request.provider_id,
        provider_name: request.provider_name,
        configuration: {},
        is_active: true,
        created_by: user.id
      });

      // Then update the request status
      updateRequestMutation.mutate({
        id: request.id,
        updates: { status: 'approved' }
      });

      toast({ title: "Integration request approved and added" });
    } catch (error) {
      toast({ title: "Failed to approve request", variant: "destructive" });
    }
  };

  const integrationTypes = [
    { value: 'crm', label: 'CRM' },
    { value: 'email', label: 'Email' },
    { value: 'communication', label: 'Communication' },
    { value: 'automation', label: 'Automation' }
  ];

  const getProvidersForType = (type: string) => {
    switch (type) {
      case 'crm':
        return CRM_PROVIDERS;
      case 'email':
        return [
          { id: 'gmail', name: 'Gmail', logo: '/placeholder.svg' },
          { id: 'outlook', name: 'Outlook', logo: '/placeholder.svg' },
          { id: 'smtp', name: 'SMTP', logo: '/placeholder.svg' }
        ];
      case 'communication':
        return [
          { id: 'slack', name: 'Slack', logo: '/placeholder.svg' },
          { id: 'teams', name: 'Microsoft Teams', logo: '/placeholder.svg' }
        ];
      case 'automation':
        return [
          { id: 'zapier', name: 'Zapier', logo: '/placeholder.svg' },
          { id: 'make', name: 'Make', logo: '/placeholder.svg' }
        ];
      default:
        return [];
    }
  };

  if (isLoading) {
    return <div>Loading integrations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Integrations Hub</h2>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/'}
        >
          Back to Home
        </Button>
      </div>

      {/* Org-level connectors */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Integrations</CardTitle>
          <p className="text-sm text-muted-foreground">
            Connect tools that work across your entire organization
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Salesforce */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <div>
                <div className="font-medium">Salesforce</div>
                <div className="text-sm text-muted-foreground">CRM Integration</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge('salesforce')}
              <div className="flex gap-1">
                {statuses['salesforce'] === "connected" ? (
                  <Button size="sm" variant="outline" onClick={() => handleDisconnect('salesforce')}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect('salesforce')}>
                    Connect
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setSelected(new Set(['salesforce']));
                    runTest();
                  }}
                  disabled={testing}
                >
                  Test
                </Button>
              </div>
            </div>
          </div>

          {/* Box */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">B</span>
              </div>
              <div>
                <div className="font-medium">Box</div>
                <div className="text-sm text-muted-foreground">File storage & CSV analysis</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge('box')}
              {statuses.box === 'connected' ? (
                <Button variant="outline" size="sm" onClick={() => handleDisconnect('box')}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleConnect('box')}>
                  {statuses.box === 'needs-auth' ? 'Reconnect' : 'Connect'}
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5" />
              <div>
                <div className="font-medium">Asana</div>
                <div className="text-sm text-muted-foreground">Project Management</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge('asana')}
              <div className="flex gap-1">
                {statuses['asana'] === "connected" ? (
                  <Button size="sm" variant="outline" onClick={() => handleDisconnect('asana')}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect('asana')}>
                    Connect
                  </Button>
                )}
                 <Button 
                   size="sm" 
                   variant="ghost"
                   onClick={() => {
                     setSelected(new Set(['asana']));
                     runTest();
                   }}
                   disabled={testing}
                 >
                   Test
                 </Button>
               </div>
             </div>
           </div>

          {/* Box */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">B</span>
              </div>
              <div>
                <div className="font-medium">Box</div>
                <div className="text-sm text-muted-foreground">File storage & CSV analysis</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge('box')}
              <div className="flex gap-1">
                {statuses['box'] === "connected" ? (
                  <Button size="sm" variant="outline" onClick={() => handleDisconnect('box')}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect('box')}>
                    {statuses['box'] === 'needs-auth' ? 'Reconnect' : 'Connect'}
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setSelected(new Set(['box']));
                    runTest();
                  }}
                  disabled={testing}
                >
                  Test
                </Button>
              </div>
            </div>
          </div>
          {/* Box */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <ExternalLink className="h-5 w-5" />
              <div>
                <div className="font-medium">Box</div>
                <div className="text-sm text-muted-foreground">File Storage & CSV Analysis</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge('box')}
              <div className="flex gap-1">
                {statuses['box'] === "connected" ? (
                  <Button size="sm" variant="outline" onClick={() => handleDisconnect('box')}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect('box')}>
                    Connect
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setSelected(new Set(['box']));
                    runTest();
                  }}
                  disabled={testing}
                >
                  Test
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User-level connectors */}
      <Card>
        <CardHeader>
          <CardTitle>User Integrations</CardTitle>
          <p className="text-sm text-muted-foreground">
            Connect tools for your personal use across all projects
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Slack */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Slack className="h-5 w-5" />
              <div>
                <div className="font-medium">Slack</div>
                <div className="text-sm text-muted-foreground">Team Communication</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge('slack')}
              <div className="flex gap-1">
                {statuses['slack'] === "connected" ? (
                  <Button size="sm" variant="outline" onClick={() => handleDisconnect('slack')}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect('slack')}>
                    Connect
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setSelected(new Set(['slack']));
                    runTest();
                  }}
                  disabled={testing}
                >
                  Test
                </Button>
              </div>
            </div>
          </div>

          {/* Google */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5" />
              <div>
                <div className="font-medium">Google / Gmail</div>
                <div className="text-sm text-muted-foreground">Email Integration</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge('google')}
              <div className="flex gap-1">
                {statuses['google'] === "connected" ? (
                  <Button size="sm" variant="outline" onClick={() => handleDisconnect('google')}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect('google')}>
                    Connect
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setSelected(new Set(['google']));
                    runTest();
                  }}
                  disabled={testing}
                >
                  Test
                </Button>
              </div>
            </div>
          </div>

          {/* Outlook */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5" />
              <div>
                <div className="font-medium">Outlook</div>
                <div className="text-sm text-muted-foreground">Email Integration</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge('outlook')}
              <div className="flex gap-1">
                {statuses['outlook'] === "connected" ? (
                  <Button size="sm" variant="outline" onClick={() => handleDisconnect('outlook')}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect('outlook')}>
                    Connect
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setSelected(new Set(['outlook']));
                    runTest();
                  }}
                  disabled={testing}
                >
                  Test
                </Button>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            User-level tools (Gmail/Outlook) are connected once per user and apply to all projects.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Integrations</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.filter(r => r.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="all">All Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.filter(i => i.is_active).map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {integration.integration_type === 'communication' && <Slack className="h-5 w-5" />}
                      {integration.integration_type === 'crm' && <Users className="h-5 w-5" />}
                      {integration.integration_type === 'email' && <Mail className="h-5 w-5" />}
                      {integration.integration_type === 'automation' && <Zap className="h-5 w-5" />}
                      <span>{integration.provider_name}</span>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {integration.integration_type.toUpperCase()} Integration
                  </p>
                  
                  {canManage && (
                    <div className="flex gap-2">
                      {(integration.provider_id?.toLowerCase?.() === 'asana' ||
                        integration.provider_name?.toLowerCase?.() === 'asana') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAsanaSetup(true)}
                        >
                          Configure
                        </Button>
                      )}
                      <Switch 
                        checked={integration.is_active}
                        onCheckedChange={() => handleToggleIntegration(integration)}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteIntegrationMutation.mutate(integration.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {canManage ? (
            <div className="space-y-4">
              {requests.filter(r => r.status === 'pending').map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{request.provider_name}</span>
                      <Badge variant="outline">Pending</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{request.integration_type.toUpperCase()} Integration</p>
                    {request.justification && (
                      <p className="text-sm text-muted-foreground">{request.justification}</p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApproveRequest(request)}>
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateRequestMutation.mutate({
                          id: request.id,
                          updates: { status: 'rejected' }
                        })}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Only organization owners and admins can view integration requests.</p>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{integration.provider_name}</span>
                    <Badge variant={integration.is_active ? "default" : "secondary"}>
                      {integration.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {integration.integration_type.toUpperCase()} Integration
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Asana Setup Dialog */}
      <Dialog open={showAsanaSetup} onOpenChange={setShowAsanaSetup}>
        <DialogContent aria-describedby="asana-help">
          <DialogHeader>
            <DialogTitle>Connect Asana</DialogTitle>
          </DialogHeader>
          <p id="asana-help" className="sr-only">
            Enter your Asana Personal Access Token. It will be stored securely and used to pull tasks for connected projects.
          </p>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You'll need a Personal Access Token from Asana. Go to{" "}
                <a 
                  href="https://app.asana.com/0/my-apps" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Asana Developer Console → My Apps
                </a>{" "}
                to create one.
              </p>
            </div>
            
            <div>
              <Label htmlFor="asana-pat">Personal Access Token</Label>
              <Input
                id="asana-pat"
                type="password"
                placeholder="Enter your Asana PAT..."
                value={asanaPAT}
                onChange={(e) => setAsanaPAT(e.target.value)}
                disabled={asanaLoading}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleTestAsana} 
                variant="outline" 
                disabled={!asanaPAT.trim() || asanaLoading}
              >
                {asanaLoading ? "Testing..." : "Test"}
              </Button>
              <Button 
                onClick={handleAsanaSetup} 
                disabled={!asanaPAT.trim() || asanaLoading}
                className="flex-1"
              >
                {asanaLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}