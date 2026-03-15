import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import SelectShow from "@/pages/select-show";
import ShowOverview from "@/pages/show-overview";
import RingDetail from "@/pages/ring-detail";
import RingAlerts from "@/pages/ring-alerts";
import RingControl from "@/pages/ring-control";
import AuthPage from "@/pages/auth-page";
import OrganizerDashboard from "@/pages/organizer-dashboard";

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Redirect to="/auth" />;
  if (roles && !roles.includes(user.role)) return <Redirect to="/" />;
  return <Component />;
}

function AuthRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-background" />;
  if (user) return <Redirect to="/" />;
  return <AuthPage />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/auth" component={AuthRoute} />
      <Route path="/" component={SelectShow} />
      <Route path="/show/:showId" component={ShowOverview} />
      <Route path="/ring/:ringId" component={RingDetail} />
      <Route path="/ring/:ringId/alerts">
        {() => <ProtectedRoute component={RingAlerts} />}
      </Route>
      <Route path="/ring/:ringId/control">
        {() => <ProtectedRoute component={RingControl} roles={["organizer", "staff"]} />}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={OrganizerDashboard} roles={["organizer"]} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
