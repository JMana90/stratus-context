import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, Zap, Slack, MessageSquare, Mail, Building, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { organizationService } from "@/services/organizationService";
import { integrationService } from "@/services/integrationService";
import { subscriptionService } from "@/services/subscriptionService";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

interface OrganizationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (organization: any) => void;
}

type SetupStep = 'organization' | 'integrations' | 'complete';

interface IntegrationOption {
  id: string;
  name: string;
  type: string;
  icon: React.ReactNode;
  description: string;
  popular?: boolean;
}

const INTEGRATION_OPTIONS: IntegrationOption[] = [
  // CRM Options
  {
    id: 'hubspot',
    name: 'HubSpot',
    type: 'crm',
    icon: <Users className="h-5 w-5" />,
    description: 'Customer relationship management',
    popular: true
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    type: 'crm',
    icon: <Users className="h-5 w-5" />,
    description: 'Enterprise CRM platform',
    popular: true
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    type: 'crm',
    icon: <Users className="h-5 w-5" />,
    description: 'Simple CRM for small teams'
  },
  // Email Options
  {
    id: 'gmail',
    name: 'Gmail',
    type: 'email',
    icon: <Mail className="h-5 w-5" />,
    description: 'Google email integration',
    popular: true
  },
  {
    id: 'outlook',
    name: 'Outlook',
    type: 'email',
    icon: <Mail className="h-5 w-5" />,
    description: 'Microsoft email integration'
  },
  {
    id: 'smtp',
    name: 'SMTP',
    type: 'email',
    icon: <Mail className="h-5 w-5" />,
    description: 'Generic SMTP email setup'
  },
  // Communication Options
  {
    id: 'slack',
    name: 'Slack',
    type: 'communication',
    icon: <Slack className="h-5 w-5" />,
    description: 'Team communication',
    popular: true
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    type: 'communication',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Microsoft collaboration platform'
  },
  // Automation Options
  {
    id: 'zapier',
    name: 'Zapier',
    type: 'automation',
    icon: <Zap className="h-5 w-5" />,
    description: 'Workflow automation',
    popular: true
  },
  {
    id: 'make',
    name: 'Make',
    type: 'automation',
    icon: <Zap className="h-5 w-5" />,
    description: 'Advanced automation workflows'
  }
];

export function OrganizationSetupModal({ isOpen, onClose, onComplete }: OrganizationSetupModalProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('organization');
  const [organizationData, setOrganizationData] = useState({
    name: '',
    description: ''
  });
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [createdOrg, setCreatedOrg] = useState<any>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get current subscription to check permissions
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionService.getCurrentSubscription(),
  });

  // Check if user can directly add integrations (Owner/Admin in Pro+ tiers)
  const canDirectlyAddIntegrations = subscription && (
    subscription.id === 'professional' || subscription.id === 'enterprise'
  );

  const createOrgMutation = useMutation({
    mutationFn: organizationService.createOrganization,
    onSuccess: (org) => {
      setCreatedOrg(org);
      setCurrentStep('integrations');
      toast({
        title: "Organization created!",
        description: `${org.name} has been created successfully.`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create organization.",
        variant: "destructive"
      });
    }
  });

  const createIntegrationMutation = useMutation({
    mutationFn: integrationService.createOrganizationIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-integrations'] });
    }
  });

  const handleCreateOrganization = () => {
    if (!organizationData.name || !user) return;

    createOrgMutation.mutate({
      name: organizationData.name,
      description: organizationData.description,
      owner_id: user.id
    });
  };

  const handleSetupIntegrations = async () => {
    if (!createdOrg || !user) return;

    try {
      if (canDirectlyAddIntegrations) {
        // Create selected integrations directly
        for (const integrationId of selectedIntegrations) {
          const integration = INTEGRATION_OPTIONS.find(i => i.id === integrationId);
          if (integration) {
            await createIntegrationMutation.mutateAsync({
              organization_id: createdOrg.id,
              integration_type: integration.type,
              provider_id: integration.id,
              provider_name: integration.name,
              configuration: {},
              is_active: true,
              created_by: user.id
            });
          }
        }
      } else {
        // Create integration requests for approval
        for (const integrationId of selectedIntegrations) {
          const integration = INTEGRATION_OPTIONS.find(i => i.id === integrationId);
          if (integration) {
            await integrationService.createIntegrationRequest({
              organization_id: createdOrg.id,
              project_id: createdOrg.id, // Temporary - will be updated when project is created
              integration_type: integration.type,
              provider_id: integration.id,
              provider_name: integration.name,
              requested_by: user.id
            });
          }
        }
      }

      setCurrentStep('complete');
      toast({
        title: canDirectlyAddIntegrations ? "Integrations configured!" : "Integration requests submitted!",
        description: canDirectlyAddIntegrations 
          ? `${selectedIntegrations.length} integrations have been set up.`
          : `${selectedIntegrations.length} integration requests have been submitted for admin approval.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up some integrations.",
        variant: "destructive"
      });
    }
  };

  const handleComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['current-organization'] });
    onComplete(createdOrg);
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'organization':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Building className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Create Your Organization</h3>
              <p className="text-muted-foreground">
                Set up your organization to manage projects and team members.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input
                  id="org-name"
                  value={organizationData.name}
                  onChange={(e) => setOrganizationData({ ...organizationData, name: e.target.value })}
                  placeholder="Enter your organization name"
                />
              </div>

              <div>
                <Label htmlFor="org-description">Description (Optional)</Label>
                <Textarea
                  id="org-description"
                  value={organizationData.description}
                  onChange={(e) => setOrganizationData({ ...organizationData, description: e.target.value })}
                  placeholder="Describe your organization"
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleCreateOrganization} 
                disabled={!organizationData.name || createOrgMutation.isPending}
                className="w-full"
              >
                Create Organization
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Settings className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Set Up Integrations</h3>
              <p className="text-muted-foreground">
                Connect your favorite tools to streamline your workflow. {canDirectlyAddIntegrations ? 'Select integrations to add directly.' : 'You can always add more later.'}
              </p>
              {!canDirectlyAddIntegrations && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Some integrations require Pro or Enterprise plans for direct setup. Others can be requested for admin approval.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Group integrations by type */}
              {['crm', 'email', 'communication', 'automation'].map((type) => {
                const typeIntegrations = INTEGRATION_OPTIONS.filter(i => i.type === type);
                const typeLabels = {
                  crm: 'Customer Relationship Management',
                  email: 'Email Integration',
                  communication: 'Team Communication',
                  automation: 'Workflow Automation'
                };
                
                return (
                  <div key={type} className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {typeLabels[type as keyof typeof typeLabels]}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {typeIntegrations.map((integration) => (
                        <Card 
                          key={integration.id} 
                          className={`cursor-pointer transition-colors ${
                            selectedIntegrations.includes(integration.id) 
                              ? 'ring-2 ring-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            setSelectedIntegrations(prev => 
                              prev.includes(integration.id)
                                ? prev.filter(id => id !== integration.id)
                                : [...prev, integration.id]
                            );
                          }}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {integration.icon}
                                <span className="text-sm">{integration.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {integration.popular && (
                                  <Badge variant="secondary" className="text-xs">Popular</Badge>
                                )}
                                <Checkbox 
                                  checked={selectedIntegrations.includes(integration.id)}
                                  onChange={() => {}}
                                />
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground">{integration.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep('organization')} className="flex-1">
                Back
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep('complete')} className="flex-1">
                Skip for Now
              </Button>
              <Button 
                onClick={handleSetupIntegrations}
                disabled={selectedIntegrations.length === 0 || createIntegrationMutation.isPending}
                className="flex-1"
              >
                {canDirectlyAddIntegrations ? 'Connect Integrations' : 'Request Integrations'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <Building className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold">Organization Ready!</h3>
              <p className="text-muted-foreground">
                {createdOrg?.name} has been created{selectedIntegrations.length > 0 ? ` with ${selectedIntegrations.length} ${canDirectlyAddIntegrations ? 'integrations configured' : 'integration requests submitted'}` : ''}.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">What's Next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create your first project</li>
                <li>• Invite team members</li>
                <li>• Configure integration settings</li>
                <li>• Start managing workflows</li>
              </ul>
            </div>

            <Button onClick={handleComplete} className="w-full">
              Continue to Create Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Welcome to Stratus</DialogTitle>
        </DialogHeader>
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}