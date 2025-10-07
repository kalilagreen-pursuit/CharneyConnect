import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Task } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TasksPanelProps {
  leadId: string;
}

export function TasksPanel({ leadId }: TasksPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", leadId],
    enabled: !!leadId,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", leadId] });
      toast({
        title: "Task Completed",
        description: "Task marked as complete successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete task",
        variant: "destructive",
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-accent/10 text-accent-foreground border-accent/20";
      case "low":
        return "bg-secondary/10 text-secondary-foreground border-secondary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleCompleteTask = (taskId: string, currentStatus: string) => {
    if (currentStatus !== "completed") {
      completeTaskMutation.mutate(taskId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium" data-testid="text-no-tasks">
          No tasks assigned
        </p>
        <p className="text-sm mt-1">
          Tasks will appear here when created by automation
        </p>
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-4">
      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Tasks ({pendingTasks.length})
          </h3>
          {pendingTasks.map((task) => (
            <Card
              key={task.id}
              className="p-4 space-y-3"
              data-testid={`card-task-${task.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={() => handleCompleteTask(task.id, task.status)}
                    disabled={completeTaskMutation.isPending}
                    data-testid={`checkbox-task-${task.id}`}
                  />
                  <div className="flex-1">
                    <h4
                      className="font-bold uppercase tracking-tight text-sm"
                      data-testid={`text-task-title-${task.id}`}
                    >
                      {task.title}
                    </h4>
                    {task.description && (
                      <p
                        className="text-sm text-muted-foreground mt-1"
                        data-testid={`text-task-description-${task.id}`}
                      >
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={getPriorityColor(task.priority)}
                  data-testid={`badge-priority-${task.id}`}
                >
                  {task.priority}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {task.dueDate && (
                  <span data-testid={`text-due-date-${task.id}`}>
                    Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                  </span>
                )}
                {task.automationSource && (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Auto-created
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedTasks.length})
          </h3>
          {completedTasks.map((task) => (
            <Card
              key={task.id}
              className="p-4 space-y-3 opacity-60"
              data-testid={`card-task-${task.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={true}
                    disabled
                    data-testid={`checkbox-task-${task.id}`}
                  />
                  <div className="flex-1">
                    <h4
                      className="font-bold uppercase tracking-tight text-sm line-through"
                      data-testid={`text-task-title-${task.id}`}
                    >
                      {task.title}
                    </h4>
                    {task.description && (
                      <p
                        className="text-sm text-muted-foreground mt-1"
                        data-testid={`text-task-description-${task.id}`}
                      >
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {task.completedAt && (
                <div className="text-xs text-muted-foreground">
                  Completed {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
