import { supabase } from "@/integrations/supabase/client";

export type OAuthProvider = "salesforce" | "slack" | "google" | "outlook" | "box";
type OAuthLevel = "org" | "user";

// Helper functions to determine provider level
export const isOrgLevel = (p: string) => p === 'salesforce' || p === 'asana' || p === 'box';
export const isUserLevel = (p: string) => p === 'slack' || p === 'google' || p === 'outlook';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? (window as any).__SUPABASE_URL__;

/** POST to edge function to get the provider authorize URL. We must include the Supabase access token. */
async function getAuthorizeUrl(provider: OAuthProvider, level: OAuthLevel, projectId?: string, organizationId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  
  const qs = new URLSearchParams({
    level,
    ...(projectId ? { project_id: projectId } : {}),
    ...(organizationId && isOrgLevel(provider) ? { organizationId } : {}),
    // where the edge callback should bounce back to in the UI (popup will postMessage then close)
    return_to: `${window.location.origin}/integrations/callback`
  });

  const headers: Record<string, string> = {};
  
  // For org-level providers, always include Authorization header
  // For user-level providers, include Authorization header (they need user context)
  headers.Authorization = `Bearer ${session.access_token}`;
  
  const res = await fetch(`${supabaseUrl}/functions/v1/${provider}_oauth/start?${qs}`, {
    method: "POST",
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  // expect { authorize_url: string }
  return json.authorize_url as string;
}

function openCenteredPopup(url: string, name = "oauth") {
  const w = 720, h = 780;
  const y = window.top!.outerHeight / 2 + window.top!.screenY - (h / 2);
  const x = window.top!.outerWidth / 2 + window.top!.screenX - (w / 2);
  return window.open(url, name, `width=${w},height=${h},left=${x},top=${y}`);
}

/** Start OAuth and resolve when the popup posts back a result */
export async function startOAuth(provider: OAuthProvider, level: OAuthLevel, projectId?: string, organizationId?: string) {
  const authorizeUrl = await getAuthorizeUrl(provider, level, projectId, organizationId);
  const popup = openCenteredPopup(authorizeUrl, `${provider}-oauth`);
  if (!popup) throw new Error("Popup blocked");
  return new Promise<{ provider: string; status: "success" | "error"; message?: string }>((resolve) => {
    const handler = (evt: MessageEvent) => {
      if (evt.origin !== window.location.origin) return;
      if (evt.data?.type === "OAUTH_RESULT" && evt.data?.provider === provider) {
        window.removeEventListener("message", handler);
        resolve({ provider, status: evt.data.status, message: evt.data.message });
      }
    };
    window.addEventListener("message", handler);
  });
}

/** After OAuth succeeds, refresh connection state for UI chips */
export async function getConnectionState() {
  // keep whatever you already have; just ensure it reads from v_project_integration_mappings or existing endpoints
}

/** Check status of a provider */
export async function checkProviderStatus(provider: OAuthProvider, organizationId?: string): Promise<{
  provider: OAuthProvider;
  level: 'user' | 'org';
  status: 'connected' | 'needs-auth' | 'error';
  detail?: string;
  account?: string;
  expires_at?: string;
  organization_id?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {};
    const body: Record<string, any> = {};
    
    // Add Authorization header for user-level providers
    if (isUserLevel(provider) && session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    // Add organization ID for org-level providers
    if (isOrgLevel(provider) && organizationId) {
      body.organizationId = organizationId;
    }

    const { data, error } = await supabase.functions.invoke(`${provider}_oauth/status`, {
      headers,
      body: Object.keys(body).length ? body : undefined,
    } as any);

    if (error) {
      console.error(`Error checking ${provider} status:`, error);
      return {
        provider,
        level: isOrgLevel(provider) ? 'org' : 'user',
        status: 'error',
        detail: error.message
      };
    }

    return data;
  } catch (error) {
    console.error(`Error checking ${provider} status:`, error);
    return {
      provider,
      level: isOrgLevel(provider) ? 'org' : 'user', 
      status: 'error',
      detail: error.message
    };
  }
}

export async function saveProjectMapping(projectId: string, updates: Record<string, any>) {
  // keep your existing upsert to project_integrations.settings/configuration
}

// Keep legacy beginOAuth for backwards compatibility
export async function beginOAuth(
  provider: "salesforce" | "slack" | "google" | "outlook",
  level: "org" | "user", 
  projectId?: string,
  organizationId?: string
): Promise<boolean> {
  await startOAuth(provider, level, projectId, organizationId);
  return true;
}

export type Provider = "salesforce" | "slack" | "google" | "outlook" | "box";
export type ProviderStatus = "connected" | "needs_auth" | "error";

// Map provider -> status function slug
const statusFn: Record<Provider, string> = {
  salesforce: "salesforce_oauth/status",
  slack: "slack_oauth/status",
  google: "google_oauth/status",
  outlook: "outlook_oauth/status", // implement when you add outlook
  box: "box_oauth/status",
};

export interface OrganizationIntegration {
  id: string;
  organization_id: string;
  integration_type: string;
  provider_id: string;
  provider_name: string;
  configuration: any;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectIntegration {
  id: string;
  project_id: string;
  organization_integration_id: string;
  is_enabled: boolean;
  configuration: any;
  created_at: string;
  updated_at: string;
  organization_integration?: OrganizationIntegration;
}

export interface IntegrationRequest {
  id: string;
  project_id: string;
  organization_id: string;
  requested_by: string;
  integration_type: string;
  provider_id: string;
  provider_name: string;
  justification?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Build start URLs for each provider (these are opened in a popup)
function buildOAuthStartUrl(provider: Provider, params: { organizationId?: string; projectId?: string } = {}) {
  const base = `${supabaseUrl}/functions/v1`;
  const qs = new URLSearchParams();
  if (params.organizationId) qs.set("organizationId", params.organizationId);
  if (params.projectId) qs.set("projectId", params.projectId);

  // Your edge functions are {provider}_oauth/start
  return `${base}/${provider}_oauth/start${qs.toString() ? `?${qs.toString()}` : ""}`;
}

// Open a centered OAuth popup
export function openOAuthWindow(url: string, name = "oauth", w = 600, h = 700) {
  const y = window.top?.outerHeight ? Math.max((window.top!.outerHeight - h) / 2, 0) : 0;
  const x = window.top?.outerWidth ? Math.max((window.top!.outerWidth - w) / 2, 0) : 0;
  return window.open(
    url,
    name,
    `width=${w},height=${h},left=${x},top=${y},noopener,noreferrer`
  );
}

// Optional: Accept "gmail" from legacy callers and map to "google"
function toProvider(key: string): Provider | null {
  const k = key.toLowerCase();
  if (k === "gmail") return "google";
  if (k === "google" || k === "slack" || k === "salesforce" || k === "outlook" || k === "box") return k as Provider;
  return null;
}

export class IntegrationService {
  // Organization-level integration management
  async getOrganizationIntegrations(organizationId: string): Promise<OrganizationIntegration[]> {
    const { data, error } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createOrganizationIntegration(integration: Omit<OrganizationIntegration, 'id' | 'created_at' | 'updated_at'>): Promise<OrganizationIntegration> {
    const { data, error } = await supabase
      .from('organization_integrations')
      .insert(integration)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateOrganizationIntegration(id: string, updates: Partial<OrganizationIntegration>): Promise<OrganizationIntegration> {
    const { data, error } = await supabase
      .from('organization_integrations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteOrganizationIntegration(id: string): Promise<void> {
    const { error } = await supabase
      .from('organization_integrations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Project-level integration assignment
  async getProjectIntegrations(projectId: string): Promise<ProjectIntegration[]> {
    const { data, error } = await supabase
      .from('project_integrations')
      .select(`
        *,
        organization_integration:organization_integrations(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async assignIntegrationToProject(projectId: string, organizationIntegrationId: string, configuration: any = {}): Promise<ProjectIntegration> {
    const { data, error } = await supabase
      .from('project_integrations')
      .insert({
        project_id: projectId,
        organization_integration_id: organizationIntegrationId,
        configuration,
        is_enabled: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProjectIntegration(id: string, updates: Partial<ProjectIntegration>): Promise<ProjectIntegration> {
    const { data, error } = await supabase
      .from('project_integrations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeIntegrationFromProject(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_integrations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }


  // Integration requests
  async getIntegrationRequests(organizationId: string): Promise<IntegrationRequest[]> {
    const { data, error } = await supabase
      .from('integration_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createIntegrationRequest(request: Omit<IntegrationRequest, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<IntegrationRequest> {
    const { data, error } = await supabase
      .from('integration_requests')
      .insert({
        ...request,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateIntegrationRequest(id: string, updates: Partial<IntegrationRequest>): Promise<IntegrationRequest> {
    const { data, error } = await supabase
      .from('integration_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Helper method to check user permissions
  async canManageIntegrations(organizationId: string): Promise<boolean> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    // Check if user is organization owner
    const { data: org } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single();

    if (org?.owner_id === user.user.id) return true;

    // Check if user is admin
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.user.id)
      .single();

    return member?.role === 'admin';
  }

  // Check if user can directly add integrations (based on role and subscription)
  async canDirectlyAddIntegrations(organizationId: string): Promise<boolean> {
    const canManage = await this.canManageIntegrations(organizationId);
    if (!canManage) return false;

    // Import subscription service to check tier
    const { subscriptionService } = await import('@/services/subscriptionService');
    const subscription = await subscriptionService.getCurrentSubscription();
    
    // Allow direct integration setup for Pro+ tiers
    return subscription.id === 'professional' || subscription.id === 'enterprise';
  }

  /**
   * Check OAuth connection status for a provider.
   * Returns normalized status response.
   */
  async test(provider: Provider, scope: "user" | "org", organizationId?: string): Promise<{
    provider: string;
    level: 'user' | 'org';
    status: 'connected' | 'needs-auth' | 'error';
    detail?: string;
  }> {
    try {
      const headers: Record<string, string> = {};
      const body: Record<string, any> = {};

      // Add Authorization header for user-level providers
      if (scope === "user") {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      }

      // Add organization ID for org-level providers  
      if (scope === "org" && organizationId) {
        body.organizationId = organizationId;
      }

      const { data, error } = await supabase.functions.invoke(`${provider}_oauth/status`, {
        headers,
        body: Object.keys(body).length ? body : undefined,
      } as any);

      if (error) {
        console.error(`Error testing ${provider} connection:`, error);
        return { provider, level: scope, status: 'error', detail: error.message };
      }

      return data;
    } catch (e) {
      console.error(`Error testing ${provider} connection:`, e);
      return { provider, level: scope, status: 'error', detail: e.message };
    }
  }

  /**
   * Kick off OAuth for a provider. Call from your "Authorize" button.
   * scope: "user" for Google; "org" for Salesforce/Slack; pass org id for org-scoped.
   */
  start(provider: Provider, scope: "user" | "org", params: { organizationId?: string; projectId?: string } = {}) {
    const url = buildOAuthStartUrl(provider, params);
    openOAuthWindow(url, `${provider}-oauth`);
  }
  
}

// OAuth Connection helpers - Updated to use normalized responses
export async function hasGoogleConnection(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    const { data, error } = await supabase.functions.invoke('google_oauth/status', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    } as any);
    
    if (error) return false;
    return data?.status === 'connected';
  } catch (error) {
    console.error('Error checking Google connection:', error);
    return false;
  }
}

export async function hasSalesforceConnection(organizationId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('salesforce_oauth/status', {
      body: { organizationId },
    } as any);
    
    if (error) return false;
    return data?.status === 'connected';
  } catch (error) {
    console.error('Error checking Salesforce connection:', error);
    return false;
  }
}

export async function hasSlackConnection(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    const { data, error } = await supabase.functions.invoke('slack_oauth/status', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    } as any);
    
    if (error) return false;
    return data?.status === 'connected';
  } catch (error) {
    console.error('Error checking Slack connection:', error);
    return false;
  }
}

// Salesforce CRM helpers
export async function fetchBudget(projectId: string) {
  // TODO: Implement after mapping is available
  console.log('Fetching budget for project:', projectId);
  return { budget: 0, spent: 0 };
}

export async function fetchContacts(projectId: string) {
  // TODO: Implement after mapping is available
  console.log('Fetching contacts for project:', projectId);
  return [];
}

// Slack helper
export async function postMessage({ userId, channel, text }: { userId: string; channel: string; text: string }) {
  // TODO: Implement after user token retrieval
  console.log('Posting message:', { userId, channel, text });
}

const service = new IntegrationService();
export const integrationService = Object.assign({ 
  startOAuth, 
  getConnectionState, 
  saveProjectMapping, 
  checkProviderStatus,
  isOrgLevel,
  isUserLevel
}, service);