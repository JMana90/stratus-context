import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { integrationDataService } from "@/services/integrationDataService";
import { useIntegrationStatus } from "@/hooks/useIntegrationStatus";

interface BudgetOverviewProps {
  projectId?: string;
  organizationId?: string;
}

export default function BudgetOverview({ projectId, organizationId }: BudgetOverviewProps) {
  const integrationStatus = useIntegrationStatus(projectId || '', organizationId || '');
  
  const { data: budgetData, isLoading } = useQuery({
    queryKey: ['integration-budget', projectId],
    queryFn: () => projectId ? integrationDataService.getWidgetData(projectId, 'budget') : Promise.resolve({ source: 'none' }),
    enabled: !!projectId && integrationStatus.crm
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if CRM integration is connected
  if (!integrationStatus.crm) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Salesforce integration required</p>
            <p className="text-xs mt-1">Connect Salesforce in project settings to view budget data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if we have integration data
  const hasIntegrationData = budgetData?.source && budgetData.source !== 'none';
  
  if (!hasIntegrationData) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No budget data available</p>
            <p className="text-xs mt-1">Connect a CRM integration to see budget information</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const budget = budgetData as any;
  const spentPercentage = budget.total_budget ? (budget.spent / budget.total_budget) * 100 : 0;
  const isOverBudget = spentPercentage > 80;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {budget.source}
          </Badge>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budget.total_budget && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Total Budget</span>
                <span className="font-medium">${budget.total_budget.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Spent</span>
                <span className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
                  ${budget.spent.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={spentPercentage} 
                className={`w-full ${isOverBudget ? 'text-destructive' : ''}`}
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Remaining</span>
                <span>${budget.remaining.toLocaleString()}</span>
              </div>
            </div>
          )}

          {isOverBudget && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">Budget Alert: 80% spent</span>
            </div>
          )}

          {budget.forecasted_revenue && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Forecasted Revenue
                </span>
                <span className="font-medium text-green-600">
                  ${budget.forecasted_revenue.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {budget.opportunities && budget.opportunities.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <h4 className="text-sm font-medium">Opportunities</h4>
              <div className="space-y-1">
                {budget.opportunities.slice(0, 3).map((opp: any) => (
                  <div key={opp.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{opp.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">${opp.value.toLocaleString()}</span>
                      {opp.probability && (
                        <Badge variant="outline" className="text-xs">
                          {opp.probability}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}