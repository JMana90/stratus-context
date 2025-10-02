
import { SubscriptionTier, UsageStats, OrganizationUser, UsageTier } from '@/types/subscription';

// Legacy tier ID mapping for backward compatibility
const TIER_ID_ALIASES: Record<string, SubscriptionTier['id']> = {
  'team': 'solo',
  'enterprise-starter': 'professional',
  'enterprise-pro': 'enterprise',
  'enterprise-unlimited': 'enterprise'
};

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    maxUsers: 1,
    maxProjects: 1,
    storageLimit: 1, // 1GB
    features: [
      'Basic project tracking',
      'AI-powered communication drafts',
      'Email notifications',
      'Document organization',
      'Basic support'
    ],
    price: 0,
    interval: 'month',
    aiRequestsLimit: 50,
    supportLevel: 'basic'
  },
  {
    id: 'solo',
    name: 'Solo',
    maxUsers: 1,
    maxProjects: 3,
    storageLimit: 5, // 5GB
    features: [
      'Everything in Starter',
      'Up to 3 active projects',
      'Advanced AI features',
      'Priority support',
      'Milestone tracking'
    ],
    price: 29,
    interval: 'month',
    aiRequestsLimit: 500,
    supportLevel: 'priority'
  },
  {
    id: 'professional',
    name: 'Professional',
    maxUsers: 5,
    maxProjects: 15,
    storageLimit: 25, // 25GB
    features: [
      'Everything in Solo',
      '5 user accounts',
      '15 active projects',
      'Custom permissions at user level',
      'Team collaboration tools',
      'Advanced reporting',
      'Premium support'
    ],
    price: 99,
    interval: 'month',
    aiRequestsLimit: 2500,
    supportLevel: 'premium'
  },
  {
    id: 'enterprise',
    name: 'Enterprise+',
    maxUsers: -1, // Unlimited (20+ users)
    maxProjects: -1, // Unlimited
    storageLimit: -1, // Unlimited
    features: [
      'Everything in Professional',
      '20+ users (custom scaling)',
      'Unlimited projects',
      'Dedicated support',
      'Custom integrations'
    ],
    price: 0, // Custom pricing
    interval: 'month',
    aiRequestsLimit: -1,
    supportLevel: 'dedicated'
  }
];

// Removed add-on services since they're not available on free Lovable plan

export const PROFESSIONAL_SCALING_TIERS: UsageTier[] = [
  {
    userRange: '6-10',
    projectRange: '16-25',
    storageRange: '26-50GB',
    monthlyPrice: 149,
    description: 'Professional + Scale Block 1 - Additional 5 users & 10 projects'
  },
  {
    userRange: '11-15',
    projectRange: '26-35',
    storageRange: '51-75GB',
    monthlyPrice: 199,
    description: 'Professional + Scale Block 2 - Additional 10 users & 20 projects'
  },
  {
    userRange: '16-20',
    projectRange: '36-50',
    storageRange: '76-100GB',
    monthlyPrice: 249,
    description: 'Professional + Scale Block 3 - Additional 15 users & 35 projects'
  }
];

export class SubscriptionService {
  private normalizeTierId(tierId: string): SubscriptionTier['id'] {
    return TIER_ID_ALIASES[tierId] || tierId as SubscriptionTier['id'];
  }

  async getCurrentSubscription(): Promise<SubscriptionTier> {
    // In production, this would fetch from Supabase
    const stored = localStorage.getItem('current_subscription');
    if (stored) {
      const tierName = this.normalizeTierId(JSON.parse(stored));
      return SUBSCRIPTION_TIERS.find(tier => tier.id === tierName) || SUBSCRIPTION_TIERS[0];
    }
    return SUBSCRIPTION_TIERS[0]; // Default to Starter
  }

  async getUsageStats(orgId?: string): Promise<UsageStats> {
    const currentTier = await this.getCurrentSubscription();
    
    // Import Supabase client and organization service
    const { supabase } = await import('@/integrations/supabase/client');
    const { organizationService } = await import('@/services/organizationService');
    
    // Get organization - use provided orgId or current user's organization
    let organization;
    if (orgId) {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      if (!error) organization = data;
    } else {
      organization = await organizationService.getCurrentUserOrganization();
    }
    
    if (!organization) {
      return {
        currentUsers: 0,
        currentProjects: 0,
        maxUsers: currentTier.maxUsers,
        maxProjects: currentTier.maxProjects,
        storageUsed: 0,
        storageLimit: currentTier.storageLimit * 1024,
        aiRequestsUsed: 0,
        aiRequestsLimit: currentTier.aiRequestsLimit || 0,
        currentTierPrice: currentTier.price
      };
    }
    
    // Get real data from Supabase for organization
    const [projectsResult, orgMembersResult] = await Promise.all([
      supabase.from('projects').select('id').eq('organization_id', organization.id).limit(1000),
      supabase.from('organization_members').select('id').eq('organization_id', organization.id).limit(1000)
    ]);
    
    const currentProjects = projectsResult.data?.length || 0;
    const currentUsers = orgMembersResult.data?.length || 0;
    
    const usage = {
      currentUsers,
      currentProjects,
      maxUsers: currentTier.maxUsers,
      maxProjects: currentTier.maxProjects,
      storageUsed: 0, // TODO: Implement storage tracking when needed
      storageLimit: currentTier.storageLimit * 1024, // Convert GB to MB
      aiRequestsUsed: 0, // TODO: Implement AI request tracking when needed
      aiRequestsLimit: currentTier.aiRequestsLimit || 0,
      currentTierPrice: currentTier.price
    };

    // Calculate projected next tier price if approaching limits
    const projectedPrice = this.calculateProjectedPrice(usage);
    
    return {
      ...usage,
      projectedNextTierPrice: projectedPrice
    };
  }

  private calculateProjectedPrice(usage: UsageStats): number | undefined {
    const currentTier = SUBSCRIPTION_TIERS.find(tier => tier.price === usage.currentTierPrice);
    if (!currentTier) return undefined;

    // Find next tier based on current tier
    const currentIndex = SUBSCRIPTION_TIERS.findIndex(tier => tier.id === currentTier.id);
    if (currentIndex < SUBSCRIPTION_TIERS.length - 1) {
      const nextTier = SUBSCRIPTION_TIERS[currentIndex + 1];
      return nextTier.price;
    }

    // If on Professional tier, check scaling options
    if (currentTier.id === 'professional') {
      const nextScalingTier = PROFESSIONAL_SCALING_TIERS.find(tier => {
        const [minUsers] = tier.userRange.split('-').map(n => parseInt(n));
        return usage.currentUsers < minUsers;
      });
      return nextScalingTier?.monthlyPrice;
    }

    return undefined;
  }

  async canCreateProject(orgId?: string): Promise<boolean> {
    const stats = await this.getUsageStats(orgId);
    if (stats.maxProjects === -1) return true; // Unlimited
    return stats.currentProjects < stats.maxProjects;
  }

  async getProjectQuotaInfo(orgId?: string): Promise<{ current: number; max: number; canCreate: boolean; isAtLimit: boolean }> {
    const stats = await this.getUsageStats(orgId);
    const isAtLimit = stats.maxProjects !== -1 && stats.currentProjects >= stats.maxProjects;
    return {
      current: stats.currentProjects,
      max: stats.maxProjects,
      canCreate: stats.maxProjects === -1 || stats.currentProjects < stats.maxProjects,
      isAtLimit
    };
  }

  async canAddUser(orgId?: string): Promise<boolean> {
    const stats = await this.getUsageStats(orgId);
    if (stats.maxUsers === -1) return true; // Unlimited
    return stats.currentUsers < stats.maxUsers;
  }

  async ensureCanCreateProject(orgId?: string): Promise<boolean> {
    try {
      // Check subscription limits directly without RPC call
      const { canCreate } = await this.getProjectQuotaInfo(orgId);
      return canCreate;
    } catch (error) {
      console.warn('Error checking project limits:', error);
      return false;
    }
  }

  async upgradeSubscription(tierId: SubscriptionTier['id']): Promise<boolean> {
    // In production, this would handle Stripe checkout
    console.log(`Upgrading to ${tierId}`);
    localStorage.setItem('current_subscription', JSON.stringify(tierId));
    return true;
  }

  getScalingTiers(): UsageTier[] {
    return PROFESSIONAL_SCALING_TIERS;
  }

  async getRecommendedTier(usage: UsageStats): Promise<SubscriptionTier | null> {
    // Recommend upgrade if approaching limits
    const utilizationThreshold = 0.8; // 80% utilization
    
    const userUtilization = usage.maxUsers === -1 ? 0 : usage.currentUsers / usage.maxUsers;
    const projectUtilization = usage.maxProjects === -1 ? 0 : usage.currentProjects / usage.maxProjects;
    const storageUtilization = usage.storageLimit === -1 ? 0 : usage.storageUsed / usage.storageLimit;
    
    if (userUtilization > utilizationThreshold || 
        projectUtilization > utilizationThreshold || 
        storageUtilization > utilizationThreshold) {
      
      const currentTier = await this.getCurrentSubscription();
      const currentIndex = SUBSCRIPTION_TIERS.findIndex(tier => tier.id === currentTier.id);
      
      if (currentIndex < SUBSCRIPTION_TIERS.length - 1) {
        return SUBSCRIPTION_TIERS[currentIndex + 1];
      }
    }
    
    return null;
  }
}

export const subscriptionService = new SubscriptionService();
