import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CheckCircle2, Bed, Bath, DollarSign, Maximize, Building2, Users, Search, X } from "lucide-react";
import { agentContextStore } from "@/lib/localStores";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import type { Contact } from "@shared/schema";

const AGENTS = [
  { id: 'agent-001', name: 'Sarah Chen', role: 'Senior Sales Agent' },
  { id: 'agent-002', name: 'Michael Rodriguez', role: 'Sales Agent' },
  { id: 'agent-003', name: 'Emily Park', role: 'Sales Agent' },
  { id: 'agent-004', name: 'David Thompson', role: 'Junior Sales Agent' },
  { id: 'agent-005', name: 'Jessica Williams', role: 'Sales Agent' },
];

const prospectQualificationSchema = z.object({
  // Agent Assignment
  agentId: z.string().min(1, "Agent selection is required"),
  
  // Basic Info
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^[\d\s\-\+\(\)]+$/, "Please enter a valid phone number"),
  consentGiven: z.boolean(),
  
  // Qualification Criteria (optional)
  targetPriceMin: z.string().optional(),
  targetPriceMax: z.string().optional(),
  targetBedrooms: z.string().optional(),
  targetBathrooms: z.string().optional(),
  targetSqft: z.string().optional(),
  targetBuilding: z.string().optional(),
});

type ProspectQualificationData = z.infer<typeof prospectQualificationSchema>;

interface ProspectResult {
  leadId: string;
  contactId: string;
  prospectName: string;
  matchedUnits: any[];
}

interface QuickProspectWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  onProspectCreated?: (result: ProspectResult) => void;
  buildings: string[];
  unitId?: string;
  unitNumber?: string;
}

export function QuickProspectWorkflow({ 
  isOpen, 
  onClose, 
  onProspectCreated,
  buildings = [],
  unitId,
  unitNumber
}: QuickProspectWorkflowProps) {
  const [actionId] = useState(() => `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProspect, setSelectedProspect] = useState<Contact | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { toast } = useToast();

  // Search for existing prospects
  const { data: searchResults = [] } = useQuery<Contact[]>({
    queryKey: ['/api/prospects/search', searchQuery],
    enabled: searchQuery.length >= 2 && !selectedProspect,
    queryFn: async () => {
      const res = await fetch(`/api/prospects/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
  });

  const form = useForm<ProspectQualificationData>({
    resolver: zodResolver(prospectQualificationSchema),
    defaultValues: {
      agentId: agentContextStore.getAgentId() || 'agent-001',
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      consentGiven: false,
      targetPriceMin: "",
      targetPriceMax: "",
      targetBedrooms: "any",
      targetBathrooms: "any",
      targetSqft: "",
      targetBuilding: "all",
    },
  });

  // Populate form when existing prospect is selected
  useEffect(() => {
    if (selectedProspect) {
      form.setValue("firstName", selectedProspect.firstName);
      form.setValue("lastName", selectedProspect.lastName);
      form.setValue("email", selectedProspect.email);
      form.setValue("phone", selectedProspect.phone || "");
      form.setValue("consentGiven", !!selectedProspect.consentGivenAt);
    }
  }, [selectedProspect, form]);

  const handleSubmit = async (data: ProspectQualificationData) => {
    console.log(`[${actionId}] Submitting Quick Prospect Workflow`, { 
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      hasQualification: !!(data.targetPriceMin || data.targetPriceMax || data.targetBedrooms),
      timestamp: new Date().toISOString()
    });

    setIsSubmitting(true);

    try {
      console.log(`[${actionId}] Creating prospect with qualification via API`, {
        agentId: data.agentId,
        hasQualification: !!(data.targetPriceMin || data.targetPriceMax || data.targetBedrooms),
      });
      
      const prospectRes = await apiRequest("POST", "/api/prospects", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        agentId: data.agentId,
        consentGiven: data.consentGiven,
        // Unit information (if clicked from unit card)
        unitId: unitId,
        unitNumber: unitNumber,
        // Existing prospect information (if selected from search)
        contactId: selectedProspect?.id,
        // Qualification fields - filter out "any" values
        targetPriceMin: data.targetPriceMin ? Number(data.targetPriceMin) : undefined,
        targetPriceMax: data.targetPriceMax ? Number(data.targetPriceMax) : undefined,
        targetBedrooms: data.targetBedrooms && data.targetBedrooms !== "any" ? Number(data.targetBedrooms) : undefined,
        targetBathrooms: data.targetBathrooms && data.targetBathrooms !== "any" ? Number(data.targetBathrooms) : undefined,
        targetSqft: data.targetSqft ? Number(data.targetSqft) : undefined,
        targetBuilding: data.targetBuilding && data.targetBuilding !== "all" ? data.targetBuilding : undefined,
      });
      
      const result = await prospectRes.json();

      console.log(`[${actionId}] Prospect created successfully`, {
        contactId: result.contact.id,
        dealId: result.deal?.id,
        leadId: result.lead.id,
        matchedUnits: result.matchedUnits?.length || 0,
      });

      toast({
        title: "Prospect Added Successfully",
        description: result.matchedUnits?.length > 0 
          ? `${data.firstName} ${data.lastName} added with ${result.matchedUnits.length} matched units.`
          : `${data.firstName} ${data.lastName} is now tracked in your pipeline.`,
        duration: 4000,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/units'] });

      // Reset form and notify parent
      form.reset();
      
      if (onProspectCreated) {
        onProspectCreated({
          leadId: result.lead.id,
          contactId: result.contact.id,
          prospectName: `${data.firstName} ${data.lastName}`,
          matchedUnits: result.matchedUnits || [],
        });
      } else {
        onClose();
      }
    } catch (error) {
      console.error(`[${actionId}] Error saving prospect:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save prospect. Please try again.";
      toast({
        title: "Error Adding Prospect",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    console.log(`[${actionId}] Closing Quick Prospect Workflow without saving`);
    form.reset();
    setSearchQuery("");
    setSelectedProspect(null);
    setShowSearchResults(false);
    onClose();
  };

  const handleSelectProspect = (prospect: Contact) => {
    setSelectedProspect(prospect);
    setSearchQuery(`${prospect.firstName} ${prospect.lastName}`);
    setShowSearchResults(false);
  };

  const handleClearSelection = () => {
    setSelectedProspect(null);
    setSearchQuery("");
    form.reset({
      agentId: agentContextStore.getAgentId() || 'agent-001',
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      consentGiven: false,
      targetPriceMin: "",
      targetPriceMax: "",
      targetBedrooms: "any",
      targetBathrooms: "any",
      targetSqft: "",
      targetBuilding: "all",
    });
  };

  const consentGiven = form.watch("consentGiven");
  const hasQualificationData = !!(
    form.watch("targetPriceMin") || 
    form.watch("targetPriceMax") || 
    (form.watch("targetBedrooms") && form.watch("targetBedrooms") !== "any") ||
    (form.watch("targetBathrooms") && form.watch("targetBathrooms") !== "any") ||
    form.watch("targetSqft") ||
    (form.watch("targetBuilding") && form.watch("targetBuilding") !== "all")
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="dialog-quick-prospect-workflow"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                Quick Prospect
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Capture contact info and preferences in one step
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Prospect Search */}
        <div className="space-y-2 mt-4">
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Search existing prospect or add new..."
                  className="pl-10 min-h-11"
                  data-testid="input-search-prospect"
                  disabled={!!selectedProspect}
                />
                {selectedProspect && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={handleClearSelection}
                    data-testid="button-clear-prospect"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchQuery.length >= 2 && searchResults.length > 0 && !selectedProspect && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                {searchResults.map((prospect) => (
                  <button
                    key={prospect.id}
                    type="button"
                    onClick={() => handleSelectProspect(prospect)}
                    className="w-full px-4 py-3 text-left hover-elevate active-elevate-2 border-b last:border-b-0"
                    data-testid={`button-select-prospect-${prospect.id}`}
                  >
                    <div className="font-medium">
                      {prospect.firstName} {prospect.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">{prospect.email}</div>
                    <div className="text-xs text-muted-foreground">{prospect.phone}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProspect && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Existing Prospect Selected
            </Badge>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-black uppercase tracking-wide">Contact Information</h3>
              </div>

              {/* Agent Assignment */}
              <FormField
                control={form.control}
                name="agentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold uppercase tracking-wide">
                      Assign To Agent <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-11" data-testid="select-agent">
                          <SelectValue placeholder="Select agent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AGENTS.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id} data-testid={`select-item-agent-${agent.id}`}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{agent.name}</span>
                              <span className="text-xs text-muted-foreground">({agent.role})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold uppercase tracking-wide">
                        First Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="John"
                          className="min-h-11"
                          data-testid="input-first-name"
                          disabled={!!selectedProspect}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Last Name */}
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold uppercase tracking-wide">
                        Last Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Smith"
                          className="min-h-11"
                          data-testid="input-last-name"
                          disabled={!!selectedProspect}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold uppercase tracking-wide">
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="john.smith@example.com"
                          className="min-h-11"
                          data-testid="input-email"
                          disabled={!!selectedProspect}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold uppercase tracking-wide">
                        Phone <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="(555) 123-4567"
                          className="min-h-11"
                          data-testid="input-phone"
                          disabled={!!selectedProspect}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Consent Toggle */}
              <FormField
                control={form.control}
                name="consentGiven"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                        data-testid="checkbox-consent"
                        disabled={!!selectedProspect}
                      />
                    </FormControl>
                    <div className="flex-1 space-y-1">
                      <FormLabel className="text-sm font-bold leading-none flex items-center gap-2">
                        Marketing Consent
                        {consentGiven && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Given
                          </Badge>
                        )}
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Prospect agrees to receive marketing communications
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Qualification Section */}
            <div className="space-y-4">
              <div className="border-b pb-2 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wide">Preferences (Optional)</h3>
                {hasQualificationData && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Qualified
                  </Badge>
                )}
              </div>

              {/* Budget Range */}
              <div className="space-y-2">
                <FormLabel className="text-sm font-bold uppercase flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget Range
                </FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetPriceMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="Min Price"
                            className="min-h-11"
                            data-testid="input-price-min"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetPriceMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="Max Price"
                            className="min-h-11"
                            data-testid="input-price-max"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Bedrooms */}
                <FormField
                  control={form.control}
                  name="targetBedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold uppercase flex items-center gap-2">
                        <Bed className="h-4 w-4" />
                        Bedrooms
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="min-h-11" data-testid="select-bedrooms">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1">1 Bedroom</SelectItem>
                          <SelectItem value="2">2 Bedrooms</SelectItem>
                          <SelectItem value="3">3 Bedrooms</SelectItem>
                          <SelectItem value="4">4+ Bedrooms</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bathrooms */}
                <FormField
                  control={form.control}
                  name="targetBathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold uppercase flex items-center gap-2">
                        <Bath className="h-4 w-4" />
                        Bathrooms
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="min-h-11" data-testid="select-bathrooms">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1">1 Bathroom</SelectItem>
                          <SelectItem value="2">2 Bathrooms</SelectItem>
                          <SelectItem value="3">3+ Bathrooms</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Square Footage */}
                <FormField
                  control={form.control}
                  name="targetSqft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold uppercase flex items-center gap-2">
                        <Maximize className="h-4 w-4" />
                        Min Square Feet
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="e.g., 800"
                          className="min-h-11"
                          data-testid="input-sqft"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Building/Tower */}
                <FormField
                  control={form.control}
                  name="targetBuilding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold uppercase flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Preferred Building
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="min-h-11" data-testid="select-building">
                            <SelectValue placeholder="Any Building" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Any Building</SelectItem>
                          {buildings.map(building => (
                            <SelectItem key={building} value={building}>
                              {building}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 min-h-11"
                disabled={isSubmitting}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                className="flex-1 min-h-11 gap-2"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    {selectedProspect && unitId 
                      ? `Link to Unit ${unitNumber}`
                      : selectedProspect
                        ? "Update Prospect"
                        : unitId
                          ? `Add Prospect for Unit ${unitNumber}`
                          : hasQualificationData 
                            ? "Add & Show Units" 
                            : "Add Prospect"
                    }
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
