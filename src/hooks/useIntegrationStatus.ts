import { useQuery } from "@tanstack/react-query";
import { integrationService } from "@/services/integrationService";

interface IntegrationStatus {
  crm: boolean;
  comm: boolean;
  salesforceConnected: boolean;
  slackConnected: boolean;
  gmailConnected: boolean;
  outlookConnected: boolean;
}

export function useIntegrationStatus(projectId: string, organizationId: string): IntegrationStatus {
  const { data: projectIntegrations = [] } = useQuery({
    queryKey: ['project-integrations', projectId],
    queryFn: () => integrationService.getProjectIntegrations(projectId),
    enabled: !!projectId
  });

  const { data: orgIntegrations = [] } = useQuery({
    queryKey: ['organization-integrations', organizationId],
    queryFn: () => integrationService.getOrganizationIntegrations(organizationId),
    enabled: !!organizationId
  });

  const enabledProjectIntegrations = projectIntegrations.filter(pi => pi.is_enabled);
  const activeOrgIntegrations = orgIntegrations.filter(oi => oi.is_active);

  // Check if we have CRM integration (Salesforce) available and mapped to this project
  const hasSalesforceIntegration = activeOrgIntegrations.some(oi => 
    oi.provider_id === 'salesforce' || oi.provider_name.toLowerCase().includes('salesforce')
  );
  const salesforceProjectIntegration = enabledProjectIntegrations.find(pi => 
    pi.organization_integration?.provider_id === 'salesforce' || 
    pi.organization_integration?.provider_name.toLowerCase().includes('salesforce')
  );
  const salesforceConnected = !!(hasSalesforceIntegration && salesforceProjectIntegration);

  // Check communication integrations (user-level: Slack, Gmail, Outlook)
  const hasSlackIntegration = enabledProjectIntegrations.some(pi => 
    pi.organization_integration?.provider_id === 'slack' || 
    pi.organization_integration?.provider_name.toLowerCase().includes('slack')
  );
  
  const hasGmailIntegration = enabledProjectIntegrations.some(pi => 
    pi.organization_integration?.provider_id === 'gmail' || 
    pi.organization_integration?.provider_name.toLowerCase().includes('gmail')
  );
  
  const hasOutlookIntegration = enabledProjectIntegrations.some(pi => 
    pi.organization_integration?.provider_id === 'outlook' || 
    pi.organization_integration?.provider_name.toLowerCase().includes('outlook')
  );

  const commConnected = hasSlackIntegration || hasGmailIntegration || hasOutlookIntegration;

  return {
    crm: salesforceConnected,
    comm: commConnected,
    salesforceConnected,
    slackConnected: hasSlackIntegration,
    gmailConnected: hasGmailIntegration,
    outlookConnected: hasOutlookIntegration
  };
}