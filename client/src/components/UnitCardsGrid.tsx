
import { TouredUnitCard } from "@/components/TouredUnitCard";
import type { TouredUnit, UnitWithDetails } from "@shared/schema";

interface UnitCardsGridProps {
  touredUnits: TouredUnit[];
  availableUnits: UnitWithDetails[];
}

export function UnitCardsGrid({ touredUnits, availableUnits }: UnitCardsGridProps) {
  // Map toured units to their full unit details
  const unitsWithDetails = touredUnits.map(touredUnit => {
    const unitDetails = availableUnits.find(u => u.id === touredUnit.unitId);
    return {
      touredUnit,
      unitDetails,
    };
  }).filter(item => item.unitDetails); // Only show units with complete details

  if (unitsWithDetails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="w-24 h-24 mx-auto bg-muted rounded-lg flex items-center justify-center">
            <div className="text-4xl font-black text-muted-foreground">📦</div>
          </div>
          <h3 className="text-2xl font-black uppercase text-muted-foreground">
            No Units to Display
          </h3>
          <p className="text-sm text-muted-foreground">
            Select units from the left sidebar to begin
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          Selected Units ({unitsWithDetails.length})
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and tour these units with your client
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {unitsWithDetails.map(({ touredUnit, unitDetails }) => (
          <TouredUnitCard
            key={touredUnit.id}
            unit={unitDetails!}
            touredUnit={touredUnit}
          />
        ))}
      </div>
    </div>
  );
}
