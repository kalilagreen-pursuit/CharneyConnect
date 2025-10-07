import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Bed, Bath, Maximize2, Eye, LayoutGrid } from "lucide-react";
import { UnitSheetDrawer } from "@/components/unit-sheet-drawer";
import { UnitWithDetails, UnitWithDealContext } from "@shared/schema";
import { agentContextStore } from "@/lib/localStores";
import { useRealtime } from "@/contexts/RealtimeContext";
import { cn } from "@/lib/utils";

const PROJECTS = [
  { id: "2320eeb4-596b-437d-b4cb-830bdb3c3b01", name: "THE JACKSON" },
  { id: "f3ae960d-a0a9-4449-82fe-ffab7b01f3fa", name: "THE DIME" },
  { id: "6f9a358c-0fc6-41bd-bd5e-6234b68295cb", name: "GOWANUS" },
];

export default function AgentViewer() {
  const [, setLocation] = useLocation();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showUnitSheet, setShowUnitSheet] = useState(false);
  const [activeTab, setActiveTab] = useState("all-units");
  const [actionId] = useState(() => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const { unitUpdates, clearUnitUpdates} = useRealtime();
  
  // Get project context from agentContextStore
  const agentName = agentContextStore.getAgentName() || 'Agent';
  const agentId = agentContextStore.getAgentId() || 'agent-001';
  const [currentProjectId, setCurrentProjectId] = useState(() => agentContextStore.getProjectId() || PROJECTS[0].id);
  const currentProject = PROJECTS.find(p => p.id === currentProjectId) || PROJECTS[0];
  const projectName = currentProject.name;
  const projectId = currentProjectId;

  console.log(`[${actionId}] Agent Viewer initialized - Agent: ${agentName} (${agentId}), Project: ${projectName}`);

  // Fetch units specific to this agent and project
  const { data: units = [], isLoading } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/agents", agentId, "units", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${agentId}/units?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch agent units');
      return response.json();
    },
  });

  // Fetch active deals for this agent and project
  const { data: activeDeals = [], isLoading: isLoadingDeals } = useQuery<UnitWithDealContext[]>({
    queryKey: ["/api/agents", agentId, "active-deals", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${agentId}/active-deals?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch active deals');
      return response.json();
    },
    enabled: activeTab === "active-deals", // Only fetch when active deals tab is selected
  });

  // Listen for realtime updates and invalidate cache
  useEffect(() => {
    if (unitUpdates.size > 0) {
      console.log(`[${actionId}] Received ${unitUpdates.size} realtime unit updates - invalidating cache`);
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "units", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "active-deals", projectId] });
      clearUnitUpdates();
    }
  }, [unitUpdates, actionId, agentId, projectId, clearUnitUpdates]);

  // Get selected unit object
  const selectedUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId) || null;
  }, [units, selectedUnitId]);

  // Handle unit selection from card
  const handleUnitSelect = (unitId: string) => {
    console.log(`[${actionId}] Unit selected: ${unitId}`);
    setSelectedUnitId(unitId);
  };

  // Handle view details
  const handleViewDetails = (unit: UnitWithDetails) => {
    console.log(`[${actionId}] Opening Unit Sheet for Unit ${unit.unitNumber}`);
    setSelectedUnitId(unit.id);
    setShowUnitSheet(true);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading units...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
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
                  Agent: {agentName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {units.length} Units
              </div>
              <Button
                variant="default"
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

      {/* Main Content: Unit Cards */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Project Selector Tabs */}
        <div className="flex-shrink-0 flex items-center justify-center gap-3 p-4 bg-[#f6f1eb] border-b">
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
                  {units.map(unit => (
                <Card
                  key={unit.id}
                  data-unit-id={unit.id}
                  data-testid={`card-unit-${unit.unitNumber}`}
                  className={cn(
                    "p-4 cursor-pointer transition-all duration-200 hover-elevate",
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
                        <h3 className="text-xl font-black uppercase tracking-tight">
                          Unit {unit.unitNumber}
                        </h3>
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
              ))}
                </div>

                {units.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No units found for this project
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active-deals" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isLoadingDeals ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      Loading active deals...
                    </div>
                  ) : activeDeals.length > 0 ? (
                    activeDeals.map(unit => (
                      <Card
                        key={unit.id}
                        data-unit-id={unit.id}
                        data-testid={`card-deal-${unit.unitNumber}`}
                        className={cn(
                          "p-4 cursor-pointer transition-all duration-200 hover-elevate",
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
                              <h3 className="text-xl font-black uppercase tracking-tight">
                                Unit {unit.unitNumber}
                              </h3>
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

                          {/* Lead Info (Active Deals only) */}
                          {'leadName' in unit && (
                            <div className="pt-2 border-t">
                              <div className="text-xs text-muted-foreground">Lead</div>
                              <div className="text-sm font-semibold">{unit.leadName}</div>
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
                    ))
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

      {/* Unit Sheet Drawer */}
      <UnitSheetDrawer
        unit={selectedUnit}
        isOpen={showUnitSheet}
        onClose={() => {
          console.log(`[${actionId}] Closing Unit Sheet`);
          setShowUnitSheet(false);
        }}
        onLogShowing={handleLogShowing}
        agentName={agentName}
      />
    </div>
  );
}
