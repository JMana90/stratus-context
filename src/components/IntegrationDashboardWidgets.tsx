import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Zap, Slack, MessageSquare, Mail, BarChart, Calendar } from "lucide-react";
import { integrationService } from "@/services/integrationService";

interface IntegrationDashboardWidgetsProps {
  projectId: string;
  organizationId: string;
}

export function IntegrationDashboardWidgets({ projectId, organizationId }: IntegrationDashboardWidgetsProps) {
  const { data: projectIntegrations = [] } = useQuery({
    queryKey: ['project-integrations', projectId],
    queryFn: () => integrationService.getProjectIntegrations(projectId),
    enabled: !!projectId
  });

  const enabledIntegrations = projectIntegrations.filter(integration => integration.is_enabled);

  const getIntegrationWidget = (type: string, providerName: string) => {
    switch (type) {
      case 'crm':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CRM Overview</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124</div>
              <p className="text-xs text-muted-foreground">Active contacts in {providerName}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">+12 this week</Badge>
              </div>
            </CardContent>
          </Card>
        );

      case 'communication':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Activity</CardTitle>
              {providerName.toLowerCase().includes('slack') ? <Slack className="h-4 w-4 text-muted-foreground" /> : <MessageSquare className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-muted-foreground">Messages today in {providerName}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">3 channels active</Badge>
              </div>
            </CardContent>
          </Card>
        );

      case 'automation':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automation</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Active workflows in {providerName}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">2 triggered today</Badge>
              </div>
            </CardContent>
          </Card>
        );

      case 'email':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Email Activity</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">Emails processed today</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">4 campaigns active</Badge>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{providerName}</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Connected to {providerName}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  if (enabledIntegrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No integrations configured for this project.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {enabledIntegrations.map((integration) => (
        <div key={integration.id}>
          {getIntegrationWidget(
            integration.organization_integration?.integration_type || '',
            integration.organization_integration?.provider_name || 'Unknown'
          )}
        </div>
      ))}
    </div>
  );
}