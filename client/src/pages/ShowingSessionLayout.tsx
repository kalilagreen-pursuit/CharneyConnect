import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient, useEndSession, useGeneratePortal, useTouredUnits, useSessionStatus } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Bed,
  Bath,
  Maximize2,
  Eye,
  CheckCircle,
  Star,
  Menu,
  Clock,
  Calendar,
  AlertCircle,
  Timer,
} from "lucide-react";
import { UnitWithDetails, Lead } from "@shared/schema";
import { agentContextStore } from "@/lib/localStores";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getMatchedUnitsWithScores, getMatchIndicatorClass } from "@/lib/preference-matcher";
import { ClientSelectorDialog } from "@/components/ClientSelectorDialog";
import { UnitSheetDrawer } from "@/components/unit-sheet-drawer";
import { EndSessionDialog } from "@/components/EndSessionDialog";
import { useWebSocket } from "@/hooks/use-websocket";

const PROJECTS = [
  { id: "2320eeb4-596b-437d-b4cb-830bdb3c3b01", name: "THE JACKSON" },
  { id: "f3ae960d-a0a9-4449-82fe-ffab7b01f3fa", name: "THE DIME" },
  { id: "6f9a358c-0fc6-41bd-bd5e-6234b68295cb", name: "GOWANUS" },
];

export default function ShowingSessionLayout() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Session state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showUnitSheet, setShowUnitSheet] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [generatedPortalUrl, setGeneratedPortalUrl] = useState<string | null>(null);

  const agentId = agentContextStore.getAgentId() || "agent-001";
  const agentName = agentContextStore.getAgentName() || "Agent";

  // WebSocket Hook
  const { lastMessage, sendMessage } = useWebSocket(); // Adjust URL as needed

  // Auto-open client selector if coming from /new route
  useEffect(() => {
    if (location === '/agent/viewer/new' || location === '/showing/new') {
      setShowClientSelector(true);
      setLocation('/showing');
    }
  }, [location]);

  // Subscribe to session events when session starts
  useEffect(() => {
    if (activeSessionId && sendMessage) {
      const subscribeMessage = JSON.stringify({
        type: 'subscribe',
        sessionId: activeSessionId
      });
      sendMessage(subscribeMessage);
      console.log(`[ShowingSession] Subscribed to WebSocket events for session: ${activeSessionId}`);
    }
  }, [activeSessionId, sendMessage]);

  // Fetch units for current project
  const { data: units = [], isLoading: unitsLoading, isError: unitsError } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/agents", agentId, "units", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return [];
      const response = await fetch(`/api/agents/${agentId}/units?projectId=${currentProjectId}`);
      if (!response.ok) throw new Error("Failed to fetch units");
      return response.json();
    },
    enabled: !!currentProjectId,
  });

  // Fetch active lead data
  const { data: activeLead = null, isLoading: isLeadLoading, isError: leadError } = useQuery<Lead | null>({
    queryKey: ["/api/leads", activeLeadId],
    enabled: !!activeLeadId,
    queryFn: async () => {
      if (!activeLeadId) return null;
      const response = await fetch(`/api/leads/${activeLeadId}`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Fetch toured units
  const { data: touredUnits = [], isLoading: isTouredLoading } = useTouredUnits(activeSessionId);
  const { data: sessionStatus } = useSessionStatus(activeSessionId);

  // WebSocket integration for real-time toured units
  useEffect(() => {
    if (activeSessionId && lastMessage) {
      try {
        const messageData = JSON.parse(lastMessage.data);
        if (messageData.type === "unit_toured" && messageData.sessionId === activeSessionId) {
          queryClient.invalidateQueries({ queryKey: ["/api/showing-sessions", activeSessionId, "toured-units"] });
          toast({
            title: "Unit Toured (Real-time)",
            description: `Unit ${messageData.unitNumber} was toured by the client.`,
            duration: 3000,
          });
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    }
  }, [lastMessage, activeSessionId, toast]);

  // Session timer
  useEffect(() => {
    if (!activeSessionId || !sessionStatus?.startTime) {
      setElapsedTime("00:00:00");
      return;
    }

    const updateTimer = () => {
      const startTime = new Date(sessionStatus.startTime).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);

      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;

      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeSessionId, sessionStatus?.startTime]);

  // Mutations
  const endSessionMutation = useEndSession();
  const generatePortalMutation = useGeneratePortal();

  const currentProject = PROJECTS.find(p => p.id === currentProjectId);

  // Calculate unit matches
  const unitMatches = useMemo(() => {
    if (!activeLead || !units || units.length === 0) return new Map();
    return getMatchedUnitsWithScores(units, activeLead);
  }, [units, activeLead]);

  const handleSessionStart = (sessionId: string, leadId: string, projectId: string) => {
    setActiveSessionId(sessionId);
    setActiveLeadId(leadId);
    setCurrentProjectId(projectId);
    agentContextStore.setProject(projectId, PROJECTS.find(p => p.id === projectId)?.name || '');
    // The WebSocket subscription is now handled by the useEffect hook
  };

  const handleEndSessionClick = () => {
    setShowEndDialog(true);
  };

  const handleEndSession = async () => {
    if (!activeSessionId || !activeLeadId) return;

    try {
      const touredUnitIds = touredUnits?.map(t => t.unitId) || [];

      // Generate portal
      const portalResult = await generatePortalMutation.mutateAsync({
        sessionId: activeSessionId,
        contactId: activeLeadId,
        touredUnitIds,
      });

      // End session
      await endSessionMutation.mutateAsync(activeSessionId);

      const fullPortalUrl = `${window.location.origin}${portalResult.portalUrl}`;
      setGeneratedPortalUrl(fullPortalUrl);

      toast({
        title: "Session Ended Successfully!",
        description: `Portal: ${fullPortalUrl}`,
        duration: 8000,
      });

      // Clear state after a delay to show portal URL
      setTimeout(() => {
        setShowEndDialog(false);
        setActiveSessionId(null);
        setActiveLeadId(null);
        setGeneratedPortalUrl(null);

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "dashboard"] });
      }, 3000);
    } catch (error) {
      console.error("Failed to end session:", error);
      toast({
        title: "Error",
        description: "Failed to end session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTourUnit = useCallback(async (unitId: string, isToured: boolean) => {
    if (!activeSessionId) return;

    if (isToured) {
      try {
        const response = await fetch('/api/toured-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSessionId,
            unitId,
          }),
        });

        if (!response.ok) throw new Error("Failed to mark unit as toured");

        // No need to invalidate queries here, WebSocket will handle it
        // queryClient.invalidateQueries({ queryKey: ["/api/showing-sessions", activeSessionId, "toured-units"] });

        toast({
          title: "Unit Toured",
          description: "Unit marked as toured in this session.",
          duration: 2000,
        });

        // Optionally send a message to the server via WebSocket if your backend expects it
        // sendMessage(JSON.stringify({ type: "unit_toured", sessionId: activeSessionId, unitId }));

      } catch (error) {
        console.error("Error marking unit as toured:", error);
        toast({
          title: "Error",
          description: "Failed to mark unit as toured.",
          variant: "destructive",
        });
      }
    }
  }, [activeSessionId, toast, sendMessage]); // Added sendMessage to dependencies

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(numPrice)) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  // Error handling for critical data fetching
  if (unitsError || leadError) {
    toast({
      title: "Error Loading Data",
      description: "Could not load essential session data. Please try refreshing.",
      variant: "destructive",
    });
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <AlertCircle className="h-8 w-8 mr-4 text-destructive" />
        <p className="text-lg font-semibold text-destructive">Failed to load session data.</p>
      </div>
    );
  }

  // Loading states
  const isLoading = unitsLoading || isLeadLoading || isTouredLoading;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR - Client Context */}
      <aside
        className={cn(
          "fixed md:relative z-50 md:z-auto w-80 h-full bg-card border-r border-border shadow-lg p-6 flex-shrink-0 overflow-y-auto transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >

        <h3 className="text-2xl font-black uppercase mb-6 tracking-tight border-b pb-3">Client Context</h3>

        {isLoading ? (
          <p className="text-muted-foreground">Loading client context...</p>
        ) : activeLead ? (
          <>
            <p className="font-bold text-primary text-xl mb-1">{activeLead.firstName} {activeLead.lastName}</p>
            <p className="text-sm text-muted-foreground mb-4">
              Stage: {activeLead.pipelineStage?.replace(/_/g, " ").toUpperCase() || "N/A"}
            </p>

            {activeLead.preferences && (
              <>
                <h5 className="font-bold uppercase text-sm mt-4 mb-2">Preferences</h5>
                <ul className="space-y-1 text-sm">
                  <li>
                    <span className="text-muted-foreground">Min Beds:</span>{" "}
                    <span className="font-semibold">{activeLead.preferences.min_beds || "N/A"}</span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Max Price:</span>{" "}
                    <span className="font-semibold">
                      {activeLead.preferences.max_price ? formatPrice(activeLead.preferences.max_price) : "N/A"}
                    </span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Desired Views:</span>{" "}
                    <span className="font-semibold">{activeLead.preferences.desired_views?.join(", ") || "N/A"}</span>
                  </li>
                </ul>
              </>
            )}

            {/* Toured Units List */}
            {activeSessionId && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-md font-bold uppercase mb-3 flex items-center justify-between">
                  <span>Toured Units</span>
                  <Badge variant="secondary">{touredUnits.length}</Badge>
                </h4>
                {touredUnits.length > 0 ? (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {touredUnits.map(touredUnit => {
                      const unit = units.find(u => u.id === touredUnit.unitId);
                      return (
                        <li
                          key={touredUnit.id}
                          className="text-sm flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <CheckCircle className="h-5 w-5 text-green-600 fill-green-600 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-bold block">Unit {touredUnit.unitNumber || unit?.unitNumber}</span>
                            {unit && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {unit.bedrooms}BD · {unit.bathrooms}BA · {formatPrice(unit.price)}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground p-4 bg-muted/30 rounded-lg border-2 border-dashed text-center">
                    No units toured yet
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">No active session</p>
            <Button onClick={() => setShowClientSelector(true)} className="uppercase font-black">
              Start Session
            </Button>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-card border-b-4 border-primary p-4 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                variant="outline"
                size="icon"
                className="md:hidden flex-shrink-0 min-h-[44px] min-w-[44px]"
                data-testid="button-toggle-sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">{currentProject?.name || 'Select Project'}</h2>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading units...</p>
                ) : (
                  <p className="text-sm text-muted-foreground font-medium">{units.length} units available</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {activeSessionId ? (
                <Button
                  onClick={handleEndSessionClick}
                  variant="destructive"
                  className="uppercase font-black"
                  disabled={endSessionMutation.isPending || generatePortalMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              ) : (
                <Button
                  onClick={() => setShowClientSelector(true)}
                  className="uppercase font-black bg-green-600 hover:bg-green-700"
                >
                  Start Showing
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Units Grid */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading units...</p>
            </div>
          ) : units.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No units found for this project.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map(unit => {
                const unitMatch = unitMatches.get(unit.id);
                const matchLevel = unitMatch
                  ? unitMatch.matchScore >= 90 ? 'perfect'
                  : unitMatch.matchScore >= 70 ? 'strong'
                  : unitMatch.matchScore >= 50 ? 'good'
                  : 'none'
                  : 'none';

                const isToured = touredUnits.some(tu => tu.unitId === unit.id);

                return (
                  <Card
                    key={unit.id}
                    className={cn(
                      "p-4 cursor-pointer hover:shadow-xl transition-all relative", // Added relative for absolute positioning
                      matchLevel === 'perfect' && "border-l-8 border-l-green-600 bg-green-50/50",
                      matchLevel === 'strong' && "border-l-8 border-l-blue-600 bg-blue-50/50",
                      matchLevel === 'good' && "border-l-8 border-l-yellow-600 bg-yellow-50/50"
                    )}
                    onClick={() => {
                      setSelectedUnitId(unit.id);
                      setShowUnitSheet(true);
                    }}
                  >
                    {unitMatch && unitMatch.matchScore > 0 && (
                      <div className={cn(
                        "absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg",
                        matchLevel === 'perfect' && "bg-green-600 text-white",
                        matchLevel === 'strong' && "bg-blue-600 text-white",
                        matchLevel === 'good' && "bg-yellow-600 text-white"
                      )}>
                        {unitMatch.matchScore}% Match
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-black uppercase">Unit {unit.unitNumber}</h3>
                          {isToured && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500 mt-1">
                              <CheckCircle className="h-3 w-3 mr-1 fill-green-600" />
                              TOURED
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-2xl font-bold">{formatPrice(unit.price)}</div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          <span>{unit.bedrooms} BD</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          <span>{unit.bathrooms} BA</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Maximize2 className="h-4 w-4" />
                          <span>{unit.squareFeet.toLocaleString()} SF</span>
                        </div>
                      </div>

                      {unitMatch && unitMatch.matchReasons.length > 0 && (
                        <div className={cn(
                          "p-3 rounded-lg border-2",
                          matchLevel === 'perfect' && "bg-green-50 border-green-300",
                          matchLevel === 'strong' && "bg-blue-50 border-blue-300",
                          matchLevel === 'good' && "bg-yellow-50 border-yellow-300"
                        )}>
                          <div className="text-xs font-bold uppercase mb-2 flex items-center gap-1">
                            <Star className={cn(
                              "h-3 w-3",
                              matchLevel === 'perfect' && "text-green-600 fill-green-600",
                              matchLevel === 'strong' && "text-blue-600 fill-blue-600",
                              matchLevel === 'good' && "text-yellow-600 fill-yellow-600"
                            )} />
                            Why This Matches
                          </div>
                          <ul className="text-xs space-y-1">
                            {unitMatch.matchReasons.slice(0, 3).map((reason: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className={cn(
                                  "mt-0.5",
                                  matchLevel === 'perfect' && "text-green-600",
                                  matchLevel === 'strong' && "text-blue-600",
                                  matchLevel === 'good' && "text-yellow-600"
                                )}>✓</span>
                                <span className="text-muted-foreground">{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeSessionId && (
                        <div className={cn(
                          "flex items-center space-x-2 p-3 rounded-md border-2 transition-colors min-h-[48px]",
                          isToured
                            ? "bg-green-50 border-green-300"
                            : "border-dashed border-muted-foreground/30"
                        )}>
                          <Checkbox
                            checked={isToured}
                            onCheckedChange={(checked) => handleTourUnit(unit.id, checked as boolean)}
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label className={cn(
                            "text-sm font-medium cursor-pointer flex-1",
                            isToured && "text-green-700"
                          )}>
                            {isToured ? "✓ Toured with Client" : "Mark as Toured"}
                          </label>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Tracker */}
        <div className="flex-shrink-0 border-t-4 border-primary bg-card p-4 shadow-xl">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {activeSessionId ? (
                  <span className="text-green-600 font-bold uppercase">● ACTIVE SESSION</span>
                ) : (
                  <span className="text-muted-foreground uppercase">○ No Active Session</span>
                )}
              </span>
            </div>

            {activeSessionId && sessionStatus && (
              <>
                <div className="h-6 w-px bg-border"></div>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" />
                  <span className="text-sm font-mono font-bold text-primary">
                    {elapsedTime}
                  </span>
                </div>

                <div className="h-6 w-px bg-border"></div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Started: {new Date(sessionStatus.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="h-6 w-px bg-border"></div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 fill-green-600" />
                  <span className="text-sm">
                    Toured: <span className="font-bold font-mono text-green-600">{touredUnits.length}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ClientSelectorDialog
        isOpen={showClientSelector}
        onClose={() => setShowClientSelector(false)}
        agentId={agentId}
        onSessionStart={handleSessionStart}
      />

      <UnitSheetDrawer
        unit={units.find(u => u.id === selectedUnitId) || null}
        isOpen={showUnitSheet}
        onClose={() => {
          setShowUnitSheet(false);
          setSelectedUnitId(null);
        }}
        onLogShowing={() => {}}
        agentName={agentName}
        activeVisitId={activeSessionId}
        vizMode="LIVE"
      />

      <EndSessionDialog
        isOpen={showEndDialog}
        onClose={() => setShowEndDialog(false)}
        onConfirm={handleEndSession}
        sessionData={{
          clientName: activeLead ? `${activeLead.firstName} ${activeLead.lastName}` : 'Client',
          projectName: currentProject?.name || 'Project',
          touredUnitsCount: touredUnits.length,
          elapsedTime: elapsedTime,
          startTime: sessionStatus?.startTime || new Date().toISOString(),
        }}
        isEnding={endSessionMutation.isPending || generatePortalMutation.isPending}
        portalUrl={generatedPortalUrl || undefined}
      />
    </div>
  );
}