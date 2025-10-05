import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { UnitWithDetails } from "@shared/schema";

interface InteractiveMapProps {
  unitsData: UnitWithDetails[];
  selectedUnitId: string | null;
  setSelectedUnitId: (unitId: string) => void;
}

export function InteractiveMap({
  unitsData,
  selectedUnitId,
  setSelectedUnitId,
}: InteractiveMapProps) {
  
  useEffect(() => {
    console.log('[InteractiveMap] Map initialized with', unitsData.length, 'units');
  }, [unitsData.length]);

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600';
      case 'on_hold':
        return 'bg-amber-500 hover:bg-amber-600';
      case 'contract':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'sold':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const unitsByFloor = useMemo(() => {
    const floors = new Map<number, UnitWithDetails[]>();
    unitsData.forEach(unit => {
      if (!floors.has(unit.floor)) {
        floors.set(unit.floor, []);
      }
      floors.get(unit.floor)!.push(unit);
    });
    return Array.from(floors.entries()).sort((a, b) => b[0] - a[0]);
  }, [unitsData]);

  const handleBlockClick = (unitId: string) => {
    setSelectedUnitId(unitId);
  };

  return (
    <div className="space-y-4">
      {unitsByFloor.map(([floor, floorUnits]) => (
        <div key={floor} className="space-y-2">
          <div className="text-sm font-bold uppercase text-muted-foreground">
            Floor {floor}
          </div>
          <div className="flex flex-wrap gap-2">
            {floorUnits.map((unit) => (
              <button
                key={unit.id}
                data-testid={`map-block-${unit.unitNumber}`}
                onClick={() => handleBlockClick(unit.id)}
                className={cn(
                  "relative w-20 h-20 rounded-md transition-all duration-200",
                  "flex flex-col items-center justify-center",
                  "text-white font-bold text-sm",
                  getStatusColor(unit.status),
                  selectedUnitId === unit.id && "ring-4 ring-primary ring-offset-2 scale-105"
                )}
              >
                <span className="text-xs opacity-90">{unit.building}</span>
                <span>{unit.unitNumber}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
