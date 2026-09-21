import LayerPanel from "../editor-sidebar/LayerPanel";
import { layerPanelTheme } from "../editor-sidebar/LayerPanel/theme";
import { useEditor, type EditorTool } from "../../context/EditorContext";

// ─── Component (local-only: LayerPanel owns state, no backend sync) ──────────

interface EditorSidebarProps {
  /** @deprecated Tool selection now handled by TopToolbar; kept for backwards compat */
  onToolSelect?: (tool: EditorTool) => void;
  onLayerContextAction?: (actionId: string, layerId: string) => void;
}

export default function EditorSidebar({
  onLayerContextAction,
}: EditorSidebarProps) {
  const {
    layers,
    setLayers,
    setSelection,
    clearSelection,
    elementProperties,
    clipboardLayerCount,
  } = useEditor();

  return (
    <aside className={layerPanelTheme.sidebar}>
      {/* Layers Section */}
      <LayerPanel
        layers={layers}
        setLayers={setLayers}
        elementProperties={elementProperties}
        onContextAction={onLayerContextAction}
        onSelectionChange={setSelection}
        onClearSelection={clearSelection}
        clipboardCount={clipboardLayerCount}
      />
    </aside>
  );
}
