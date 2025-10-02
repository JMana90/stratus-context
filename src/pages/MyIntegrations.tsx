import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Slack, Mail, MessageSquare, Link2, Settings, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface UserIntegration {
  id: string;
  provider_key: string;
  access_token: string;
  metadata: any;
  created_at: string;
}

const USER_PROVIDERS = [
  { key: 'slack', name: 'Slack', icon: Slack, description: 'Post messages and receive notifications' },
  { key: 'gmail', name: 'Gmail', icon: Mail, description: 'Send emails and sync contacts' },
  { key: 'outlook', name: 'Outlook', icon: MessageSquare, description: 'Microsoft email and calendar integration' }
];

export default function MyIntegrationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>([]);
  const [statuses, setStatuses] = useState<Record<string, "connected" | "needs-auth" | "error">>({});
  const [testing, setTesting] = useState(false);

  const handleConnect = async (providerKey: string) => {
    try {
      // In production, this would call integrationService.startOAuth(providerKey, "user")
      toast({ 
        title: "OAuth flow starting", 
        description: `Connecting to ${providerKey}...` 
      });
      console.log(`Starting OAuth for ${providerKey} at user level`);
      
      // Mock implementation
      setTimeout(() => {
        setStatuses(prev => ({ ...prev, [providerKey]: "connected" }));
        toast({ title: `${providerKey} connected successfully!` });
      }, 2000);
    } catch (error) {
      toast({ 
        title: "Connection failed", 
        description: `Failed to connect to ${providerKey}`,
        variant: "destructive" 
      });
    }
  };

  const handleTest = async (providerKey: string) => {
    setTesting(true);
    try {
      // In production: await integrationService.testProvider({ level: "user", id: user.id, providerKey })
      console.log(`Testing ${providerKey} connection for user ${user?.id}`);
      
      // Mock test
      const isConnected = statuses[providerKey] === "connected";
      setStatuses(prev => ({ 
        ...prev, 
        [providerKey]: isConnected ? "connected" : "needs-auth" 
      }));
      
      toast({ 
        title: `${providerKey} test complete`,
        description: isConnected ? "Connection working" : "Needs authorization"
      });
    } catch (error) {
      setStatuses(prev => ({ ...prev, [providerKey]: "error" }));
      toast({ 
        title: "Test failed", 
        variant: "destructive" 
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async (providerKey: string) => {
    try {
      // In production: await integrationService.disconnectUser(providerKey)
      setStatuses(prev => {
        const updated = { ...prev };
        delete updated[providerKey];
        return updated;
      });
      
      toast({ title: `${providerKey} disconnected` });
    } catch (error) {
      toast({ 
        title: "Disconnect failed", 
        variant: "destructive" 
      });
    }
  };

  const getStatusBadge = (providerKey: string) => {
    const status = statuses[providerKey];
    if (!status) return <Badge variant="outline">Not connected</Badge>;
    
    switch (status) {
      case "connected":
        return <Badge variant="default">Connected</Badge>;
      case "needs-auth":
        return <Badge variant="secondary">Needs login</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Please sign in to manage your integrations.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Integrations</h1>
            <p className="text-muted-foreground">Connect your personal accounts to enhance project collaboration</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {USER_PROVIDERS.map((provider) => {
            const IconComponent = provider.icon;
            const status = statuses[provider.key];
            const isConnected = status === "connected";
            
            return (
              <Card key={provider.key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-6 w-6" />
                      <span>{provider.name}</span>
                    </div>
                    {getStatusBadge(provider.key)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {provider.description}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    {!isConnected ? (
                      <Button 
                        onClick={() => handleConnect(provider.key)}
                        className="flex-1"
                        size="sm"
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    ) : (
                      <Button 
                        variant="destructive"
                        onClick={() => handleDisconnect(provider.key)}
                        className="flex-1"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Disconnect
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline"
                      onClick={() => handleTest(provider.key)}
                      disabled={testing}
                      size="sm"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                  </div>
                  
                  {status === "error" && (
                    <p className="text-sm text-destructive">
                      Connection error. Please try reconnecting.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Integration Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              These personal integrations allow you to:
            </p>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Post updates to Slack channels from your projects</li>
              <li>• Send project reports via Gmail or Outlook</li>
              <li>• Sync project contacts with your email providers</li>
              <li>• Receive real-time notifications about project changes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}