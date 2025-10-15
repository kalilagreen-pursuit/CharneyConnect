
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UnitWithDetails } from "@shared/schema";

interface TouredUnitChipProps {
  unit: UnitWithDetails;
  onRemove: (unitId: string) => void;
}

export function TouredUnitChip({ unit, onRemove }: TouredUnitChipProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-green-50 border-2 border-green-200 rounded-lg group hover:bg-green-100 transition-colors">
      <div className="flex-1">
        <p className="font-bold text-green-900">Unit {unit.unitNumber}</p>
        <p className="text-xs text-green-700">
          {unit.bedrooms} bed • {unit.bathrooms} bath
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-green-700 hover:text-red-600 hover:bg-red-50"
        onClick={() => onRemove(unit.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
