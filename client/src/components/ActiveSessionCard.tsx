
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActiveSessionCardProps {
  sessionId: string;
  clientName: string;
  projectName: string;
  unitsViewed: number;
  lastActivity: string;
  onResume: (sessionId: string) => void;
}

export function ActiveSessionCard({
  sessionId,
  clientName,
  projectName,
  unitsViewed,
  lastActivity,
  onResume,
}: ActiveSessionCardProps) {
  return (
    <Card
      className="shadow-lg hover-elevate active-elevate-2 transition-all cursor-pointer"
      onClick={() => onResume(sessionId)}
      data-testid={`active-session-${sessionId}`}
    >
      <CardHeader>
        <CardTitle className="text-lg font-black uppercase flex items-center justify-between">
          <span>{clientName}</span>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            ACTIVE
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Project</span>
          <span className="font-medium">{projectName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Eye className="h-4 w-4" />
            Units Viewed
          </span>
          <Badge variant="outline">{unitsViewed}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Last Activity
          </span>
          <span className="font-medium">
            {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
          </span>
        </div>
        <Button
          size="sm"
          className="w-full uppercase font-black gap-2 mt-2"
          onClick={(e) => {
            e.stopPropagation();
            onResume(sessionId);
          }}
          data-testid={`button-resume-${sessionId}`}
        >
          Resume Session
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
