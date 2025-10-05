import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Mail, Phone, Building2, DollarSign } from "lucide-react";
import { UnitWithDetails } from "@shared/schema";
import { useRealtime } from "@/contexts/RealtimeContext";
import { queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

type LeadStatus = "available" | "on_hold" | "contract" | "sold";

const statusConfig: Record<LeadStatus, { label: string; bgColor: string; color: string }> = {
  available: {
    label: "Available",
    bgColor: "bg-status-available/10 border-status-available",
    color: "text-status-available",
  },
  on_hold: {
    label: "On Hold",
    bgColor: "bg-status-on-hold/10 border-status-on-hold",
    color: "text-status-on-hold",
  },
  contract: {
    label: "Contract",
    bgColor: "bg-status-contract/10 border-status-contract",
    color: "text-status-contract",
  },
  sold: {
    label: "Sold",
    bgColor: "bg-status-sold/10 border-status-sold",
    color: "text-status-sold",
  },
};

export default function ManagerView() {
  const [, setLocation] = useLocation();
  const [actionId] = useState(() => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const { unitUpdates, clearUnitUpdates } = useRealtime();

  console.log(`[${actionId}] Manager View initialized`);

  const { data: units, isLoading } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
  });

  // Listen for realtime updates and invalidate cache
  useEffect(() => {
    if (unitUpdates.size > 0) {
      console.log(`[${actionId}] Received ${unitUpdates.size} realtime unit updates - refreshing Kanban`);
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      clearUnitUpdates();
    }
  }, [unitUpdates, actionId, clearUnitUpdates]);

  const groupedUnits = {
    available: units?.filter((u) => u.status === "available") || [],
    on_hold: units?.filter((u) => u.status === "on_hold") || [],
    contract: units?.filter((u) => u.status === "contract") || [],
    sold: units?.filter((u) => u.status === "sold") || [],
  };

  const handleBack = () => {
    console.log(`[${actionId}] Navigating back to home`);
    setLocation("/");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl font-black uppercase tracking-tight" data-testid="text-manager-title">
                  Manager Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time unit pipeline
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" data-testid="badge-total-units">
                {units?.length || 0} Total Units
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading pipeline...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
            {(Object.keys(statusConfig) as LeadStatus[]).map((status) => {
              const config = statusConfig[status];
              const columnUnits = groupedUnits[status];

              return (
                <div key={status} className="flex flex-col gap-4 min-h-0">
                  {/* Column Header */}
                  <Card className={`${config.bgColor} border-2 flex-shrink-0`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-black uppercase tracking-tight ${config.color}`}>
                          {config.label}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="ml-2"
                          data-testid={`badge-count-${status}`}
                        >
                          {columnUnits.length}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Cards */}
                  <div className="space-y-3 overflow-auto flex-1" data-testid={`column-${status}`}>
                    {columnUnits.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                          No units
                        </CardContent>
                      </Card>
                    ) : (
                      columnUnits.map((unit) => {
                        const price = typeof unit.price === 'string' ? parseFloat(unit.price) : unit.price;
                        return (
                          <Card
                            key={unit.id}
                            className="hover-elevate transition-all"
                            data-testid={`card-unit-${unit.unitNumber}`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-bold text-lg">
                                    Unit {unit.unitNumber}
                                  </h4>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Building2 className="h-3 w-3" />
                                    <span>{unit.building} · Floor {unit.floor}</span>
                                  </div>
                                </div>
                                <Badge className={`${config.bgColor} ${config.color} border`}>
                                  {config.label}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono font-semibold">
                                  {formatCurrency(price)}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {unit.bedrooms} BD · {unit.bathrooms} BA · {unit.squareFeet.toLocaleString()} SF
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
