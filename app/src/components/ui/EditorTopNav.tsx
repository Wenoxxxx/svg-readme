import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  DownloadSimple,
  FilePlus,
  ArrowCounterClockwise,
  ArrowClockwise,
  FloppyDisk,
  FolderOpen,
  Check,
  Spinner,
  WarningCircle,
  Keyboard,
  Question,
} from "@phosphor-icons/react";
import { startEditorTour, TOUR_STATE_EVENT } from "./EditorTour/EditorTour";
import { Link, useNavigate } from "react-router-dom";
import { useEditor } from "../../context/EditorContext";
import { UnsavedChangesModal } from "./UnsavedChangesModal";
import {
  onSaveStatus,
  saveDocument,
  type DocumentState,
  type SaveStatus,
} from "../../lib/persistence";
import {
  downloadDesignFile,
  readDesignFileFromFile,
  DesignFileError,
} from "../../lib/designFile";

interface EditorTopNavProps {
  onExport?: () => void;
  onNewProject?: () => void;
  isProjectActive?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  frameSize?: { width: number; height: number };
  /** Full document state for file save */
  documentRef?: React.MutableRefObject<DocumentState>;
}

export default function EditorTopNav({
  onExport,
  onNewProject,
  isProjectActive,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  frameSize,
  documentRef,
}: EditorTopNavProps) {
  const { isDirty, markClean, projectName, setProjectName } = useEditor();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  // Editable project name: double-click the badge to rename inline.
  const [renamingName, setRenamingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingName) nameInputRef.current?.select();
  }, [renamingName]);

  const commitRename = () => {
    const trimmed = nameDraft.trim();
    if (trimmed) setProjectName(trimmed);
    setRenamingName(false);
    setNameDraft(projectName);
  };

  useEffect(() => {
    return onSaveStatus(setSaveStatus);
  }, []);

  // Guide active state — lights the About button while explore/walkthrough is open.
  const [guideActive, setGuideActive] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      setGuideActive(Boolean((e as CustomEvent).detail?.open));
    };
    window.addEventListener(TOUR_STATE_EVENT, handler);
    return () => window.removeEventListener(TOUR_STATE_EVENT, handler);
  }, []);

  // ── Modal state for unsaved-changes guards ───────────────────────
  const [unsavedModalAction, setUnsavedModalAction] = useState<"new" | "open" | "back" | null>(
    null,
  );

  const closeUnsavedModal = () => setUnsavedModalAction(null);

  const handleBack = (e: React.MouseEvent) => {
    if (isDirty && isProjectActive) {
      e.preventDefault();
      setUnsavedModalAction("back");
    }
  };

  const handleNew = () => {
    if (isDirty) {
      setUnsavedModalAction("new");
    } else {
      onNewProject?.();
    }
  };

  const handleSave = useCallback(async () => {
    if (!documentRef?.current) return;
    downloadDesignFile(documentRef.current, projectName);
    await saveDocument(documentRef.current);
    markClean();
  }, [documentRef, projectName, markClean]);

  // Ctrl+S bus from useEditorPersistence.
  useEffect(() => {
    const handler = () => void handleSave();
    window.addEventListener("request-design-save", handler);
    return () => window.removeEventListener("request-design-save", handler);
  }, [handleSave]);

  const openFilePicker = useCallback(() => {
    setOpenError(null);
    fileInputRef.current?.click();
  }, []);

  const handleOpenClick = useCallback(() => {
    if (isDirty) {
      setUnsavedModalAction("open");
      return;
    }
    openFilePicker();
  }, [isDirty, openFilePicker]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        const { doc, name } = await readDesignFileFromFile(file);
        window.dispatchEvent(new CustomEvent("open-design", { detail: { doc, name } }));
      } catch (err) {
        setOpenError(
          err instanceof DesignFileError ? err.message : "Could not open design file.",
        );
      }
    },
    [],
  );

  const dimensionsLabel = frameSize ? `${frameSize.width} × ${frameSize.height}` : "draft";

  const statusIcon = () => {
    switch (saveStatus.kind) {
      case "saving":
        return <Spinner className="w-3 h-3 animate-spin text-zinc-400" />;
      case "saved":
        return <Check className="w-3 h-3 text-green-400" />;
      case "error":
        return (
          <span title={saveStatus.message}>
            <WarningCircle className="w-3 h-3 text-red-400" />
          </span>
        );
      default:
        return isDirty ? (
          <span className="w-2 h-2 rounded-full bg-amber-400/80" title="Unsaved changes" />
        ) : null;
    }
  };

  // ── Modal action handlers ─────────────────────────────────────────
  const handleModalSaveAndContinue = async () => {
    if (unsavedModalAction === "back") {
      await handleSave();
      closeUnsavedModal();
      navigate("/");
    } else if (unsavedModalAction === "new") {
      await handleSave();
      closeUnsavedModal();
      onNewProject?.();
    } else if (unsavedModalAction === "open") {
      await handleSave();
      closeUnsavedModal();
      openFilePicker();
    }
  };

  const handleModalDiscard = async () => {
    if (unsavedModalAction === "back") {
      closeUnsavedModal();
      navigate("/");
    } else if (unsavedModalAction === "new") {
      closeUnsavedModal();
      onNewProject?.();
    } else if (unsavedModalAction === "open") {
      closeUnsavedModal();
      openFilePicker();
    }
  };

  const modalTitle =
    unsavedModalAction === "new"
      ? "Start New Project?"
      : unsavedModalAction === "open"
        ? "Open Another Design?"
        : "Leave Editor?";

  const modalDescription =
    unsavedModalAction === "new"
      ? "Your current canvas will be cleared."
      : unsavedModalAction === "open"
        ? "Opening a design file will replace your current canvas."
        : "You have unsaved changes. Leave anyway?";

  return (
    <>
      <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-5">
          <Link
            to="/"
            onClick={handleBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <img className="w-7 h-7" src={`${import.meta.env.BASE_URL}svg-readme-logo.png`} alt="svg-readme" />
            <span className="font-[Poppins] font-medium text-[15px]">svg-readme</span>
            {isProjectActive && (
              <>
                <span className="flex items-center justify-center w-4 h-4">{statusIcon()}</span>
                {renamingName ? (
                  <input
                    ref={nameInputRef}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingName(false);
                    }}
                    aria-label="Project name"
                    className="w-40 px-2 py-0.5 rounded text-[11px] font-[JetBrains_Mono] bg-zinc-900 text-zinc-200 border border-blue-500/50 outline-none"
                  />
                ) : (
                  <span
                    onDoubleClick={() => {
                      setNameDraft(projectName);
                      setRenamingName(true);
                    }}
                    title="Double-click to rename"
                    className="px-2 py-0.5 rounded text-[11px] font-[JetBrains_Mono] bg-zinc-800/50 text-zinc-400 border border-white/5 hover:border-white/20 hover:text-zinc-200 transition-colors cursor-text"
                  >
                    {projectName}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[11px] font-[JetBrains_Mono] bg-zinc-800/30 text-zinc-500 border border-white/5">
                  {dimensionsLabel}
                </span>
              </>
            )}
            {!isProjectActive && (
              <span className="ml-1 px-2 py-0.5 rounded text-[11px] font-[JetBrains_Mono] bg-zinc-800/50 text-zinc-400 border border-white/5">
                draft
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {openError && (
            <span className="text-xs text-red-400 max-w-56 truncate" title={openError}>
              {openError}
            </span>
          )}
          {isProjectActive && (
            <div className="flex items-center gap-1" data-tour="history" aria-label="About and history controls">
              <button
                onClick={startEditorTour}
                title="About this editor — hover to learn each tool"
                aria-label="About editor tools"
                aria-pressed={guideActive}
                className={`p-2 rounded-md transition-colors ${
                  guideActive
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Question className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("toggle-shortcuts"))}
                title="Keyboard shortcuts (Ctrl+/)"
                aria-label="Keyboard shortcuts"
                className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 mr-1" aria-label="History controls">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl/Cmd+Z)"
                className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowCounterClockwise className="w-4 h-4" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl/Cmd+Shift+Z)"
                className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowClockwise className="w-4 h-4" />
              </button>
              </div>
            </div>
          )}

          {isProjectActive && (
            <>
              <button
                onClick={handleOpenClick}
                data-tour="file-actions"
                title="Open design JSON file"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white border border-white/10 hover:bg-white/5 rounded-md transition-all duration-200"
              >
                <FolderOpen className="w-4 h-4" />
                Open
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Open design file"
              />

              <button
                onClick={handleSave}
                disabled={saveStatus.kind === "saving"}
                title="Save design as JSON file (Ctrl+S)"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white border border-white/10 hover:bg-white/5 rounded-md transition-all duration-200 disabled:opacity-50"
              >
                <FloppyDisk className="w-4 h-4" />
                Save
              </button>
            </>
          )}

          {isProjectActive && (
            <button
              onClick={handleNew}
              title="New Project"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white border border-white/10 hover:bg-white/5 rounded-md transition-all duration-200"
            >
              <FilePlus className="w-4 h-4" />
              New
            </button>
          )}

          <button
            onClick={onExport}
            data-tour="export"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all duration-200 border border-blue-500/50"
          >
            <DownloadSimple className="w-4 h-4" />
            Export SVG
          </button>
        </div>
      </header>

      <UnsavedChangesModal
        open={unsavedModalAction !== null}
        onClose={closeUnsavedModal}
        onDiscard={handleModalDiscard}
        onSaveAndContinue={handleModalSaveAndContinue}
        title={modalTitle}
        description={modalDescription}
      />
    </>
  );
}
