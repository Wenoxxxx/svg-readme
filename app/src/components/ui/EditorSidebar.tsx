import LayerPanel from "../editor-sidebar/LayerPanel";
import FramePanel from "../editor-sidebar/FramePanel";
import type { FrameSize } from "../editor-sidebar/FramePanel";
import { useEditor, type EditorTool } from "../../context/EditorContext";

// ─── Component (local-only: LayerPanel owns state, no backend sync) ──────────

interface EditorSidebarProps {
  frameSize: FrameSize;
  setFrameSize: (size: FrameSize) => void;
  /** @deprecated Tool selection now handled by TopToolbar; kept for backwards compat */
  onToolSelect?: (tool: EditorTool) => void;
  onLayerContextAction?: (actionId: string, layerId: string) => void;
}

export default function EditorSidebar({
  frameSize,
  setFrameSize,
  onLayerContextAction,
}: EditorSidebarProps) {
  const { layers, setLayers, selectLayer, clearSelection, elementProperties } = useEditor();

  return (
    <aside className="w-72 shrink-0 border-r border-white/5 bg-[#09090b]/95 backdrop-blur-xl flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      {/* Frame size controls — always visible for canvas resizing */}
      <FramePanel frameSize={frameSize} setFrameSize={setFrameSize} />

      {/* Layers Section */}
      <LayerPanel
        layers={layers}
        setLayers={setLayers}
        elementProperties={elementProperties}
        onContextAction={onLayerContextAction}
        onSelectLayer={(id) => selectLayer(id, false)}
        onClearSelection={clearSelection}
      />
    </aside>
  );
}
