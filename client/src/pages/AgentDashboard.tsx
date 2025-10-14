import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { agentContextStore } from "@/lib/localStores";
import { useDashboardMetrics, useActiveClients, queryClient } from "@/lib/queryClient";
import type { Lead, UnitWithDetails } from "@shared/schema";
import { useMemo } from "react";

// Hardcoded agent context for Demo Day
const AGENT_NAME = "SARAH CHEN";
const AGENT_ROLE = "SENIOR SALES AGENT";
const AGENT_ID = "agent-001";

// Simple Metric Card Component
const MetricCard = ({ title, value, color }: { title: string; value: string | number; color: string }) => (
  <Card className="text-center shadow-lg hover-elevate transition-all">
    <CardContent className="p-6">
      <p className={`text-5xl font-black ${color} mb-2`} data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {value}
      </p>
      <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </CardTitle>
    </CardContent>
  </Card>
);

export default function AgentDashboard() {
  const [, setLocation] = useLocation();

  // Fetch dashboard metrics
  const { data: metrics, isLoading: isMetricsLoading, isError: isMetricsError } = useDashboardMetrics(AGENT_ID);

  // Fetch active clients (qualified leads) for an agent
  const { data: activeClients = [], isLoading: isClientsLoading, isError: isClientsError } = useActiveClients(AGENT_ID);

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
    agentContextStore.setAgent(AGENT_ID, AGENT_NAME.split(' ')[0] + ' ' + AGENT_NAME.split(' ')[1]);
    // Navigate directly to unified viewer - the viewer will handle client selection
    setLocation("/agent/viewer");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header: Agent Profile */}
      <div className="border-b bg-card">
        <div className="px-6 py-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2" data-testid="text-welcome">
              WELCOME BACK, <span className="text-primary">{AGENT_NAME}</span>
            </h1>
            <p className="text-sm text-muted-foreground uppercase tracking-wide" data-testid="text-role">
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
                className="min-h-[48px]"
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

          {/* Main Content: Active Clients & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Active Clients Grid */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">Active Clients</h2>

              {isClientsLoading && (
                <p className="text-muted-foreground" data-testid="loading-clients">Loading clients...</p>
              )}

              {isClientsError && (
                <Card className="shadow-lg p-8 text-center" data-testid="card-clients-error">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                  <p className="text-destructive font-bold mb-2">Failed to Load Active Clients</p>
                  <p className="text-sm text-muted-foreground mb-4">There was an error fetching your client list</p>
                  <Button 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/agents", AGENT_ID, "active-clients"] })}
                    className="min-h-[48px]"
                  >
                    Retry Loading Clients
                  </Button>
                </Card>
              )}

              {!isClientsLoading && !isClientsError && formattedClients.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formattedClients.map(client => (
                    <Card
                      key={client.id}
                      className="shadow-lg hover-elevate active-elevate-2 transition-all"
                      data-testid={`card-client-${client.id}`}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg font-black uppercase">{client.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Lead Score</span>
                          <Badge variant="outline">{client.leadScore}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Next Follow-up</span>
                          <span className="font-medium">{client.nextFollowUpDate}</span>
                        </div>
                        <Button
                          size="sm"
                          className="w-full uppercase font-black gap-2"
                          onClick={handleGoToViewer}
                          data-testid={`button-start-session-${client.id}`}
                        >
                          Start/Resume Session
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!isClientsLoading && !isClientsError && formattedClients.length === 0 && (
                <Card className="shadow-lg" data-testid="card-no-clients">
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No active clients found.</p>
                    <Button onClick={() => setLocation('/agent/viewer/new')} data-testid="button-start-new-session">
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
                    onClick={handleGoToViewer}
                    data-testid="button-start-showing"
                  >
                    🎯 Start New Showing Session
                  </Button>
                  <Link href="/leads">
                    <Button
                      variant="outline"
                      className="w-full uppercase font-black gap-2"
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
                  </Link>

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
    </div>
  );
}