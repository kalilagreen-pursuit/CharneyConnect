import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/header";
import { FloatingAIButton } from "@/components/floating-ai-button";
import { useWebSocket } from "@/hooks/use-websocket";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import AgentSelect from "@/pages/agent-select";
import AgentDashboard from "@/pages/AgentDashboard";
import ProjectSelect from "@/pages/project-select";
import AgentViewer from "@/pages/agent-viewer";
import ShowingSessionLayout from "@/pages/ShowingSessionLayout";
import ManagerView from "@/pages/manager-view";
import UnitLeads from "@/pages/unit-leads";
import BuyerPortalStub from "@/pages/portal/BuyerPortalStub";
import PortalView from "@/pages/PortalView";
import NotFound from "@/pages/not-found";
import ClientContextPage from "@/pages/ClientContextPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AgentDashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/leads" component={Leads} />
      <Route path="/agent/select" component={AgentSelect} />
      <Route path="/agent/:agentId" component={AgentDashboard} />
      <Route path="/agent/dashboard" component={AgentDashboard} />
      <Route path="/agent/viewer/:mode?" component={AgentViewer} />
      <Route path="/agent/project-select" component={ProjectSelect} />
      {/* Main session context page - uses ShowingSessionLayout temporarily */}
      <Route path="/session/:sessionId" component={ClientContextPage} />
      <Route path="/showing/:mode?" component={ShowingSessionLayout} />
      <Route path="/manager" component={ManagerView} />
      <Route path="/unit/:projectId/:unitNumber/leads" component={UnitLeads} />
      <Route path="/portal/:leadId" component={BuyerPortalStub} />
      <Route path="/portal/:token" component={PortalView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  useWebSocket();

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RealtimeProvider>
          <AppContent />
          <FloatingAIButton />
          <Toaster />
        </RealtimeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;