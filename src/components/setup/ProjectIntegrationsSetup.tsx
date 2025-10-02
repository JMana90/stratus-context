import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectIntegrationsSelector } from "@/components/ProjectIntegrationsSelector";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { startOAuth } from "@/services/integrationService";
import { useToast } from "@/hooks/use-toast";

type Props = { 
  projectId: string; 
  organizationId: string; 
  onComplete?: () => void;
  showBackToHome?: boolean;
};

export default function ProjectIntegrationsSetup({ 
  projectId, 
  organizationId, 
  onComplete,
  showBackToHome = false 
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [authorizingProviders, setAuthorizingProviders] = useState<Set<string>>(new Set());

  // Listen for OAuth completion
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e?.data?.type === 'OAUTH_DONE') {
        // Clear authorizing state for the provider
        setAuthorizingProviders(prev => {
          const next = new Set(prev);
          next.delete(e.data.provider);
          return next;
        });
        
        // Refresh integration status
        queryClient.invalidateQueries({ queryKey: ['integrations-status'] });
        
        toast({
          title: "Authorization Complete",
          description: `${e.data.provider} has been connected successfully.`,
        });
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [queryClient, toast]);

  const handleStartOAuth = async (provider: 'salesforce' | 'slack' | 'google' | 'outlook', level: 'org' | 'user') => {
    setAuthorizingProviders(prev => new Set(prev).add(provider));
    try {
      const result = await startOAuth(provider, level, projectId);
      if (result.status === "success") {
        toast({ title: "Authorization successful", description: `${provider} connected successfully` });
      } else {
        toast({ title: "Authorization failed", description: result.message || "Failed to authorize" });
      }
      queryClient.invalidateQueries({ queryKey: ['integrations-status'] });
    } catch (error) {
      toast({
        title: "Authorization Failed",
        description: "Failed to open OAuth popup. Please check if popups are blocked.",
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

  const handleSkipForNow = () => {
    if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate("/");
    }
  };

  const handleFinishSetup = () => {
    if (onComplete) {
      onComplete();
    } else if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate("/");
    }
  };

  // Check if all selected providers are connected or none are authorizing
  const canFinish = !Array.from(authorizingProviders).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick OAuth Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              onClick={() => handleStartOAuth('salesforce', 'org')}
              disabled={authorizingProviders.has('salesforce')}
            >
              {authorizingProviders.has('salesforce') ? 'Authorizing...' : 'Authorize Salesforce'}
            </Button>
            <Button 
              onClick={() => handleStartOAuth('slack', 'user')}
              disabled={authorizingProviders.has('slack')}
            >
              {authorizingProviders.has('slack') ? 'Authorizing...' : 'Authorize Slack'}
            </Button>
            <Button 
              onClick={() => handleStartOAuth('google', 'user')}
              disabled={authorizingProviders.has('google')}
            >
              {authorizingProviders.has('google') ? 'Authorizing...' : 'Authorize Google'}
            </Button>
            <Button 
              onClick={() => handleStartOAuth('outlook', 'user')}
              disabled={authorizingProviders.has('outlook')}
            >
              {authorizingProviders.has('outlook') ? 'Authorizing...' : 'Authorize Outlook'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
        <Card>
          <CardHeader>
            <CardTitle>Project Integrations & Asana Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectIntegrationsSelector
              projectId={projectId}
              organizationId={organizationId}
              onIntegrationsChange={() => {}}
            />
          </CardContent>
        </Card>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleSkipForNow}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Skip for now
        </Button>
        <Button onClick={handleFinishSetup} disabled={!canFinish}>
          {onComplete ? "Done" : "Finish Setup"}
        </Button>
      </div>
    </div>
  );
}
