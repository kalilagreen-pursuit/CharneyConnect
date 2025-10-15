
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FloorplanViewer3D from "@/components/FloorplanViewer3D";
import { Building2, Image as ImageIcon } from "lucide-react";

interface ThreeDViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  unitNumber?: string;
  floorPlanImageUrl?: string;
  onUnitClick?: (unitNumber: string) => void;
  matchedUnitNumbers?: string[];
  prospectContext?: {
    leadId: string;
    contactId: string;
    prospectName: string;
  };
  activeVisitId?: string | null;
  viewedUnitIds?: Set<string>;
  vizMode?: "LIVE" | "GALLERY";
}

export function ThreeDViewerModal({
  isOpen,
  onClose,
  projectId,
  unitNumber,
  floorPlanImageUrl,
  onUnitClick,
  matchedUnitNumbers = [],
  prospectContext,
  activeVisitId = null,
  viewedUnitIds = new Set(),
  vizMode = "LIVE",
}: ThreeDViewerModalProps) {
  const [activeTab, setActiveTab] = useState<"3d" | "floorplan">("3d");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-black uppercase tracking-tight">
            {unitNumber ? `UNIT ${unitNumber}` : "BUILDING VIEWER"}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "3d" | "floorplan")}
          className="flex-1 flex flex-col h-[calc(100%-5rem)]"
        >
          <TabsList className="mx-6 mt-4 grid w-full max-w-md grid-cols-2">
            <TabsTrigger
              value="3d"
              className="uppercase font-bold flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              3D VIEW
            </TabsTrigger>
            <TabsTrigger
              value="floorplan"
              className="uppercase font-bold flex items-center gap-2"
              disabled={!floorPlanImageUrl}
            >
              <ImageIcon className="h-4 w-4" />
              FLOOR PLAN
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="3d"
            className="flex-1 mt-0 data-[state=active]:flex"
          >
            <div className="w-full h-full">
              <FloorplanViewer3D
                projectId={projectId}
                unitNumber={unitNumber}
                embedded={true}
                onUnitClick={onUnitClick}
                matchedUnitNumbers={matchedUnitNumbers}
                prospectContext={prospectContext}
                activeVisitId={activeVisitId}
                viewedUnitIds={viewedUnitIds}
                vizMode={vizMode}
              />
            </div>
          </TabsContent>

          <TabsContent
            value="floorplan"
            className="flex-1 mt-0 data-[state=active]:flex items-center justify-center bg-muted/20"
          >
            {floorPlanImageUrl ? (
              <div className="w-full h-full flex items-center justify-center p-6">
                <img
                  src={floorPlanImageUrl}
                  alt="Floor Plan"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                />
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm uppercase font-bold">
                  NO FLOOR PLAN IMAGE AVAILABLE
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
