
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, CheckSquare, Eye } from "lucide-react";
import type { Lead, UnitWithDetails } from "@shared/schema";

interface LeftSidebarProps {
  lead: Lead | null;
  availableUnits: UnitWithDetails[];
  touredUnits: any[];
  onToggleUnit?: (unitId: string) => void;
  onViewUnits?: () => void;
}

export function LeftSidebar({
  lead,
  availableUnits,
  touredUnits,
  onToggleUnit,
  onViewUnits,
}: LeftSidebarProps) {
  return (
    <aside className="w-80 h-full bg-card border-r border-border shadow-lg flex flex-col">
      {/* Client Info Card */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-black uppercase tracking-tight">
            Client Info
          </h3>
        </div>
        {lead ? (
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-bold text-lg">
                {lead.firstName} {lead.lastName}
              </p>
            </div>
            {lead.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{lead.email}</p>
              </div>
            )}
            {lead.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{lead.phone}</p>
              </div>
            )}
            {lead.preferences && (
              <div>
                <p className="text-sm text-muted-foreground">Preferences</p>
                <p className="text-sm">
                  {lead.preferences.min_beds && `${lead.preferences.min_beds}+ beds`}
                  {lead.preferences.min_beds && lead.preferences.min_baths && " • "}
                  {lead.preferences.min_baths && `${lead.preferences.min_baths}+ baths`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading client info...</p>
        )}
      </div>

      {/* Unit Checkbox List */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black uppercase tracking-tight">
              Available Units
            </h3>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {availableUnits.length > 0 ? (
              availableUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`unit-${unit.id}`}
                    onCheckedChange={() => onToggleUnit?.(unit.id)}
                  />
                  <label
                    htmlFor={`unit-${unit.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <p className="font-bold">Unit {unit.unitNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {unit.bedrooms} bed • {unit.bathrooms} bath
                    </p>
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No units available
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Toured Units Section */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black uppercase tracking-tight">
              Toured Units
            </h3>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {touredUnits.length > 0 ? (
              touredUnits.map((unit, index) => (
                <div
                  key={unit.id || index}
                  className="p-3 bg-green-50 border-2 border-green-200 rounded-lg"
                >
                  <p className="font-bold text-green-900">
                    Unit {unit.unitNumber || 'N/A'}
                  </p>
                  <p className="text-xs text-green-700">
                    {new Date(unit.viewedAt).toLocaleTimeString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No units toured yet
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* View Units Button */}
      <div className="p-4">
        <Button
          onClick={onViewUnits}
          className="w-full font-black uppercase"
          size="lg"
        >
          View Units
        </Button>
      </div>
    </aside>
  );
}
