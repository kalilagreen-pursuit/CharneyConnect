import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertActivitySchema, type InsertActivity } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface AddActivityFormProps {
  leadId: string;
}

const activityTypes = [
  { value: "call", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "viewing", label: "Property Viewing" },
  { value: "note", label: "Note" },
];

export function AddActivityForm({ leadId }: AddActivityFormProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const form = useForm<InsertActivity>({
    resolver: zodResolver(insertActivitySchema),
    defaultValues: {
      leadId,
      type: "",
      description: "",
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: InsertActivity) => {
      return await apiRequest("POST", "/api/activities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      toast({
        title: "Activity Added",
        description: "The activity has been recorded successfully.",
      });
      form.reset({ leadId, type: "", description: "" });
      setIsExpanded(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create activity",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertActivity) => {
    createActivityMutation.mutate(data);
  };

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        variant="outline"
        className="w-full"
        data-testid="button-add-activity"
      >
        <Plus className="w-4 h-4 mr-2" />
        Log Activity
      </Button>
    );
  }

  return (
    <Card data-testid="card-add-activity-form">
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-4">
        <CardTitle className="text-lg">Log New Activity</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsExpanded(false);
            form.reset({ leadId, type: "", description: "" });
          }}
          data-testid="button-cancel-activity"
        >
          Cancel
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-activity-type">
                        <SelectValue placeholder="Select activity type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value} data-testid={`option-activity-type-${type.value}`}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter activity details..."
                      className="resize-none"
                      rows={4}
                      {...field}
                      data-testid="input-activity-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createActivityMutation.isPending}
              data-testid="button-submit-activity"
            >
              {createActivityMutation.isPending ? "Adding..." : "Add Activity"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
