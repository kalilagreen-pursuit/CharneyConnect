
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Calendar, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EndSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessionData: {
    clientName: string;
    projectName: string;
    touredUnitsCount: number;
    elapsedTime: string;
    startTime: string;
  };
  isEnding: boolean;
  portalUrl?: string;
}

export function EndSessionDialog({
  isOpen,
  onClose,
  onConfirm,
  sessionData,
  isEnding,
  portalUrl,
}: EndSessionDialogProps) {
  const { toast } = useToast();

  const handleCopyPortalUrl = () => {
    if (portalUrl) {
      navigator.clipboard.writeText(portalUrl);
      toast({
        title: "Portal URL Copied",
        description: "The portal link has been copied to your clipboard.",
        duration: 3000,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="dialog-end-session">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black uppercase tracking-tight">
            End Showing Session
          </DialogTitle>
          <DialogDescription className="text-base">
            Review session summary and generate client portal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-8 space-y-4 border-2 border-border/50 shadow-sm">
            <h4 className="font-black uppercase text-xs tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="h-1 w-8 bg-primary rounded-full"></span>
              Session Summary
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground font-medium">Client:</span>
                <span className="font-bold text-base">{sessionData.clientName}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-t border-border/30">
                <span className="text-sm text-muted-foreground font-medium">Project:</span>
                <span className="font-bold text-base">{sessionData.projectName}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-t border-border/30">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4" />
                  Duration:
                </span>
                <span className="font-mono font-black text-lg text-primary tabular-nums">{sessionData.elapsedTime}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-t border-border/30">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Units Toured:
                </span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 font-black text-base px-4 py-1">
                  {sessionData.touredUnitsCount}
                </Badge>
              </div>

              <div className="flex justify-between items-center py-2 border-t border-border/30">
                <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4" />
                  Started:
                </span>
                <span className="text-sm font-bold">
                  {new Date(sessionData.startTime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {portalUrl && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5 fill-green-700" />
                <span className="font-bold uppercase text-sm">Portal Generated</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={portalUrl}
                  readOnly
                  className="flex-1 text-xs bg-white border border-green-300 rounded px-2 py-1 font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyPortalUrl}
                  className="min-h-[32px]"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isEnding}
            className="min-h-[48px] touch-manipulation"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isEnding}
            className="min-h-[48px] touch-manipulation uppercase font-black bg-destructive hover:bg-destructive/90"
          >
            {isEnding ? 'Ending Session...' : 'End Session & Generate Portal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
