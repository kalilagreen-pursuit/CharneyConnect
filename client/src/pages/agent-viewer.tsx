import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient, useStartShowing, useEndShowing, useShowingItinerary, useLogUnitView, useLeadsForShowing } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Bed, Bath, Maximize2, Eye, LayoutGrid, Edit, AlertCircle, Zap, Clock, Calendar, CheckCircle, Star, Search } from "lucide-react";
import { UnitSheetDrawer } from "@/components/unit-sheet-drawer";
import { LeadQualificationSheet } from "@/components/lead-qualification-sheet";
import { UnitWithDetails, UnitWithDealContext, Lead } from "@shared/schema";
import { agentContextStore } from "@/lib/localStores";
import { useRealtime } from "@/contexts/RealtimeContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getMatchedUnitsWithScores, getMatchIndicatorClass, getMatchBadge } from "@/lib/preference-matcher";
import { matchUnitToClient } from "@/lib/match-units";

const PROJECTS = [
  { id: "2320eeb4-596b-437d-b4cb-830bdb3c3b01", name: "THE JACKSON" },
  { id: "f3ae960d-a0a9-4449-82fe-ffab7b01f3fa", name: "THE DIME" },
  { id: "6f9a358c-0fc6-41bd-bd5e-6234b68295cb", name: "GOWANUS" },
];

export default function AgentViewer() {
  const [, setLocation] = useLocation();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnitData, setSelectedUnitData] = useState<UnitWithDetails | null>(null);
  const [showUnitSheet, setShowUnitSheet] = useState(false);
  const [activeTab, setActiveTab] = useState("all-units");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showQualificationSheet, setShowQualificationSheet] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [actionId] = useState(() => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const { unitUpdates, clearUnitUpdates} = useRealtime();
  const { toast } = useToast();
  const startShowingMutation = useStartShowing();
  const endShowingMutation = useEndShowing();

  // Showing session state
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [showStartShowingDialog, setShowStartShowingDialog] = useState(false);
  const [selectedLeadForShowing, setSelectedLeadForShowing] = useState<string | null>(null);

  // Visualization mode state (LIVE 3D vs PRE-CONSTRUCTION GALLERY)
  const [isGalleryMode, setIsGalleryMode] = useState(false);

  // Fetch showing itinerary (viewed units in current session)
  const { data: viewedUnits = [] } = useShowingItinerary(activeVisitId);

  // Create a Set for quick lookup
  const viewedUnitIds = useMemo(() => {
    return new Set(viewedUnits.map(vu => vu.unitId));
  }, [viewedUnits]);

  // Hardcoded agent context for Demo Day
  const agentName = "SARAH CHEN";
  const agentRole = "SENIOR SALES AGENT";
  const agentId = agentContextStore.getAgentId() || 'agent-001';
  const [currentProjectId, setCurrentProjectId] = useState(() => agentContextStore.getProjectId() || PROJECTS[0].id);
  const currentProject = PROJECTS.find(p => p.id === currentProjectId) || PROJECTS[0];
  const projectName = currentProject.name;
  const projectId = currentProjectId;

  console.log(`[${actionId}] Agent Viewer initialized - Agent: ${agentName} (${agentId}), Project: ${projectName}`);

  // Fetch units specific to this agent and project
  const { data: units = [], isLoading } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/agents", agentId, "units", currentProjectId],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${agentId}/units?projectId=${currentProjectId}`);
      if (!response.ok) throw new Error('Failed to fetch agent units');
      return response.json();
    },
    enabled: !!agentId && !!currentProjectId, // Only fetch when both IDs are available
  });

  // Fetch active deals for this agent and project
  const { data: activeDeals = [], isLoading: isLoadingDeals } = useQuery<UnitWithDealContext[]>({
    queryKey: ["/api/agents", agentId, "active-deals", currentProjectId],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${agentId}/active-deals?projectId=${currentProjectId}`);
      if (!response.ok) throw new Error('Failed to fetch active deals');
      return response.json();
    },
    enabled: activeTab === "active-deals" && !!agentId && !!currentProjectId, // Only fetch when active deals tab is selected and IDs are available
  });

  // Fetch leads for showing session selection using new query hook
  const { data: allLeads = [], isLoading: isLoadingLeads } = useLeadsForShowing(
    showStartShowingDialog ? agentId : null,
    showStartShowingDialog ? currentProjectId : null
  );

  // Lead search state
  const [leadSearchQuery, setLeadSearchQuery] = useState("");

  // Filtered leads based on search query
  const filteredLeadsForShowing = useMemo(() => {
    if (!leadSearchQuery.trim()) return allLeads;
    const query = leadSearchQuery.toLowerCase();
    return allLeads.filter((lead) => {
      const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
      const email = lead.email?.toLowerCase() || '';
      return fullName.includes(query) || email.includes(query);
    });
  }, [allLeads, leadSearchQuery]);

  // Active lead for preference matching (from active showing session)
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const { data: activeLead = null, isLoading: isLeadLoading } = useQuery<Lead | null>({
    queryKey: ["/api/leads", activeLeadId],
    enabled: !!activeLeadId,
    queryFn: async () => {
      if (!activeLeadId) return null;
      const response = await fetch(`/api/leads/${activeLeadId}`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Calculate unit matches based on active lead preferences
  const unitMatches = useMemo(() => {
    if (!activeLead || !units || units.length === 0) return new Map();
    return getMatchedUnitsWithScores(units, activeLead);
  }, [units, activeLead]);

  // Listen for realtime updates and invalidate cache
  // Defer updates if unit drawer is open to prevent data loss
  useEffect(() => {
    if (unitUpdates.size > 0 && !showUnitSheet) {
      console.log(`[${actionId}] Received ${unitUpdates.size} realtime unit updates - invalidating cache`);
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "units", currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "active-deals", currentProjectId] });
      clearUnitUpdates();
    }
  }, [unitUpdates, actionId, agentId, currentProjectId, clearUnitUpdates, showUnitSheet]);

  // Get selected unit object
  const selectedUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId) || null;
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

    activeDeals.forEach(deal => {
      if (counts[deal.dealStage] !== undefined) {
        counts[deal.dealStage]++;
      }
    });

    return counts;
  }, [activeDeals]);

  // Filter deals by stage
  const filteredDeals = useMemo(() => {
    if (stageFilter === "all") return activeDeals;
    return activeDeals.filter(deal => deal.dealStage === stageFilter);
  }, [activeDeals, stageFilter]);

  // Import the log unit view mutation
  const logUnitViewMutation = useLogUnitView(activeVisitId);

  // Handle unit selection from card
  const handleUnitSelect = (unitId: string) => {
    console.log(`[${actionId}] Unit selected: ${unitId}`);
    setSelectedUnitId(unitId);

    // Log the unit view if there's an active showing session
    if (activeVisitId && !viewedUnitIds.has(unitId)) {
      console.log(`[${actionId}] Logging unit view for showing session: ${activeVisitId}`);
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

  // Handle view details - opens Lead Qualification Sheet for Active Deals, Unit Sheet for All Units
  const handleViewDetails = async (unit: UnitWithDetails | UnitWithDealContext) => {
    console.log(`[${actionId}] View details clicked for Unit ${unit.unitNumber}`);

    // Check if this is a deal with lead info (from Active Deals tab)
    const isDeal = 'dealId' in unit && 'leadEmail' in unit;

    if (isDeal && unit.dealId && unit.leadEmail) {
      // Open Lead Qualification Sheet
      console.log(`[${actionId}] Opening Lead details for deal`);

      try {
        // Fetch all leads and find one matching the email
        const response = await fetch('/api/leads');
        if (!response.ok) throw new Error('Failed to fetch leads');
        const allLeads: Lead[] = await response.json();

        const matchingLead = allLeads.find(lead => lead.email === unit.leadEmail);

        if (matchingLead) {
          setSelectedLead(matchingLead);
          setShowQualificationSheet(true);
        } else {
          toast({
            title: "Lead Not Found",
            description: "This contact hasn't been qualified yet. Please qualify them first on the Leads page.",
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
      console.log(`[${actionId}] Opening Unit Sheet for Unit ${unit.unitNumber}`);
      setSelectedUnitId(unit.id);
      setSelectedUnitData(unit as UnitWithDetails);
      setShowUnitSheet(true);
    }
  };

  const handleLogShowing = () => {
    console.log(`[${actionId}] TODO: Open Log Showing form for Unit ${selectedUnit?.unitNumber}`);
  };

  const handleBack = () => {
    console.log(`[${actionId}] Navigating back to project selection`);
    setLocation("/agent/project-select");
  };

  const handleProjectChange = (newProjectId: string) => {
    const project = PROJECTS.find(p => p.id === newProjectId);
    if (project) {
      console.log(`[${actionId}] Switching to project: ${project.name}`);
      setCurrentProjectId(newProjectId);
      agentContextStore.setProject(newProjectId, project.name);
      setSelectedUnitId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "units", newProjectId] });
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'default';
      case 'on_hold':
        return 'secondary';
      case 'contract':
        return 'outline';
      case 'sold':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string): string => {
    return status.replace('_', ' ').toUpperCase();
  };

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  const handleEditLead = async (dealId: string) => {
    console.log(`[${actionId}] Edit lead clicked for deal: ${dealId}`);

    // Find the deal in activeDeals to get the contact email
    const deal = activeDeals.find(d => d.dealId === dealId);
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
      const response = await fetch('/api/leads');
      if (!response.ok) throw new Error('Failed to fetch leads');
      const allLeads: Lead[] = await response.json();

      const matchingLead = allLeads.find(lead => lead.email === deal.leadEmail);

      if (matchingLead) {
        setSelectedLead(matchingLead);
        setShowQualificationSheet(true);
      } else {
        toast({
          title: "Lead Not Found",
          description: "This contact hasn't been qualified yet. Please qualify them first on the Leads page.",
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
    if (!selectedLeadForShowing) {
      toast({
        title: "No Lead Selected",
        description: "Please select a lead to start the showing session.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    console.log(`[${actionId}] Starting showing session for lead: ${selectedLeadForShowing}`);

    startShowingMutation.mutate(
      {
        leadId: selectedLeadForShowing,
        agentId,
        projectId: currentProjectId,
      },
      {
        onSuccess: (data) => {
          setActiveVisitId(data.id);
          setActiveLeadId(selectedLeadForShowing); // Set active lead for preference matching

          toast({
            title: "Showing Started",
            description: "All unit views will now be tracked for this session. Units matching preferences are highlighted.",
            duration: 3000,
          });

          setShowStartShowingDialog(false);
          setSelectedLeadForShowing(null);

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
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading units...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 1. Left Sidebar - Client Context */}
      <div className="w-80 bg-card border-r p-6 flex-shrink-0 overflow-y-auto">
          <h3 className="text-xl font-black uppercase mb-1">Agent: {agentName}</h3>
          <p className="text-sm text-muted-foreground mb-4">{agentRole}</p>

          <h4 className="text-lg font-black uppercase mb-4 border-b pb-2">Client Context</h4>
          
          {activeLeadId ? (
            <>
              {isLeadLoading && <p className="text-sm text-muted-foreground">Loading Client...</p>}

              {activeLead ? (
                <>
                  <p className="font-bold text-primary text-xl mb-1" data-testid="sidebar-client-name">
                    {activeLead.firstName} {activeLead.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4" data-testid="sidebar-client-stage">
                    Stage: {activeLead.stage?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                  </p>

                  {activeLead.preferences && (
                    <>
                      <h5 className="font-bold uppercase text-sm mt-4 mb-2">Preferences</h5>
                      <ul className="space-y-1 text-sm">
                        <li data-testid="sidebar-min-beds">
                          <span className="text-muted-foreground">Min Beds:</span>{' '}
                          <span className="font-semibold">{activeLead.preferences.min_beds || 'N/A'}</span>
                        </li>
                        <li data-testid="sidebar-max-price">
                          <span className="text-muted-foreground">Max Price:</span>{' '}
                          <span className="font-semibold">
                            {activeLead.preferences.max_price 
                              ? `$${(activeLead.preferences.max_price / 1000).toFixed(0)}K` 
                              : 'N/A'}
                          </span>
                        </li>
                        <li data-testid="sidebar-desired-views">
                          <span className="text-muted-foreground">Views:</span>{' '}
                          <span className="font-semibold">
                            {activeLead.preferences.desired_views?.join(', ') || 'N/A'}
                          </span>
                        </li>
                      </ul>
                    </>
                  )}
                  
                  <div className="p-3 bg-primary/10 border-l-4 border-primary mt-6 rounded" data-testid="sidebar-session-status">
                    <p className="text-sm font-medium uppercase">Session Status:</p>
                    <p className="text-lg font-black">{activeVisitId ? 'ACTIVE' : 'INACTIVE'}</p>
                    {activeVisitId && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {viewedUnits.length} unit{viewedUnits.length !== 1 ? 's' : ''} viewed
                      </p>
                    )}
                  </div>
                </>
              ) : (
                !isLeadLoading && (
                  <p className="text-sm text-destructive">No active client selected.</p>
                )
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">No active showing session</p>
                <p className="text-xs text-muted-foreground">Click "START SHOWING" to begin tracking a client session</p>
              </div>
              
              <div className="p-3 bg-primary/10 border-l-4 border-primary rounded" data-testid="sidebar-session-status">
                <p className="text-sm font-medium uppercase">Session Status:</p>
                <p className="text-lg font-black">INACTIVE</p>
              </div>
            </div>
          )}
        </div>

        {/* 2. Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tight" data-testid="text-viewer-title">
                      {projectName}
                    </h1>
                    <p className="text-sm text-muted-foreground" data-testid="text-agent-name">
                      Agent: {agentName} • {agentRole}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    {units.length} Units
                  </div>
                  {!activeVisitId && (
                    <Button
                      variant="default"
                      onClick={() => setShowStartShowingDialog(true)}
                      data-testid="button-start-showing"
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      START SHOWING
                    </Button>
                  )}
                  {activeVisitId && (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="px-3 py-1.5">
                        <Eye className="mr-1 h-3 w-3" />
                        Showing Active ({viewedUnits.length} viewed)
                      </Badge>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          console.log(`[${actionId}] Ending showing session: ${activeVisitId}`);
                          endShowingMutation.mutate(activeVisitId, {
                            onSuccess: () => {
                              toast({
                                title: "Showing Ended",
                                description: `Follow-up task created for ${viewedUnits.length} viewed unit(s).`,
                                duration: 3000,
                              });

                              setActiveVisitId(null);
                              setActiveLeadId(null);
                              queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "units", projectId] });

                              console.log(`[${actionId}] Showing ended and automation triggered`);
                            },
                            onError: (error) => {
                              console.error(`[${actionId}] Error ending showing:`, error);
                              toast({
                                title: "Error",
                                description: "Failed to end showing. Please try again.",
                                variant: "destructive",
                                duration: 3000,
                              });
                            },
                          });
                        }}
                        data-testid="button-end-showing"
                        className="uppercase font-black"
                        disabled={endShowingMutation.isPending}
                      >
                        {endShowingMutation.isPending ? 'PROCESSING...' : 'END SHOWING'}
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/")}
                    data-testid="button-view-all-units"
                  >
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    VIEW ALL UNITS
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Unit Cards Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
        {/* Project Selector Tabs */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 p-4 bg-[#f6f1eb] border-b">
          <div className="flex items-center gap-3">
            {PROJECTS.map((project) => (
              <Button
                key={project.id}
                data-testid={`button-project-${project.name.toLowerCase().replace(/\s+/g, "-")}`}
                variant={currentProjectId === project.id ? "default" : "outline"}
                onClick={() => handleProjectChange(project.id)}
                className="font-black uppercase tracking-tight"
              >
                {project.name}
              </Button>
            ))}
          </div>
          
          {/* Visualization Mode Toggle */}
          <Tabs value={isGalleryMode ? "gallery" : "live"} onValueChange={(v) => setIsGalleryMode(v === "gallery")}>
            <TabsList>
              <TabsTrigger value="live" data-testid="button-viz-live">Live Inventory Map</TabsTrigger>
              <TabsTrigger value="gallery" data-testid="button-viz-gallery">Pre-Construction Gallery</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Unit Cards Grid */}
        <div className="flex-1 overflow-auto bg-background" data-testid="container-unit-cards">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all-units" data-testid="tab-all-units" className="uppercase font-bold">
                  ALL UNITS
                </TabsTrigger>
                <TabsTrigger value="active-deals" data-testid="tab-active-deals" className="uppercase font-bold">
                  MY ACTIVE DEALS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all-units" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {units.map(unit => {
                    const unitMatch = unitMatches.get(unit.id);
                    const matchIndicator = unitMatch ? getMatchIndicatorClass(unitMatch.matchScore) : "";
                    const matchBadge = unitMatch ? getMatchBadge(unitMatch.matchScore) : null;
                    
                    // Use simpler match utility for visual highlighting
                    const simpleMatch = activeLead ? matchUnitToClient(unit, activeLead) : null;
                    const highlightClass = simpleMatch?.isMatch 
                      ? "border-4 border-green-500 shadow-xl" 
                      : "border border-transparent";
                    
                    return (
                <Card
                  key={unit.id}
                  data-unit-id={unit.id}
                  data-testid={`card-unit-${unit.unitNumber}`}
                  title={simpleMatch?.reason || ""}
                  className={cn(
                    "p-4 cursor-pointer transform transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02] hover:border-indigo-600 relative",
                    selectedUnitId === unit.id && "ring-2 ring-primary",
                    matchIndicator,
                    highlightClass
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
                          {activeVisitId && viewedUnitIds.has(unit.id) && (
                            <Badge 
                              variant="outline" 
                              className="bg-primary/10 text-primary border-primary"
                              data-testid={`badge-viewed-${unit.unitNumber}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              VIEWED
                            </Badge>
                          )}
                          {matchBadge && (
                            <Badge 
                              variant={matchBadge.variant}
                              className="bg-green-500 text-white uppercase text-xs"
                              data-testid={`badge-match-${unit.unitNumber}`}
                            >
                              <Star className="h-3 w-3 mr-1 fill-white" />
                              {matchBadge.label}
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
                    <div className="text-2xl font-bold" data-testid={`text-price-${unit.unitNumber}`}>
                      {formatPrice(unit.price)}
                    </div>

                    {/* Unit Details */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1" data-testid={`text-beds-${unit.unitNumber}`}>
                        <Bed className="h-4 w-4" />
                        <span>{unit.bedrooms} BD</span>
                      </div>
                      <div className="flex items-center gap-1" data-testid={`text-baths-${unit.unitNumber}`}>
                        <Bath className="h-4 w-4" />
                        <span>{unit.bathrooms} BA</span>
                      </div>
                      <div className="flex items-center gap-1" data-testid={`text-sqft-${unit.unitNumber}`}>
                        <Maximize2 className="h-4 w-4" />
                        <span>{unit.squareFeet.toLocaleString()} SF</span>
                      </div>
                    </div>

                    {/* Floor */}
                    <div className="text-xs text-muted-foreground">
                      Floor {unit.floor}
                    </div>

                    {/* Recommendation Badge for Strong Matches */}
                    {simpleMatch?.isMatch && simpleMatch.score >= 3 && (
                      <div className="absolute top-2 right-2">
                        <span className="text-xs font-bold text-white bg-green-500 rounded-full px-2 py-1 shadow-md">
                          RECOMMENDED
                        </span>
                      </div>
                    )}

                    {/* Match Reasons */}
                    {unitMatch && unitMatch.matchReasons.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          Match Reasons ({unitMatch.matchScore}% match)
                        </div>
                        <ul className="text-xs space-y-0.5">
                          {unitMatch.matchReasons.slice(0, 3).map((reason, idx) => (
                            <li key={idx} className="text-muted-foreground flex items-center gap-1">
                              <span className="text-green-500">✓</span> {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* View Details Button */}
                    <Button
                      size="sm"
                      className="w-full uppercase"
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
                  })}
                </div>

                {units.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No units found for this project
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
                      className="uppercase"
                    >
                      All: {dealCountsByStage.all}
                    </Button>
                    <Button
                      size="sm"
                      variant={stageFilter === "new" ? "default" : "outline"}
                      onClick={() => setStageFilter("new")}
                      data-testid="filter-new"
                      className="uppercase"
                    >
                      New: {dealCountsByStage.new}
                    </Button>
                    <Button
                      size="sm"
                      variant={stageFilter === "contacted" ? "default" : "outline"}
                      onClick={() => setStageFilter("contacted")}
                      data-testid="filter-contacted"
                      className="uppercase"
                    >
                      Contacted: {dealCountsByStage.contacted}
                    </Button>
                    <Button
                      size="sm"
                      variant={stageFilter === "qualified" ? "default" : "outline"}
                      onClick={() => setStageFilter("qualified")}
                      data-testid="filter-qualified"
                      className="uppercase"
                    >
                      Qualified: {dealCountsByStage.qualified}
                    </Button>
                    <Button
                      size="sm"
                      variant={stageFilter === "proposal" ? "default" : "outline"}
                      onClick={() => setStageFilter("proposal")}
                      data-testid="filter-proposal"
                      className="uppercase"
                    >
                      Proposal: {dealCountsByStage.proposal}
                    </Button>
                    <Button
                      size="sm"
                      variant={stageFilter === "negotiation" ? "default" : "outline"}
                      onClick={() => setStageFilter("negotiation")}
                      data-testid="filter-negotiation"
                      className="uppercase"
                    >
                      Negotiation: {dealCountsByStage.negotiation}
                    </Button>
                    <Button
                      size="sm"
                      variant={stageFilter === "closed_won" ? "default" : "outline"}
                      onClick={() => setStageFilter("closed_won")}
                      data-testid="filter-closed-won"
                      className="uppercase"
                    >
                      Closed Won: {dealCountsByStage.closed_won}
                    </Button>
                    <Button
                      size="sm"
                      variant={stageFilter === "closed_lost" ? "default" : "outline"}
                      onClick={() => setStageFilter("closed_lost")}
                      data-testid="filter-closed-lost"
                      className="uppercase"
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
                    filteredDeals.map(unit => {
                      // Map deal stage to Charney brand border color
                      const stageBorderColor = {
                        new: "border-l-muted-foreground",
                        contacted: "border-l-primary",
                        qualified: "border-l-[hsl(var(--status-available))]",
                        proposal: "border-l-[hsl(var(--status-on-hold))]",
                        negotiation: "border-l-[hsl(var(--status-contract))]",
                        closed_won: "border-l-[hsl(var(--status-available))]",
                        closed_lost: "border-l-destructive"
                      }[unit.dealStage] || "border-l-muted";

                      // Map deal stage to badge variant
                      const stageBadgeVariant = {
                        new: "secondary" as const,
                        contacted: "default" as const,
                        qualified: "default" as const,
                        proposal: "default" as const,
                        negotiation: "default" as const,
                        closed_won: "default" as const,
                        closed_lost: "destructive" as const
                      }[unit.dealStage] || "secondary" as const;

                      return (
                        <Card
                          key={unit.id}
                          data-unit-id={unit.id}
                          data-testid={`card-deal-${unit.unitNumber}`}
                          className={cn(
                            "p-4 cursor-pointer transform transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02] border-l-4 border-transparent hover:border-indigo-600",
                            stageBorderColor,
                            selectedUnitId === unit.id && "ring-2 ring-primary"
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
                                {activeVisitId && viewedUnitIds.has(unit.id) && (
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
                                {('hasOverdueTasks' in unit || 'isHotLead' in unit || 'isStaleLead' in unit) && (
                                  <div className="flex items-center gap-1">
                                    {unit.hasOverdueTasks && (
                                      <div className="relative" data-testid={`indicator-overdue-${unit.unitNumber}`}>
                                        <AlertCircle className="h-4 w-4 text-destructive fill-destructive" />
                                      </div>
                                    )}
                                    {unit.isHotLead && (
                                      <div className="relative" data-testid={`indicator-hot-${unit.unitNumber}`}>
                                        <Zap className="h-4 w-4 text-[hsl(var(--status-on-hold))] fill-[hsl(var(--status-on-hold))]" />
                                      </div>
                                    )}
                                    {unit.isStaleLead && (
                                      <div className="relative" data-testid={`indicator-stale-${unit.unitNumber}`}>
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
                                {unit.dealStage.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-2xl font-bold" data-testid={`text-price-${unit.unitNumber}`}>
                            {formatPrice(unit.price)}
                          </div>

                          {/* Unit Details */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1" data-testid={`text-beds-${unit.unitNumber}`}>
                              <Bed className="h-4 w-4" />
                              <span>{unit.bedrooms} BD</span>
                            </div>
                            <div className="flex items-center gap-1" data-testid={`text-baths-${unit.unitNumber}`}>
                              <Bath className="h-4 w-4" />
                              <span>{unit.bathrooms} BA</span>
                            </div>
                            <div className="flex items-center gap-1" data-testid={`text-sqft-${unit.unitNumber}`}>
                              <Maximize2 className="h-4 w-4" />
                              <span>{unit.squareFeet.toLocaleString()} SF</span>
                            </div>
                          </div>

                          {/* Lead Info (Active Deals only) */}
                          {'leadName' in unit && (
                            <div className="pt-2 border-t">
                              <div className="text-xs text-muted-foreground">Lead</div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold">{unit.leadName}</div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditLead(unit.dealId);
                                  }}
                                  data-testid={`button-edit-lead-${unit.unitNumber}`}
                                >
                                  <Edit className="h-3 w-3" />
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
                            size="sm"
                            className="w-full uppercase"
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
        }}
        onLogShowing={handleLogShowing}
        agentName={agentName}
        activeVisitId={activeVisitId}
        vizMode={isGalleryMode ? 'GALLERY' : 'LIVE'}
      />

      {/* Start Showing Dialog */}
      <Dialog open={showStartShowingDialog} onOpenChange={setShowStartShowingDialog}>
        <DialogContent data-testid="dialog-start-showing">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              Start Showing Session
            </DialogTitle>
            <DialogDescription>
              Select a lead to track unit views for this showing session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoadingLeads ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Loading leads...
              </div>
            ) : allLeads.length > 0 ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Leads</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by name or email..."
                      value={leadSearchQuery}
                      onChange={(e) => setLeadSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-leads"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Lead</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={selectedLeadForShowing || ''}
                    onChange={(e) => setSelectedLeadForShowing(e.target.value)}
                    data-testid="select-lead-for-showing"
                  >
                    <option value="">-- Select a lead --</option>
                    {filteredLeadsForShowing.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName} - {lead.email}
                      </option>
                    ))}
                  </select>
                  {leadSearchQuery && filteredLeadsForShowing.length === 0 && (
                    <p className="text-sm text-muted-foreground">No leads match your search.</p>
                  )}
                </div>

                <Button
                  className="w-full uppercase font-black"
                  onClick={handleStartShowing}
                  disabled={!selectedLeadForShowing || startShowingMutation.isPending}
                  data-testid="button-confirm-start-showing"
                >
                  {startShowingMutation.isPending ? 'STARTING...' : 'START SHOWING'}
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No leads available. Please qualify a lead first.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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