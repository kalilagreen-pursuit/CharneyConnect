import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Bed, Bath, Maximize2, Eye } from "lucide-react";
import { UnitSheetDrawer } from "@/components/unit-sheet-drawer";
import { UnitWithDetails } from "@shared/schema";
import { agentContextStore } from "@/lib/localStores";
import { useRealtime } from "@/contexts/RealtimeContext";
import { cn } from "@/lib/utils";

export default function AgentViewer() {
  const [, setLocation] = useLocation();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showUnitSheet, setShowUnitSheet] = useState(false);
  const [actionId] = useState(() => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const { unitUpdates, clearUnitUpdates } = useRealtime();
  
  // Get project context from agentContextStore
  const agentName = agentContextStore.getAgentName() || 'Agent';
  const projectName = agentContextStore.getProjectName() || 'Project';
  const projectId = agentContextStore.getProjectId() || '1';

  console.log(`[${actionId}] Agent Viewer initialized - Agent: ${agentName}, Project: ${projectName}`);

  // Fetch all units for the current project
  const { data: allUnits, isLoading } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
  });

  // Filter units by current project
  const units = useMemo(() => {
    return allUnits?.filter(u => u.projectId === projectId) || [];
  }, [allUnits, projectId]);

  // Listen for realtime updates and invalidate cache
  useEffect(() => {
    if (unitUpdates.size > 0) {
      console.log(`[${actionId}] Received ${unitUpdates.size} realtime unit updates - invalidating cache`);
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      clearUnitUpdates();
    }
  }, [unitUpdates, actionId, clearUnitUpdates]);

  // Get selected unit object
  const selectedUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId) || null;
  }, [units, selectedUnitId]);

  // Handle unit selection from map or card
  const handleUnitSelect = (unitId: string) => {
    console.log(`[${actionId}] Unit selected: ${unitId}`);
    setSelectedUnitId(unitId);
    
    // Scroll to unit card in bottom panel
    const cardElement = document.querySelector(`[data-unit-id="${unitId}"]`);
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600';
      case 'on_hold':
        return 'bg-amber-500 hover:bg-amber-600';
      case 'contract':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'sold':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
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

  // Organize units by floor for map display
  const unitsByFloor = useMemo(() => {
    const floors = new Map<number, UnitWithDetails[]>();
    units.forEach(unit => {
      if (!floors.has(unit.floor)) {
        floors.set(unit.floor, []);
      }
      floors.get(unit.floor)!.push(unit);
    });
    // Sort floors descending (penthouse first) and return as array
    return Array.from(floors.entries()).sort((a, b) => b[0] - a[0]);
  }, [units]);

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
            <div className="text-sm text-muted-foreground">
              {units.length} Units
            </div>
          </div>
        </div>
      </div>

      {/* Split View Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Half: Unit Map */}
        <div className="flex-shrink-0 h-1/2 border-b overflow-auto bg-cream/5" data-testid="container-unit-map">
          <div className="p-6">
            <h2 className="text-lg font-black uppercase tracking-tight mb-4">
              UNIT MAP
            </h2>
            
            {/* Floor Grid */}
            <div className="space-y-4">
              {unitsByFloor.map(([floor, floorUnits]) => (
                <div key={floor} className="space-y-2">
                  <div className="text-sm font-bold uppercase text-muted-foreground">
                    Floor {floor}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {floorUnits.map((unit) => (
                      <button
                        key={unit.id}
                        data-testid={`map-block-${unit.unitNumber}`}
                        onClick={() => handleUnitSelect(unit.id)}
                        className={cn(
                          "relative w-20 h-20 rounded-md transition-all duration-200",
                          "flex flex-col items-center justify-center",
                          "text-white font-bold text-sm",
                          getStatusColor(unit.status),
                          selectedUnitId === unit.id && "ring-4 ring-primary ring-offset-2 scale-105"
                        )}
                      >
                        <span className="text-xs opacity-90">{unit.building}</span>
                        <span>{unit.unitNumber}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Half: Unit Cards */}
        <div className="flex-1 overflow-auto bg-background" data-testid="container-unit-cards">
          <div className="p-6">
            <h2 className="text-lg font-black uppercase tracking-tight mb-4">
              UNIT DETAILS
            </h2>
            
            {/* Units Grid */}
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
