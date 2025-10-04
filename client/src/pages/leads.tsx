import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LeadWithDetails } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, Building2, Users, Award, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AddActivityForm } from "@/components/add-activity-form";

const leadStatusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-500 text-white dark:text-white border-blue-500" },
  contacted: { label: "Contacted", color: "bg-purple-500 text-white dark:text-white border-purple-500" },
  qualified: { label: "Qualified", color: "bg-green-500 text-white dark:text-white border-green-500" },
  negotiating: { label: "Negotiating", color: "bg-amber-500 text-gray-900 dark:text-gray-900 border-amber-500" },
  closed: { label: "Closed", color: "bg-emerald-600 text-white dark:text-white border-emerald-600" },
  lost: { label: "Lost", color: "bg-red-500 text-white dark:text-white border-red-500" },
};

function LeadCard({ lead, onSelect }: { lead: LeadWithDetails; onSelect: () => void }) {
  const statusConfig = leadStatusConfig[lead.status] || leadStatusConfig.new;
  
  return (
    <Card 
      className="hover-elevate active-elevate-2 transition-all duration-200 cursor-pointer" 
      onClick={onSelect}
      data-testid={`card-lead-${lead.id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold" data-testid={`text-lead-name-${lead.id}`}>
          {lead.contact.firstName} {lead.contact.lastName}
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
              {lead.contact.email}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span data-testid={`text-phone-${lead.id}`}>
              {lead.contact.phone}
            </span>
          </div>
        </div>

        {lead.broker && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium" data-testid={`text-broker-${lead.id}`}>
                {lead.broker.firstName} {lead.broker.lastName}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              {lead.broker.company}
            </p>
          </div>
        )}

        {lead.unit && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium" data-testid={`text-unit-${lead.id}`}>
                Unit {lead.unit.unitNumber}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              {lead.unit.bedrooms} BD • {lead.unit.bathrooms} BA • {lead.unit.squareFeet.toLocaleString()} SF
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium" data-testid={`text-score-${lead.id}`}>
              Score: {lead.score}
            </span>
          </div>
          <span className="text-xs text-muted-foreground" data-testid={`text-activity-count-${lead.id}`}>
            {lead.activities.length} {lead.activities.length === 1 ? 'activity' : 'activities'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadDetailDialog({ lead, open, onClose }: { lead: LeadWithDetails; open: boolean; onClose: () => void }) {
  const statusConfig = leadStatusConfig[lead.status] || leadStatusConfig.new;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" data-testid={`dialog-lead-detail-${lead.id}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl" data-testid={`text-dialog-lead-name-${lead.id}`}>
              {lead.contact.firstName} {lead.contact.lastName}
            </DialogTitle>
            <Badge className={`${statusConfig.color} border-2`}>
              {statusConfig.label}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-6 pr-2">
          {/* Contact & Lead Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.contact.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.contact.phone}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lead Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>Score: <strong>{lead.score}</strong></span>
                </div>
                {lead.broker && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.broker.firstName} {lead.broker.lastName} ({lead.broker.company})</span>
                  </div>
                )}
                {lead.unit && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Unit {lead.unit.unitNumber} - ${lead.unit.price.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {lead.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{lead.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
              <AddActivityForm leadId={lead.id} />
            </div>
            
            <div className="mt-4">
              <ActivityTimeline activities={lead.activities} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
        <CardTitle className="text-sm font-medium text-muted-foreground">
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
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const { data: leads, isLoading } = useQuery<LeadWithDetails[]>({
    queryKey: ["/api/leads"],
  });

  const { data: selectedLead } = useQuery<LeadWithDetails>({
    queryKey: ["/api/leads", selectedLeadId],
    enabled: !!selectedLeadId,
  });

  const stats = leads ? {
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    qualified: leads.filter(l => l.status === "qualified").length,
    closed: leads.filter(l => l.status === "closed").length,
  } : null;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold" data-testid="text-leads-page-title">
            Leads
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
            <h2 className="text-lg font-semibold mb-4" data-testid="text-leads-section-title">
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
                  <LeadCard 
                    key={lead.id} 
                    lead={lead}
                    onSelect={() => setSelectedLeadId(lead.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-3">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold" data-testid="text-leads-empty-state-title">
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

      {/* Lead Detail Dialog */}
      {selectedLead && (
        <LeadDetailDialog 
          lead={selectedLead}
          open={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </div>
  );
}
