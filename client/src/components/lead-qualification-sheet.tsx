import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Lead } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, MapPin, Calendar, TrendingUp, Eye, ListTodo, CheckCircle2, AlertCircle } from "lucide-react";
import { MatchedUnitsDrawer } from "./matched-units-drawer";
import { TasksPanel } from "./tasks-panel";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";

interface LeadQualificationSheetProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function normalizeLocations(locations: string[] | string | null | undefined): string {
  if (!locations) return "";
  
  if (Array.isArray(locations)) {
    return locations.join(", ");
  }
  
  if (typeof locations === "string") {
    const cleaned = locations.trim();
    if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
      const parsed = cleaned.slice(1, -1).split(",").map(s => s.trim());
      return parsed.join(", ");
    }
    return cleaned;
  }
  
  return "";
}

export function LeadQualificationSheet({
  lead,
  open,
  onOpenChange,
}: LeadQualificationSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [targetPriceMin, setTargetPriceMin] = useState<string>(
    lead.targetPriceMin || ""
  );
  const [targetPriceMax, setTargetPriceMax] = useState<string>(
    lead.targetPriceMax || ""
  );
  const [targetLocations, setTargetLocations] = useState<string>(
    normalizeLocations(lead.targetLocations)
  );
  const [timeFrameToBuy, setTimeFrameToBuy] = useState<string>(
    lead.timeFrameToBuy || ""
  );
  const [pipelineStage, setPipelineStage] = useState<string>(
    lead.pipelineStage || ""
  );
  const [matchedUnitsDrawerOpen, setMatchedUnitsDrawerOpen] = useState(false);

  useEffect(() => {
    setTargetPriceMin(lead.targetPriceMin || "");
    setTargetPriceMax(lead.targetPriceMax || "");
    setTargetLocations(normalizeLocations(lead.targetLocations));
    setTimeFrameToBuy(lead.timeFrameToBuy || "");
    setPipelineStage(lead.pipelineStage || "");
  }, [lead.id]);

  const { data: matchedUnits, isLoading: loadingUnits } = useQuery<any[]>({
    queryKey: ["/api/leads", lead.id, "matched-units"],
    enabled: open && !!lead.id,
  });

  const qualifyMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/leads/${lead.id}/qualify`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "matched-units"] });
      toast({
        title: "Lead Qualified",
        description: "Lead qualification updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to qualify lead",
        variant: "destructive",
      });
    },
  });

  const handleQualify = () => {
    const locations = targetLocations
      .split(",")
      .map((loc) => loc.trim())
      .filter((loc) => loc.length > 0);

    qualifyMutation.mutate({
      targetPriceMin: targetPriceMin ? Number(targetPriceMin) : undefined,
      targetPriceMax: targetPriceMax ? Number(targetPriceMax) : undefined,
      targetLocations: locations.length > 0 ? locations : undefined,
      timeFrameToBuy: timeFrameToBuy || undefined,
      pipelineStage: pipelineStage || undefined,
      leadScore: 50,
      agentId: lead.agentId || "agent-001",
    });
  };

  const isQualified = !!(lead.targetPriceMin || lead.targetPriceMax || lead.targetLocations?.length || lead.timeFrameToBuy);
  const hasPrice = !!(lead.targetPriceMin || lead.targetPriceMax);
  const hasLocations = !!(lead.targetLocations?.length);
  const hasTimeframe = !!lead.timeFrameToBuy;
  const hasPipelineStage = !!lead.pipelineStage && lead.pipelineStage !== 'new';

  const agentNames: Record<string, string> = {
    'agent-001': 'Sarah Chen',
    'agent-002': 'Michael Rodriguez',
    'agent-003': 'Emily Park',
    'agent-004': 'David Thompson',
    'agent-005': 'Jessica Williams',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto" data-testid="sheet-lead-qualification">
        <SheetHeader>
          <SheetTitle className="text-xl font-black uppercase tracking-tight">
            {isQualified ? 'Update Lead Qualification' : 'Qualify Lead'}
          </SheetTitle>
          <SheetDescription>
            {lead.name} • {lead.email}
          </SheetDescription>
        </SheetHeader>

        <div className={`mt-4 p-3 rounded-md border-l-4 ${isQualified ? 'bg-green-50 border-green-500 dark:bg-green-950/20' : 'bg-amber-50 border-amber-500 dark:bg-amber-950/20'}`} data-testid="banner-qualification-status">
          <div className="flex items-start gap-2">
            {isQualified ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-bold text-sm ${isQualified ? 'text-green-900 dark:text-green-100' : 'text-amber-900 dark:text-amber-100'}`}>
                {isQualified ? 'Lead Qualified' : 'Needs Qualification'}
              </p>
              <p className={`text-xs ${isQualified ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {isQualified 
                  ? `Last updated ${formatDistanceToNow(new Date(lead.updatedAt))} ago${lead.agentId ? ` by ${agentNames[lead.agentId] || lead.agentId}` : ''}`
                  : 'Complete qualification fields to match with available units'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price-min" className="text-sm font-bold uppercase flex items-center gap-2">
                <DollarSign className="inline h-4 w-4" />
                Budget Range
                {hasPrice && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" data-testid="indicator-price-filled" />}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="price-min"
                  type="number"
                  placeholder="Min Price"
                  value={targetPriceMin}
                  onChange={(e) => setTargetPriceMin(e.target.value)}
                  data-testid="input-price-min"
                />
                <Input
                  id="price-max"
                  type="number"
                  placeholder="Max Price"
                  value={targetPriceMax}
                  onChange={(e) => setTargetPriceMax(e.target.value)}
                  data-testid="input-price-max"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locations" className="text-sm font-bold uppercase flex items-center gap-2">
                <MapPin className="inline h-4 w-4" />
                Target Locations
                {hasLocations && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" data-testid="indicator-locations-filled" />}
              </Label>
              <Input
                id="locations"
                type="text"
                placeholder="e.g., Brooklyn, Manhattan, Queens"
                value={targetLocations}
                onChange={(e) => setTargetLocations(e.target.value)}
                data-testid="input-target-locations"
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple locations with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe" className="text-sm font-bold uppercase flex items-center gap-2">
                <Calendar className="inline h-4 w-4" />
                Timeframe to Buy
                {hasTimeframe && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" data-testid="indicator-timeframe-filled" />}
              </Label>
              <Select
                value={timeFrameToBuy}
                onValueChange={setTimeFrameToBuy}
              >
                <SelectTrigger data-testid="select-timeframe">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate (0-30 days)</SelectItem>
                  <SelectItem value="short-term">Short Term (1-3 months)</SelectItem>
                  <SelectItem value="medium-term">Medium Term (3-6 months)</SelectItem>
                  <SelectItem value="long-term">Long Term (6+ months)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pipeline-stage" className="text-sm font-bold uppercase flex items-center gap-2">
                <TrendingUp className="inline h-4 w-4" />
                Pipeline Stage
                {hasPipelineStage && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" data-testid="indicator-pipeline-filled" />}
              </Label>
              <Select
                value={pipelineStage}
                onValueChange={setPipelineStage}
              >
                <SelectTrigger data-testid="select-pipeline-stage">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="closed won">Closed Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingUnits ? (
            <div className="p-4 border rounded-md">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading matched units...
              </div>
            </div>
          ) : matchedUnits && matchedUnits.length > 0 ? (
            <div className="p-4 border rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold uppercase">Matched Units</p>
                <Badge variant="secondary" data-testid="badge-matched-units-count">
                  {matchedUnits.length} Units
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Based on budget and location preferences
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMatchedUnitsDrawerOpen(true)}
                className="w-full"
                data-testid="button-view-matched-units"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Matched Units
              </Button>
            </div>
          ) : null}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleQualify}
              disabled={qualifyMutation.isPending}
              className="flex-1"
              data-testid="button-qualify-lead"
            >
              {qualifyMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isQualified ? 'Update Qualification' : 'Qualify Lead'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-qualify"
            >
              Cancel
            </Button>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Tasks
            </h3>
            <TasksPanel leadId={lead.id} />
          </div>
        </div>
      </SheetContent>

      <MatchedUnitsDrawer
        lead={lead}
        open={matchedUnitsDrawerOpen}
        onOpenChange={setMatchedUnitsDrawerOpen}
      />
    </Sheet>
  );
}
