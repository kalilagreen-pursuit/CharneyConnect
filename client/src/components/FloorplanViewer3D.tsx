import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, Eye } from "lucide-react";
import { ProspectQuickAddForm } from "@/components/prospect-quick-add-form";
import { agentContextStore } from "@/lib/localStores";
import { useLogUnitView } from "@/lib/queryClient";

interface Project {
  id: string;
  name: string;
  modelPath: string;
}

interface UnitData {
  id: string;
  unitNumber: string;
  price: number;
  status: string;
  floorPlan?: {
    planName: string;
    sqFt: number;
    imgUrl?: string;
  };
}

interface ProspectContext {
  leadId: string;
  contactId: string;
  prospectName: string;
}

interface FloorplanViewer3DProps {
  projectId?: string;
  unitNumber?: string;
  onClose?: () => void;
  onUnitClick?: (unitNumber: string) => void;
  embedded?: boolean;
  onProjectChange?: (projectId: string) => void;
  matchedUnitNumbers?: string[]; // Array of unit numbers to highlight (from prospect matching)
  prospectContext?: ProspectContext; // Prospect context for linking unit
  activeVisitId?: string | null; // Active showing session ID
  viewedUnitIds?: Set<string>; // Set of viewed unit IDs in current session
  vizMode?: 'LIVE' | 'GALLERY'; // Visualization mode: LIVE 3D or PRE-CONSTRUCTION GALLERY
}

const PROJECTS: Project[] = [
  {
    id: "2320eeb4-596b-437d-b4cb-830bdb3c3b01",
    name: "The Jackson",
    modelPath: "/the_jackson_v2.glb",
  },
  {
    id: "f3ae960d-a0a9-4449-82fe-ffab7b01f3fa",
    name: "The Dime",
    modelPath: "/the_dime_v1.glb",
  },
  {
    id: "6f9a358c-0fc6-41bd-bd5e-6234b68295cb",
    name: "Gowanus",
    modelPath: "/gowanus_v1.glb",
  },
];

const STATUS_COLORS: Record<string, number> = {
  available: 0x2ecc71,
  on_hold: 0xf1c40f,
  contract: 0x3498db,
  sold: 0xe74c3c,
};

// Pre-construction gallery renderings by project
const GALLERY_RENDERINGS: Record<string, string[]> = {
  "2320eeb4-596b-437d-b4cb-830bdb3c3b01": [ // The Jackson
    "/jacksonph.png",
    "/jackson1br.png",
    "/jackson2br.png",
  ],
  "f3ae960d-a0a9-4449-82fe-ffab7b01f3fa": [ // The Dime
    "/dimeph.png",
    "/dime1br.png",
    "/dime2br.png",
  ],
  "6f9a358c-0fc6-41bd-bd5e-6234b68295cb": [ // Gowanus
    "/gowanusph.png",
    "/gowanus1br.png",
    "/gowanus2br.png",
  ],
};

export default function FloorplanViewer3D({
  projectId,
  unitNumber,
  onClose,
  onUnitClick,
  embedded = false,
  onProjectChange,
  matchedUnitNumbers = [],
  prospectContext,
  activeVisitId = null,
  viewedUnitIds = new Set(),
  vizMode = 'LIVE',
}: FloorplanViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentModelRef = useRef<THREE.Group | null>(null);
  const unitMeshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const highlightedMeshRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const compassImgRef = useRef<HTMLImageElement>(null);
  const animationFrameRef = useRef<number>(0);
  const continuousCompassAngleRef = useRef<number>(0);

  const [currentProject, setCurrentProject] = useState<Project>(
    PROJECTS.find((p) => p.id === projectId) || PROJECTS[0],
  );
  const [selectedUnit, setSelectedUnit] = useState<UnitData | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showProspectForm, setShowProspectForm] = useState(false);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);

  const logUnitViewMutation = useLogUnitView(activeVisitId);

  const hideDetailsPanel = useCallback(() => {
    setShowPanel(false);
    setSelectedUnit(null);
    setShowProspectForm(false);
  }, []);

  const loadProject = useCallback(
    async (project: Project) => {
      if (!sceneRef.current) return;

      if (currentModelRef.current) {
        sceneRef.current.remove(currentModelRef.current);
      }
      unitMeshMapRef.current.clear();
      hideDetailsPanel();
      setCurrentGalleryIndex(0); // Reset gallery to first image

      const loader = new GLTFLoader();
      loader.load(
        project.modelPath,
        (gltf) => {
          currentModelRef.current = gltf.scene;
          sceneRef.current!.add(currentModelRef.current);

          currentModelRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.name.startsWith("Unit_")) {
              unitMeshMapRef.current.set(child.name, child);
              const edges = new THREE.EdgesGeometry(child.geometry);
              const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x000000,
                linewidth: 2,
              });
              const lineSegments = new THREE.LineSegments(edges, lineMaterial);
              child.add(lineSegments);
            }
          });

          fetchAndUpdateUnitColors(project.id);
        },
        (xhr) => {
          console.log(
            `Loading ${project.name}: ${((xhr.loaded / xhr.total) * 100).toFixed(2)}%`,
          );
        },
        (error: unknown) => {
          console.error("Error loading model:", {
            project: project.name,
            path: project.modelPath,
            error: error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        },
      );
    },
    [hideDetailsPanel],
  );

  const fetchAndUpdateUnitColors = async (projectId: string) => {
    try {
      const url = new URL('/api/units', window.location.origin);
      url.searchParams.set('projectId', projectId);
      url.searchParams.set('status', 'available');
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch units: ${response.statusText}`);
      }
      const units = await response.json();

      const hasMatchedUnits = matchedUnitNumbers.length > 0;
      const defaultMaterial = new THREE.MeshStandardMaterial({
        color: 0xbdc3c7,
        transparent: hasMatchedUnits,
        opacity: hasMatchedUnits ? 0.3 : 1.0, // Fade non-matched units when there are matches
      });
      unitMeshMapRef.current.forEach((mesh) => {
        mesh.material = defaultMaterial;
      });

      units.forEach((unit: any) => {
        if (unit.project?.id !== projectId) return;

        const meshName = `Unit_${unit.unitNumber}`;
        const mesh = unitMeshMapRef.current.get(meshName);
        if (mesh) {
          const isMatched = matchedUnitNumbers.includes(unit.unitNumber);
          const color = STATUS_COLORS[unit.status] || 0xbdc3c7;
          
          if (isMatched) {
            // Matched units: bright with pulsing glow
            mesh.material = new THREE.MeshStandardMaterial({ 
              color,
              emissive: 0x00ff00, // Green glow for matched units
              emissiveIntensity: 0.4,
              transparent: false,
              opacity: 1.0,
            });
          } else if (hasMatchedUnits) {
            // Non-matched units when there are matches: faded
            mesh.material = new THREE.MeshStandardMaterial({ 
              color,
              transparent: true,
              opacity: 0.3,
            });
          } else {
            // Normal display when no matches
            mesh.material = new THREE.MeshStandardMaterial({ color });
          }
        }
      });

      if (unitNumber) {
        const targetMeshName = `Unit_${unitNumber}`;
        const targetMesh = unitMeshMapRef.current.get(targetMeshName);
        if (targetMesh) {
          const unit = units.find(
            (u: any) =>
              u.unitNumber === unitNumber && u.project?.id === projectId,
          );
          const statusColor = unit
            ? STATUS_COLORS[unit.status] || 0xbdc3c7
            : 0xbdc3c7;
          targetMesh.material = new THREE.MeshStandardMaterial({
            color: statusColor,
            emissive: 0xffff00,
            emissiveIntensity: 0.5,
          });
          highlightedMeshRef.current = targetMesh;
          fetchUnitDetails(unitNumber);
        }
      }
    } catch (error) {
      console.error("Error fetching units:", error);
    }
  };

  const fetchUnitDetails = async (unitNumber: string) => {
    if (!currentProject) return;
    setIsLoading(true);

    try {
      const url = new URL('/api/units', window.location.origin);
      url.searchParams.set('projectId', currentProject.id);
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch units: ${response.statusText}`);
      }
      const units = await response.json();

      const unit = units.find(
        (u: any) =>
          u.unitNumber === unitNumber && u.project?.id === currentProject.id,
      );

      if (unit) {
        setSelectedUnit({
          id: unit.id,
          unitNumber: unit.unitNumber,
          price: unit.price,
          status: unit.status,
          floorPlan: unit.floorPlan
            ? {
                planName: unit.floorPlan.planName,
                sqFt: unit.floorPlan.sqFt,
                imgUrl: unit.floorPlan.imgUrl,
              }
            : undefined,
        });
        setShowPanel(true);
        
        // Log the unit view if there's an active showing session
        if (activeVisitId && unit.id && !viewedUnitIds?.has(unit.id)) {
          console.log(`[3D Viewer] Logging unit view for showing session: ${activeVisitId}`);
          logUnitViewMutation.mutate(unit.id, {
            onSuccess: () => {
              console.log(`[3D Viewer] Unit view logged successfully`);
            },
            onError: (error) => {
              console.error(`[3D Viewer] Error logging unit view:`, error);
            },
          });
        }
      }
    } catch (error) {
      console.error("Error fetching unit details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHoldUnitForProspect = async () => {
    if (!selectedUnit || !prospectContext) return;
    setIsLoading(true);

    try {
      const agentId = agentContextStore.getAgentId();
      if (!agentId) {
        throw new Error("Agent ID not found");
      }

      // Update unit status to on_hold
      const statusResponse = await fetch(`/api/units/${selectedUnit.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "on_hold" }),
      });

      if (!statusResponse.ok) {
        throw new Error("Failed to update unit status");
      }

      // Create deal linking prospect to unit
      const dealResponse = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedUnit.id,
          buyerContactId: prospectContext.contactId,
          agentId,
          dealStage: "inquiry",
          category: "in_person_inquiry",
        }),
      });

      if (!dealResponse.ok) {
        throw new Error("Failed to create deal");
      }

      const deal = await dealResponse.json();

      // Create activity
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: deal.id,
          activityType: "unit_hold",
          notes: `Unit ${selectedUnit.unitNumber} held for ${prospectContext.prospectName}`,
        }),
      });

      // Update the 3D view
      const mesh = unitMeshMapRef.current.get(`Unit_${selectedUnit.unitNumber}`);
      if (mesh) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: STATUS_COLORS["on_hold"] || 0xbdc3c7,
        });
      }

      setSelectedUnit({ ...selectedUnit, status: "on_hold" });
      hideDetailsPanel();
      
      console.log("[3D Viewer] Unit held for prospect successfully", {
        unitId: selectedUnit.id,
        prospectName: prospectContext.prospectName,
        dealId: deal.id,
      });
    } catch (error) {
      console.error("Error holding unit for prospect:", error);
      alert("Failed to hold unit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedUnit) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/units/${selectedUnit.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedUnit.status }),
      });

      if (response.ok) {
        const mesh = unitMeshMapRef.current.get(
          `Unit_${selectedUnit.unitNumber}`,
        );
        if (mesh) {
          const color = STATUS_COLORS[selectedUnit.status] || 0xbdc3c7;
          mesh.material = new THREE.MeshStandardMaterial({ color });
        }
      }
    } catch (error) {
      console.error("Error updating unit:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCanvasInteraction = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;

      const panelElement = document.getElementById("unit-details-panel");
      if (panelElement?.contains(event.target as Node)) return;

      const touch = "changedTouches" in event ? event.changedTouches[0] : null;
      const clientX = touch ? touch.clientX : (event as MouseEvent).clientX;
      const clientY = touch ? touch.clientY : (event as MouseEvent).clientY;

      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(
        sceneRef.current.children,
        true,
      );

      let targetUnit: THREE.Object3D | null = null;
      if (intersects.length > 0) {
        let object: THREE.Object3D | null = intersects[0].object;
        while (object) {
          if (object.name.startsWith("Unit_")) {
            targetUnit = object;
            break;
          }
          object = object.parent;
        }
      }

      if (targetUnit) {
        const unitNumber = targetUnit.name.split("_")[1];
        // If onUnitClick callback is provided, use it instead of showing built-in panel
        if (onUnitClick) {
          onUnitClick(unitNumber);
        } else {
          fetchUnitDetails(unitNumber);
        }
      } else {
        hideDetailsPanel();
      }
    },
    [hideDetailsPanel, onUnitClick],
  );

  // Client-side only mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(2.15, 0, 200.83);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      rendererRef.current = renderer;
    } catch (error) {
      console.error("WebGL not supported:", error);
      setWebglError(true);
      return;
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 60;
    controls.maxDistance = 100;
    controls.target.set(0, 0, 0);
    controls.minPolarAngle = Math.PI / 3;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    const minPan = new THREE.Vector3(-50, -20, -50);
    const maxPan = new THREE.Vector3(50, 20, 50);
    const _v = new THREE.Vector3();
    controls.addEventListener("change", () => {
      _v.copy(controls.target);
      controls.target.clamp(minPan, maxPan);
      _v.sub(controls.target);
      camera.position.sub(_v);
    });

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();

      if (compassImgRef.current) {
        const currentAzimuthalAngle = controls.getAzimuthalAngle();
        const delta =
          ((currentAzimuthalAngle -
            (continuousCompassAngleRef.current % (2 * Math.PI)) +
            3 * Math.PI) %
            (2 * Math.PI)) -
          Math.PI;
        continuousCompassAngleRef.current += delta;
        compassImgRef.current.style.transform = `rotate(${continuousCompassAngleRef.current}rad)`;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    let touchStartX = 0,
      touchStartY = 0,
      isDragging = false;
    const dragThreshold = 10;
    const handleTouchStart = (e: TouchEvent) => {
      isDragging = false;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (
        Math.abs(e.touches[0].clientX - touchStartX) > dragThreshold ||
        Math.abs(e.touches[0].clientY - touchStartY) > dragThreshold
      ) {
        isDragging = true;
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) handleCanvasInteraction(e);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("click", handleCanvasInteraction as EventListener);

    loadProject(currentProject);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener(
        "click",
        handleCanvasInteraction as EventListener,
      );
      controls.dispose();
      renderer.dispose();
    };
  }, [isMounted, currentProject, loadProject, handleCanvasInteraction]);

  return (
    <div className={embedded ? "relative w-full h-full bg-[#f6f1eb]" : "fixed inset-0 z-50 bg-[#f6f1eb]"}>
      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center z-[100]">
          <div className="bg-card p-8 rounded-lg shadow-lg max-w-md text-center">
            <h2 className="text-2xl font-black uppercase mb-4">
              3D VIEW UNAVAILABLE
            </h2>
            <p className="text-muted-foreground mb-6">
              Your browser or device doesn't support WebGL, which is required
              for the 3D viewer.
            </p>
            {onClose && (
              <Button
                onClick={onClose}
                className="uppercase font-black"
                data-testid="button-close-webgl-error"
              >
                CLOSE
              </Button>
            )}
          </div>
        </div>
      )}
      
      {!embedded && (
        <div className="absolute top-5 right-5 z-[100] flex gap-3">
          {PROJECTS.map((project) => (
            <Button
              key={project.id}
              data-testid={`button-project-${project.name.toLowerCase().replace(/\s+/g, "-")}`}
              variant={currentProject.id === project.id ? "default" : "outline"}
              onClick={() => {
                setCurrentProject(project);
                loadProject(project);
              }}
              className="font-black uppercase tracking-tight"
            >
              {project.name.toUpperCase()}
            </Button>
          ))}
          {onClose && (
            <Button
              data-testid="button-close-3d-viewer"
              variant="outline"
              size="icon"
              onClick={onClose}
              className="font-black"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {!embedded && showPanel && selectedUnit && (
        <div
          id="unit-details-panel"
          className="absolute top-5 left-5 bg-card p-6 rounded-lg shadow-lg w-80 z-[100]"
        >
          <button
            data-testid="button-close-panel"
            onClick={hideDetailsPanel}
            className="absolute top-3 right-4 text-2xl text-muted-foreground hover:text-foreground"
          >
            &times;
          </button>

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold uppercase">
                UNIT {selectedUnit.unitNumber}
              </h2>
              {activeVisitId && viewedUnitIds.has(selectedUnit.id) && (
                <Badge 
                  variant="outline" 
                  className="bg-primary/10 text-primary border-primary text-xs"
                  data-testid={`badge-viewed-3d-${selectedUnit.unitNumber}`}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  VIEWED
                </Badge>
              )}
            </div>
            {isLoading && (
              <div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin" />
            )}
          </div>

          {selectedUnit.floorPlan?.imgUrl && (
            <div className="mb-4">
              <img
                src={selectedUnit.floorPlan.imgUrl}
                alt="Floor Plan"
                className="w-full max-h-64 object-contain rounded border"
                data-testid="img-floor-plan"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between">
              <strong>PRICE:</strong>
              <span data-testid="text-unit-price">
                ${selectedUnit.price.toLocaleString()}
              </span>
            </div>
            {selectedUnit.floorPlan && (
              <>
                <div className="flex justify-between">
                  <strong>FLOOR PLAN:</strong>
                  <span data-testid="text-floor-plan">
                    {selectedUnit.floorPlan.planName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <strong>SQ FT:</strong>
                  <span data-testid="text-sq-ft">
                    {selectedUnit.floorPlan.sqFt.toLocaleString()}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center">
              <strong>STATUS:</strong>
              <select
                data-testid="select-unit-status"
                value={selectedUnit.status}
                onChange={(e) =>
                  setSelectedUnit({ ...selectedUnit, status: e.target.value })
                }
                className="px-2 py-1 rounded border bg-background"
              >
                <option value="available">Available</option>
                <option value="on_hold">On Hold</option>
                <option value="contract">Contract</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>

          {prospectContext ? (
            <>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-bold uppercase mb-1">Prospect</p>
                <p className="text-sm text-muted-foreground">{prospectContext.prospectName}</p>
              </div>
              
              {selectedUnit.status === 'available' && (
                <Button
                  data-testid="button-hold-for-prospect"
                  onClick={handleHoldUnitForProspect}
                  className="w-full mt-4 uppercase"
                  disabled={isLoading}
                >
                  HOLD UNIT FOR PROSPECT
                </Button>
              )}
              
              {selectedUnit.status !== 'available' && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-center">
                  <p className="text-sm font-bold uppercase">
                    Unit {selectedUnit.status === 'on_hold' ? 'On Hold' : selectedUnit.status === 'contract' ? 'In Contract' : 'Sold'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <Button
                data-testid="button-save-changes"
                onClick={handleSaveChanges}
                className="w-full mt-4 uppercase"
                disabled={isLoading}
              >
                SAVE CHANGES
              </Button>
              
              <Button
                data-testid="button-add-prospect"
                onClick={() => setShowProspectForm(true)}
                className="w-full mt-2 uppercase"
                variant="outline"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                ADD PROSPECT
              </Button>
            </>
          )}
        </div>
      )}

      <div className="absolute bottom-6 right-6 w-36 h-36 pointer-events-none z-[100]">
        <img
          ref={compassImgRef}
          src="/compass.png"
          alt="Compass"
          className="w-full transition-transform duration-100"
        />
      </div>

      {vizMode === 'LIVE' ? (
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          data-testid="canvas-3d-viewer"
        />
      ) : (
        // PRE-CONSTRUCTION GALLERY MODE
        <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] relative">
          {GALLERY_RENDERINGS[currentProject.id] && GALLERY_RENDERINGS[currentProject.id].length > 0 ? (
            <>
              <img
                src={GALLERY_RENDERINGS[currentProject.id][currentGalleryIndex]}
                alt={`${currentProject.name} Pre-Construction Rendering ${currentGalleryIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                data-testid="gallery-rendering"
              />
              
              {/* Gallery Navigation */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-sm px-6 py-3 rounded-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentGalleryIndex((prev) => 
                    prev === 0 ? GALLERY_RENDERINGS[currentProject.id].length - 1 : prev - 1
                  )}
                  data-testid="button-gallery-prev"
                  className="text-white hover:text-primary"
                >
                  PREV
                </Button>
                <span className="text-white font-bold uppercase text-sm">
                  {currentGalleryIndex + 1} / {GALLERY_RENDERINGS[currentProject.id].length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentGalleryIndex((prev) => 
                    prev === GALLERY_RENDERINGS[currentProject.id].length - 1 ? 0 : prev + 1
                  )}
                  data-testid="button-gallery-next"
                  className="text-white hover:text-primary"
                >
                  NEXT
                </Button>
              </div>

              {/* Gallery Info Overlay */}
              <div className="absolute top-8 left-8 bg-black/60 backdrop-blur-sm px-6 py-4 rounded-lg">
                <h3 className="text-white font-black uppercase text-xl mb-1">
                  {currentProject.name}
                </h3>
                <p className="text-white/70 text-sm uppercase">
                  Pre-Construction Rendering
                </p>
              </div>
            </>
          ) : (
            <div className="text-center text-white">
              <p className="text-xl font-bold uppercase mb-2">No Renderings Available</p>
              <p className="text-sm text-white/70">Switch to LIVE 3D view to explore units</p>
            </div>
          )}
        </div>
      )}
      
      {selectedUnit && (
        <ProspectQuickAddForm
          isOpen={showProspectForm}
          onClose={() => setShowProspectForm(false)}
          unitId={selectedUnit.id}
          unitNumber={selectedUnit.unitNumber}
          agentName={agentContextStore.getAgentName() || 'Agent'}
        />
      )}
    </div>
  );
}
