import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import ProviderCard from "@/components/integrations/ProviderCard";
import { supabase } from "@/integrations/supabase/client";
import { startOAuth } from "@/services/integrationService";

type Provider = "salesforce" | "slack" | "google" | "outlook";

interface ProviderOption {
  id: Provider;
  name: string;
  description: string;
  level: "org" | "user";
  defaultChecked: boolean;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Connect your CRM for contacts and opportunities",
    level: "org",
    defaultChecked: true
  },
  {
    id: "slack", 
    name: "Slack",
    description: "Send notifications and updates to your team",
    level: "user",
    defaultChecked: true
  },
  {
    id: "google",
    name: "Gmail",
    description: "Access emails and calendar integration",
    level: "user", 
    defaultChecked: true
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Integrate with Microsoft Office suite", 
    level: "user",
    defaultChecked: false
  }
];

export default function IntegrationsSetup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const afterPath = searchParams.get("after");
  const projectId = searchParams.get("project");

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>(
    PROVIDER_OPTIONS.filter(p => p.defaultChecked).map(p => p.id)
  );
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<Provider, "connected" | "needs-auth" | "error">>({
    salesforce: "needs-auth",
    slack: "needs-auth", 
    google: "needs-auth",
    outlook: "needs-auth"
  });
  const [authorizingProviders, setAuthorizingProviders] = useState<Set<Provider>>(new Set());
  const [pollingActive, setPollingActive] = useState(false);
  const [slackChannel, setSlackChannel] = useState("");
  const [salesforceRecordId, setSalesforceRecordId] = useState("");

  // Load initial integration statuses
  useEffect(() => {
    loadIntegrationStatuses();
  }, []);

  // Listen for OAuth completion
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e?.data?.type === 'oauth-finished') {
        // Clear authorizing state for the provider
        setAuthorizingProviders(prev => {
          const next = new Set(prev);
          next.delete(e.data.provider);
          return next;
        });
        
        // Refresh integration statuses
        loadIntegrationStatuses();
        
        toast({
          title: "Authorization Complete",
          description: `${e.data.provider} has been connected successfully.`,
        });
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [toast]);

  // Polling for status updates after OAuth
  useEffect(() => {
    if (!pollingActive) return;

    const interval = setInterval(() => {
      loadIntegrationStatuses();
    }, 2000);

    const timeout = setTimeout(() => {
      setPollingActive(false);
      clearInterval(interval);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pollingActive]);

  const loadIntegrationStatuses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!org) return;

      const { data: connections } = await supabase
        .from("integration_connections")
        .select("provider, status")
        .eq("organization_id", org.id);

      const newStatuses = { ...integrationStatuses };
      
      PROVIDER_OPTIONS.forEach(provider => {
        const connection = connections?.find(c => c.provider === provider.id);
        newStatuses[provider.id] = connection?.status === "connected" ? "connected" : "needs-auth";
      });

      setIntegrationStatuses(newStatuses);
    } catch (error) {
      console.error("Failed to load integration statuses:", error);
    }
  };

  const handleProviderToggle = (providerId: Provider, checked: boolean) => {
    setSelectedProviders(prev => 
      checked 
        ? [...prev, providerId]
        : prev.filter(id => id !== providerId)
    );
  };

  const handleAuthorize = async (provider: Provider) => {
    const providerConfig = PROVIDER_OPTIONS.find(p => p.id === provider);
    if (!providerConfig) return;

    setAuthorizingProviders(prev => new Set(prev).add(provider));
    
    try {
      const result = await startOAuth(provider, providerConfig.level, projectId || undefined);
      if (result.status === "success") {
        toast({ title: "Authorization successful", description: `${providerConfig.name} connected successfully` });
        queryClient.invalidateQueries({ queryKey: ['integration-status'] });
      } else {
        throw new Error(result.message || `Failed to authorize ${providerConfig.name}`);
      }
      
      // Start polling for status updates
      setPollingActive(true);
      
      toast({
        title: "Authorization Started",
        description: `Please complete the ${providerConfig.name} authorization in the popup window.`,
      });
    } catch (error: any) {
      toast({
        title: "Authorization Failed", 
        description: error.message || `Failed to authorize ${providerConfig.name}`,
        variant: "destructive",
      });
    } finally {
      setAuthorizingProviders(prev => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
    }
  };

  const handleSaveProjectMappings = async () => {
    if (!projectId) return;

    try {
      // TODO: Implement project mapping
      toast({
        title: "Mappings Saved",
        description: "Project integration mappings have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save project mappings",
        variant: "destructive",
      });
    }
  };

  const handleFinish = async () => {
    if (currentStep === 3 && projectId) {
      await handleSaveProjectMappings();
    }
    
    // Navigate to project if we have projectId, otherwise home or afterPath
    const redirectPath = projectId ? `/projects/${projectId}` : (afterPath || "/");
    navigate(redirectPath);
  };

  const handleSkipForNow = () => {
    const redirectPath = projectId ? `/projects/${projectId}` : "/";
    navigate(redirectPath);
  };

  const canProceedFromStep1 = selectedProviders.length > 0;
  const canProceedFromStep2 = selectedProviders.some(provider => 
    integrationStatuses[provider] === "connected"
  );
  const canFinish = !Array.from(authorizingProviders).length;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Choose Your Integrations</h2>
              <p className="text-muted-foreground">
                Select the services you'd like to connect to your projects
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROVIDER_OPTIONS.map(provider => (
                <Card key={provider.id} className="cursor-pointer hover:bg-muted/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={provider.id}
                        checked={selectedProviders.includes(provider.id)}
                        onCheckedChange={(checked) => 
                          handleProviderToggle(provider.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={provider.id} className="font-medium cursor-pointer">
                        {provider.name}
                      </Label>
                      <span className="text-xs text-muted-foreground capitalize">
                        ({provider.level})
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {provider.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Authorize Your Services</h2>
              <p className="text-muted-foreground">
                Click "Authorize" for each service you selected
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROVIDER_OPTIONS
                .filter(provider => selectedProviders.includes(provider.id))
                .map(provider => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider.id}
                    level={provider.level}
                    title={provider.name}
                    description={provider.description}
                    status={integrationStatuses[provider.id]}
                    onAuthorize={() => handleAuthorize(provider.id)}
                    isLoading={authorizingProviders.has(provider.id)}
                  />
                ))}
            </div>

            {pollingActive && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for authorization updates...
              </div>
            )}
          </div>
        );

      case 3:
        if (!projectId) {
          return (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold">Setup Complete!</h2>
              <p className="text-muted-foreground">
                Your integrations have been successfully configured.
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Configure Project Mappings</h2>
              <p className="text-muted-foreground">
                Set up specific connections for this project (optional)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedProviders.includes("slack") && integrationStatuses.slack === "connected" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Slack Channel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Label htmlFor="slack-channel">Channel Name</Label>
                      <Input
                        id="slack-channel"
                        value={slackChannel}
                        onChange={(e) => setSlackChannel(e.target.value)}
                        placeholder="general"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedProviders.includes("salesforce") && integrationStatuses.salesforce === "connected" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Salesforce Record</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Label htmlFor="sf-record">Record/Opportunity ID</Label>
                      <Input
                        id="sf-record"
                        value={salesforceRecordId}
                        onChange={(e) => setSalesforceRecordId(e.target.value)}
                        placeholder="0061234567890ABC"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {(!selectedProviders.includes("slack") || integrationStatuses.slack !== "connected") &&
             (!selectedProviders.includes("salesforce") || integrationStatuses.salesforce !== "connected") && (
              <div className="text-center text-muted-foreground">
                No project mappings available for the selected integrations.
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return "Choose Providers";
      case 2: return "Authorize";
      case 3: return projectId ? "Map to Project" : "Complete";
      default: return "";
    }
  };

  const totalSteps = projectId ? 3 : 2;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold">Integrations Setup</h1>
            </div>
            <div className="w-[120px]"></div> {/* Spacer for alignment */}
          </div>
          <p className="text-muted-foreground mt-2">
            Connect your favorite tools to get the most out of your projects
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            {[1, 2, 3].slice(0, totalSteps).map(step => (
              <span 
                key={step}
                className={`${
                  step === currentStep 
                    ? "text-primary font-medium" 
                    : step < currentStep 
                      ? "text-green-600" 
                      : "text-muted-foreground"
                }`}
              >
                {step < currentStep ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {getStepTitle(step)}
                  </span>
                ) : (
                  getStepTitle(step)
                )}
              </span>
            ))}
          </div>
          <Progress value={progress} />
        </div>

        {/* Step Content */}
        <Card className="min-h-[400px]">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={handleSkipForNow}>
              Skip for now
            </Button>
          </div>

          <div className="flex gap-2">
            {currentStep < totalSteps ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !canProceedFromStep2)
                }
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={!canFinish}>
                Finish Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}