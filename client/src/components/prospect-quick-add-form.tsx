import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { agentContextStore } from "@/lib/localStores";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const prospectFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^[\d\s\-\+\(\)]+$/, "Please enter a valid phone number"),
  consentGiven: z.boolean(),
});

type ProspectFormData = z.infer<typeof prospectFormSchema>;

interface ProspectQuickAddFormProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  unitNumber: string;
  agentName?: string;
}

export function ProspectQuickAddForm({ isOpen, onClose, unitId, unitNumber, agentName }: ProspectQuickAddFormProps) {
  const [actionId] = useState(() => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProspectFormData>({
    resolver: zodResolver(prospectFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      consentGiven: false,
    },
  });

  const handleSubmit = async (data: ProspectFormData) => {
    console.log(`[${actionId}] Submitting Quick-Add Prospect form`, { 
      unitId, 
      unitNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      consentGiven: data.consentGiven,
      timestamp: new Date().toISOString()
    });

    setIsSubmitting(true);

    try {
      const agentId = agentContextStore.getAgentId();
      if (!agentId) {
        throw new Error("Agent ID not found. Please refresh the page.");
      }

      console.log(`[${actionId}] Creating prospect via atomic API endpoint`);
      
      const prospectRes = await apiRequest("POST", "/api/prospects", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        unitId,
        unitNumber,
        agentId,
        consentGiven: data.consentGiven,
      });
      
      const result = await prospectRes.json();

      console.log(`[${actionId}] Prospect created successfully`, {
        contactId: result.contact.id,
        dealId: result.deal.id,
        activityId: result.activity.id,
      });

      toast({
        title: "Prospect Added Successfully",
        description: `${data.firstName} ${data.lastName} is now tracked for Unit ${unitNumber} and visible to your team.`,
        duration: 4000,
      });

      // Invalidate leads query to refresh the leads page
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });

      // Reset form and close
      form.reset();
      onClose();
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
    console.log(`[${actionId}] Closing Quick-Add Prospect form without saving`);
    form.reset();
    onClose();
  };

  const consentGiven = form.watch("consentGiven");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="w-full max-w-md"
        data-testid="dialog-quick-add-prospect"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                Quick-Add Prospect
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Unit {unitNumber}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
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
                      Prospect agrees to receive marketing communications about available units and updates.
                      Consent timestamp will be recorded.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

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
                  "Saving..."
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add Prospect
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
