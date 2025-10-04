import { format } from "date-fns";
import { Phone, Mail, Calendar, Eye, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Activity } from "@shared/schema";

interface ActivityTimelineProps {
  activities: Activity[];
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  viewing: Eye,
  note: FileText,
};

const activityColors = {
  call: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  email: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  meeting: "bg-green-500/10 text-green-700 dark:text-green-400",
  viewing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  note: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <Card data-testid="card-no-activities">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center" data-testid="text-no-activities">
            No activities recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4" data-testid="container-activity-timeline">
      {sortedActivities.map((activity, index) => {
        const Icon = activityIcons[activity.type as keyof typeof activityIcons];
        const colorClass = activityColors[activity.type as keyof typeof activityColors];

        return (
          <Card key={activity.id} className="hover-elevate" data-testid={`card-activity-${activity.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-md ${colorClass}`} data-testid={`icon-activity-${activity.type}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline" className="capitalize" data-testid={`badge-activity-type-${activity.id}`}>
                      {activity.type}
                    </Badge>
                    <time className="text-sm text-muted-foreground" data-testid={`text-activity-time-${activity.id}`}>
                      {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </time>
                  </div>
                  <p className="text-sm text-foreground" data-testid={`text-activity-description-${activity.id}`}>
                    {activity.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
