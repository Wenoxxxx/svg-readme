import { useState, useEffect } from "react";
import type { ReactNode, MutableRefObject } from "react";
import EditorTopNav from "../components/ui/EditorTopNav";
import TopToolbar from "../components/ui/TopToolbar";
import EditorSidebar from "../components/ui/EditorSidebar";
import EditorRightBar from "../components/ui/EditorRightBar";
import type { EditorTool } from "../context/EditorContext";
import { type FrameSize } from "../components/editor-sidebar/FramePanel";
import type { ElementProperties } from "../components/editor-canvas/ElementsRenderer";
import type { DocumentState } from "../lib/designFile";

interface EditorLayoutProps {
  children: ReactNode;
  frameSize: FrameSize;
  setFrameSize: (size: FrameSize) => void;
  onToolSelect?: (tool: EditorTool) => void;
  onExport?: () => void;
  onNewProject?: () => void;
  isProjectActive?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  selectedLayerIds?: string[];
  elementProperties?: Record<string, ElementProperties>;
  onUpdateProperties?: (id: string, updates: Partial<ElementProperties>) => void;
  onBulkUpdateProperties?: (updates: Partial<ElementProperties>) => void;
  onPropertiesStart?: () => void;
  onMoveElement?: (id: string, x: number, y: number) => void;
  onAlignmentStart?: () => void;
  onLayerContextAction?: (actionId: string, layerId: string) => void;
  /** Live document state ref for the navbar Save button / autosave flush. */
  documentRef?: MutableRefObject<DocumentState>;
  activeRightTab?: "design" | "animate" | "export";
  onRightTabChange?: (tab: "design" | "animate" | "export") => void;
  onInsertComponent?: (id: string) => void;
  onInsertBackground?: (id: string, opts?: import("../lib/templates/backgroundAnimations").BackgroundTemplateOptions) => void;
}

export default function EditorLayout({
  children,
  frameSize,
  setFrameSize,
  onToolSelect,
  onExport,
  onNewProject,
  isProjectActive,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedLayerIds,
  elementProperties,
  onUpdateProperties,
  onBulkUpdateProperties,
  onPropertiesStart,
  onMoveElement,
  onAlignmentStart,
  onLayerContextAction,
  documentRef,
  activeRightTab: controlledRightTab,
  onRightTabChange: controlledOnRightTabChange,
  onInsertComponent,
  onInsertBackground,
}: EditorLayoutProps) {
  const [internalRightTab, setInternalRightTab] = useState<"design" | "animate" | "export">("design");
  const activeRightTab = controlledRightTab ?? internalRightTab;
  const onRightTabChange = controlledOnRightTabChange ?? setInternalRightTab;
  const [copyError, setCopyError] = useState<string | null>(null);

  // Transient toast for clipboard failures (non-HTTPS origins, denied permission).
  useEffect(() => {
    const handler = (e: Event) => {
      const message = (e as CustomEvent).detail?.message as string | undefined;
      setCopyError(message ?? "Copy unavailable — use download instead.");
    };
    window.addEventListener("copy-failed", handler);
    return () => window.removeEventListener("copy-failed", handler);
  }, []);

  useEffect(() => {
    if (!copyError) return;
    const t = setTimeout(() => setCopyError(null), 4000);
    return () => clearTimeout(t);
  }, [copyError]);
  return (
    <div className="h-screen w-screen flex flex-col bg-[#09090b] text-zinc-100 font-[Poppins] selection:bg-blue-500/30 selection:text-white">
      <EditorTopNav
        onExport={onExport}
        onNewProject={onNewProject}
        isProjectActive={isProjectActive}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        frameSize={isProjectActive ? frameSize : undefined}
        documentRef={documentRef}
      />

      {isProjectActive && (
        <TopToolbar
          onToolSelect={onToolSelect}
          activeRightTab={activeRightTab}
          onRightTabChange={onRightTabChange}
          onInsertComponent={onInsertComponent}
          onInsertBackground={onInsertBackground}
        />
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <EditorSidebar
          frameSize={frameSize}
          setFrameSize={setFrameSize}
          onLayerContextAction={onLayerContextAction}
        />

        <main className="flex-1 overflow-auto flex items-center justify-center bg-zinc-950/50 relative shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
          {/* Subtle grid pattern for the canvas background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          {children}
        </main>
        <EditorRightBar
          onExport={onExport}
          selectedLayerIds={selectedLayerIds}
          elementProperties={elementProperties}
          onUpdateProperties={onUpdateProperties}
          onBulkUpdateProperties={onBulkUpdateProperties}
          onPropertiesStart={onPropertiesStart}
          onMoveElement={onMoveElement}
          onAlignmentStart={onAlignmentStart}
          frameSize={frameSize}
          activeTab={activeRightTab}
          onTabChange={onRightTabChange}
        />
      </div>

      {copyError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-lg bg-red-950/95 border border-red-500/40 text-sm text-red-200 shadow-2xl"
        >
          {copyError}
        </div>
      )}
    </div>
  );
}
