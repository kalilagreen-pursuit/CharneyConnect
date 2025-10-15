
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UnitWithDetails } from "@shared/schema";

interface UnitCheckboxListProps {
  units: UnitWithDetails[];
  selectedUnitIds: string[];
  onUnitToggle: (unitId: string, isChecked: boolean) => void;
}

const formatPrice = (price: number | null | undefined): string => {
  if (!price) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export function UnitCheckboxList({
  units,
  selectedUnitIds,
  onUnitToggle,
}: UnitCheckboxListProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-2">
        {units.length > 0 ? (
          units.map((unit) => {
            const isChecked = selectedUnitIds.includes(unit.id);
            
            return (
              <div
                key={unit.id}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`unit-${unit.id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => 
                    onUnitToggle(unit.id, checked === true)
                  }
                />
                <label
                  htmlFor={`unit-${unit.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">Unit {unit.unitNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {unit.bedrooms} bed • {unit.bathrooms} bath
                      </p>
                    </div>
                    <p className="text-sm font-bold text-primary">
                      {formatPrice(unit.price)}
                    </p>
                  </div>
                </label>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No units available
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
