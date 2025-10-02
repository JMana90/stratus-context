import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ProjectIntegration = Database['public']['Tables']['project_integrations']['Row'] & {
  organization_integration?: Database['public']['Tables']['organization_integrations']['Row'];
};

interface IntegrationData {
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    assigned_to?: string;
    source: string;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description?: string;
    target_date?: string;
    status: 'upcoming' | 'current' | 'completed';
    progress?: number;
    source: string;
  }>;
  budget: {
    total_budget?: number;
    spent?: number;
    remaining?: number;
    forecasted_revenue?: number;
    opportunities?: Array<{
      id: string;
      name: string;
      value: number;
      probability?: number;
      close_date?: string;
    }>;
    source: string;
  };
  contacts: Array<{
    id: string;
    name: string;
    email?: string;
    role?: string;
    phone?: string;
    company?: string;
    is_project_member?: boolean;
    source: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    url?: string;
    type?: string;
    size?: number;
    created_at?: string;
    created_by?: string;
    source: string;
  }>;
}

export const integrationDataService = {
  async getIntegratedProjectData(projectId: string): Promise<IntegrationData> {
    // Get project integrations
    const { data: integrations, error } = await supabase
      .from('project_integrations')
      .select(`
        *,
        organization_integration:organization_integrations(*)
      `)
      .eq('project_id', projectId)
      .eq('is_enabled', true);

    if (error) {
      console.error('Error fetching integrations:', error);
      return this.getEmptyData();
    }

    if (!integrations || integrations.length === 0) {
      return this.getEmptyData();
    }

    // Process each integration and aggregate data
    const aggregatedData: IntegrationData = {
      tasks: [],
      milestones: [],
      budget: { source: 'none' },
      contacts: [],
      documents: []
    };

    for (const integration of integrations) {
      if (!integration.organization_integration) continue;

      const integrationType = integration.organization_integration.integration_type;
      const providerName = integration.organization_integration.provider_name;

      switch (integrationType) {
        case 'crm':
          await this.processCRMData(integration, aggregatedData, providerName);
          break;
        case 'email':
          await this.processEmailData(integration, aggregatedData, providerName);
          break;
        case 'communication':
          await this.processCommunicationData(integration, aggregatedData, providerName);
          break;
        case 'automation':
          await this.processAutomationData(integration, aggregatedData, providerName);
          break;
        default:
          console.log(`Unknown integration type: ${integrationType}`);
      }
    }

    return aggregatedData;
  },

  async processCRMData(integration: ProjectIntegration, data: IntegrationData, providerName: string) {
    const config = integration.configuration as any;
    
    // Mock CRM data processing - in real implementation, this would call actual CRM APIs
    switch (providerName.toLowerCase()) {
      case 'salesforce':
        data.tasks.push(
          ...this.generateMockCRMTasks('Salesforce', config)
        );
        data.contacts.push(
          ...this.generateMockCRMContacts('Salesforce', config)
        );
        data.budget = {
          ...data.budget,
          ...this.generateMockCRMBudget('Salesforce', config)
        };
        break;
      
      case 'hubspot':
        data.tasks.push(
          ...this.generateMockCRMTasks('HubSpot', config)
        );
        data.contacts.push(
          ...this.generateMockCRMContacts('HubSpot', config)
        );
        data.milestones.push(
          ...this.generateMockCRMMilestones('HubSpot', config)
        );
        break;
      
      case 'pipedrive':
        data.tasks.push(
          ...this.generateMockCRMTasks('Pipedrive', config)
        );
        data.budget = {
          ...data.budget,
          ...this.generateMockCRMBudget('Pipedrive', config)
        };
        break;
    }
  },

  async processEmailData(integration: ProjectIntegration, data: IntegrationData, providerName: string) {
    const config = integration.configuration as any;
    
    // Process email-based data
    data.contacts.push(
      ...this.generateMockEmailContacts(providerName, config)
    );
    data.documents.push(
      ...this.generateMockEmailDocuments(providerName, config)
    );
  },

  async processCommunicationData(integration: ProjectIntegration, data: IntegrationData, providerName: string) {
    const config = integration.configuration as any;
    
    // Process Slack/Teams data
    data.tasks.push(
      ...this.generateMockCommunicationTasks(providerName, config)
    );
    data.documents.push(
      ...this.generateMockCommunicationDocuments(providerName, config)
    );
  },

  async processAutomationData(integration: ProjectIntegration, data: IntegrationData, providerName: string) {
    const config = integration.configuration as any;
    
    // Process automation platform data (Zapier, Make, etc.)
    data.tasks.push(
      ...this.generateMockAutomationTasks(providerName, config)
    );
    data.milestones.push(
      ...this.generateMockAutomationMilestones(providerName, config)
    );
  },

  // Mock data generators - these would be replaced with actual API calls
  generateMockCRMTasks(provider: string, config: any) {
    return [
      {
        id: `${provider}-task-1`,
        title: `Follow up on ${provider} lead`,
        description: `High-priority follow-up from ${provider} CRM`,
        status: 'pending' as const,
        priority: 'high' as const,
        due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
        assigned_to: 'Sales Team',
        source: provider
      },
      {
        id: `${provider}-task-2`,
        title: `Update ${provider} opportunity`,
        description: `Sync project progress to ${provider}`,
        status: 'in_progress' as const,
        priority: 'medium' as const,
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        assigned_to: 'Project Manager',
        source: provider
      }
    ];
  },

  generateMockCRMContacts(provider: string, config: any) {
    return [
      {
        id: `${provider}-contact-1`,
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        role: 'Project Sponsor',
        phone: '+1-555-0123',
        company: 'Enterprise Corp',
        is_project_member: true,
        source: provider
      },
      {
        id: `${provider}-contact-2`,
        name: 'Mike Chen',
        email: 'mike.chen@company.com',
        role: 'Technical Lead',
        phone: '+1-555-0124',
        company: 'Enterprise Corp',
        is_project_member: true,
        source: provider
      }
    ];
  },

  generateMockCRMBudget(provider: string, config: any) {
    return {
      total_budget: 150000,
      spent: 45000,
      remaining: 105000,
      forecasted_revenue: 250000,
      opportunities: [
        {
          id: `${provider}-opp-1`,
          name: 'Phase 2 Expansion',
          value: 75000,
          probability: 80,
          close_date: new Date(Date.now() + 86400000 * 60).toISOString()
        },
        {
          id: `${provider}-opp-2`,
          name: 'Additional Services',
          value: 25000,
          probability: 60,
          close_date: new Date(Date.now() + 86400000 * 90).toISOString()
        }
      ],
      source: provider
    };
  },

  generateMockCRMMilestones(provider: string, config: any) {
    return [
      {
        id: `${provider}-milestone-1`,
        title: 'Project Kickoff',
        description: `Tracked in ${provider}`,
        target_date: new Date(Date.now() - 86400000 * 30).toISOString(),
        status: 'completed' as const,
        progress: 100,
        source: provider
      },
      {
        id: `${provider}-milestone-2`,
        title: 'Phase 1 Delivery',
        description: `Synced from ${provider} deal stages`,
        target_date: new Date(Date.now() + 86400000 * 15).toISOString(),
        status: 'current' as const,
        progress: 75,
        source: provider
      }
    ];
  },

  generateMockEmailContacts(provider: string, config: any) {
    return [
      {
        id: `${provider}-email-contact-1`,
        name: 'Jennifer Davis',
        email: 'jennifer.davis@client.com',
        role: 'Stakeholder',
        company: 'Client Organization',
        is_project_member: false,
        source: provider
      }
    ];
  },

  generateMockEmailDocuments(provider: string, config: any) {
    return [
      {
        id: `${provider}-doc-1`,
        name: `Project Requirements - ${provider}`,
        type: 'pdf',
        size: 1024000,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        created_by: 'Email Import',
        source: provider
      }
    ];
  },

  generateMockCommunicationTasks(provider: string, config: any) {
    return [
      {
        id: `${provider}-comm-task-1`,
        title: `Review ${provider} feedback`,
        description: `Action item from ${provider} conversation`,
        status: 'pending' as const,
        priority: 'medium' as const,
        due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
        source: provider
      }
    ];
  },

  generateMockCommunicationDocuments(provider: string, config: any) {
    return [
      {
        id: `${provider}-comm-doc-1`,
        name: `Meeting Notes - ${provider}`,
        type: 'document',
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        created_by: provider,
        source: provider
      }
    ];
  },

  generateMockAutomationTasks(provider: string, config: any) {
    return [
      {
        id: `${provider}-auto-task-1`,
        title: `${provider} workflow trigger`,
        description: `Automated task from ${provider}`,
        status: 'pending' as const,
        priority: 'low' as const,
        source: provider
      }
    ];
  },

  generateMockAutomationMilestones(provider: string, config: any) {
    return [
      {
        id: `${provider}-auto-milestone-1`,
        title: `${provider} Process Milestone`,
        description: `Automated milestone from ${provider}`,
        target_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        status: 'upcoming' as const,
        source: provider
      }
    ];
  },

  getEmptyData(): IntegrationData {
    return {
      tasks: [],
      milestones: [],
      budget: { source: 'none' },
      contacts: [],
      documents: []
    };
  },

  // Helper method to get data for specific widget types
  async getWidgetData(projectId: string, widgetType: 'tasks' | 'milestones' | 'budget' | 'contacts' | 'documents') {
    const data = await this.getIntegratedProjectData(projectId);
    return data[widgetType];
  }
};