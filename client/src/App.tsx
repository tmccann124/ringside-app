import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import SelectShow from "@/pages/select-show";
import ShowOverview from "@/pages/show-overview";
import RingDetail from "@/pages/ring-detail";
import RingAlerts from "@/pages/ring-alerts";
import RingControl from "@/pages/ring-control";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={SelectShow} />
      <Route path="/show/:showId" component={ShowOverview} />
      <Route path="/ring/:ringId" component={RingDetail} />
      <Route path="/ring/:ringId/alerts" component={RingAlerts} />
      <Route path="/ring/:ringId/control" component={RingControl} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
