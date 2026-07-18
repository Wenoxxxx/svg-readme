import { useState, useEffect } from "react";
import LayerPanel, { type LayerType } from "../editorSidebar/LayerPanel";
import FramePanel, { type FrameSize } from "../editorSidebar/FramePanel";
import ToolPanel from "../editorSidebar/ToolPanel";
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

const fallbackLayers: LayerType[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map an ApiLayer (backend) → LayerType (frontend) */
const toLayerType = (l: ApiLayer): LayerType => ({
  id: l.id,
  name: l.name,
  type: "shape", // Element types come in a future iteration
  locked: l.isLocked,
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

  // ── Generic layer creation handler (shapes, text, image) ───────────────────
  const handleAddLayer = (type: string, name: string) => {
    const tempId = Date.now().toString();
    const newLayer: LayerType = {
      id: tempId,
      name: `New ${name}`,
      type,
      locked: false,
      visible: true,
      active: true,
    };

    setLayers(prev => {
      const activeIndex = prev.findIndex(l => l.active);
      const insertIndex = activeIndex >= 0 ? activeIndex : 0;
      const updated = prev.map(l => ({ ...l, active: false }));
      updated.splice(insertIndex, 0, newLayer);

      // Persist to backend (fire-and-forget)
      createLayer(projectId, { id: tempId, name: newLayer.name, orderIndex: insertIndex })
        .catch(console.error);
      reorderLayers(projectId, updated.map((l, i) => ({ id: l.id, orderIndex: i })))
        .catch(console.error);

      return updated;
    });
  };

  // ── Layer callbacks (called by LayerPanel after optimistic updates) ────────
  const handleLayerAdd = (layer: LayerType, insertIndex: number) => {
    createLayer(projectId, { id: layer.id, name: layer.name, orderIndex: insertIndex })
      .then(() => {
        setLayers(prev => {
          reorderLayers(projectId, prev.map((l, i) => ({ id: l.id, orderIndex: i })))
            .catch(console.error);
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

  const handleLayerReorder = (ordered: { id: string; orderIndex: number }[]) => {
    reorderLayers(projectId, ordered).catch(console.error);
  };

  return (
    <aside className="w-72 shrink-0 border-r border-white/5 bg-[#09090b]/95 backdrop-blur-xl flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      {/* Tools Section */}
      <ToolPanel
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onAddLayer={handleAddLayer}
      />

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