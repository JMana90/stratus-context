import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { integrationService } from "@/services/integrationService";
import { dashboardService, normalizeWidgetIds } from "@/services/dashboardService";
import { 
  DollarSign, 
  FileText, 
  Users, 
  MessageSquare,
  Camera,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { WidgetId } from "@/config/industry-widgets";

interface DashboardSetupProps {
  projectId: string;
  organizationId: string;
  projectType?: string;
  onComplete: () => void;
  draft?: any;
  patchDraft?: (patch: any) => void;
}

// Widget registry mapping IDs to display info
const WIDGET_REGISTRY: Record<WidgetId, { 
  name: string; 
  description: string; 
  icon: React.ComponentType<any>;
  requiresIntegration?: boolean;
}> = {
  "budget-overview": { name: "Budget Overview", description: "Track project budget and expenses", icon: DollarSign },
  "project-contacts": { name: "Project Contacts", description: "Manage project stakeholders", icon: Users, requiresIntegration: true },
  "doc-repo": { name: "Document Repository", description: "Store and organize project documents", icon: FileText },
  "project-photos": { name: "Project Photos", description: "Visual project progress tracking", icon: Camera },
  "delay-tracker": { name: "Delay Tracker", description: "Monitor and analyze project delays", icon: AlertTriangle },
  "timeline": { name: "Timeline & Gantt", description: "Project timeline and milestone tracking", icon: BarChart3 },
  "meeting-minutes": { name: "Meeting Minutes", description: "Track meeting notes and decisions", icon: MessageSquare },
};

export function DashboardSetup({ projectId, organizationId, projectType, onComplete, draft, patchDraft }: DashboardSetupProps) {
  const { toast } = useToast();
  
  // Use draft state if available, otherwise local state
  const usingDraft = Boolean(draft && patchDraft);
  const [localSelectedWidgets, setLocalSelectedWidgets] = useState<string[]>([]);
  
  const selectedWidgets = usingDraft ? (draft?.recommendedWidgets ?? []) : localSelectedWidgets;

  const { data: integrations } = useQuery({
    queryKey: ['project-integrations', projectId],
    queryFn: () => integrationService.getProjectIntegrations(projectId),
    enabled: !!projectId
  });

  const getConnectedIntegrations = () => {
    return {
      crm: integrations?.some(i => 
        i.organization_integration?.integration_type === 'crm' && i.is_enabled
      ) || false,
    };
  };

  const handleWidgetToggle = (widgetId: WidgetId) => {
    if (usingDraft && patchDraft) {
      // Update draft state
      const current = draft?.recommendedWidgets ?? [];
      const isSelected = current.includes(widgetId);
      const updated = isSelected 
        ? current.filter((id: string) => id !== widgetId)
        : [...current, widgetId];
      patchDraft({ recommendedWidgets: updated });
    } else {
      // Update local state
      setLocalSelectedWidgets(prev => 
        prev.includes(widgetId)
          ? prev.filter(id => id !== widgetId)
          : [...prev, widgetId]
      );
    }
  };

  const handleComplete = async () => {
    try {
      const finalWidgets = normalizeWidgetIds(selectedWidgets);
      
      await dashboardService.applySelectedWidgets(projectId, finalWidgets);
      onComplete();
      
      toast({
        title: "Dashboard configured!",
        description: `${finalWidgets.length} widgets have been set up for your dashboard.`
      });
    } catch (error: any) {
      toast({
        title: "Error configuring dashboard",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const normalizedSelected = normalizeWidgetIds(selectedWidgets);
  const connectedIntegrations = getConnectedIntegrations();

  // Get all widget IDs from the registry
  const availableWidgets = Object.keys(WIDGET_REGISTRY) as WidgetId[];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableWidgets.map((widgetId) => {
          const widget = WIDGET_REGISTRY[widgetId];
          const isSelected = selectedWidgets.includes(widgetId);
          const isDisabled = widget.requiresIntegration && !connectedIntegrations.crm;
          const Icon = widget.icon;
          
          return (
            <Card 
              key={widgetId}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : isDisabled 
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:border-primary/50'
              }`}
              onClick={() => !isDisabled && handleWidgetToggle(widgetId)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => {}} // Handled by card click
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5" />
                      <h3 className="font-medium">{widget.name}</h3>
                      {widget.requiresIntegration && (
                        <Badge variant="secondary" className="text-xs">
                          {isDisabled ? 'Needs CRM' : 'Integration'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {widget.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Selected: {normalizedSelected.length} widget{normalizedSelected.length !== 1 ? 's' : ''}
        </div>
        <Button 
          onClick={handleComplete}
          disabled={normalizedSelected.length === 0}
        >
          Continue with {normalizedSelected.length} widget{normalizedSelected.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}