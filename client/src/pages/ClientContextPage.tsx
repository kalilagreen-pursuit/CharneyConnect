
import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSessionStatus, useTouredUnits } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { NBASuggestions } from "@/components/NBASuggestions";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightPanel } from "@/components/RightPanel";
import type { Lead, UnitWithDetails } from "@shared/schema";

// Mock NBA suggestions function (replace with real API call when available)
const fetchNBASuggestions = async (sessionId: string): Promise<string[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock suggestions based on session data
  return [
    "Unit 4A matches client's budget and bedroom preferences - prioritize showing this unit",
    "Client showed high interest in water views - highlight units 2C and 5B with waterfront access",
    "Follow up on financing options discussed during last viewing of Unit 3D",
  ];
};

export default function ClientContextPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/session/:sessionId");
  const sessionId = params?.sessionId || null;

  const [nbaSuggestions, setNbaSuggestions] = useState<string[]>([]);
  const [isLoadingNBA, setIsLoadingNBA] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [viewingUnits, setViewingUnits] = useState(false);

  // Fetch session status
  const { data: sessionStatus, isLoading: isSessionLoading } = useSessionStatus(sessionId);
  
  // Fetch toured units
  const { data: touredUnits = [] } = useTouredUnits(sessionId);

  // Fetch lead/client details
  const { data: lead } = useQuery<Lead>({
    queryKey: ["/api/leads", sessionStatus?.contactId || sessionStatus?.leadId],
    enabled: !!(sessionStatus?.contactId || sessionStatus?.leadId),
  });

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["/api/projects", sessionStatus?.projectId],
    enabled: !!sessionStatus?.projectId,
  });

  // Load NBA suggestions when session is resumed (active status)
  useEffect(() => {
    if (sessionStatus && sessionStatus.status === "in_progress" && sessionId) {
      setIsLoadingNBA(true);
      fetchNBASuggestions(sessionId)
        .then(suggestions => {
          setNbaSuggestions(suggestions);
        })
        .catch(error => {
          console.error("Failed to fetch NBA suggestions:", error);
        })
        .finally(() => {
          setIsLoadingNBA(false);
        });
    }
  }, [sessionStatus, sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No session ID provided</p>
            <Button onClick={() => setLocation("/agent-dashboard")} className="mt-4">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  // Fetch available units for the project
  const { data: availableUnits = [] } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units", sessionStatus?.projectId],
    enabled: !!sessionStatus?.projectId,
  });

  const handleUnitToggle = (unitId: string, isChecked: boolean) => {
    setSelectedUnitIds(prev => {
      if (isChecked) {
        return [...prev, unitId];
      } else {
        return prev.filter(id => id !== unitId);
      }
    });
  };

  const handleViewUnits = async () => {
    if (selectedUnitIds.length === 0) return;
    
    // TODO: Create toured_units records via API when endpoint is available
    // For now, just set viewing state to show the cards
    setViewingUnits(true);
  };

  const handleEndSession = () => {
    setLocation("/agent-dashboard");
  };

  const handleSaveDraft = () => {
    // TODO: Implement save draft functionality
    console.log("Save draft clicked");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b-4 border-primary bg-gradient-to-br from-card via-card to-primary/10 shadow-xl">
        <div className="px-6 py-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/agent-dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
            Client Context
          </h1>
        </div>
      </div>

      {/* NBA Suggestions (if any) */}
      {!isLoadingNBA && nbaSuggestions.length > 0 && (
        <div className="px-6 pt-4">
          <NBASuggestions suggestions={nbaSuggestions} sessionId={sessionId} />
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          lead={lead || null}
          availableUnits={availableUnits}
          touredUnits={touredUnits}
          selectedUnitIds={selectedUnitIds}
          onToggleUnit={handleUnitToggle}
          onViewUnits={handleViewUnits}
        />
        <RightPanel
          sessionId={sessionId}
          viewingUnits={viewingUnits}
          touredUnits={touredUnits}
          availableUnits={availableUnits}
          onEndSession={handleEndSession}
          onSaveDraft={handleSaveDraft}
        />
      </div>
    </div>
  );
}
