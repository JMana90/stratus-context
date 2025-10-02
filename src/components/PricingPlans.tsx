
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Star, Zap, Users, Building2 } from "lucide-react";
import { SUBSCRIPTION_TIERS, subscriptionService } from "@/services/subscriptionService";
import { SubscriptionTier, UsageStats } from "@/types/subscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function PricingPlans() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [recommendedTier, setRecommendedTier] = useState<SubscriptionTier | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load current subscription data at mount
  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        const [tier, usageStats] = await Promise.all([
          subscriptionService.getCurrentSubscription(),
          subscriptionService.getUsageStats()
        ]);
        
        setCurrentTier(tier);
        setUsage(usageStats);
        
        const recommended = await subscriptionService.getRecommendedTier(usageStats);
        setRecommendedTier(recommended);
      } catch (error) {
        console.error('Failed to load subscription data:', error);
      }
    };

    loadSubscriptionData();
  }, []);

  const refreshSubscriptionData = async () => {
    try {
      const [tier, usageStats] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getUsageStats()
      ]);
      
      setCurrentTier(tier);
      setUsage(usageStats);
      
      const recommended = await subscriptionService.getRecommendedTier(usageStats);
      setRecommendedTier(recommended);
      
      // Invalidate related queries to refresh other components
      queryClient.invalidateQueries({ queryKey: ['project-quota'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch (error) {
      console.error('Failed to refresh subscription data:', error);
    }
  };

  const handleChoosePlan = async (planId: string) => {
    if (!currentTier) return;
    
    if (planId === currentTier.id) {
      toast({
        title: "Already Selected",
        description: `You're already on the ${currentTier.name} plan.`,
      });
      return;
    }

    try {
      setLoading(planId);
      
      if (planId === 'enterprise') {
        toast({
          title: "Enterprise Plan",
          description: "Enterprise pricing is custom. Please contact us for a quote.",
        });
        return;
      }

      // Use local subscription service to "upgrade"
      await subscriptionService.upgradeSubscription(planId as SubscriptionTier['id']);
      
      const newTier = SUBSCRIPTION_TIERS.find(t => t.id === planId);
      if (newTier) {
        toast({
          title: "Plan Updated",
          description: `Switched to ${newTier.name} plan.`,
        });
        
        // Refresh data to reflect new limits
        await refreshSubscriptionData();
      }
    } catch (error) {
      console.error('Error switching plan:', error);
      toast({
        title: "Error",
        description: "Failed to switch plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter': return <Users className="h-5 w-5" />;
      case 'solo': return <Star className="h-5 w-5" />;
      case 'professional': return <Zap className="h-5 w-5" />;
      case 'enterprise': return <Building2 className="h-5 w-5" />;
      default: return <Users className="h-5 w-5" />;
    }
  };

  const getPopularBadge = (planId: string) => {
    if (planId === 'professional') {
      return <Badge className="mb-2 bg-orange-500 hover:bg-orange-600">Most Popular</Badge>;
    }
    return null;
  };

  const getRecommendedBadge = (planId: string) => {
    if (recommendedTier && planId === recommendedTier.id) {
      return <Badge className="mb-2 bg-blue-500 hover:bg-blue-600">Recommended</Badge>;
    }
    return null;
  };

  const getCurrentPlanBadge = (planId: string) => {
    if (currentTier && planId === currentTier.id) {
      return <Badge className="mb-2 bg-green-500 hover:bg-green-600">Current Plan</Badge>;
    }
    return null;
  };

  const getUsageForTier = (tierId: string) => {
    if (!usage) return null;
    
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === tierId);
    if (!tier) return null;

    const projectUsage = tier.maxProjects === -1 ? 0 : (usage.currentProjects / tier.maxProjects) * 100;
    const userUsage = tier.maxUsers === -1 ? 0 : (usage.currentUsers / tier.maxUsers) * 100;
    
    return { projectUsage, userUsage, tier };
  };

  const getButtonText = (planId: string) => {
    if (loading === planId) return 'Processing...';
    if (currentTier && planId === currentTier.id) return 'Selected';
    if (planId === 'enterprise') return 'Contact Sales';
    
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === planId);
    return `Choose ${tier?.name}`;
  };

  const getButtonVariant = (planId: string) => {
    if (currentTier && planId === currentTier.id) return 'secondary';
    if (planId === 'professional') return 'default';
    return 'outline';
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-muted-foreground text-lg">
            Scale with your team size and project needs
          </p>
          {usage && currentTier && (
            <div className="mt-4 text-sm text-muted-foreground">
              Current usage: {usage.currentProjects} projects, {usage.currentUsers} users on {currentTier.name} plan
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const usageInfo = getUsageForTier(tier.id);
            const isCurrentPlan = currentTier && tier.id === currentTier.id;
            
            return (
              <Card key={tier.id} className={`relative ${
                tier.id === 'professional' ? 'border-orange-500 border-2' : 
                isCurrentPlan ? 'border-green-500 border-2' : ''
              }`}>
                <CardHeader>
                  {getCurrentPlanBadge(tier.id)}
                  {getRecommendedBadge(tier.id)}
                  {getPopularBadge(tier.id)}
                  <div className="flex items-center gap-2">
                    {getPlanIcon(tier.id)}
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                  </div>
                  <div className="text-3xl font-bold">
                    {tier.price === 0 && tier.id !== 'starter' ? (
                      "Custom"
                    ) : (
                      <>
                        ${tier.price}
                        <span className="text-base font-normal text-muted-foreground">/month</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.maxUsers === -1 ? '20+ users' : `${tier.maxUsers} user${tier.maxUsers > 1 ? 's' : ''}`}
                    {', '}
                    {tier.maxProjects === -1 ? 'Unlimited projects' : `${tier.maxProjects} project${tier.maxProjects > 1 ? 's' : ''}`}
                  </p>
                  
                  {/* Show current usage for current plan */}
                  {isCurrentPlan && usageInfo && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground">Current Usage:</div>
                      {tier.maxProjects !== -1 && (
                        <div>
                          <div className="flex justify-between text-xs">
                            <span>Projects</span>
                            <span>{usage?.currentProjects}/{tier.maxProjects}</span>
                          </div>
                          <Progress value={usageInfo.projectUsage} className="h-1" />
                        </div>
                      )}
                      {tier.maxUsers !== -1 && (
                        <div>
                          <div className="flex justify-between text-xs">
                            <span>Users</span>
                            <span>{usage?.currentUsers}/{tier.maxUsers}</span>
                          </div>
                          <Progress value={usageInfo.userUsage} className="h-1" />
                        </div>
                      )}
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full mt-6" 
                    variant={getButtonVariant(tier.id)}
                    onClick={() => handleChoosePlan(tier.id)}
                    disabled={loading === tier.id || (isCurrentPlan && tier.id !== 'enterprise')}
                  >
                    {getButtonText(tier.id)}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
