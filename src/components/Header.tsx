
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/AuthModal";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User, CreditCard, Settings, Building } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organizationService";

export function Header() {
  const { user, loading, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: organization } = useQuery({
    queryKey: ['current-organization'],
    queryFn: () => organizationService.getCurrentUserOrganization(),
    enabled: !!user,
  });

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <img 
              src="/lovable-uploads/1e3e27c0-ccd3-4a0f-8105-c9193f68bc82.png" 
              alt="Stratus Logo" 
              className="h-8 w-8"
            />
            <h1 className="text-2xl font-bold text-foreground">
              Stratus
            </h1>
          </div>
          <p className="text-muted-foreground">Project Management Platform</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Top-level navigation */}
          <nav className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className={location.pathname === '/' ? 'bg-muted' : ''}
            >
              Home
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/integrations')}
              className={location.pathname.startsWith('/integrations') ? 'bg-muted' : ''}
            >
              Integrations
            </Button>
          </nav>
          
          {/* Navigation for logged-in users */}
          {user && (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/add-project')}>
                New Project
              </Button>
              {(import.meta as any).env?.DEV && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/dev/Smoke')}>
                  Dev → Smoke
                </Button>
              )}
            </div>
          )}
          
          {/* Only show pricing for non-logged in users */}
          {!user && (
            <Button variant="ghost" onClick={() => navigate('/pricing')}>
              Pricing
            </Button>
          )}
          
          {/* Show organization info for logged-in users */}
          {user && organization && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{organization.name}</span>
            </div>
          )}
          
          <ThemeToggle />
          
          {loading ? (
            <div className="h-8 w-8 animate-pulse bg-muted rounded-full" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {getInitials(user.email || '')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>{user.email}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')} className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/my-integrations')} className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>My Integrations</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/pricing')} className="flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Upgrade Plan</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => setAuthModalOpen(true)}>
              Sign In
            </Button>
          )}
        </div>
      </div>
      
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </header>
  );
}
