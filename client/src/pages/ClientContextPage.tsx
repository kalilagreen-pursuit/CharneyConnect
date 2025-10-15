
import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSessionStatus, useTouredUnits } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Building2, Clock, Eye } from "lucide-react";
import { NBASuggestions } from "@/components/NBASuggestions";
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b-4 border-primary bg-gradient-to-br from-card via-card to-primary/10 shadow-xl">
        <div className="px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => setLocation("/agent-dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2">
              Client Context
            </h1>
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">
              Session ID: {sessionId.slice(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* NBA Suggestions */}
          {!isLoadingNBA && nbaSuggestions.length > 0 && (
            <NBASuggestions suggestions={nbaSuggestions} sessionId={sessionId} />
          )}

          {/* Session Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-bold text-lg">
                    {lead ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name : 'Loading...'}
                  </p>
                </div>
                {lead?.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{lead.email}</p>
                  </div>
                )}
                {lead?.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{lead.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Session Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Project</p>
                  <p className="font-bold text-lg">{project?.name || 'Loading...'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Status
                  </span>
                  <Badge variant={sessionStatus?.status === "in_progress" ? "default" : "secondary"}>
                    {sessionStatus?.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    Units Toured
                  </span>
                  <Badge variant="outline">{touredUnits.length}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Toured Units List */}
          <Card>
            <CardHeader>
              <CardTitle>Units Toured This Session</CardTitle>
            </CardHeader>
            <CardContent>
              {touredUnits.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No units toured yet</p>
              ) : (
                <div className="space-y-2">
                  {touredUnits.map((unit, index) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <span className="font-medium">Unit {unit.unitNumber || 'N/A'}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(unit.viewedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={() => setLocation(`/showing/session/${sessionId}`)}
              className="flex-1"
            >
              Continue Showing Session
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/agent-dashboard")}
              className="flex-1"
            >
              End Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
