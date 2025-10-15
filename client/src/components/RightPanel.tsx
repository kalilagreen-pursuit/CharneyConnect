
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, X } from "lucide-react";

interface RightPanelProps {
  sessionId: string;
  onEndSession?: () => void;
  onSaveDraft?: () => void;
  children?: React.ReactNode;
}

export function RightPanel({
  sessionId,
  onEndSession,
  onSaveDraft,
  children,
}: RightPanelProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Session Controls Header */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black uppercase tracking-tight">
              Session View
            </h2>
            <Badge variant="outline" className="text-xs">
              {sessionId.slice(0, 8)}...
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onSaveDraft}
              className="font-bold uppercase"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              variant="destructive"
              onClick={onEndSession}
              className="font-bold uppercase"
            >
              <X className="h-4 w-4 mr-2" />
              End Session
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {children || (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 p-8 max-w-md">
              <div className="w-24 h-24 mx-auto bg-muted rounded-lg flex items-center justify-center">
                <div className="text-4xl font-black text-muted-foreground">
                  📋
                </div>
              </div>
              <h3 className="text-2xl font-black uppercase text-muted-foreground">
                Unit Cards Grid Will Appear Here
              </h3>
              <p className="text-sm text-muted-foreground">
                Unit cards will be displayed in a responsive grid layout
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
