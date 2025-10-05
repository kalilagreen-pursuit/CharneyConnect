import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Bed, Bath, Maximize, Home, UserPlus, Calendar, Sparkles, Eye, Lock } from "lucide-react";
import { UnitWithDetails, UnitStatus } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { ProspectQuickAddForm } from "@/components/prospect-quick-add-form";
import { LogShowingForm } from "@/components/log-showing-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<UnitStatus, { label: string; color: string; bgColor: string }> = {
  available: { 
    label: "Available", 
    color: "text-white dark:text-white", 
    bgColor: "bg-status-available border-status-available" 
  },
  on_hold: { 
    label: "On Hold", 
    color: "text-gray-900 dark:text-gray-900", 
    bgColor: "bg-status-on-hold border-status-on-hold" 
  },
  contract: { 
    label: "Contract", 
    color: "text-white dark:text-white", 
    bgColor: "bg-status-contract border-status-contract" 
  },
  sold: { 
    label: "Sold", 
    color: "text-white dark:text-white", 
    bgColor: "bg-status-sold border-status-sold" 
  },
};

interface UnitSheetDrawerProps {
  unit: UnitWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onLogShowing: () => void;
  agentName?: string;
}

export function UnitSheetDrawer({ unit, isOpen, onClose, onLogShowing, agentName }: UnitSheetDrawerProps) {
  const [actionId] = useState(() => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [showProspectForm, setShowProspectForm] = useState(false);
  const [showLogShowingForm, setShowLogShowingForm] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const { toast } = useToast();
  
  if (!unit) return null;
  
  const config = statusConfig[unit.status as UnitStatus] || statusConfig.available;
  const price = typeof unit.price === 'string' ? parseFloat(unit.price) : unit.price;

  // Next Best Action logic - will be enhanced in later tasks
  const getNextBestAction = () => {
    console.log(`[${actionId}] Computing Next Best Action for Unit ${unit.unitNumber}`);
    
    if (unit.status === 'available') {
      return {
        label: 'Schedule Showing',
        icon: Calendar,
        variant: 'default' as const,
        action: handleLogShowing
      };
    } else if (unit.status === 'on_hold') {
      return {
        label: 'Follow Up on Hold',
        icon: Sparkles,
        variant: 'secondary' as const,
        action: () => console.log(`[${actionId}] Follow up on hold`)
      };
    }
    return null;
  };

  const nextAction = getNextBestAction();

  const handleAddProspect = () => {
    console.log(`[${actionId}] Opening Quick-Add Prospect form for Unit ${unit.unitNumber}`);
    setShowProspectForm(true);
  };

  const handleLogShowing = () => {
    console.log(`[${actionId}] Opening Log Showing form for Unit ${unit.unitNumber}`);
    setShowLogShowingForm(true);
  };

  const handleHoldUnit = async () => {
    console.log(`[${actionId}] Placing hold on Unit ${unit.unitNumber}`);
    setIsHolding(true);

    try {
      await apiRequest(`/api/units/${unit.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'on_hold' }),
        headers: { 'Content-Type': 'application/json' },
      });

      toast({
        title: "Unit Held",
        description: `Unit ${unit.unitNumber} has been placed on hold.`,
        duration: 3000,
      });

      console.log(`[${actionId}] Unit ${unit.unitNumber} status updated to on_hold`);
    } catch (error) {
      console.error(`[${actionId}] Error holding unit:`, error);
      toast({
        title: "Error",
        description: "Failed to hold unit. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsHolding(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md overflow-y-auto"
        data-testid="drawer-unit-sheet"
      >
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <SheetTitle 
                className="text-2xl font-black uppercase tracking-tight"
                data-testid="text-unit-sheet-title"
              >
                Unit {unit.unitNumber}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground" data-testid="text-unit-building">
                  {unit.building} · Floor {unit.floor}
                </span>
              </div>
            </div>
            <Badge 
              className={`${config.bgColor} ${config.color} border-2`}
              data-testid="badge-unit-status"
            >
              {config.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Price Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                  Asking Price
                </span>
              </div>
              <div 
                className="text-3xl font-mono font-bold mt-1"
                data-testid="text-unit-price"
              >
                {formatCurrency(price)}
              </div>
            </CardContent>
          </Card>

          {/* Unit Details */}
          <div className="space-y-3">
            <h3 className="font-black uppercase tracking-tight text-sm text-muted-foreground">
              Unit Details
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-6 text-center space-y-2">
                  <Bed className="h-5 w-5 mx-auto text-muted-foreground" />
                  <div className="font-bold" data-testid="text-unit-bedrooms">
                    {unit.bedrooms}
                  </div>
                  <div className="text-xs text-muted-foreground">Bedroom{unit.bedrooms !== 1 ? 's' : ''}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center space-y-2">
                  <Bath className="h-5 w-5 mx-auto text-muted-foreground" />
                  <div className="font-bold" data-testid="text-unit-bathrooms">
                    {unit.bathrooms}
                  </div>
                  <div className="text-xs text-muted-foreground">Bath{unit.bathrooms !== 1 ? 's' : ''}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center space-y-2">
                  <Maximize className="h-5 w-5 mx-auto text-muted-foreground" />
                  <div className="font-bold" data-testid="text-unit-sqft">
                    {unit.squareFeet.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Sq. Ft.</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Floor Plan Info */}
          {unit.floorPlan && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-black uppercase tracking-tight text-sm text-muted-foreground">
                  Floor Plan
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-bold" data-testid="text-floorplan-name">
                          {unit.floorPlan.planName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {unit.bedrooms} BD · {unit.bathrooms} BA · {unit.squareFeet.toLocaleString()} SF
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Next Best Action */}
          {nextAction && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-black uppercase tracking-tight text-sm text-muted-foreground">
                    Next Best Action
                  </h3>
                </div>
                <Button
                  variant={nextAction.variant}
                  className="w-full gap-2 min-h-11"
                  onClick={nextAction.action}
                  data-testid="button-next-best-action"
                >
                  <nextAction.icon className="h-4 w-4" />
                  {nextAction.label}
                </Button>
              </div>
            </>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            {unit.status === 'available' && (
              <Button
                variant="default"
                size="lg"
                className="w-full gap-2 min-h-11 bg-status-on-hold hover:bg-status-on-hold/90 text-gray-900 border-2 border-status-on-hold"
                onClick={handleHoldUnit}
                disabled={isHolding}
                data-testid="button-hold-unit"
              >
                <Lock className="h-4 w-4" />
                {isHolding ? 'Holding Unit...' : 'Hold Unit'}
              </Button>
            )}
            
            <Button
              variant="default"
              size="lg"
              className="w-full gap-2 min-h-11"
              onClick={handleAddProspect}
              data-testid="button-add-prospect"
            >
              <UserPlus className="h-4 w-4" />
              Quick-Add Prospect
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2 min-h-11"
              onClick={handleLogShowing}
              data-testid="button-log-showing"
            >
              <Eye className="h-4 w-4" />
              Log Showing
            </Button>
          </div>

          {/* Notes */}
          {unit.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-black uppercase tracking-tight text-sm text-muted-foreground">
                  Notes
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground" data-testid="text-unit-notes">
                      {unit.notes}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </SheetContent>

      {/* Prospect Quick-Add Form */}
      <ProspectQuickAddForm
        isOpen={showProspectForm}
        onClose={() => {
          console.log(`[${actionId}] Prospect form closed`);
          setShowProspectForm(false);
        }}
        unitId={unit.id}
        unitNumber={unit.unitNumber}
        agentName={agentName}
      />

      {/* Log Showing Form */}
      <LogShowingForm
        isOpen={showLogShowingForm}
        onClose={() => {
          console.log(`[${actionId}] Log Showing form closed`);
          setShowLogShowingForm(false);
        }}
        unitId={unit.id}
        unitNumber={unit.unitNumber}
        agentName={agentName}
      />
    </Sheet>
  );
}
