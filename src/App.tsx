import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import AddProject from "./pages/AddProject";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";
import Waitlist from "./pages/Waitlist";
import Pricing from "./pages/Pricing";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Integrations from "./pages/Integrations";
import IntegrationsConnected from "./pages/integrations/Connected";
import OAuthCallbackRelay from "./pages/integrations/callback";
import MyIntegrations from "./pages/MyIntegrations";
import IntegrationsSettings from "./pages/IntegrationsSettings";
import IntegrationsHub from "./pages/IntegrationsHub";
import IntegrationsSetup from "./pages/IntegrationsSetup";
import ProjectRedirect from "./components/ProjectRedirect";

const SmokeLazy = (import.meta as any).env?.DEV ? React.lazy(() => import("./pages/dev/Smoke")) : null as any;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/onboarding" element={<Index />} />
              <Route path="/projects/:projectId" element={<Index />} />
              <Route path="/project/:projectId" element={<ProjectRedirect />} />
              <Route path="/integrations" element={<IntegrationsHub />} />
              <Route path="/integrations/setup" element={<IntegrationsSetup />} />
              <Route path="/integrations/connected" element={<IntegrationsConnected />} />
              <Route path="/integrations/callback" element={<OAuthCallbackRelay />} />
              <Route path="/add-project" element={<AddProject />} />
              <Route path="/admin" element={<AdminSettings />} />
              <Route path="/waitlist" element={<Waitlist />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              {(import.meta as any).env?.DEV && SmokeLazy && (
                <>
                  <Route
                    path="/dev/smoke"
                    element={
                      <React.Suspense fallback={<div>Loading…</div>}>
                        <SmokeLazy />
                      </React.Suspense>
                    }
                  />
                  <Route
                    path="/dev/Smoke"
                    element={
                      <React.Suspense fallback={<div>Loading…</div>}>
                        <SmokeLazy />
                      </React.Suspense>
                    }
                  />
                </>
              )}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
