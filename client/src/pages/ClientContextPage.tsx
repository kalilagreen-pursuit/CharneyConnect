
import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSessionStatus, useTouredUnits } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, Send } from "lucide-react";
import { NBASuggestions } from "@/components/NBASuggestions";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightPanel } from "@/components/RightPanel";
import { useToast } from "@/hooks/use-toast";
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
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const { toast } = useToast();

  // Mutation to save session as active (draft)
  const saveAsActiveMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/showing-sessions/${sessionId}/save-draft`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to save session as active");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Saved",
        description: "This session has been saved and can be resumed later.",
      });
      setLocation("/agent-dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to complete session and send synopsis
  const completeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/showing-sessions/${sessionId}/complete`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to complete session");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Session Completed",
        description: data.portalUrl 
          ? `Synopsis sent to client. Portal: ${data.portalUrl}`
          : "Synopsis sent to client successfully.",
      });
      setLocation("/agent-dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete session. Please try again.",
        variant: "destructive",
      });
    },
  });

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
    setShowEndSessionDialog(true);
  };

  const handleSaveAsActive = () => {
    if (sessionId) {
      saveAsActiveMutation.mutate(sessionId);
    }
  };

  const handleCompleteSession = () => {
    if (sessionId) {
      completeSessionMutation.mutate(sessionId);
    }
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

      {/* End Session Dialog */}
      <Dialog open={showEndSessionDialog} onOpenChange={setShowEndSessionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              End Showing Session
            </DialogTitle>
            <DialogDescription className="text-base">
              How would you like to conclude this session?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Client:</span>
                <span className="font-bold">
                  {lead ? `${lead.firstName} ${lead.lastName}` : "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/30 pt-2">
                <span className="text-sm font-medium">Units Toured:</span>
                <span className="font-bold">{touredUnits.length}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleSaveAsActive}
                disabled={saveAsActiveMutation.isPending || completeSessionMutation.isPending}
                className="w-full h-auto py-4 flex-col items-start gap-1 bg-blue-600 hover:bg-blue-700"
              >
                <div className="flex items-center gap-2 font-black uppercase text-base">
                  <Save className="h-5 w-5" />
                  Save as Active Session
                </div>
                <span className="text-xs font-normal text-blue-100">
                  Resume this session later without sending updates
                </span>
              </Button>

              <Button
                onClick={handleCompleteSession}
                disabled={saveAsActiveMutation.isPending || completeSessionMutation.isPending}
                className="w-full h-auto py-4 flex-col items-start gap-1 bg-green-600 hover:bg-green-700"
              >
                <div className="flex items-center gap-2 font-black uppercase text-base">
                  <Send className="h-5 w-5" />
                  Log Session & Send Synopsis
                </div>
                <span className="text-xs font-normal text-green-100">
                  Complete session and send portal link to client
                </span>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEndSessionDialog(false)}
              disabled={saveAsActiveMutation.isPending || completeSessionMutation.isPending}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
