
export interface SubscriptionTier {
  id: 'starter' | 'solo' | 'professional' | 'enterprise';
  name: string;
  maxUsers: number;
  maxProjects: number;
  storageLimit: number; // GB
  features: string[];
  price: number;
  interval: 'month' | 'year';
  aiRequestsLimit?: number; // Monthly AI requests limit
  supportLevel: 'basic' | 'priority' | 'premium' | 'dedicated';
}

export interface UsageTier {
  userRange: string;
  projectRange: string;
  storageRange: string;
  monthlyPrice: number;
  description: string;
}

export interface UserRole {
  id: string;
  name: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: Permission[];
}

export interface Permission {
  resource: 'projects' | 'users' | 'settings' | 'integrations';
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface OrganizationUser {
  id: string;
  email: string;
  name: string;
  role: UserRole['name'];
  joinedAt: string;
  lastActive: string;
  status: 'active' | 'pending' | 'suspended';
}

export interface UsageStats {
  currentUsers: number;
  currentProjects: number;
  maxUsers: number;
  maxProjects: number;
  storageUsed: number;
  storageLimit: number;
  aiRequestsUsed: number;
  aiRequestsLimit: number;
  currentTierPrice: number;
  projectedNextTierPrice?: number;
}
