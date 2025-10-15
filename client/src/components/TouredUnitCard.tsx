
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bed, Bath, Square, Eye, ExternalLink } from "lucide-react";
import type { UnitWithDetails, TouredUnit } from "@shared/schema";

interface TouredUnitCardProps {
  unit: UnitWithDetails;
  touredUnit: TouredUnit;
  onCardClick?: (unitId: string) => void;
}

export function TouredUnitCard({ unit, touredUnit, onCardClick }: TouredUnitCardProps) {
  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(numPrice)) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-status-available text-black";
      case "on_hold":
        return "bg-status-on-hold text-black";
      case "contract":
        return "bg-status-contract text-white";
      case "sold":
        return "bg-status-sold text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(unit.id);
    }
  };

  return (
    <Card 
      className="hover:shadow-xl transition-all duration-300 border-2 cursor-pointer overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Unit Image/Placeholder */}
      <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
        <div className="text-6xl font-black text-gray-400 opacity-50">
          {unit.unitNumber}
        </div>
        <Badge className={`absolute top-3 right-3 ${getStatusColor(unit.status)}`}>
          {unit.status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl font-black uppercase tracking-tight">
              Unit {unit.unitNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {unit.building}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-black text-primary">
            {formatPrice(unit.price)}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Unit Details */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Bed className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{unit.bedrooms} BD</span>
          </div>
          <div className="flex items-center gap-2">
            <Bath className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{unit.bathrooms} BA</span>
          </div>
          <div className="flex items-center gap-2">
            <Square className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{unit.squareFeet?.toLocaleString()} SF</span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Floor:</span>
            <span className="font-medium">{unit.floor}</span>
          </div>
          {unit.views && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Views:</span>
              <span className="font-medium">{unit.views}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Added to tour:</span>
            <span className="font-medium">
              {new Date(touredUnit.viewedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Agent Notes Placeholder */}
        <div className="pt-4 border-t">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Agent Notes
          </label>
          <Textarea
            placeholder="Add notes about this unit for the client..."
            className="min-h-[80px] resize-none"
            onClick={(e) => e.stopPropagation()}
            disabled
          />
          <p className="text-xs text-muted-foreground mt-1">
            Notes feature coming in C4
          </p>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
