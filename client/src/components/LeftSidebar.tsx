
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, CheckSquare, Eye } from "lucide-react";
import { UnitCheckboxList } from "@/components/UnitCheckboxList";
import { TouredUnitChip } from "@/components/TouredUnitChip";
import type { Lead, UnitWithDetails } from "@shared/schema";

interface LeftSidebarProps {
  lead: Lead | null;
  availableUnits: UnitWithDetails[];
  touredUnits: any[];
  selectedUnitIds: string[];
  onToggleUnit: (unitId: string, isChecked: boolean) => void;
  onViewUnits: () => void;
}

export function LeftSidebar({
  lead,
  availableUnits,
  touredUnits,
  selectedUnitIds,
  onToggleUnit,
  onViewUnits,
}: LeftSidebarProps) {
  // Filter selected units for the toured section
  const selectedUnits = availableUnits.filter(unit => 
    selectedUnitIds.includes(unit.id)
  );
  
  const handleRemoveUnit = (unitId: string) => {
    onToggleUnit(unitId, false);
  };
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
        <UnitCheckboxList
          units={availableUnits}
          selectedUnitIds={selectedUnitIds}
          onUnitToggle={onToggleUnit}
        />
      </div>

      {/* Toured Units Section */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black uppercase tracking-tight">
              Selected for Tour
            </h3>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {selectedUnits.length > 0 ? (
              selectedUnits.map((unit) => (
                <TouredUnitChip
                  key={unit.id}
                  unit={unit}
                  onRemove={handleRemoveUnit}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No units selected yet
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* View Units Button */}
      <div className="p-4">
        <Button
          onClick={onViewUnits}
          disabled={selectedUnitIds.length === 0}
          className="w-full font-black uppercase"
          size="lg"
        >
          View Units ({selectedUnitIds.length})
        </Button>
      </div>
    </aside>
  );
}
