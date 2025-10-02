import { supabase } from "@/integrations/supabase/client";

export interface CRMProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  authUrl?: string;
  webhookSupport: boolean;
}

export interface CRMContact {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  source: string;
}

export interface CRMProject {
  id: string;
  name: string;
  status: string;
  value?: number;
  contacts: string[];
  source: string;
}

export const CRM_PROVIDERS: CRMProvider[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    logo: '/placeholder.svg',
    description: 'Popular CRM with generous free tier',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    webhookSupport: true
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    logo: '/placeholder.svg',
    description: 'Enterprise CRM solution',
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    webhookSupport: true
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    logo: '/placeholder.svg',
    description: 'Sales-focused CRM platform',
    authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    webhookSupport: true
  },
  {
    id: 'zapier',
    name: 'Zapier',
    logo: '/placeholder.svg',
    description: 'Connect to 5000+ apps via webhooks',
    webhookSupport: true
  }
];

export class CRMService {
  private connections: Map<string, any> = new Map();

  async connectProvider(providerId: string, credentials: any): Promise<boolean> {
    try {
      // Store connection info (in production, this would be in Supabase)
      this.connections.set(providerId, {
        ...credentials,
        connectedAt: new Date().toISOString()
      });
      
      localStorage.setItem(`crm_${providerId}`, JSON.stringify(credentials));
      return true;
    } catch (error) {
      console.error(`Failed to connect to ${providerId}:`, error);
      return false;
    }
  }

  isConnected(providerId: string): boolean {
    return this.connections.has(providerId) || 
           localStorage.getItem(`crm_${providerId}`) !== null;
  }

  async syncContacts(providerId: string): Promise<CRMContact[]> {
    if (!this.isConnected(providerId)) {
      throw new Error(`${providerId} not connected`);
    }

    // Mock data for now - in production, this would call the actual CRM APIs
    return [
      {
        id: '1',
        name: 'John Smith',
        email: 'john@example.com',
        company: 'Acme Corp',
        phone: '+1234567890',
        source: providerId
      },
      {
        id: '2',
        name: 'Jane Doe',
        email: 'jane@example.com',
        company: 'Tech Solutions',
        source: providerId
      }
    ];
  }

  async syncProjects(providerId: string): Promise<CRMProject[]> {
    if (!this.isConnected(providerId)) {
      throw new Error(`${providerId} not connected`);
    }

    // Mock data for now
    return [
      {
        id: '1',
        name: 'Office Renovation',
        status: 'In Progress',
        value: 150000,
        contacts: ['1'],
        source: providerId
      },
      {
        id: '2',
        name: 'Warehouse Expansion',
        status: 'Planning',
        value: 500000,
        contacts: ['2'],
        source: providerId
      }
    ];
  }

  async sendWebhook(url: string, data: any): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          source: 'stratus-ai'
        }),
      });
      return true;
    } catch (error) {
      console.error('Webhook error:', error);
      return false;
    }
  }
  async hasSalesforceSecrets(): Promise<boolean> {
    try {
      // We just ping the proxy; if it responds (200-399) we treat as connected.
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("salesforce_proxy", {
        method: "GET",
        // lightweight ping; function can ignore body
        headers: { "Content-Type": "application/json" },
      });
      return !error;
    } catch {
      return false;
    }
  }
}

export const crmService = new CRMService();
