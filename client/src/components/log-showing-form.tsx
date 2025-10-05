import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, Clock } from "lucide-react";
import { visitsStore, agentContextStore } from "@/lib/localStores";
import { useToast } from "@/hooks/use-toast";

const logShowingSchema = z.object({
  duration: z.string().min(1, "Please select a duration"),
  notes: z.string().optional(),
});

type LogShowingFormData = z.infer<typeof logShowingSchema>;

interface LogShowingFormProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  unitNumber: string;
  agentName?: string;
  prospectId?: string;
}

export function LogShowingForm({ isOpen, onClose, unitId, unitNumber, agentName, prospectId }: LogShowingFormProps) {
  const [actionId] = useState(() => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<LogShowingFormData>({
    resolver: zodResolver(logShowingSchema),
    defaultValues: {
      duration: "30",
      notes: "",
    },
  });

  const handleSubmit = async (data: LogShowingFormData) => {
    console.log(`[${actionId}] Logging showing for Unit ${unitNumber}`, {
      unitId,
      duration: data.duration,
      hasNotes: !!data.notes,
      prospectId: prospectId || 'walk-in',
      timestamp: new Date().toISOString()
    });

    setIsSubmitting(true);

    try {
      const visit = {
        id: crypto.randomUUID(),
        prospectId: prospectId || 'walk-in',
        unitId: unitId,
        agentId: agentContextStore.getAgentId() || '',
        timestamp: new Date().toISOString(),
        notes: data.notes || undefined,
        duration: parseInt(data.duration),
      };

      visitsStore.add(visit);

      console.log(`[${actionId}] Showing logged successfully`, { 
        visitId: visit.id,
        unitId: visit.unitId,
        duration: visit.duration,
        hasProspect: !!prospectId
      });

      toast({
        title: "Showing Logged",
        description: `Visit to Unit ${unitNumber} has been recorded.`,
        duration: 3000,
      });

      form.reset();
      onClose();
    } catch (error) {
      console.error(`[${actionId}] Error logging showing:`, error);
      toast({
        title: "Error",
        description: "Failed to log showing. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    console.log(`[${actionId}] Closing Log Showing form without saving`);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="w-full max-w-md"
        data-testid="dialog-log-showing"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                Log Showing
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Unit {unitNumber}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
            {/* Duration Select */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="min-h-11" data-testid="select-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes Textarea */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold uppercase tracking-wide">
                    Notes (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any relevant notes about the showing (feedback, interests, concerns, etc.)"
                      rows={4}
                      className="resize-none"
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
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
                  "Logging..."
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Log Showing
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
