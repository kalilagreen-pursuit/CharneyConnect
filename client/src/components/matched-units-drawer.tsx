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
import { Building2, Bed, Bath, Ruler, DollarSign, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
  const { data: matchedUnits, isLoading } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/leads", lead.id, "matched-units"],
    enabled: open && !!lead.id,
  });

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

  function getMatchBadgeVariant(score: number): "default" | "secondary" | "outline" {
    if (score >= 90) return "default";
    if (score >= 70) return "default";
    if (score >= 50) return "secondary";
    return "outline";
  }

  function getMatchScoreColor(score: number): string {
    if (score >= 90) return "text-status-available"; // Charney Green
    if (score >= 70) return "text-status-contract"; // Charney Blue
    if (score >= 50) return "text-status-on-hold"; // Charney Amber
    return "text-muted-foreground";
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleUnitClick = (unit: UnitWithDetails) => {
    // Navigate to 3D viewer with lead context
    const params = new URLSearchParams({
      projectId: unit.projectId || "",
      unitNumber: unit.unitNumber,
      leadId: lead.id,
    });
    setLocation(`/agent/viewer?${params.toString()}`);
    onOpenChange(false);
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
              <SheetDescription className="mt-2">
                Units matching {lead.name}'s criteria
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid="button-edit-lead-from-drawer"
              className="uppercase"
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
    </Sheet>
  );
}