import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  queryClient,
  useStartShowing,
  useEndShowing,
  useShowingItinerary,
  useLogUnitView,
  useMarkUnitToured,
  useTouredUnits,
  useGeneratePortal, // Import useGeneratePortal
  useEndSession, // Import useEndSession
  useSessionStatus, // Import useSessionStatus
} from "@/lib/queryClient";
import { Agent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Bed,
  Bath,
  Maximize2,
  Eye,
  LayoutGrid,
  Edit,
  AlertCircle,
  Zap,
  Clock,
  Calendar,
  CheckCircle,
  Star,
  Search,
  Menu, // Import Menu icon
} from "lucide-react";
import { UnitSheetDrawer } from "@/components/unit-sheet-drawer";
import { LeadQualificationSheet } from "@/components/lead-qualification-sheet";
import { StartShowingDialog } from "@/components/StartShowingDialog";
import { UnitWithDetails, UnitWithDealContext, Lead } from "@shared/schema";
import { agentContextStore } from "@/lib/localStores";
import { useRealtime } from "@/contexts/RealtimeContext";
import { cn } from "@/lib/utils";
import { preferenceCache } from "@/lib/preference-cache";
import { debounce } from "@/lib/debounce";
import { useToast } from "@/hooks/use-toast";
import {
  getMatchedUnitsWithScores,
  getMatchIndicatorClass,
  getMatchBadge,
} from "@/lib/preference-matcher";
import { matchUnitToClient } from "@/lib/match-units";

const PROJECTS = [
  { id: "2320eeb4-596b-437d-b4cb-830bdb3c3b01", name: "THE JACKSON" },
  { id: "f3ae960d-a0a9-4449-82fe-ffab7b01f3fa", name: "THE DIME" },
  { id: "6f9a358c-0fc6-41bd-bd5e-6234b68295cb", name: "GOWANUS" },
];

export default function AgentViewer() {
  const [location, setLocation] = useLocation();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnitData, setSelectedUnitData] =
    useState<UnitWithDetails | null>(null);
  const [showUnitSheet, setShowUnitSheet] = useState(false);
  const [activeTab, setActiveTab] = useState("all-units");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showQualificationSheet, setShowQualificationSheet] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [actionId] = useState(
    () => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  );
  const { unitUpdates, clearUnitUpdates } = useRealtime();
  const { toast } = useToast();
  const startShowingMutation = useStartShowing();
  const endShowingMutation = useEndShowing();
  const generatePortalMutation = useGeneratePortal(); // Added mutation
  const endSessionMutation = useEndSession(); // Added mutation

  // State for sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-open dialog when route is /agent/viewer/new
  useEffect(() => {
    if (location === '/agent/viewer/new' || location === '/agent/viewer/new/') {
      setShowStartShowingDialog(true);
      // Clean up the URL after opening dialog
      setLocation('/agent/viewer');
    }
  }, [location, setLocation]);

  // Virtualization state - track which units are visible
  const [visibleUnitIds, setVisibleUnitIds] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Get agentId from the context store, with a fallback for the demo
  const agentId = agentContextStore.getAgentId() || "agent-001";

  // Showing session state
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [showStartShowingDialog, setShowStartShowingDialog] = useState(false);
  const [selectedLeadForShowing, setSelectedLeadForShowing] = useState<
    string | null
  >(null);

  // View mode toggle state (Grid vs 3D)
  const [viewMode, setViewMode] = useState<'grid' | '3d'>('grid');

  // Visualization mode state (LIVE 3D vs PRE-CONSTRUCTION GALLERY)
  const [isGalleryMode, setIsGalleryMode] = useState(false);

  // NEW: Fetch the agent's data using useQuery
  const { data: agentData, isLoading: isLoadingAgent } = useQuery<Agent>({
    queryKey: ["/api/agents", agentId],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${agentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch agent data");
      }
      return response.json();
    },
    enabled: !!agentId, // Only run the query if we have an agentId
  });

  // Fetch units specific to this agent and project
  const [currentProjectId, setCurrentProjectId] = useState(
    () => agentContextStore.getProjectId() || PROJECTS[0].id,
  );

  const { data: units = [], isLoading, error: unitsError } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/agents", agentId, "units", currentProjectId],
    queryFn: async () => {
      const response = await fetch(
        `/api/agents/${agentId}/units?projectId=${currentProjectId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch agent units");
      return response.json();
    },
    enabled: !!agentId && !!currentProjectId,
    retry: 2,
  });

  // Fetch showing itinerary (viewed units in current session)
  const { data: viewedUnits = [] } = useShowingItinerary(activeVisitId);

  // Tour tracking hooks for showing session
  const sessionId = activeVisitId; // Assuming activeVisitId can be used as sessionId
  const markTouredMutation = useMarkUnitToured(sessionId);
  const { data: touredUnits = [] } = useTouredUnits(sessionId);

  // Session status for real-time metrics in bottom tracker
  const { data: sessionStatus } = useSessionStatus(sessionId);

  // Import the log unit view mutation
  const logUnitViewMutation = useLogUnitView(activeVisitId);

  // Computed values
  const agentName = agentData?.name || "Loading Agent...";
  const agentRole = agentData?.role || "...";
  const currentProject =
    PROJECTS.find((p) => p.id === currentProjectId) || PROJECTS[0];
  const projectName = currentProject.name;
  const projectId = currentProjectId;

  // Create a Set for quick lookup
  const viewedUnitIds = useMemo(() => {
    return new Set(viewedUnits.map((vu) => vu.unitId));
  }, [viewedUnits]);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const unitId = entry.target.getAttribute('data-unit-id');
          if (unitId) {
            setVisibleUnitIds((prev) => {
              const newSet = new Set(prev);
              if (entry.isIntersecting) {
                newSet.add(unitId);
              }
              return newSet;
            });
          }
        });
      },
      {
        rootMargin: '100px', // Load units 100px before they enter viewport
        threshold: 0.01,
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Callback to attach observer to unit card elements
  const unitCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && observerRef.current) {
        observerRef.current.observe(node);
      }
    },
    []
  );

  console.log(
    `[${actionId}] Agent Viewer initialized - Agent: ${agentName} (${agentId}), Project: ${projectName}`,
  );

  // Show error state if units failed to load
  if (unitsError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4 p-6 max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <p className="text-lg font-bold uppercase text-destructive">
            Failed to Load Units
          </p>
          <p className="text-sm text-muted-foreground">
            {unitsError.message || "An error occurred while loading unit data"}
          </p>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "units", currentProjectId] })}
            size="lg"
            className="min-h-[48px] w-full touch-manipulation"
          >
            Retry Loading Units
          </Button>
          <Button
            onClick={handleBack}
            variant="outline"
            size="lg"
            className="min-h-[48px] w-full touch-manipulation"
          >
            Return to Project Select
          </Button>
        </div>
      </div>
    );
  }

  // Fetch active deals for this agent and project
  const { data: activeDeals = [], isLoading: isLoadingDeals } = useQuery<
    UnitWithDealContext[]
  >({
    queryKey: ["/api/agents", agentId, "active-deals", currentProjectId],
    queryFn: async () => {
      const response = await fetch(
        `/api/agents/${agentId}/active-deals?projectId=${currentProjectId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch active deals");
      return response.json();
    },
    enabled: activeTab === "active-deals" && !!agentId && !!currentProjectId, // Only fetch when active deals tab is selected and IDs are available
  });

  // Lead search state (still needed for dialog state management)
  const [leadSearchQuery, setLeadSearchQuery] = useState("");

  // Active lead for preference matching (from active showing session)
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const { data: activeLead = null, isLoading: isLeadLoading } =
    useQuery<Lead | null>({
      queryKey: ["/api/leads", activeLeadId],
      enabled: !!activeLeadId,
      queryFn: async () => {
        if (!activeLeadId) return null;

        // Check cache first
        const cached = preferenceCache.get(activeLeadId);
        if (cached) {
          console.log(`[preference-cache] Using cached preferences for lead ${activeLeadId}`);
          return cached;
        }

        // Fetch from API if not cached
        const response = await fetch(`/api/leads/${activeLeadId}`);
        if (!response.ok) return null;
        const data = await response.json();

        // Store in cache
        preferenceCache.set(activeLeadId, data);
        return data;
      },
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    });

  // Determine if there's an error loading the client
  const isClientError = !isLeadLoading && !activeLead && !!activeLeadId;

  // Calculate unit matches based on active lead preferences
  const unitMatches = useMemo(() => {
    if (!activeLead || !units || units.length === 0) return new Map();
    return getMatchedUnitsWithScores(units, activeLead);
  }, [units, activeLead]);

  // Listen for realtime updates and invalidate cache
  // Defer updates if unit drawer is open to prevent data loss
  useEffect(() => {
    if (unitUpdates.size > 0 && !showUnitSheet) {
      console.log(
        `[${actionId}] Received ${unitUpdates.size} realtime unit updates - invalidating cache`,
      );
      queryClient.invalidateQueries({
        queryKey: ["/api/agents", agentId, "units", currentProjectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/agents", agentId, "active-deals", currentProjectId],
      });
      clearUnitUpdates();
    }
  }, [
    unitUpdates,
    actionId,
    agentId,
    currentProjectId,
    clearUnitUpdates,
    showUnitSheet,
  ]);

  // Get selected unit object
  const selectedUnit = useMemo(() => {
    return units.find((u) => u.id === selectedUnitId) || null;
  }, [units, selectedUnitId]);

  // Calculate deal counts by stage
  const dealCountsByStage = useMemo(() => {
    const counts: Record<string, number> = {
      all: activeDeals.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      closed_won: 0,
      closed_lost: 0,
    };

    activeDeals.forEach((deal) => {
      if (counts[deal.dealStage] !== undefined) {
        counts[deal.dealStage]++;
      }
    });

    return counts;
  }, [activeDeals]);

  // Filter deals by stage
  const filteredDeals = useMemo(() => {
    if (stageFilter === "all") return activeDeals;
    return activeDeals.filter((deal) => deal.dealStage === stageFilter);
  }, [activeDeals, stageFilter]);

  // Handle unit selection from card
  const handleUnitSelect = (unitId: string) => {
    console.log(`[${actionId}] Unit selected: ${unitId}`);
    setSelectedUnitId(unitId);

    // Log the unit view if there's an active showing session
    if (activeVisitId && !viewedUnitIds.has(unitId)) {
      console.log(
        `[${actionId}] Logging unit view for showing session: ${activeVisitId}`,
      );
      logUnitViewMutation.mutate(unitId, {
        onSuccess: () => {
          console.log(`[${actionId}] Unit view logged successfully`);
        },
        onError: (error) => {
          console.error(`[${actionId}] Error logging unit view:`, error);
        },
      });
    }

    // Switch to 3D viewer tab if coming from Active Deals
    if (activeTab === "active-deals") {
      setActiveTab("all-units");
    }
  };

  // Handle unit tour tracking checkbox change (debounced)
  const handleTourTrackingChange = useMemo(
    () =>
      debounce((unitId: string, isToured: boolean) => {
        if (!sessionId) return;

        console.log(
          `[${actionId}] ${isToured ? 'Marking' : 'Unmarking'} unit ${unitId} as toured`,
        );

        if (isToured) {
          // Mark as toured
          markTouredMutation.mutate(unitId, {
            onSuccess: () => {
              console.log(`[${actionId}] Tour status updated successfully`);
              toast({
                title: "Unit Toured",
                description: "Unit marked as toured in this session.",
                duration: 2000,
              });
            },
            onError: (error) => {
              console.error(`[${actionId}] Error updating tour status:`, error);
              toast({
                title: "Error",
                description: "Failed to mark unit as toured.",
                variant: "destructive",
              });
            },
          });
        }
        // Note: Unchecking is not currently implemented on backend - checkboxes are additive only
      }, 300),
    [sessionId, markTouredMutation, actionId, toast]
  );

  // Handle view details - opens Lead Qualification Sheet for Active Deals, Unit Sheet for All Units
  const handleViewDetails = async (
    unit: UnitWithDetails | UnitWithDealContext,
  ) => {
    console.log(
      `[${actionId}] View details clicked for Unit ${unit.unitNumber}`,
    );

    // Check if this is a deal with lead info (from Active Deals tab)
    const isDeal = "dealId" in unit && "leadEmail" in unit;

    if (isDeal && unit.dealId && unit.leadEmail) {
      // Open Lead Qualification Sheet
      console.log(`[${actionId}] Opening Lead details for deal`);

      try {
        // Fetch all leads and find one matching the email
        const response = await fetch("/api/leads");
        if (!response.ok) throw new Error("Failed to fetch leads");
        const allLeads: Lead[] = await response.json();

        const matchingLead = allLeads.find(
          (lead) => lead.email === unit.leadEmail,
        );

        if (matchingLead) {
          setSelectedLead(matchingLead);
          setShowQualificationSheet(true);
        } else {
          toast({
            title: "Lead Not Found",
            description:
              "This contact hasn't been qualified yet. Please qualify them first on the Leads page.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(`[${actionId}] Error fetching lead:`, error);
        toast({
          title: "Error",
          description: "Failed to fetch lead information",
          variant: "destructive",
        });
      }
    } else {
      // Open Unit Sheet for regular units (from All Units tab)
      console.log(
        `[${actionId}] Opening Unit Sheet for Unit ${unit.unitNumber}`,
      );
      setSelectedUnitId(unit.id);
      setSelectedUnitData(unit as UnitWithDetails);
      setShowUnitSheet(true);
    }
  };

  const handleLogShowing = () => {
    console.log(
      `[${actionId}] TODO: Open Log Showing form for Unit ${selectedUnit?.unitNumber}`,
    );
  };

  const handleBack = () => {
    console.log(`[${actionId}] Navigating back to project selection`);
    setLocation("/agent/project-select");
  };

  const handleProjectChange = (newProjectId: string) => {
    const project = PROJECTS.find((p) => p.id === newProjectId);
    if (project) {
      console.log(`[${actionId}] Switching to project: ${project.name}`);
      setCurrentProjectId(newProjectId);
      agentContextStore.setProject(newProjectId, project.name);
      setSelectedUnitId(null);
      queryClient.invalidateQueries({
        queryKey: ["/api/agents", agentId, "units", newProjectId],
      });
    }
  };

  const getStatusBadgeVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "available":
        return "default";
      case "on_hold":
        return "secondary";
      case "contract":
        return "outline";
      case "sold":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatStatus = (status: string): string => {
    return status.replace("_", " ").toUpperCase();
  };

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  const handleEditLead = async (dealId: string) => {
    console.log(`[${actionId}] Edit lead clicked for deal: ${dealId}`);

    // Find the deal in activeDeals to get the contact email
    const deal = activeDeals.find((d) => d.dealId === dealId);
    if (!deal || !deal.leadEmail) {
      toast({
        title: "Error",
        description: "Could not find deal information",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch all leads and find one matching the email
      const response = await fetch("/api/leads");
      if (!response.ok) throw new Error("Failed to fetch leads");
      const allLeads: Lead[] = await response.json();

      const matchingLead = allLeads.find(
        (lead) => lead.email === deal.leadEmail,
      );

      if (matchingLead) {
        setSelectedLead(matchingLead);
        setShowQualificationSheet(true);
      } else {
        toast({
          title: "Lead Not Found",
          description:
            "This contact hasn't been qualified yet. Please qualify them first on the Leads page.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`[${actionId}] Error fetching lead:`, error);
      toast({
        title: "Error",
        description: "Failed to fetch lead information",
        variant: "destructive",
      });
    }
  };

  const handleStartShowing = () => {
    const actionId = `start-showing-${Date.now()}`;

    if (!selectedLeadForShowing) {
      console.error(`[${actionId}] No lead selected`);
      return;
    }

    console.log(`[${actionId}] Starting showing session`, {
      leadId: selectedLeadForShowing,
      agentId,
      projectId: currentProjectId,
    });

    startShowingMutation.mutate(
      {
        leadId: selectedLeadForShowing,
        agentId,
        projectId: currentProjectId,
      },
      {
        onSuccess: (data) => {
          setActiveVisitId(data.id);
          setActiveLeadId(selectedLeadForShowing);

          toast({
            title: "Showing Started",
            description:
              "All unit views will now be tracked for this session. Units matching preferences are highlighted.",
            duration: 3000,
          });

          setShowStartShowingDialog(false);
          setSelectedLeadForShowing(null);
          setLeadSearchQuery("");

          console.log(`[${actionId}] Showing session started: ${data.id}`);
        },
        onError: (error) => {
          console.error(`[${actionId}] Error starting showing:`, error);
          toast({
            title: "Error",
            description: "Failed to start showing session. Please try again.",
            variant: "destructive",
            duration: 3000,
          });
        },
      },
    );
  };

  // Function to handle ending the session and generating the portal link
  const handleEndSession = async () => {
    // Ensure necessary IDs and data are available
    if (!activeVisitId || !activeLeadId) {
      console.error("Missing required session data to end session.");
      toast({
        title: "Error",
        description: "Cannot end session: Missing session ID or lead ID.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Generate the client portal link using the new mutation
      const touredUnitIds = touredUnits?.map(t => t.unitId) || [];

      console.log(`[${actionId}] Ending session and generating portal`, {
        sessionId: activeVisitId,
        leadId: activeLeadId,
        touredUnitsCount: touredUnitIds.length
      });

      const portalResult = await generatePortalMutation.mutateAsync({
        sessionId: activeVisitId,
        contactId: activeLeadId,
        touredUnitIds: touredUnitIds,
      });

      // 2. Complete the showing session (triggers automation logic on backend)
      await endSessionMutation.mutateAsync(activeVisitId);

      // Display success toast with portal link
      const fullPortalUrl = `${window.location.origin}${portalResult.portalUrl}`;

      toast({
        title: "Session Ended Successfully!",
        description: `Portal link generated: ${fullPortalUrl}. Follow-up automation triggered.`,
        duration: 8000,
      });

      console.log(`[${actionId}] Session ended successfully. Portal: ${fullPortalUrl}`);

      // 3. Clear state
      setActiveVisitId(null);
      setActiveLeadId(null);

      // 4. Invalidate queries to refresh dashboard
      queryClient.invalidateQueries({
        queryKey: ["/api/agents", agentId, "dashboard"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/agents", agentId, "active-clients"],
      });

    } catch (error) {
      console.error(`[${actionId}] Failed to end session or generate portal:`, error);
      toast({
        title: "Error",
        description: "Failed to end session. Please try again.",
        variant: "destructive",
      });
    }
  };


  if (isLoading || isLoadingAgent) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
          <p className="text-lg font-bold uppercase text-muted-foreground">
            Loading Agent Data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 1. Left Sidebar - Client Context */}
      <aside
        className={cn(
          "w-80 bg-card border-r p-6 flex-shrink-0 overflow-y-auto transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        style={{ maxWidth: isSidebarOpen ? "320px" : "0px", minWidth: isSidebarOpen ? "320px" : "0px" }}
      >
        <button
          onClick={() => setIsSidebarOpen(false)}
          className={cn(
            "absolute top-1/2 right-2 transform -translate-y-1/2 z-50 p-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200",
            !isSidebarOpen && "hidden md:block",
          )}
          aria-label="Close sidebar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <h3 className="text-xl font-black uppercase mb-1">
          Agent: {agentName}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{agentRole}</p>

        <h4 className="text-lg font-black uppercase mb-4 border-b pb-2">
          Client Context
        </h4>

        {activeLeadId ? (
          <>
            {isLeadLoading && (
              <p className="text-sm text-muted-foreground">Loading Client...</p>
            )}

            {!isLeadLoading && activeLead && (
              <>
                <p
                  className="font-bold text-primary text-xl mb-1"
                  data-testid="sidebar-client-name"
                >
                  {activeLead.firstName} {activeLead.lastName}
                </p>
                <p
                  className="text-sm text-muted-foreground mb-4"
                  data-testid="sidebar-client-client-stage"
                >
                  Stage:{" "}
                  {activeLead.stage?.replace(/_/g, " ").toUpperCase() || "N/A"}
                </p>

                {activeLead.preferences && (
                  <>
                    <h5 className="font-bold uppercase text-sm mt-4 mb-2">
                      Preferences
                    </h5>
                    <ul className="space-y-1 text-sm">
                      <li data-testid="sidebar-min-beds">
                        <span className="text-muted-foreground">Min Beds:</span>{" "}
                        <span className="font-semibold">
                          {activeLead.preferences.min_beds || "N/A"}
                        </span>
                      </li>
                      <li data-testid="sidebar-max-price">
                        <span className="text-muted-foreground">
                          Max Price:
                        </span>{" "}
                        <span className="font-semibold">
                          {activeLead.preferences.max_price
                            ? `$${(activeLead.preferences.max_price / 1000).toFixed(0)}K`
                            : "N/A"}
                        </span>
                      </li>
                      <li data-testid="sidebar-desired-views">
                        <span className="text-muted-foreground">Views:</span>{" "}
                        <span className="font-semibold">
                          {activeLead.preferences.desired_views?.join(", ") ||
                            "N/A"}
                        </span>
                      </li>
                    </ul>
                  </>
                )}

                <div
                  className="p-3 bg-primary/10 border-l-4 border-primary mt-6 rounded"
                  data-testid="sidebar-session-status"
                >
                  <p className="text-sm font-medium uppercase">
                    Session Status:
                  </p>
                  <p className="text-lg font-black">
                    {activeVisitId ? "ACTIVE" : "INACTIVE"}
                  </p>
                  {activeVisitId && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {viewedUnits.length} unit
                      {viewedUnits.length !== 1 ? "s" : ""} viewed
                    </p>
                  )}
                </div>

                {/* Toured Units List */}
                {activeVisitId && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-md font-bold uppercase mb-3 flex items-center justify-between">
                      <span>Toured Units</span>
                      <Badge variant="secondary" className="ml-2">
                        {touredUnits.length}
                      </Badge>
                    </h4>
                    {touredUnits.length > 0 ? (
                      <ul className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {touredUnits.map((touredUnit) => {
                          // Find the matching unit to get the full details
                          const matchingUnit = units.find(u => u.id === touredUnit.unitId);
                          return (
                            <li
                              key={touredUnit.id}
                              className="text-sm flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors cursor-pointer group"
                              data-testid={`toured-unit-${touredUnit.unitId}`}
                              onClick={() => handleUnitSelect(touredUnit.unitId)}
                            >
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 fill-green-600" />
                              <div className="flex-1 min-w-0">
                                <span className="font-bold block text-gray-900 group-hover:text-green-700">
                                  Unit {touredUnit.unitNumber || matchingUnit?.unitNumber || touredUnit.unitId.slice(0, 8)}
                                </span>
                                {matchingUnit && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      {matchingUnit.bedrooms}BD · {matchingUnit.bathrooms}BA
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatPrice(matchingUnit.price)}
                                    </span>
                                  </div>
                                )}
                                <span className="text-xs text-muted-foreground block mt-1">
                                  Toured at {new Date(touredUnit.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 text-center">
                        <p className="text-xs text-muted-foreground">
                          No units toured yet. Check the "Toured" box on unit cards to mark them.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {!isLeadLoading && isClientError && (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  Error loading client details
                </p>
                <Button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/leads", activeLeadId] })}
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full min-h-[40px]"
                >
                  Retry
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                No active showing session
              </p>
              <p className="text-xs text-muted-foreground">
                Click "START SHOWING" to begin tracking a client session
              </p>
            </div>

            <div
              className="p-3 bg-primary/10 border-l-4 border-primary rounded"
              data-testid="sidebar-session-status"
            >
              <p className="text-sm font-medium uppercase">Session Status:</p>
              <p className="text-lg font-black">INACTIVE</p>
            </div>
          </div>
        )}
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar with Controls */}
        <div className="flex-shrink-0 bg-card border-b p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                variant="outline"
                size="icon"
                className="md:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-black uppercase">{projectName}</h2>
                <p className="text-sm text-muted-foreground">
                  {units.length} units available
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeVisitId ? (
                <Button
                  onClick={handleEndSession}
                  variant="destructive"
                  className="uppercase font-bold"
                  disabled={endSessionMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {endSessionMutation.isPending ? 'Ending...' : 'End Session'}
                </Button>
              ) : (
                <Button
                  onClick={() => setShowStartShowingDialog(true)}
                  className="uppercase font-bold bg-green-600 hover:bg-green-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start Showing
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Unit Cards Grid */}
        <div
          className="flex-1 overflow-auto bg-background"
          data-testid="container-unit-cards"
        >
          <div className="p-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="mb-6">
                <TabsTrigger
                  value="all-units"
                  data-testid="tab-all-units"
                  className="uppercase font-bold"
                >
                  ALL UNITS
                </TabsTrigger>
                <TabsTrigger
                  value="active-deals"
                  data-testid="tab-active-deals"
                  className="uppercase font-bold"
                >
                  MY ACTIVE DEALS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all-units" className="mt-0">
                {/* View Mode Toggle */}
                <div className="flex justify-end mb-4 gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    onClick={() => setViewMode('grid')}
                    size="sm"
                    className="uppercase font-bold"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Unit Grid
                  </Button>
                  <Button
                    variant={viewMode === '3d' ? 'default' : 'outline'}
                    onClick={() => setViewMode('3d')}
                    size="sm"
                    className="uppercase font-bold"
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    3D Viewer
                  </Button>
                </div>

                {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {units.map((unit) => {
                    const unitMatch = unitMatches.get(unit.id);
                    const matchIndicator = unitMatch
                      ? getMatchIndicatorClass(unitMatch.matchScore)
                      : "";
                    const matchBadge = unitMatch
                      ? getMatchBadge(unitMatch.matchScore)
                      : null;

                    // Use simpler match utility for visual highlighting
                    const simpleMatch = activeLead
                      ? matchUnitToClient(unit, activeLead)
                      : null;
                    const highlightClass = simpleMatch?.isMatch
                      ? "border-4 border-green-500 shadow-xl"
                      : "border border-transparent";

                    // Check if unit has been toured in the current session
                    const isToured =
                      touredUnits.some((tu) => tu.unitId === unit.id) || false;

                    const isVisible = visibleUnitIds.has(unit.id);

                    // Enhanced matching overlay - determine match level for styling
                    const matchLevel = unitMatch
                      ? unitMatch.matchScore >= 90 ? 'perfect'
                      : unitMatch.matchScore >= 70 ? 'strong'
                      : unitMatch.matchScore >= 50 ? 'good'
                      : 'none'
                      : 'none';

                    const matchOverlayClass = {
                      perfect: 'border-l-8 border-l-green-600 bg-green-50/50',
                      strong: 'border-l-8 border-l-blue-600 bg-blue-50/50',
                      good: 'border-l-8 border-l-yellow-600 bg-yellow-50/50',
                      none: ''
                    }[matchLevel];

                    return (
                      <Card
                        key={unit.id}
                        ref={unitCardRef}
                        data-unit-id={unit.id}
                        data-testid={`card-unit-${unit.unitNumber}`}
                        title={simpleMatch?.reason || ""}
                        className={cn(
                          "p-4 cursor-pointer transform transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02] hover:border-indigo-600 relative",
                          selectedUnitId === unit.id && "ring-2 ring-primary",
                          matchOverlayClass,
                          highlightClass,
                          !isVisible && "min-h-[300px]" // Reserve space for non-visible cards
                        )}
                        onClick={() => handleUnitSelect(unit.id)}
                      >
                        {isVisible ? (
                        <div className="space-y-3">
                          {/* Matching Score Overlay - Top Right Corner */}
                          {unitMatch && unitMatch.matchScore > 0 && (
                            <div className="absolute top-3 right-3 z-10">
                              <div className={cn(
                                "px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg",
                                matchLevel === 'perfect' && "bg-green-600 text-white",
                                matchLevel === 'strong' && "bg-blue-600 text-white",
                                matchLevel === 'good' && "bg-yellow-600 text-white"
                              )}>
                                {unitMatch.matchScore}% Match
                              </div>
                            </div>
                          )}

                          {/* Header: Unit Number + Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs text-muted-foreground uppercase">
                                {unit.building}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xl font-black uppercase tracking-tight">
                                  Unit {unit.unitNumber}
                                </h3>
                                {activeVisitId &&
                                  viewedUnitIds.has(unit.id) && (
                                    <Badge
                                      variant="outline"
                                      className="bg-primary/10 text-primary border-primary"
                                      data-testid={`badge-viewed-${unit.unitNumber}`}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      VIEWED
                                    </Badge>
                                  )}
                                {isToured && (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-500/10 text-green-600 border-green-500"
                                    data-testid={`badge-toured-${unit.unitNumber}`}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1 fill-green-600" />
                                    TOURED
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={getStatusBadgeVariant(unit.status)}
                              data-testid={`badge-status-${unit.unitNumber}`}
                              className="uppercase text-xs"
                            >
                              {formatStatus(unit.status)}
                            </Badge>
                          </div>

                          {/* Price */}
                          <div
                            className="text-2xl font-bold"
                            data-testid={`text-price-${unit.unitNumber}`}
                          >
                            {formatPrice(unit.price)}
                          </div>

                          {/* Unit Details */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div
                              className="flex items-center gap-1"
                              data-testid={`text-beds-${unit.unitNumber}`}
                            >
                              <Bed className="h-4 w-4" />
                              <span>{unit.bedrooms} BD</span>
                            </div>
                            <div
                              className="flex items-center gap-1"
                              data-testid={`text-baths-${unit.unitNumber}`}
                            >
                              <Bath className="h-4 w-4" />
                              <span>{unit.bathrooms} BA</span>
                            </div>
                            <div
                              className="flex items-center gap-1"
                              data-testid={`text-sqft-${unit.unitNumber}`}
                            >
                              <Maximize2 className="h-4 w-4" />
                              <span>
                                {unit.squareFeet.toLocaleString()} SF
                              </span>
                            </div>
                          </div>

                          {/* Floor */}
                          <div className="text-xs text-muted-foreground">
                            Floor {unit.floor}
                          </div>

                          {/* Match Reasons - Prominent Display */}
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
                                {unitMatch.matchReasons
                                  .slice(0, 3)
                                  .map((reason, idx) => (
                                    <li
                                      key={idx}
                                      className="flex items-start gap-1"
                                    >
                                      <span className={cn(
                                        "mt-0.5",
                                        matchLevel === 'perfect' && "text-green-600",
                                        matchLevel === 'strong' && "text-blue-600",
                                        matchLevel === 'good' && "text-yellow-600"
                                      )}>
                                        ✓
                                      </span>
                                      <span className="text-muted-foreground">{reason}</span>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}

                          {/* Tour Tracking Checkbox - Enhanced with API connection */}
                          {activeVisitId && (
                            <div className={cn(
                              "flex items-center space-x-2 mt-2 p-3 rounded-md border-2 transition-colors",
                              isToured
                                ? "bg-green-50 border-green-300 hover:bg-green-100"
                                : "border-dashed border-muted-foreground/30 hover:bg-accent"
                            )}>
                              <Checkbox
                                id={`tour-checkbox-${unit.id}`}
                                checked={isToured}
                                onCheckedChange={(checked) => {
                                  handleTourTrackingChange(unit.id, checked as boolean);
                                }}
                                className="h-6 w-6 min-h-[24px] min-w-[24px] data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                data-testid={`checkbox-toured-${unit.unitNumber}`}
                              />
                              <label
                                htmlFor={`tour-checkbox-${unit.id}`}
                                className={cn(
                                  "text-sm font-medium leading-none cursor-pointer py-2 flex-1",
                                  isToured && "text-green-700"
                                )}
                              >
                                {isToured ? "✓ Toured with Client" : "Mark as Toured"}
                              </label>
                            </div>
                          )}

                          {/* View Details Button */}
                          <Button
                            size="lg"
                            className="w-full uppercase mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(unit);
                            }}
                            data-testid={`button-view-details-${unit.unitNumber}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                        ) : (
                          <div className="flex items-center justify-center h-full min-h-[250px]">
                            <div className="text-sm text-muted-foreground">Loading...</div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {units.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No units found for this project
                  </div>
                )}
              </div>
                ) : (
                  <div className="h-[60vh] flex items-center justify-center bg-muted rounded-lg border-2 border-dashed border-muted-foreground/20">
                    <div className="text-center space-y-3">
                      <Maximize2 className="h-16 w-16 mx-auto text-muted-foreground" />
                      <p className="text-xl font-bold uppercase text-muted-foreground">
                        3D Viewer
                      </p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        3D floor plan visualization will be displayed here. Toggle back to Unit Grid to see the unit cards.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active-deals" className="mt-0 space-y-4">
                {/* Stats/Filter Header */}
                {!isLoadingDeals && activeDeals.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={stageFilter === "all" ? "default" : "outline"}
                      onClick={() => setStageFilter("all")}
                      data-testid="filter-all"
                      className="uppercase px-4 py-2 min-h-[36px]"
                    >
                      All: {dealCountsByStage.all}
                    </Button>
                    <Button
                      size="sm"
                      variant={stageFilter === "new" ? "default" : "outline"}
                      onClick={() => setStageFilter("new")}
                      data-testid="filter-new"
                      className="uppercase px-4 py-2 min-h-[36px]"
                    >
                      New: {dealCountsByStage.new}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        stageFilter === "contacted" ? "default" : "outline"
                      }
                      onClick={() => setStageFilter("contacted")}
                      data-testid="filter-contacted"
                      className="uppercase px-4 py-2 min-h-[36px]"
                    >
                      Contacted: {dealCountsByStage.contacted}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        stageFilter === "qualified" ? "default" : "outline"
                      }
                      onClick={() => setStageFilter("qualified")}
                      data-testid="filter-qualified"
                      className="uppercase px-4 py-2 min-h-[36px]"
                    >
                      Qualified: {dealCountsByStage.qualified}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        stageFilter === "proposal" ? "default" : "outline"
                      }
                      onClick={() => setStageFilter("proposal")}
                      data-testid="filter-proposal"
                      className="uppercase px-4 py-2 min-h-[36px]"
                    >
                      Proposal: {dealCountsByStage.proposal}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        stageFilter === "negotiation" ? "default" : "outline"
                      }
                      onClick={() => setStageFilter("negotiation")}
                      data-testid="filter-negotiation"
                      className="uppercase px-4 py-2 min-h-[36px]"
                    >
                      Negotiation: {dealCountsByStage.negotiation}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        stageFilter === "closed_won" ? "default" : "outline"
                      }
                      onClick={() => setStageFilter("closed_won")}
                      data-testid="filter-closed-won"
                      className="uppercase px-4 py-2 min-h-[36px]"
                    >
                      Closed Won: {dealCountsByStage.closed_won}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        stageFilter === "closed_lost" ? "default" : "outline"
                      }
                      onClick={() => setStageFilter("closed_lost")}
                      data-testid="filter-closed-lost"
                      className="uppercase px-4 py-2 min-h-[36px]"
                    >
                      Closed Lost: {dealCountsByStage.closed_lost}
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isLoadingDeals ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      Loading active deals...
                    </div>
                  ) : filteredDeals.length > 0 ? (
                    filteredDeals.map((unit) => {
                      // Map deal stage to Charney brand border color
                      const stageBorderColor =
                        {
                          new: "border-l-muted-foreground",
                          contacted: "border-l-primary",
                          qualified:
                            "border-l-[hsl(var(--status-available))]",
                          proposal: "border-l-[hsl(var(--status-on-hold))]",
                          negotiation:
                            "border-l-[hsl(var(--status-contract))]",
                          closed_won:
                            "border-l-[hsl(var(--status-available))]",
                          closed_lost: "border-l-destructive",
                        }[unit.dealStage] || "border-l-muted";

                      // Map deal stage to badge variant
                      const stageBadgeVariant =
                        {
                          new: "secondary" as const,
                          contacted: "default" as const,
                          qualified: "default" as const,
                          proposal: "default" as const,
                          negotiation: "default" as const,
                          closed_won: "default" as const,
                          closed_lost: "destructive" as const,
                        }[unit.dealStage] || ("secondary" as const);

                      // Check if unit has been toured in the current session
                      const isToured =
                        touredUnits.some((tu) => tu.unitId === unit.id) || false;

                      return (
                        <Card
                          key={unit.id}
                          data-unit-id={unit.id}
                          data-testid={`card-deal-${unit.unitNumber}`}
                          className={cn(
                            "p-4 cursor-pointer transform transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02] border-l-4 border-transparent hover:border-indigo-600",
                            stageBorderColor,
                            selectedUnitId === unit.id &&
                              "ring-2 ring-primary",
                          )}
                          onClick={() => handleUnitSelect(unit.id)}
                        >
                          <div className="space-y-3">
                            {/* Header: Unit Number + Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs text-muted-foreground uppercase">
                                  {unit.building}
                                </div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-xl font-black uppercase tracking-tight">
                                    Unit {unit.unitNumber}
                                  </h3>
                                  {activeVisitId &&
                                    viewedUnitIds.has(unit.id) && (
                                      <Badge
                                        variant="outline"
                                        className="bg-green-500/10 text-green-600 border-green-500"
                                        data-testid={`badge-viewed-deal-${unit.unitNumber}`}
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1 fill-green-600" />
                                        VIEWED
                                      </Badge>
                                    )}
                                  {/* Priority Indicators */}
                                  {("hasOverdueTasks" in unit ||
                                    "isHotLead" in unit ||
                                    "isStaleLead" in unit) && (
                                    <div className="flex items-center gap-1">
                                      {unit.hasOverdueTasks && (
                                        <div
                                          className="relative"
                                          data-testid={`indicator-overdue-${unit.unitNumber}`}
                                        >
                                          <AlertCircle className="h-4 w-4 text-destructive fill-destructive" />
                                        </div>
                                      )}
                                      {unit.isHotLead && (
                                        <div
                                          className="relative"
                                          data-testid={`indicator-hot-${unit.unitNumber}`}
                                        >
                                          <Zap className="h-4 w-4 text-[hsl(var(--status-on-hold))] fill-[hsl(var(--status-on-hold))]" />
                                        </div>
                                      )}
                                      {unit.isStaleLead && (
                                        <div
                                          className="relative"
                                          data-testid={`indicator-stale-${unit.unitNumber}`}
                                        >
                                          <Clock className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <Badge
                                  variant={getStatusBadgeVariant(unit.status)}
                                  data-testid={`badge-status-${unit.unitNumber}`}
                                  className="uppercase text-xs"
                                >
                                  {formatStatus(unit.status)}
                                </Badge>
                                <Badge
                                  variant={stageBadgeVariant}
                                  data-testid={`badge-stage-${unit.unitNumber}`}
                                  className="uppercase text-xs"
                                >
                                  {unit.dealStage.replace("_", " ")}
                                </Badge>
                              </div>
                            </div>

                            {/* Price */}
                            <div
                              className="text-2xl font-bold"
                              data-testid={`text-price-${unit.unitNumber}`}
                            >
                              {formatPrice(unit.price)}
                            </div>

                            {/* Unit Details */}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div
                                className="flex items-center gap-1"
                                data-testid={`text-beds-${unit.unitNumber}`}
                              >
                                <Bed className="h-4 w-4" />
                                <span>{unit.bedrooms} BD</span>
                              </div>
                              <div
                                className="flex items-center gap-1"
                                data-testid={`text-baths-${unit.unitNumber}`}
                              >
                                <Bath className="h-4 w-4" />
                                <span>{unit.bathrooms} BA</span>
                              </div>
                              <div
                                className="flex items-center gap-1"
                                data-testid={`text-sqft-${unit.unitNumber}`}
                              >
                                <Maximize2 className="h-4 w-4" />
                                <span>
                                  {unit.squareFeet.toLocaleString()} SF
                                </span>
                              </div>
                            </div>

                            {/* Tour Tracking Checkbox */}
                            {activeVisitId && (
                              <div className="flex items-center space-x-2 mt-2 p-2 rounded-md hover:bg-accent">
                                <Checkbox
                                  id={`tour-checkbox-${unit.id}`}
                                  checked={isToured}
                                  onCheckedChange={(checked) =>
                                    handleTourTrackingChange(
                                      unit.id,
                                      checked as boolean,
                                    )
                                  }
                                  className="h-5 w-5"
                                />
                                <label
                                  htmlFor={`tour-checkbox-${unit.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Toured
                                </label>
                              </div>
                            )}

                            {/* Lead Info (Active Deals only) */}
                            {"leadName" in unit && (
                              <div className="pt-2 border-t">
                                <div className="text-xs text-muted-foreground">
                                  Lead
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-semibold">
                                    {unit.leadName}
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditLead(unit.dealId);
                                    }}
                                    data-testid={`button-edit-lead-${unit.unitNumber}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Floor */}
                            <div className="text-xs text-muted-foreground">
                              Floor {unit.floor}
                            </div>

                            {/* View Details Button */}
                            <Button
                              size="lg"
                              className="w-full uppercase mt-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(unit);
                              }}
                              data-testid={`button-view-details-${unit.unitNumber}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      No active deals found for this project
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* 3. Right Panel (Preferences & Notes) */}
        <div className="w-80 bg-card border-l p-6 flex-shrink-0 overflow-y-auto">
          <h4 className="text-lg font-bold uppercase mb-4 border-b pb-2">Client Preferences</h4>

          {activeLead && activeLead.preferences ? (
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Budget Range</p>
                <p className="text-sm font-bold">
                  {activeLead.preferences.max_price
                    ? `Up to ${formatPrice(activeLead.preferences.max_price)}`
                    : 'Not specified'}
                </p>
              </div>

              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Bedrooms</p>
                <p className="text-sm font-bold">
                  {activeLead.preferences.min_beds
                    ? `${activeLead.preferences.min_beds}+ Bedrooms`
                    : 'Not specified'}
                </p>
              </div>

              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Desired Views</p>
                <p className="text-sm font-bold">
                  {activeLead.preferences.desired_views?.length
                    ? activeLead.preferences.desired_views.join(', ')
                    : 'Not specified'}
                </p>
              </div>

              {activeLead.preferences.desired_features?.length > 0 && (
                <div className="p-3 bg-primary/5 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Features</p>
                  <div className="flex flex-wrap gap-1">
                    {activeLead.preferences.desired_features.map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {activeLead ? 'No preferences set for this client' : 'Select a client to view preferences'}
            </p>
          )}

          <h4 className="text-lg font-bold uppercase mt-6 mb-4 border-b pb-2">Session Notes</h4>
          <textarea
            placeholder="Enter quick notes about this showing session..."
            className="w-full h-32 p-3 border rounded-lg resize-none text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={!activeVisitId}
          />
          {!activeVisitId && (
            <p className="text-xs text-muted-foreground mt-2">
              Start a showing session to enable notes
            </p>
          )}
        </div>
      </div>


      {/* Footer - Session Tracker */}
      <div className="flex-shrink-0 border-t-4 border-primary bg-card p-4 shadow-xl">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {activeVisitId ? (
                <span className="text-green-600 font-bold uppercase">● ACTIVE SESSION</span>
              ) : (
                <span className="text-muted-foreground uppercase">○ No Active Session</span>
              )}
            </span>
          </div>

          {activeVisitId && activeLead && (
            <>
              <div className="h-6 w-px bg-border"></div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Client:</span>
                <span className="text-sm font-bold text-foreground">
                  {activeLead.firstName} {activeLead.lastName}
                </span>
              </div>
            </>
          )}

          {activeVisitId && sessionStatus && (
            <>
              <div className="h-6 w-px bg-border"></div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Started:</span>{" "}
                  <span className="font-medium font-mono">
                    {new Date(sessionStatus.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </span>
              </div>

              <div className="h-6 w-px bg-border"></div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Duration:</span>{" "}
                  <span className="font-bold font-mono">
                    {(() => {
                      const start = new Date(sessionStatus.startTime).getTime();
                      const now = Date.now();
                      const durationMinutes = Math.floor((now - start) / 60000);
                      return `${durationMinutes}m`;
                    })()}
                  </span>
                </span>
              </div>

              <div className="h-6 w-px bg-border"></div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Viewed:</span>{" "}
                  <span className="font-bold font-mono text-blue-600">
                    {viewedUnits.length}
                  </span>
                </span>
              </div>

              <div className="h-6 w-px bg-border"></div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 fill-green-600" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Toured:</span>{" "}
                  <span className="font-bold font-mono text-green-600">
                    {touredUnits.length}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unit Sheet Drawer */}
      <UnitSheetDrawer
        unit={selectedUnitData}
        isOpen={showUnitSheet}
        onClose={() => {
          console.log(`[${actionId}] Closing Unit Sheet`);
          setShowUnitSheet(false);
          setSelectedUnitData(null);
          // Invalidate queries to refresh any changes made in the drawer
          queryClient.invalidateQueries({
            queryKey: ["/api/agents", agentId, "units", currentProjectId],
          });
        }}
        onLogShowing={handleLogShowing}
        agentName={agentName}
        activeVisitId={activeVisitId}
        vizMode={isGalleryMode ? "GALLERY" : "LIVE"}
      />

      {/* Start Showing Dialog */}
      <StartShowingDialog
        isOpen={showStartShowingDialog}
        onClose={() => {
          setShowStartShowingDialog(false);
          setSelectedLeadForShowing(null);
          setLeadSearchQuery("");
        }}
        agentId={agentId}
        projectId={currentProjectId}
        onSelectLead={(leadId) => {
          setSelectedLeadForShowing(leadId);
          handleStartShowing();
        }}
        projectName={currentProject.name}
        agentName={agentName}
      />

      {/* Lead Qualification Sheet */}
      {selectedLead && (
        <LeadQualificationSheet
          lead={selectedLead}
          open={showQualificationSheet}
          onOpenChange={(open) => {
            setShowQualificationSheet(open);
            if (!open) setSelectedLead(null); // Clear selection when sheet closes
          }}
        />
      )}
    </div>
  );
}