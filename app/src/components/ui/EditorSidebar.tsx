import { useEffect } from "react";
import {
  Type,
  Image as ImageIcon,
  Square,
  PenTool,
  Maximize,
  MousePointer2,
} from "lucide-react";
import LayerPanel from "../editor-sidebar/LayerPanel";
import type { LayerType } from "../editor-sidebar/LayerPanel";
import FramePanel from "../editor-sidebar/FramePanel";
import type { FrameSize } from "../editor-sidebar/FramePanel";
import { useEditor, type EditorTool } from "../../context/EditorContext";
import {
  getLayers,
  createLayer,
  updateLayer,
  deleteLayer,
  reorderLayers,
  type ApiLayer,
} from "../../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMP_PROJECT_ID = "00000000-0000-0000-0000-000000000001";

const toolList: { id: string; icon: React.ReactNode; name: string }[] = [
  { id: "move", icon: <MousePointer2 className="w-4 h-4" />, name: "Move" },
  { id: "pen", icon: <PenTool className="w-4 h-4" />, name: "Pen" },
  { id: "frame", icon: <Maximize className="w-4 h-4" />, name: "Frame" },
  { id: "rect", icon: <Square className="w-4 h-4" />, name: "Shapes" },
  { id: "text", icon: <Type className="w-4 h-4" />, name: "Text" },
  { id: "image", icon: <ImageIcon className="w-4 h-4" />, name: "Image" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toLayerType = (l: ApiLayer): LayerType => ({
  id: l.id,
  name: l.name,
  type: "shape",
  locked: l.isLocked,
  visible: l.isVisible,
});

// ─── Component ────────────────────────────────────────────────────────────────

interface EditorSidebarProps {
  frameSize: FrameSize;
  setFrameSize: (size: FrameSize) => void;
  onToolSelect?: (tool: EditorTool) => void;
}

export default function EditorSidebar({
  frameSize,
  setFrameSize,
  onToolSelect,
}: EditorSidebarProps) {
  const { activeTool, layers, setLayers } = useEditor();
  const projectId = TEMP_PROJECT_ID;

  // ── Fetch layers on mount ──────────────────────────────────────────────────
  useEffect(() => {
    getLayers(projectId)
      .then((fetched) => {
        if (fetched.length > 0) {
          setLayers(fetched.map(toLayerType));
        }
      })
      .catch(console.error);
  }, [projectId, setLayers]);

  // ── Tool click handler ──────────────────────────────────────────────────────
  const handleToolClick = (toolId: string) => {
    // All tools go through onToolSelect so the parent (Editor.tsx) can
    // handle side effects like committing text before switching tools.
    onToolSelect?.(toolId as EditorTool);
  };

  // ── Layer callbacks (called by LayerPanel after optimistic updates) ────────
  const handleLayerAdd = (layer: LayerType, insertIndex: number) => {
    createLayer(projectId, {
      id: layer.id,
      name: layer.name,
      orderIndex: insertIndex,
    })
      .then(() => {
        // After successfully creating, we can optionally trigger a reorder sync for the other layers
        setLayers((prev) => {
          reorderLayers(
            projectId,
            prev.map((l, i) => ({ id: l.id, orderIndex: i })),
          ).catch(console.error);
          return prev;
        });
      })
      .catch(console.error);
  };

  const handleLayerDelete = (id: string) => {
    deleteLayer(projectId, id).catch(console.error);
  };

  const handleLayerRename = (id: string, name: string) => {
    updateLayer(projectId, id, { name }).catch(console.error);
  };

  const handleToggleVisibility = (id: string, isVisible: boolean) => {
    updateLayer(projectId, id, { isVisible }).catch(console.error);
  };

  const handleToggleLock = (id: string, isLocked: boolean) => {
    updateLayer(projectId, id, { isLocked }).catch(console.error);
  };

  const handleLayerReorder = (
    ordered: { id: string; orderIndex: number }[],
  ) => {
    reorderLayers(projectId, ordered).catch(console.error);
  };

  return (
    <aside className="w-72 shrink-0 border-r border-white/5 bg-[#09090b]/95 backdrop-blur-xl flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      {/* Tools Section */}
      <div className="p-4 border-b border-white/5">
        <div className="grid grid-cols-4 gap-2">
          {toolList.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              title={tool.name}
              className={`p-2.5 rounded-md flex items-center justify-center transition-all ${
                activeTool === tool.id
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              }`}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Panels */}
      {activeTool === "frame" && (
        <FramePanel frameSize={frameSize} setFrameSize={setFrameSize} />
      )}

      {/* Layers Section */}
      <LayerPanel
        layers={layers}
        setLayers={setLayers}
        onAdd={handleLayerAdd}
        onDelete={handleLayerDelete}
        onRename={handleLayerRename}
        onToggleVisibility={handleToggleVisibility}
        onToggleLock={handleToggleLock}
        onReorder={handleLayerReorder}
      />
    </aside>
  );
}

// ─── Util ─────────────────────────────────────────────────────────────────────
