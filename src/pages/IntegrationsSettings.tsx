import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organizationService";
import { OrganizationIntegrations } from "@/components/OrganizationIntegrations";

export default function IntegrationsSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['current-organization'],
    queryFn: () => organizationService.getCurrentUserOrganization(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="container mx-auto px-6 py-12 text-center">
          <p>Please sign in to manage integrations.</p>
        </div>
      </div>
    );
  }

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="container mx-auto px-6 py-12 text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="container mx-auto px-6 py-12 text-center">
          <p>No organization found. Please create an organization first.</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Integration Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your organization's integrations and connections
              </p>
            </div>
          </div>

          {/* Integration Management */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <OrganizationIntegrations organizationId={organization.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}