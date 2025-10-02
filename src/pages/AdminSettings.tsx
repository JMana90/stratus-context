import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Users, Zap, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AIConfiguration } from "@/components/AIConfiguration";
import { OrganizationIntegrations } from "@/components/OrganizationIntegrations";
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organizationService";
import { useAuth } from "@/hooks/useAuth";
import { SubscriptionUsage } from "@/components/SubscriptionUsage";
import { UserManagement } from "@/components/UserManagement";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'subscription' | 'users' | 'ai' | 'integrations'>('subscription');

  const { data: organization } = useQuery({
    queryKey: ['current-organization'],
    queryFn: () => organizationService.getCurrentUserOrganization(),
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 dark:bg-background">
      <div className="container mx-auto px-6 py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
                <Settings className="h-6 w-6" />
                Admin Settings
              </CardTitle>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <Button
                    variant={activeTab === 'subscription' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('subscription')}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Subscription
                  </Button>
                  <Button
                    variant={activeTab === 'users' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('users')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    User Management
                  </Button>
                  <Button
                    variant={activeTab === 'ai' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('ai')}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    AI Models
                  </Button>
                  <Button
                    variant={activeTab === 'integrations' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('integrations')}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Integrations
                  </Button>
                </nav>
              </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-6">
              {activeTab === 'subscription' && (
                <>
                  <SubscriptionUsage />
                </>
              )}

              {activeTab === 'users' && (
                <UserManagement />
              )}

              {activeTab === 'ai' && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">AI Model Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AIConfiguration />
                  </CardContent>
                </Card>
              )}

              {activeTab === 'integrations' && organization && (
                <OrganizationIntegrations organizationId={organization.id} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
