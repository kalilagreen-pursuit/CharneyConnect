import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/header";
import { useWebSocket } from "@/hooks/use-websocket";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import AgentSelect from "@/pages/agent-select";
import ProjectSelect from "@/pages/project-select";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/leads" component={Leads} />
      <Route path="/agent/select" component={AgentSelect} />
      <Route path="/agent/project-select" component={ProjectSelect} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  useWebSocket();

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-hidden">
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
