import { useQuery } from "@tanstack/react-query";
import { Unit, UnitStatus } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Building2, Bed, Bath, Maximize, SlidersHorizontal, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";

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
        <CardTitle className="text-lg font-black uppercase tracking-tight" data-testid={`text-unit-number-${unit.id}`}>
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
        <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
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

  const [showFilters, setShowFilters] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>("all");
  const [selectedBathrooms, setSelectedBathrooms] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000000]);
  const [sqftRange, setSqftRange] = useState<[number, number]>([0, 3000]);

  const { buildings, bedroomOptions, bathroomOptions, minPrice, maxPrice, minSqft, maxSqft } = useMemo(() => {
    if (!units) return {
      buildings: [],
      bedroomOptions: [],
      bathroomOptions: [],
      minPrice: 0,
      maxPrice: 2000000,
      minSqft: 0,
      maxSqft: 3000
    };

    const buildingSet = new Set(units.map(u => u.building));
    const bedroomSet = new Set(units.map(u => u.bedrooms));
    const bathroomSet = new Set(units.map(u => u.bathrooms));
    
    return {
      buildings: Array.from(buildingSet).sort(),
      bedroomOptions: Array.from(bedroomSet).sort((a, b) => a - b),
      bathroomOptions: Array.from(bathroomSet).sort((a, b) => a - b),
      minPrice: Math.min(...units.map(u => u.price)),
      maxPrice: Math.max(...units.map(u => u.price)),
      minSqft: Math.min(...units.map(u => u.squareFeet)),
      maxSqft: Math.max(...units.map(u => u.squareFeet))
    };
  }, [units]);

  const filteredUnits = useMemo(() => {
    if (!units) return [];

    return units.filter(unit => {
      if (selectedBuilding !== "all" && unit.building !== selectedBuilding) return false;
      if (selectedBedrooms !== "all" && unit.bedrooms !== parseInt(selectedBedrooms)) return false;
      if (selectedBathrooms !== "all" && unit.bathrooms !== parseInt(selectedBathrooms)) return false;
      if (unit.price < priceRange[0] || unit.price > priceRange[1]) return false;
      if (unit.squareFeet < sqftRange[0] || unit.squareFeet > sqftRange[1]) return false;
      return true;
    });
  }, [units, selectedBuilding, selectedBedrooms, selectedBathrooms, priceRange, sqftRange]);

  const stats = filteredUnits ? {
    total: filteredUnits.length,
    available: filteredUnits.filter(u => u.status === "available").length,
    onHold: filteredUnits.filter(u => u.status === "on_hold").length,
    contract: filteredUnits.filter(u => u.status === "contract").length,
    sold: filteredUnits.filter(u => u.status === "sold").length,
    totalValue: filteredUnits.reduce((sum, u) => sum + u.price, 0),
  } : null;

  const hasActiveFilters = selectedBuilding !== "all" || 
    selectedBedrooms !== "all" || 
    selectedBathrooms !== "all" ||
    priceRange[0] !== minPrice ||
    priceRange[1] !== maxPrice ||
    sqftRange[0] !== minSqft ||
    sqftRange[1] !== maxSqft;

  const clearFilters = () => {
    setSelectedBuilding("all");
    setSelectedBedrooms("all");
    setSelectedBathrooms("all");
    setPriceRange([minPrice, maxPrice]);
    setSqftRange([minSqft, maxSqft]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight" data-testid="text-page-title">
                Unit <span className="text-primary">Map</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time inventory tracking and status management
              </p>
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="default"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  !
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="border-t bg-muted/30" data-testid="panel-filters">
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase tracking-tight text-sm">Filter Units</h3>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2"
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4" />
                    Clear All
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Building/Tower Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="filter-building">
                    Building/Tower
                  </label>
                  <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                    <SelectTrigger id="filter-building" data-testid="select-building" className="min-h-11">
                      <SelectValue placeholder="All Buildings" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buildings</SelectItem>
                      {buildings.map(building => (
                        <SelectItem key={building} value={building}>
                          {building}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bedrooms Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="filter-bedrooms">
                    Bedrooms
                  </label>
                  <Select value={selectedBedrooms} onValueChange={setSelectedBedrooms}>
                    <SelectTrigger id="filter-bedrooms" data-testid="select-bedrooms" className="min-h-11">
                      <SelectValue placeholder="All Bedrooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Bedrooms</SelectItem>
                      {bedroomOptions.map(beds => (
                        <SelectItem key={beds} value={beds.toString()}>
                          {beds} Bedroom{beds !== 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bathrooms Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="filter-bathrooms">
                    Bathrooms
                  </label>
                  <Select value={selectedBathrooms} onValueChange={setSelectedBathrooms}>
                    <SelectTrigger id="filter-bathrooms" data-testid="select-bathrooms" className="min-h-11">
                      <SelectValue placeholder="All Bathrooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Bathrooms</SelectItem>
                      {bathroomOptions.map(baths => (
                        <SelectItem key={baths} value={baths.toString()}>
                          {baths} Bathroom{baths !== 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Price Range Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Price Range</label>
                    <span className="text-sm text-muted-foreground" data-testid="text-price-range">
                      {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
                    </span>
                  </div>
                  <div className="min-h-11 flex items-center" data-testid="slider-price">
                    <Slider
                      min={minPrice}
                      max={maxPrice}
                      step={50000}
                      value={priceRange}
                      onValueChange={(value) => setPriceRange(value as [number, number])}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Square Footage Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Square Footage</label>
                    <span className="text-sm text-muted-foreground" data-testid="text-sqft-range">
                      {sqftRange[0].toLocaleString()} - {sqftRange[1].toLocaleString()} SF
                    </span>
                  </div>
                  <div className="min-h-11 flex items-center" data-testid="slider-sqft">
                    <Slider
                      min={minSqft}
                      max={maxSqft}
                      step={50}
                      value={sqftRange}
                      onValueChange={(value) => setSqftRange(value as [number, number])}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase tracking-tight" data-testid="text-units-section-title">
                {hasActiveFilters ? 'Filtered Units' : 'All Units'}
              </h2>
              {hasActiveFilters && (
                <span className="text-sm text-muted-foreground" data-testid="text-filter-count">
                  Showing {filteredUnits.length} of {units?.length || 0} units
                </span>
              )}
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <UnitCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredUnits && filteredUnits.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="grid-units">
                {filteredUnits.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} />
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-3">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-black uppercase tracking-tight" data-testid="text-empty-state-title">
                    {hasActiveFilters ? 'No Units Match Your Filters' : 'No Units Available'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {hasActiveFilters 
                      ? 'Try adjusting your filter criteria to see more results.'
                      : 'There are currently no units in the system. Units will appear here once they are added to the inventory.'
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="mt-4"
                      data-testid="button-clear-filters-empty"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
