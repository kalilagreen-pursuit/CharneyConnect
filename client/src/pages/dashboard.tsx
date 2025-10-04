import { useQuery } from "@tanstack/react-query";
import { Unit, UnitStatus } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Bed, Bath, Maximize } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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

function UnitCard({ unit }: { unit: Unit }) {
  const config = statusConfig[unit.status];
  
  return (
    <Card 
      className="hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer" 
      data-testid={`card-unit-${unit.id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold" data-testid={`text-unit-number-${unit.id}`}>
          Unit {unit.unitNumber}
        </CardTitle>
        <Badge className={`${config.bgColor} ${config.color} border-2`} data-testid={`badge-status-${unit.id}`}>
          {config.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-mono font-bold" data-testid={`text-price-${unit.id}`}>
          {formatCurrency(unit.price)}
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span data-testid={`text-building-${unit.id}`}>
              {unit.building}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span data-testid={`text-floor-${unit.id}`}>
              Floor {unit.floor}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="flex flex-col items-center gap-1">
            <Bed className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium" data-testid={`text-bedrooms-${unit.id}`}>
              {unit.bedrooms} BD
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Bath className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium" data-testid={`text-bathrooms-${unit.id}`}>
              {unit.bathrooms} BA
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Maximize className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium" data-testid={`text-sqft-${unit.id}`}>
              {unit.squareFeet.toLocaleString()} SF
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UnitCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-20" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ title, value, trend }: { title: string; value: string | number; trend?: string }) {
  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`text-stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: units, isLoading } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const stats = units ? {
    total: units.length,
    available: units.filter(u => u.status === "available").length,
    onHold: units.filter(u => u.status === "on_hold").length,
    contract: units.filter(u => u.status === "contract").length,
    sold: units.filter(u => u.status === "sold").length,
    totalValue: units.reduce((sum, u) => sum + u.price, 0),
  } : null;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            Unit Map
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time inventory tracking and status management
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {isLoading ? (
              <>
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="space-y-0 pb-2">
                      <Skeleton className="h-4 w-20" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : stats ? (
              <>
                <StatCard title="Total Units" value={stats.total} />
                <StatCard title="Available" value={stats.available} />
                <StatCard title="On Hold" value={stats.onHold} />
                <StatCard title="Contract" value={stats.contract} />
                <StatCard title="Sold" value={stats.sold} />
                <StatCard title="Total Value" value={formatCurrency(stats.totalValue)} />
              </>
            ) : null}
          </div>

          {/* Units Grid */}
          <div>
            <h2 className="text-lg font-semibold mb-4" data-testid="text-units-section-title">
              All Units
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <UnitCardSkeleton key={i} />
                ))}
              </div>
            ) : units && units.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="grid-units">
                {units.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} />
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-3">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold" data-testid="text-empty-state-title">
                    No Units Available
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    There are currently no units in the system. Units will appear here once they are added to the inventory.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
