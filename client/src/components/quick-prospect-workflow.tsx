import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CheckCircle2, Bed, Bath, DollarSign, Maximize, Building2 } from "lucide-react";
import { agentContextStore } from "@/lib/localStores";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

const prospectQualificationSchema = z.object({
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
}

export function QuickProspectWorkflow({ 
  isOpen, 
  onClose, 
  onProspectCreated,
  buildings = []
}: QuickProspectWorkflowProps) {
  const [actionId] = useState(() => `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProspectQualificationData>({
    resolver: zodResolver(prospectQualificationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      consentGiven: false,
      targetPriceMin: "",
      targetPriceMax: "",
      targetBedrooms: "",
      targetBathrooms: "",
      targetSqft: "",
      targetBuilding: "all",
    },
  });

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
      const agentId = agentContextStore.getAgentId();
      if (!agentId) {
        throw new Error("Agent ID not found. Please refresh the page.");
      }

      console.log(`[${actionId}] Creating prospect with qualification via API`);
      
      const prospectRes = await apiRequest("POST", "/api/prospects", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        agentId,
        consentGiven: data.consentGiven,
        // Qualification fields
        targetPriceMin: data.targetPriceMin ? Number(data.targetPriceMin) : undefined,
        targetPriceMax: data.targetPriceMax ? Number(data.targetPriceMax) : undefined,
        targetBedrooms: data.targetBedrooms ? Number(data.targetBedrooms) : undefined,
        targetBathrooms: data.targetBathrooms ? Number(data.targetBathrooms) : undefined,
        targetSqft: data.targetSqft ? Number(data.targetSqft) : undefined,
        targetBuilding: data.targetBuilding !== "all" ? data.targetBuilding : undefined,
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
    onClose();
  };

  const consentGiven = form.watch("consentGiven");
  const hasQualificationData = !!(
    form.watch("targetPriceMin") || 
    form.watch("targetPriceMax") || 
    form.watch("targetBedrooms") ||
    form.watch("targetBathrooms") ||
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-black uppercase tracking-wide">Contact Information</h3>
              </div>

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
                          <SelectItem value="">Any</SelectItem>
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
                          <SelectItem value="">Any</SelectItem>
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
                    {hasQualificationData ? "Add & Show Units" : "Add Prospect"}
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
