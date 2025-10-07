import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Bed, Bath, Square } from "lucide-react";
import type { LeadWithDetails, UnitWithDetails } from "@shared/schema";

export default function UnitLeads() {
  const [, params] = useRoute("/unit/:projectId/:unitNumber/leads");
  const [, setLocation] = useLocation();
  
  const projectId = params?.projectId;
  const unitNumber = params?.unitNumber;

  const { data: leads = [], isLoading: leadsLoading } = useQuery<LeadWithDetails[]>({
    queryKey: ["/api/units", projectId, unitNumber, "leads"],
    enabled: !!projectId && !!unitNumber,
  });

  const unit = leads[0]?.unit;

  if (leadsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading unit details...</div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-muted-foreground">Unit not found</div>
        <Button
          onClick={() => setLocation("/")}
          variant="outline"
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            size="icon"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase">
              Unit {unitNumber}
            </h1>
            <p className="text-muted-foreground">{unit.building}</p>
          </div>
        </div>

        {/* Unit Details Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight mb-2">
                Unit Details
              </h2>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Building:</span>
                  <span className="font-medium">{unit.building}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Bedrooms:</span>
                  <span className="font-medium">{unit.bedrooms}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Bathrooms:</span>
                  <span className="font-medium">{unit.bathrooms}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Square className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Sq Ft:</span>
                  <span className="font-medium">{unit.squareFeet?.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${parseFloat(unit.price).toLocaleString()}
              </div>
              <div
                className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-bold uppercase mt-2 ${
                  unit.status === "available"
                    ? "bg-status-available text-black"
                    : unit.status === "on_hold"
                    ? "bg-status-on-hold text-black"
                    : unit.status === "contract"
                    ? "bg-status-contract text-white"
                    : "bg-status-sold text-white"
                }`}
                data-testid={`status-${unit.status}`}
              >
                {unit.status.replace("_", " ")}
              </div>
            </div>
          </div>
        </Card>

        {/* Leads Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold uppercase tracking-tight">
              Linked Leads ({leads.length})
            </h2>
          </div>

          {leads.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                No leads linked to this unit yet
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => (
                <Card
                  key={lead.id}
                  className="p-4"
                  data-testid={`lead-card-${lead.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold">
                          {lead.contact.firstName} {lead.contact.lastName}
                        </h3>
                        <div
                          className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            lead.dealStage === "new"
                              ? "bg-secondary text-secondary-foreground"
                              : lead.dealStage === "contacted"
                              ? "bg-blue-500 text-white"
                              : lead.dealStage === "qualified"
                              ? "bg-purple-500 text-white"
                              : lead.dealStage === "proposal"
                              ? "bg-amber-500 text-black"
                              : lead.dealStage === "negotiation"
                              ? "bg-orange-500 text-white"
                              : lead.dealStage === "closed_won"
                              ? "bg-green-600 text-white"
                              : "bg-red-500 text-white"
                          }`}
                          data-testid={`deal-stage-${lead.id}`}
                        >
                          {lead.dealStage.replace("_", " ")}
                        </div>
                      </div>
                      <div className="flex gap-6 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Email:</span>{" "}
                          {lead.contact.email}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span>{" "}
                          {lead.contact.phone}
                        </div>
                        {lead.broker && (
                          <div>
                            <span className="font-medium">Broker:</span>{" "}
                            {lead.broker.firstName} {lead.broker.lastName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-edit-lead-${lead.id}`}
                      >
                        Edit Lead
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
