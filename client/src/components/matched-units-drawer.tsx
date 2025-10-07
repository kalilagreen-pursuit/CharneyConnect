import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Lead, UnitWithDetails } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Bed, Bath, Ruler, DollarSign, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { agentContextStore } from "@/lib/localStores";
import { LeadQualificationSheet } from "./lead-qualification-sheet";

interface MatchedUnitsDrawerProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchedUnitsDrawer({
  lead,
  open,
  onOpenChange,
}: MatchedUnitsDrawerProps) {
  const [, setLocation] = useLocation();
  const [showQualificationSheet, setShowQualificationSheet] = useState(false);
  
  const { data: matchedUnits, isLoading } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/leads", lead.id, "matched-units"],
    enabled: open && !!lead.id,
  });

  const handleUnitClick = (unit: UnitWithDetails) => {
    // Get project info
    const projectId = unit.projectId || unit.project?.id;
    const projectName = unit.building; // building name serves as project name
    
    // Project name mapping
    const projectNames: Record<string, string> = {
      '2320eeb4-596b-437d-b4cb-830bdb3c3b01': 'THE JACKSON',
      'f3ae960d-a0a9-4449-82fe-ffab7b01f3fa': 'THE DIME',
      '6f9a358c-0fc6-41bd-bd5e-6234b68295cb': 'GOWANUS',
    };
    
    // Store agent and project context
    if (lead.agentId) {
      const agentNames: Record<string, string> = {
        'agent-001': 'Sarah Chen',
        'agent-002': 'Michael Rodriguez',
        'agent-003': 'Emily Park',
        'agent-004': 'David Thompson',
        'agent-005': 'Jessica Williams',
      };
      agentContextStore.setAgent(lead.agentId, agentNames[lead.agentId] || lead.agentId);
    }
    
    if (projectId) {
      const displayName = projectId ? projectNames[projectId] || projectName : projectName;
      agentContextStore.setProject(projectId, displayName);
    }
    
    // Navigate to agent viewer with lead context in URL
    const params = new URLSearchParams({
      projectId: projectId || '',
      unitNumber: unit.unitNumber,
      leadId: lead.id,
      ...(lead.agentId && { agentId: lead.agentId }),
    });
    setLocation(`/agent/viewer?${params.toString()}`);
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "bg-status-available";
      case "on hold":
        return "bg-status-on-hold";
      case "contract":
        return "bg-status-contract";
      case "sold":
        return "bg-status-sold";
      default:
        return "bg-muted";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="uppercase tracking-wide text-xl">
                MATCHED UNITS
              </SheetTitle>
              <SheetDescription>
                Units matching {lead.name}'s criteria
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQualificationSheet(true)}
              data-testid="button-edit-lead-drawer"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Lead
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : matchedUnits && matchedUnits.length > 0 ? (
            matchedUnits.map((unit) => (
              <Card
                key={unit.id}
                className="p-4 hover-elevate cursor-pointer"
                onClick={() => handleUnitClick(unit)}
                data-testid={`card-matched-unit-${unit.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3
                      className="text-lg font-bold uppercase tracking-tight"
                      data-testid={`text-unit-number-${unit.id}`}
                    >
                      UNIT {unit.unitNumber}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Building2 className="h-3 w-3" />
                      {unit.building}
                    </p>
                  </div>
                  <Badge
                    className={`${getStatusColor(unit.status)} text-white dark:text-white`}
                    data-testid={`badge-status-${unit.id}`}
                  >
                    {unit.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span
                      className="font-bold"
                      data-testid={`text-price-${unit.id}`}
                    >
                      {formatPrice(Number(unit.price))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span data-testid={`text-sqft-${unit.id}`}>
                      {unit.squareFeet.toLocaleString()} sq ft
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <span data-testid={`text-bedrooms-${unit.id}`}>
                      {unit.bedrooms} {unit.bedrooms === 1 ? "Bed" : "Beds"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <span data-testid={`text-bathrooms-${unit.id}`}>
                      {unit.bathrooms} {unit.bathrooms === 1 ? "Bath" : "Baths"}
                    </span>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p data-testid="text-no-matches">
                No matching units found for the current criteria.
              </p>
              <p className="text-sm mt-2">
                Try adjusting the budget or location preferences.
              </p>
            </div>
          )}
        </div>
      </SheetContent>

      <LeadQualificationSheet
        lead={lead}
        open={showQualificationSheet}
        onOpenChange={setShowQualificationSheet}
      />
    </Sheet>
  );
}
