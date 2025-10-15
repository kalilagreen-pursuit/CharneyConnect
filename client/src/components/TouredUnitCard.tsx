
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Square, Eye, ExternalLink } from "lucide-react";
import type { UnitWithDetails, TouredUnit } from "@shared/schema";

interface TouredUnitCardProps {
  unit: UnitWithDetails;
  touredUnit: TouredUnit;
}

export function TouredUnitCard({ unit, touredUnit }: TouredUnitCardProps) {
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

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-2">
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
          <Badge className={getStatusColor(unit.status)}>
            {unit.status.replace("_", " ").toUpperCase()}
          </Badge>
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

        {/* Actions */}
        <div className="pt-4 border-t flex gap-2">
          <Button variant="outline" className="flex-1" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
