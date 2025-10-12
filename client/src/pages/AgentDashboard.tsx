
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { agentContextStore } from "@/lib/localStores";
import { usePendingTaskCount } from "@/lib/queryClient";
import type { Lead, UnitWithDetails } from "@shared/schema";

// Hardcoded agent context for Demo Day
const AGENT_NAME = "SARAH CHEN";
const AGENT_ROLE = "SENIOR SALES AGENT";
const AGENT_ID = "agent-001";

export default function AgentDashboard() {
  const [, setLocation] = useLocation();

  // Fetch active leads for follow-ups
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Fetch units to show project summary
  const { data: units = [] } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
  });

  // Fetch pending task count for the agent
  const { data: taskData, isLoading: isTaskCountLoading } = usePendingTaskCount(AGENT_ID);
  const pendingTaskCount = taskData?.count ?? 0;

  // Calculate dynamic stats
  const activeClient = leads.find(lead => lead.stage === "qualified") || leads[0];
  const activeClientName = activeClient?.name || "No Active Client";
  const followUpTasks = pendingTaskCount; // Use real-time task count

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

  // Active showing sessions (check if there's an active visit)
  const activeShowingSessions = leads.filter(lead => {
    // In real implementation, this would check for active showing visits
    return lead.stage === "showing_scheduled";
  }).length;

  const handleGoToViewer = () => {
    // Store agent context
    agentContextStore.setAgent(AGENT_ID, AGENT_NAME.split(' ')[0] + ' ' + AGENT_NAME.split(' ')[1]);
    setLocation("/agent/viewer");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="px-6 py-6">
          <div className="max-w-5xl mx-auto">
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
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Primary Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active Client Context */}
            <Card className="shadow-lg border-2 hover-elevate active-elevate-2 transition-all" data-testid="card-active-client">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-black uppercase">Active Client</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-black text-primary mb-1" data-testid="text-active-client-name">
                    {activeClientName}
                  </p>
                  {activeClient && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="uppercase text-xs">
                        {activeClient.stage.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}
                </div>
                <Button 
                  className="w-full uppercase font-black" 
                  data-testid="button-view-client"
                  onClick={handleGoToViewer}
                >
                  View Client Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-lg border-2 hover-elevate active-elevate-2 transition-all" data-testid="card-quick-actions">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-black uppercase">Quick Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full uppercase font-black" 
                  onClick={handleGoToViewer}
                  data-testid="button-start-showing"
                >
                  🎯 START SHOWING SESSION
                </Button>
                <Link href="/leads">
                  <Button 
                    variant="outline" 
                    className="w-full uppercase font-black" 
                    data-testid="button-follow-ups"
                    disabled={isTaskCountLoading}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    {isTaskCountLoading ? 'LOADING TASKS...' : 'FOLLOW-UP TASKS'}
                    {!isTaskCountLoading && followUpTasks > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {followUpTasks}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Project Summary */}
            <Card className="shadow-lg border-2 hover-elevate active-elevate-2 transition-all" data-testid="card-project-summary">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-black uppercase">Inventory</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(projectStats).slice(0, 2).map(([projectName, stats]) => (
                  <div key={projectName} className="flex justify-between items-center text-sm">
                    <span className="font-medium uppercase">{projectName}</span>
                    <Badge variant="outline" data-testid={`badge-${projectName.toLowerCase().replace(/\s+/g, '-')}-available`}>
                      {stats.available} Available
                    </Badge>
                  </div>
                ))}
                <Link href="/dashboard">
                  <Button variant="link" className="p-0 w-full justify-start uppercase font-black" data-testid="button-browse-inventory">
                    Browse All Inventory →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Active Showing Sessions Alert */}
          {activeShowingSessions > 0 && (
            <Card className="border-primary bg-primary/5" data-testid="card-active-showings">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-black uppercase text-lg">
                        {activeShowingSessions} Active Showing{activeShowingSessions !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Resume your in-progress client meetings
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleGoToViewer} data-testid="button-resume-showing">
                    RESUME
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Priorities */}
          <Card className="shadow-lg" data-testid="card-priorities">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                TODAY'S PRIORITIES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">Follow up with qualified leads</p>
                    <p className="text-sm text-muted-foreground">
                      {followUpTasks} client{followUpTasks !== 1 ? 's' : ''} awaiting post-showing contact
                    </p>
                  </div>
                  <Badge variant="outline" className="uppercase text-xs">
                    {followUpTasks}
                  </Badge>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">Review new inventory</p>
                    <p className="text-sm text-muted-foreground">
                      Check latest unit availability across projects
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">Update deal pipeline</p>
                    <p className="text-sm text-muted-foreground">
                      Move qualified prospects to contract stage
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
