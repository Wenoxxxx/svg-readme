import { useState, useEffect } from "react";
import { Type, Image as ImageIcon, Square, Circle, PenTool, Maximize, MousePointer2 } from "lucide-react";
import LayerPanel, { type LayerType } from "../editorSidebar/LayerPanel";
import FramePanel, { type FrameSize } from "../editorSidebar/FramePanel";
import {
  getLayers,
  createLayer,
  updateLayer,
  deleteLayer,
  reorderLayers,
  type ApiLayer,
} from "../../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Temporary project ID used until proper project/auth flow is implemented.
 * Replace this with a value coming from routing (e.g. useParams) or context
 * once the project creation endpoint is wired to the UI.
 */
const TEMP_PROJECT_ID = "00000000-0000-0000-0000-000000000001";

const fallbackLayers: LayerType[] = [
  { id: "4", name: "Main Title",      type: "text",   locked: false, visible: true,  active: true },
  { id: "5", name: "Subtitle",        type: "text",   locked: false, visible: true },
  { id: "2", name: "Avatar Ring",     type: "circle", locked: false, visible: true },
  { id: "3", name: "Hero Image",      type: "image",  locked: false, visible: true },
  { id: "6", name: "Decorative Dots", type: "group",  locked: false, visible: false },
  { id: "1", name: "Background",      type: "shape",  locked: true,  visible: true },
];

const tools = [
  { id: "select", icon: <MousePointer2 className="w-4 h-4" />, name: "Select" },
  { id: "frame",  icon: <Maximize     className="w-4 h-4" />, name: "Frame" },
  { id: "rect",   icon: <Square       className="w-4 h-4" />, name: "Rectangle" },
  { id: "circle", icon: <Circle       className="w-4 h-4" />, name: "Circle" },
  { id: "text",   icon: <Type         className="w-4 h-4" />, name: "Text" },
  { id: "pen",    icon: <PenTool      className="w-4 h-4" />, name: "Pen" },
  { id: "image",  icon: <ImageIcon    className="w-4 h-4" />, name: "Image" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map an ApiLayer (backend) → LayerType (frontend) */
const toLayerType = (l: ApiLayer): LayerType => ({
  id:      l.id,
  name:    l.name,
  type:    "shape", // Element types come in a future iteration
  locked:  l.isLocked,
  visible: l.isVisible,
});

// ─── Component ────────────────────────────────────────────────────────────────

interface EditorSidebarProps {
  frameSize: FrameSize;
  setFrameSize: (size: FrameSize) => void;
}

export default function EditorSidebar({ frameSize, setFrameSize }: EditorSidebarProps) {
  const [layers, setLayers] = useState<LayerType[]>(fallbackLayers);
  const [activeTool, setActiveTool] = useState("select");
  const projectId = TEMP_PROJECT_ID;

  // ── Fetch layers on mount ──────────────────────────────────────────────────
  useEffect(() => {
    getLayers(projectId)
      .then(fetched => {
        if (fetched.length > 0) {
          setLayers(fetched.map(toLayerType));
        }
      })
      .catch(console.error);
  }, [projectId]);

  // ── Tool click: create layer via API ──────────────────────────────────────
  const handleToolClick = (toolId: string, toolName: string) => {
    setActiveTool(toolId);

    if (["rect", "circle", "text", "image"].includes(toolId)) {
      const tempId = Date.now().toString();
      const newLayer: LayerType = {
        id:      tempId,
        name:    `New ${toolName}`,
        type:    toolId,
        locked:  false,
        visible: true,
        active:  true,
      };

      // Optimistic update
      setLayers(prev => {
        const activeIndex  = prev.findIndex(l => l.active);
        const insertIndex  = activeIndex >= 0 ? activeIndex : 0;
        const updated = prev.map(l => ({ ...l, active: false }));
        updated.splice(insertIndex, 0, newLayer);

        // Persist to backend (fire-and-forget)
        createLayer(projectId, { id: tempId, name: newLayer.name, orderIndex: insertIndex })
          .catch(console.error);
        reorderLayers(projectId, updated.map((l, i) => ({ id: l.id, orderIndex: i })))
          .catch(console.error);

        return updated;
      });

      setTimeout(() => setActiveTool("select"), 100);
    }
  };

  // ── Layer callbacks (called by LayerPanel after optimistic updates) ────────
  const handleLayerAdd = (layer: LayerType, insertIndex: number) => {
    createLayer(projectId, { id: layer.id, name: layer.name, orderIndex: insertIndex })
      .catch(console.error);
    setLayers(prev =>
      reorderPayload(prev).map(l => l) // trigger reorder after add
    );
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

  const handleLayerReorder = (ordered: { id: string; orderIndex: number }[]) => {
    reorderLayers(projectId, ordered).catch(console.error);
  };

  return (
    <aside className="w-72 shrink-0 border-r border-white/5 bg-[#09090b]/95 backdrop-blur-xl flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      {/* Tools Section */}
      <div className="p-4 border-b border-white/5">
        <div className="grid grid-cols-4 gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id, tool.name)}
              title={tool.name}
              className={`p-2.5 rounded-md flex items-center justify-center transition-all ${activeTool === tool.id
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                }`}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Panels */}
      {activeTool === 'frame' && (
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

/** Map current layer array → reorder payload */
function reorderPayload(layers: LayerType[]) {
  return layers.map((l, i) => ({ id: l.id, orderIndex: i }));
}