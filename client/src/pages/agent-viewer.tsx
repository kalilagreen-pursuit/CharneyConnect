import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, queryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import FloorplanViewer3D from "@/components/FloorplanViewer3D";
import { UnitSheetDrawer } from "@/components/unit-sheet-drawer";
import { UnitWithDetails } from "@shared/schema";
import { agentContextStore } from "@/lib/localStores";
import { useRealtime } from "@/contexts/RealtimeContext";

export default function AgentViewer() {
  const [, setLocation] = useLocation();
  const [selectedUnit, setSelectedUnit] = useState<UnitWithDetails | null>(null);
  const [showUnitSheet, setShowUnitSheet] = useState(false);
  const [actionId] = useState(() => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const { unitUpdates } = useRealtime();
  
  // Get project context from agentContextStore (set by project-select page)
  const agentName = agentContextStore.getAgentName() || 'Agent';
  const projectName = agentContextStore.getProjectName() || 'Project';
  const projectId = agentContextStore.getProjectId() || '1';

  console.log(`[${actionId}] Agent Viewer initialized - Agent: ${agentName}, Project: ${projectName}`);

  // Fetch all units to find the one clicked in 3D viewer
  const { data: units } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
  });

  // Listen for realtime updates and invalidate cache
  useEffect(() => {
    if (unitUpdates.size > 0) {
      console.log(`[${actionId}] Received ${unitUpdates.size} realtime unit updates - invalidating cache`);
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
    }
  }, [unitUpdates, actionId]);

  // Handle unit selection from 3D viewer
  const handleUnitClick = (unitNumber: string) => {
    console.log(`[${actionId}] Unit clicked in 3D viewer: ${unitNumber}`);
    
    if (units) {
      const unit = units.find(u => u.unitNumber === unitNumber && u.projectId === projectId);
      if (unit) {
        console.log(`[${actionId}] Opening Unit Sheet for Unit ${unitNumber} - Status: ${unit.status}, Price: ${unit.price}`);
        setSelectedUnit(unit);
        setShowUnitSheet(true);
      } else {
        console.warn(`[${actionId}] Unit ${unitNumber} not found in project ${projectId}`);
      }
    }
  };

  const handleLogShowing = () => {
    console.log(`[${actionId}] TODO: Open Log Showing form for Unit ${selectedUnit?.unitNumber}`);
    // TODO: Task 5 - Open log showing form
  };

  const handleBack = () => {
    console.log(`[${actionId}] Navigating back to project selection`);
    setLocation("/agent/project-select");
  };

  return (
    <div className="relative h-screen w-full">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-b">
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
              Tap units to view details
            </div>
          </div>
        </div>
      </div>

      {/* 3D Viewer - Full Screen */}
      <div className="w-full h-full pt-20" data-testid="container-3d-viewer">
        <FloorplanViewer3D
          projectId={projectId}
          unitNumber=""
          onClose={handleBack}
          onUnitClick={handleUnitClick}
        />
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
