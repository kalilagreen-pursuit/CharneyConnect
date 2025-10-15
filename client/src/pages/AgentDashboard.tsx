import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { agentContextStore } from "@/lib/localStores";
import { useDashboardMetrics, useActiveClients, useActiveSessions, queryClient } from "@/lib/queryClient";
import type { Lead, UnitWithDetails } from "@shared/schema";
import { useMemo } from "react";
import { SessionCreationDialog } from "@/components/SessionCreationDialog";
import { ActiveSessionCard } from "@/components/ActiveSessionCard";

// Hardcoded agent context for Demo Day
const AGENT_NAME = "SARAH CHEN";
const AGENT_ROLE = "SENIOR SALES AGENT";
const AGENT_ID = "agent-001";

// Simple Metric Card Component
const MetricCard = ({ title, value, color }: { title: string; value: string | number; color: string }) => (
  <Card className="text-center shadow-md hover-elevate transition-all hover:shadow-xl border-2 border-border/50">
    <CardContent className="p-10">
      <p className={`text-7xl font-black ${color} mb-4 leading-none tabular-nums`} data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {value}
      </p>
      <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        {title}
      </CardTitle>
    </CardContent>
  </Card>
);

export default function AgentDashboard() {
  const [, setLocation] = useLocation();

  // Session creation dialog state
  const [isSessionCreationOpen, setIsSessionCreationOpen] = useState(false);

  // Fetch dashboard metrics
  const { data: metrics, isLoading: isMetricsLoading, isError: isMetricsError } = useDashboardMetrics(AGENT_ID);

  // Fetch active clients (qualified leads) for an agent
  const { data: activeClients = [], isLoading: isClientsLoading, isError: isClientsError } = useActiveClients(AGENT_ID);

  // Fetch active sessions for the agent
  const { data: activeSessions = [], isLoading: isSessionsLoading, isError: isSessionsError } = useActiveSessions(AGENT_ID);

  // Format active clients with computed fields
  const formattedClients = useMemo(() => {
    return (activeClients as any[]).map(client => ({
      id: client.id,
      name: client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      leadScore: client.leadScore || 0,
      nextFollowUpDate: client.nextFollowUpDate
        ? new Date(client.nextFollowUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'No date set'
    }));
  }, [activeClients]);


  // Fetch active leads for fallback display
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Fetch units to show project summary
  const { data: units = [] } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
  });

  // Calculate dynamic stats from metrics
  const activeSessions = metrics?.activeSessions ?? 0;
  const pendingFollowUps = metrics?.pendingFollowUps ?? 0;
  const projectCount = metrics?.projectCount ?? 0;

  // Project summaries
  const projectStats = units.reduce((acc, unit) => {
    const projectName = unit.project?.name || "Unknown";
    if (!acc[projectName]) {
      acc[projectName] = { total: 0, available: 0 };
    }
    acc[projectName].total++;
    if (unit.status === "available") {
      acc[projectName].available++;
    }
    return acc;
  }, {} as Record<string, { total: number; available: number }>);

  const handleGoToViewer = () => {
    // Store agent context
    agentContextStore.setAgent(AGENT_ID, AGENT_NAME);
    // Navigate to new unified showing session layout to trigger client selector
    setLocation("/showing/new");
  };

  // Handler for starting a new session - opens dialog
  const handleStartNewSession = () => {
    agentContextStore.setAgent(AGENT_ID, AGENT_NAME);
    setIsSessionCreationOpen(true);
  };

  // Handler for resuming an active session - navigates to session context page
  const handleResumeSession = (sessionId: string) => {
    agentContextStore.setAgent(AGENT_ID, AGENT_NAME);
    setLocation(`/session/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header: Agent Profile */}
      <div className="border-b-4 border-primary bg-gradient-to-br from-card via-card to-primary/10 shadow-2xl">
        <div className="px-6 py-16 md:py-20">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-4 leading-none bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent" data-testid="text-welcome">
              WELCOME BACK, {AGENT_NAME}
            </h1>
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2" data-testid="text-role">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              {AGENT_ROLE}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Metrics Grid */}
          {isMetricsError ? (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-lg font-bold text-destructive mb-2">Failed to Load Metrics</p>
              <p className="text-sm text-muted-foreground mb-4">Unable to fetch dashboard data</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/agents", AGENT_ID, "dashboard"] })}
                className="min-h-[48px] touch-manipulation"
              >
                Retry
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Active Sessions"
                value={isMetricsLoading ? '...' : activeSessions}
                color="text-primary"
              />
              <MetricCard
                title="Pending Follow-ups"
                value={isMetricsLoading ? '...' : pendingFollowUps}
                color="text-destructive"
              />
              <MetricCard
                title="Projects Qualified"
                value={isMetricsLoading ? '...' : projectCount}
                color="text-green-600"
              />
            </div>
          )}

          {/* Main Content: Active Sessions & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Active Sessions Grid */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">Active Sessions</h2>

              {isSessionsLoading && (
                <p className="text-muted-foreground" data-testid="loading-sessions">Loading active sessions...</p>
              )}

              {isSessionsError && (
                <Card className="shadow-lg p-8 text-center" data-testid="card-sessions-error">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                  <p className="text-destructive font-bold mb-2">Failed to Load Active Sessions</p>
                  <p className="text-sm text-muted-foreground mb-4">There was an error fetching your active sessions</p>
                  <Button 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/agents", AGENT_ID, "active-sessions"] })}
                    className="min-h-[48px] touch-manipulation"
                  >
                    Retry Loading Sessions
                  </Button>
                </Card>
              )}

              {!isSessionsLoading && !isSessionsError && activeSessions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSessions.map(session => (
                    <ActiveSessionCard
                      key={session.id}
                      sessionId={session.id}
                      clientName={session.clientName}
                      projectName={session.projectName}
                      unitsViewed={session.unitsViewed}
                      lastActivity={session.lastActivity}
                      onResume={handleResumeSession}
                    />
                  ))}
                </div>
              )}

              {!isSessionsLoading && !isSessionsError && activeSessions.length === 0 && (
                <Card className="shadow-lg" data-testid="card-no-sessions">
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No active sessions found.</p>
                    <Button onClick={handleStartNewSession} data-testid="button-start-new-session">
                      Start New Session
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="space-y-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">Quick Actions</h2>
              <Card className="shadow-lg" data-testid="card-quick-actions">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full uppercase font-black gap-2"
                    onClick={handleStartNewSession}
                    data-testid="button-start-showing"
                  >
                    🎯 Start New Showing Session
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full uppercase font-black gap-2"
                    onClick={() => setLocation('/leads')}
                    data-testid="button-follow-ups"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Follow-up Tasks
                    {pendingFollowUps > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {pendingFollowUps}
                      </Badge>
                    )}
                  </Button>

                  {/* Project Inventory Summary */}
                  <div className="pt-3 border-t space-y-2">
                    <p className="text-sm font-bold uppercase text-muted-foreground">Inventory</p>
                    {Object.entries(projectStats).slice(0, 2).map(([projectName, stats]) => (
                      <div key={projectName} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{projectName}</span>
                        <Badge variant="outline" data-testid={`badge-${projectName.toLowerCase().replace(/\s+/g, '-')}`}>
                          {stats.available} Available
                        </Badge>
                      </div>
                    ))}
                    <Link href="/dashboard">
                      <Button variant="link" className="p-0 w-full justify-start uppercase font-black text-xs" data-testid="button-browse-inventory">
                        Browse All Inventory →
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Navigation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/dashboard">
              <Card className="cursor-pointer hover-elevate active-elevate-2 transition-all h-full" data-testid="card-nav-units">
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black uppercase text-lg">Unit Map</p>
                    <p className="text-sm text-muted-foreground">Browse all inventory</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/leads">
              <Card className="cursor-pointer hover-elevate active-elevate-2 transition-all h-full" data-testid="card-nav-leads">
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black uppercase text-lg">Leads & Pipeline</p>
                    <p className="text-sm text-muted-foreground">Manage your prospects</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Session Creation Dialog */}
      <SessionCreationDialog
        isOpen={isSessionCreationOpen}
        onClose={() => setIsSessionCreationOpen(false)}
        agentId={AGENT_ID}
        onSessionStart={(sessionId, leadId, projectId) => {
          console.log(`[AgentDashboard] Session started: ${sessionId}, Lead: ${leadId}, Project: ${projectId}`);
          setLocation(`/session/${sessionId}`);
        }}
      />
    </div>
  );
}