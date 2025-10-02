
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Shield, Calendar, Activity } from "lucide-react";
import { OrganizationUser } from "@/types/subscription";
import { useQuery } from "@tanstack/react-query";
import { subscriptionService } from "@/services/subscriptionService";

export function UserManagement() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const { data: canAddUser } = useQuery({
    queryKey: ['can-add-user'],
    queryFn: () => subscriptionService.canAddUser(),
  });

  // Mock users data - in production, this would come from Supabase
  const users: OrganizationUser[] = [
    {
      id: '1',
      email: 'john@company.com',
      name: 'John Smith',
      role: 'owner',
      joinedAt: '2024-01-15',
      lastActive: '2024-07-02',
      status: 'active'
    },
    {
      id: '2',
      email: 'sarah@company.com',
      name: 'Sarah Johnson',
      role: 'admin',
      joinedAt: '2024-02-01',
      lastActive: '2024-07-01',
      status: 'active'
    }
  ];

  const handleInviteUser = () => {
    if (!canAddUser) {
      console.log('Cannot add more users - subscription limit reached');
      return;
    }
    
    console.log('Inviting user:', inviteEmail, 'as', inviteRole);
    setIsInviteOpen(false);
    setInviteEmail('');
    setInviteRole('member');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'destructive';
      case 'admin': return 'default';
      case 'member': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Management
          </CardTitle>
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                disabled={!canAddUser}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInviteUser} className="w-full">
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Joined {new Date(user.joinedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    Active {new Date(user.lastActive).toLocaleDateString()}
                  </div>
                </div>
                
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {!canAddUser && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              You've reached your user limit. Upgrade your plan to add more team members.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
