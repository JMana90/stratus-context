
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FolderOpen, HardDrive, Crown, Zap, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { subscriptionService } from "@/services/subscriptionService";

export function SubscriptionUsage() {
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionService.getCurrentSubscription(),
  });

  const { data: usage } = useQuery({
    queryKey: ['usage-stats'],
    queryFn: () => subscriptionService.getUsageStats(),
  });

  const { data: recommendedTier } = useQuery({
    queryKey: ['recommended-tier', usage],
    queryFn: () => usage ? subscriptionService.getRecommendedTier(usage) : null,
    enabled: !!usage
  });

  if (!subscription || !usage) {
    return null;
  }

  const getUsersProgress = () => {
    if (usage.maxUsers === -1) return 0;
    return (usage.currentUsers / usage.maxUsers) * 100;
  };

  const getProjectsProgress = () => {
    if (usage.maxProjects === -1) return 0;
    return (usage.currentProjects / usage.maxProjects) * 100;
  };

  const getStorageProgress = () => {
    return (usage.storageUsed / usage.storageLimit) * 100;
  };

  const getAIProgress = () => {
    if (usage.aiRequestsLimit === -1) return 0;
    return (usage.aiRequestsUsed / usage.aiRequestsLimit) * 100;
  };

  const getBadgeVariant = (tierName: string) => {
    if (tierName.includes('Enterprise')) return 'destructive';
    if (tierName === 'Team') return 'default';
    return 'secondary';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Current Plan: {subscription.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getBadgeVariant(subscription.name)}>
              {subscription.name}
            </Badge>
            {subscription.price > 0 && (
              <Badge variant="outline">
                ${subscription.price}/month
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Users</span>
              <span className="text-sm text-muted-foreground ml-auto">
                {usage.currentUsers}/{usage.maxUsers === -1 ? '∞' : usage.maxUsers}
              </span>
            </div>
            <Progress value={getUsersProgress()} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Projects</span>
              <span className="text-sm text-muted-foreground ml-auto">
                {usage.currentProjects}/{usage.maxProjects === -1 ? '∞' : usage.maxProjects}
              </span>
            </div>
            <Progress value={getProjectsProgress()} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Storage</span>
              <span className="text-sm text-muted-foreground ml-auto">
                {Math.round(usage.storageUsed / 1024 * 100) / 100}GB/{Math.round(usage.storageLimit / 1024)}GB
              </span>
            </div>
            <Progress value={getStorageProgress()} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">AI Requests</span>
              <span className="text-sm text-muted-foreground ml-auto">
                {usage.aiRequestsUsed}/{usage.aiRequestsLimit === -1 ? '∞' : usage.aiRequestsLimit}
              </span>
            </div>
            <Progress value={getAIProgress()} className="h-2" />
          </div>
        </div>

        {recommendedTier && (
          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Approaching Usage Limits
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    Consider upgrading to {recommendedTier.name} for ${recommendedTier.price}/month
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                View Upgrade Options
              </Button>
            </div>
          </div>
        )}

        {subscription.id !== 'enterprise' && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Need more capacity?</p>
                <p className="text-xs text-muted-foreground">
                  {usage.projectedNextTierPrice && usage.projectedNextTierPrice > 0 
                    ? `Next tier starts at $${usage.projectedNextTierPrice}/month`
                    : 'Upgrade your plan for more users and projects'
                  }
                </p>
              </div>
              <Button size="sm">
                Upgrade Plan
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
