import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, Building2, MapPin, DollarSign, Users } from "lucide-react";
import { LeadQualificationSheet } from "@/components/lead-qualification-sheet";

const leadStatusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-500 text-white dark:text-white border-blue-500" },
  contacted: { label: "Contacted", color: "bg-purple-500 text-white dark:text-white border-purple-500" },
  qualified: { label: "Qualified", color: "bg-green-500 text-white dark:text-white border-green-500" },
  negotiating: { label: "Negotiating", color: "bg-amber-500 text-gray-900 dark:text-gray-900 border-amber-500" },
  closed: { label: "Closed", color: "bg-emerald-600 text-white dark:text-white border-emerald-600" },
  lost: { label: "Lost", color: "bg-red-500 text-white dark:text-white border-red-500" },
};

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const statusConfig = leadStatusConfig[lead.status] || leadStatusConfig.new;
  
  return (
    <Card 
      className="hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer" 
      data-testid={`card-lead-${lead.id}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-lg font-bold uppercase tracking-tight" data-testid={`text-lead-name-${lead.id}`}>
          {lead.name}
        </CardTitle>
        <Badge className={`${statusConfig.color} border-2`} data-testid={`badge-lead-status-${lead.id}`}>
          {statusConfig.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span data-testid={`text-email-${lead.id}`}>
              {lead.email}
            </span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span data-testid={`text-phone-${lead.id}`}>
                {lead.phone}
              </span>
            </div>
          )}
        </div>

        {lead.company && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium" data-testid={`text-company-${lead.id}`}>
                {lead.company}
              </span>
            </div>
          </div>
        )}

        {lead.address && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground" data-testid={`text-address-${lead.id}`}>
                {lead.address}
              </span>
            </div>
          </div>
        )}

        {lead.value && (
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium" data-testid={`text-value-${lead.id}`}>
                {lead.value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LeadCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-20" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="pt-3 border-t">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card data-testid={`card-lead-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`text-lead-stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  const stats = leads ? {
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    qualified: leads.filter(l => l.status === "qualified").length,
    closed: leads.filter(l => l.status === "closed").length,
  } : null;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="px-6 py-4">
          <h1 className="text-3xl font-black uppercase tracking-tight" data-testid="text-leads-page-title">
            Sales <span className="text-primary">Leads</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage your sales pipeline
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                {[...Array(4)].map((_, i) => (
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
                <StatCard title="Total Leads" value={stats.total} />
                <StatCard title="New" value={stats.new} />
                <StatCard title="Qualified" value={stats.qualified} />
                <StatCard title="Closed" value={stats.closed} />
              </>
            ) : null}
          </div>

          {/* Leads Grid */}
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-4" data-testid="text-leads-section-title">
              All Leads
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <LeadCardSkeleton key={i} />
                ))}
              </div>
            ) : leads && leads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-leads">
                {leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} />
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-3">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-black uppercase tracking-tight" data-testid="text-leads-empty-state-title">
                    No Leads Yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Start tracking your sales pipeline. Leads will appear here once they are added to the system.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {selectedLead && (
        <LeadQualificationSheet
          lead={selectedLead}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </div>
  );
}
