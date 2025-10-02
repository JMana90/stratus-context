import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Box, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface BoxIntegrationCardProps {
  organizationId: string;
}

interface BoxStatus {
  provider: 'box';
  level: 'org';
  status: 'connected' | 'needs-auth' | 'error';
  detail?: string;
}

export function BoxIntegrationCard({ organizationId }: BoxIntegrationCardProps) {
  const [status, setStatus] = useState<BoxStatus>({
    provider: 'box',
    level: 'org',
    status: 'needs-auth'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
  }, [organizationId]);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('box_oauth/status', {
        body: { organizationId }
      });

      if (error) throw error;
      setStatus(data);
    } catch (error: any) {
      console.error('Failed to check Box status:', error);
      setStatus({
        provider: 'box',
        level: 'org',
        status: 'error',
        detail: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Get authorization URL
      const { data, error } = await supabase.functions.invoke('box_oauth/start', {
        body: {
          organizationId,
          return_to: window.location.href
        }
      });

      if (error) throw error;

      // Open popup for OAuth
      const popup = window.open(
        data.authorize_url,
        'box-oauth',
        'width=720,height=780,left=' + (window.screen.width / 2 - 360) + ',top=' + (window.screen.height / 2 - 390)
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          // Refresh status after OAuth
          setTimeout(() => checkStatus(), 1000);
        }
      }, 1000);

    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Box",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('organization_integrations')
        .update({ is_active: false })
        .eq('organization_id', organizationId)
        .eq('provider_id', 'box');

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: "Box integration has been disconnected",
      });

      await checkStatus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Box",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Checking...</Badge>;
    }

    switch (status.status) {
      case 'connected':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">Not Connected</Badge>;
    }
  };

  const getActionButton = () => {
    if (isLoading) return null;

    if (status.status === 'connected') {
      return (
        <Button variant="outline" onClick={handleDisconnect}>
          Disconnect
        </Button>
      );
    }

    return (
      <Button onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          'Connect Box'
        )}
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Box</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Import CSV files from Box for weekly updates and project insights.
        </p>
        
        {status.detail && status.status === 'error' && (
          <p className="text-sm text-destructive mb-4">
            {status.detail}
          </p>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm">
            <strong>Scope:</strong> Organization-wide
          </div>
          {getActionButton()}
        </div>
      </CardContent>
    </Card>
  );
}