import LayerPanel, {
  type LayerPanelDocumentActions,
} from "../editor-sidebar/LayerPanel";
import { layerPanelTheme } from "../editor-sidebar/LayerPanel/theme";
import { useEditor } from "../../context/EditorContext";

// ─── Component (local-only: LayerPanel owns state, no backend sync) ──────────

interface EditorSidebarProps {
  onLayerContextAction?: (actionId: string, layerId: string) => void;
  /**
   * Document-level callbacks (history, delete, add) owned by the editor page.
   * Threaded through so every panel mutation is undoable.
   */
  layerPanelActions?: LayerPanelDocumentActions;
}

export default function EditorSidebar({
  onLayerContextAction,
  layerPanelActions,
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
        {...layerPanelActions}
      />
    </aside>
  );
}
