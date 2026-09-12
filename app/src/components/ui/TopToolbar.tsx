import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Text as TextIcon,
  Image as ImageIcon,
  Square,
  Circle,
  Pencil,
  MousePointer2,
  Hand,
  Triangle,
  Star,
  Hexagon,
  PaintBucket,
  LayoutTemplate,
} from "lucide-react";
import { CaretDown, LineSegment } from "@phosphor-icons/react";
import { useEditor, type EditorTool, type ShapeSubTool } from "../../context/EditorContext";
import ColorPickerPopover from "./ColorPickerPopover";
import { ANIMATED_COMPONENTS } from "../../lib/templates/animatedComponents";
import {
  BACKGROUND_TEMPLATES,
  type BackgroundTemplateOptions,
} from "../../lib/templates/backgroundAnimations";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RightBarTab = "design" | "animate" | "export";

interface TopToolbarProps {
  onToolSelect?: (tool: EditorTool) => void;
  activeRightTab?: RightBarTab;
  onRightTabChange?: (tab: RightBarTab) => void;
  onInsertComponent?: (id: string) => void;
  onInsertBackground?: (id: string, opts?: BackgroundTemplateOptions) => void;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

type ToolDef = { id: EditorTool; icon: React.ReactNode; name: string; shortcut?: string };
type ShapeToolDef = { id: ShapeSubTool; icon: React.ReactNode; name: string; shortcut?: string };

const navigationTools: ToolDef[] = [
  { id: "move", icon: <MousePointer2 className="w-4 h-4" />, name: "Move", shortcut: "V" },
  { id: "hand", icon: <Hand className="w-4 h-4" />, name: "Hand", shortcut: "H" },
];

const creationTools: ToolDef[] = [
  { id: "pen", icon: <Pencil className="w-4 h-4" />, name: "Pen", shortcut: "P" },
  { id: "text", icon: <TextIcon className="w-4 h-4" />, name: "Text", shortcut: "T" },
];

const shapeTools: ShapeToolDef[] = [
  { id: "rect", icon: <Square className="w-4 h-4" />, name: "Rectangle", shortcut: "R" },
  { id: "circle", icon: <Circle className="w-4 h-4" />, name: "Circle", shortcut: "O" },
  { id: "triangle", icon: <Triangle className="w-4 h-4" />, name: "Triangle" },
  { id: "star", icon: <Star className="w-4 h-4" />, name: "Star" },
  { id: "hexagon", icon: <Hexagon className="w-4 h-4" />, name: "Hexagon" },
  { id: "line", icon: <LineSegment className="w-4 h-4" />, name: "Line", shortcut: "L" },
];

const utilityTools: ToolDef[] = [
  { id: "image", icon: <ImageIcon className="w-4 h-4" />, name: "Image" },
  { id: "paint", icon: <PaintBucket className="w-4 h-4" />, name: "Paint Bucket" },
];

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="w-px h-6 bg-white/10 shrink-0" aria-hidden="true" />;
}

// ─── Tool button ─────────────────────────────────────────────────────────────

function ToolButton({
  tool,
  isActive,
  onSelect,
}: {
  tool: ToolDef;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      title={tool.shortcut ? `${tool.name} (${tool.shortcut})` : tool.name}
      aria-pressed={isActive}
      aria-label={tool.name}
      className={`p-2 rounded-md flex items-center justify-center transition-all shrink-0 ${
        isActive
          ? "bg-blue-600/20 text-blue-400"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
      }`}
    >
      {tool.icon}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TopToolbar({ onToolSelect, activeRightTab, onRightTabChange, onInsertComponent, onInsertBackground }: TopToolbarProps) {
  const { activeTool, selectedShapeKind, setActiveTool, setSelectedShapeKind, paintColor, setPaintColor } = useEditor();

  // Flyout state — portal-based so it renders on very top (above sidebars)
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const flyoutMenuRef = useRef<HTMLDivElement>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ left: number; top: number } | null>(null);

  // Templates flyout (separate from shape flyout)
  const [tplOpen, setTplOpen] = useState(false);
  const tplRef = useRef<HTMLDivElement>(null);
  const tplMenuRef = useRef<HTMLDivElement>(null);
  const [tplPos, setTplPos] = useState<{ left: number; top: number } | null>(null);

  // Background template options — applied at insert time from the flyout.
  const [bgPrimary, setBgPrimary] = useState("#6d28d9");
  const [bgAccent, setBgAccent] = useState("#22d3ee");
  const [bgSpeed, setBgSpeed] = useState(1);

  // Update portal position when flyout opens / on resize
  useEffect(() => {
    if (!flyoutOpen || !flyoutRef.current) return;
    const update = () => {
      const r = flyoutRef.current!.getBoundingClientRect();
      setFlyoutPos({ left: r.left, top: r.bottom + 8 });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [flyoutOpen]);

  // Close flyout on outside click (portal-aware)
  useEffect(() => {
    if (!flyoutOpen) return;
    const handleDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (flyoutRef.current?.contains(t)) return;
      if (flyoutMenuRef.current?.contains(t)) return;
      setFlyoutOpen(false);
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [flyoutOpen]);

  // Close flyout on Escape
  useEffect(() => {
    if (!flyoutOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFlyoutOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [flyoutOpen]);

  // Templates flyout position + dismiss (mirrors shape flyout)
  useEffect(() => {
    if (!tplOpen || !tplRef.current) return;
    const update = () => {
      const r = tplRef.current!.getBoundingClientRect();
      setTplPos({ left: r.left, top: r.bottom + 8 });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [tplOpen]);

  useEffect(() => {
    if (!tplOpen) return;
    const handleDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (tplRef.current?.contains(t)) return;
      if (tplMenuRef.current?.contains(t)) return;
      setTplOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTplOpen(false);
    };
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [tplOpen]);

  const showTemplates = Boolean(onInsertComponent || onInsertBackground);

  const activeShapeDef: ShapeToolDef =
    shapeTools.find((t) => t.id === selectedShapeKind) ?? shapeTools[0]!;

  const isShapeActive = activeTool === "shape";

  const handleToolSelect = (tool: EditorTool) => {
    if (onToolSelect) onToolSelect(tool);
    else setActiveTool(tool);
  };

  const handleShapeMainClick = () => {
    if (isShapeActive) {
      setFlyoutOpen(false);
      return;
    }
    setSelectedShapeKind(activeShapeDef.id);
    handleToolSelect("shape");
    setFlyoutOpen(false);
  };

  const handleShapeCaretClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlyoutOpen((v) => !v);
  };

  const handleShapeSelect = (id: ShapeSubTool) => {
    setSelectedShapeKind(id);
    handleToolSelect("shape");
    setFlyoutOpen(false);
  };

  return (
    <div className="h-12 shrink-0 flex items-center gap-1 px-4 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md z-30 relative">
      {/* Navigation group */}
      <div className="flex items-center gap-1">
        {navigationTools.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id}
            onSelect={() => handleToolSelect(tool.id)}
          />
        ))}
      </div>

      <Divider />

      {/* Creation group */}
      <div className="flex items-center gap-1">
        {creationTools.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id}
            onSelect={() => handleToolSelect(tool.id)}
          />
        ))}
      </div>

      <Divider />

      {/* Shapes group — single parent button with caret + flyout */}
      <div className="relative flex items-center" ref={flyoutRef}>
        <div
          className={`flex items-center rounded-md transition-all ${
            isShapeActive ? "bg-blue-600/20 text-blue-400" : "text-zinc-400"
          }`}
        >
          <button
            onClick={handleShapeMainClick}
            title={
              activeShapeDef.shortcut
                ? `${activeShapeDef.name} (${activeShapeDef.shortcut})`
                : activeShapeDef.name
            }
            aria-pressed={isShapeActive}
            aria-label={activeShapeDef.name}
            className={`p-2 flex items-center justify-center rounded-l-md transition-colors ${
              isShapeActive ? "" : "hover:text-zinc-100 hover:bg-white/5"
            }`}
          >
            {activeShapeDef.icon}
          </button>
          <button
            onClick={handleShapeCaretClick}
            aria-label="Open shape tools"
            aria-expanded={flyoutOpen}
            aria-haspopup="menu"
            className={`p-1 pr-1.5 flex items-center justify-center rounded-r-md transition-colors ${
              isShapeActive
                ? "hover:bg-blue-600/30"
                : "hover:text-zinc-100 hover:bg-white/5"
            }`}
          >
            <CaretDown className="w-3 h-3" />
          </button>
        </div>

        {flyoutOpen &&
          flyoutPos &&
          createPortal(
            <div
              ref={flyoutMenuRef}
              role="menu"
              style={{ position: "fixed", left: flyoutPos.left, top: flyoutPos.top, zIndex: 9999 }}
              className="bg-zinc-900 border border-white/10 rounded-lg shadow-2xl p-1.5 flex items-center gap-1"
            >
              {shapeTools.map((tool) => {
                const isActive = isShapeActive && selectedShapeKind === tool.id;
                return (
                  <button
                    key={tool.id}
                    role="menuitem"
                    onClick={() => handleShapeSelect(tool.id)}
                    title={tool.shortcut ? `${tool.name} (${tool.shortcut})` : tool.name}
                    aria-pressed={isActive}
                    aria-label={tool.name}
                    className={`p-2.5 rounded-md flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                    }`}
                  >
                    {tool.icon}
                  </button>
                );
              })}
            </div>,
            document.body,
          )}
      </div>

      <Divider />

      {/* Utility group */}
      <div className="flex items-center gap-1">
        {utilityTools.map((tool) => (
          <div key={tool.id} className="relative flex items-center">
            <ToolButton
              tool={tool}
              isActive={activeTool === tool.id}
              onSelect={() => handleToolSelect(tool.id)}
            />
            {/* Small color indicator for paint bucket when active — keeps ColorPicker accessible */}
            {tool.id === "paint" && activeTool === "paint" && (
              <span
                className="ml-1 w-3 h-3 rounded-full border border-white/20 shrink-0"
                style={{ background: paintColor }}
                title={`Paint color: ${paintColor}`}
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>

      {/* Inline paint color picker when paint tool is active (preserves ToolPanel behavior) */}
      {activeTool === "paint" && (
        <>
          <Divider />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider hidden sm:inline">
              Paint
            </span>
            <ColorPickerPopover value={paintColor} onChange={setPaintColor} />
          </div>
        </>
      )}

      {/* Templates group — animated kits append, backgrounds replace bg group */}
      {showTemplates && (
        <>
          <Divider />
          <div className="relative flex items-center" ref={tplRef}>
            <button
              onClick={() => setTplOpen((v) => !v)}
              aria-label="Insert template"
              aria-expanded={tplOpen}
              aria-haspopup="menu"
              title="Insert template"
              className={`p-2 rounded-md flex items-center gap-1 transition-all shrink-0 ${
                tplOpen ? "bg-blue-600/20 text-blue-400" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span className="text-xs font-medium hidden lg:inline">Templates</span>
              <CaretDown className="w-3 h-3" />
            </button>
            {tplOpen &&
              tplPos &&
              createPortal(
                <div
                  ref={tplMenuRef}
                  role="menu"
                  aria-label="Insert template"
                  style={{ position: "fixed", left: tplPos.left, top: tplPos.top, zIndex: 9999 }}
                  className="bg-zinc-900 border border-white/10 rounded-lg shadow-2xl p-3 w-80 flex flex-col gap-3 max-h-[70vh] overflow-y-auto"
                >
                  {onInsertComponent && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        Animated components
                      </span>
                      {ANIMATED_COMPONENTS.map((c) => (
                        <button
                          key={c.id}
                          role="menuitem"
                          onClick={() => {
                            onInsertComponent(c.id);
                            setTplOpen(false);
                          }}
                          className="flex justify-between items-center bg-zinc-950 hover:bg-zinc-800/80 p-2.5 rounded-md border border-white/5 transition-all text-left group cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="flex -space-x-1" aria-hidden="true">
                              {c.previewColors.map((color) => (
                                <span
                                  key={color}
                                  className="w-3.5 h-3.5 rounded-full border border-black/50"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </span>
                            <span>
                              <span className="block text-xs font-medium text-zinc-200 group-hover:text-white">
                                {c.name}
                              </span>
                              <span className="block text-[11px] text-zinc-500">{c.desc}</span>
                            </span>
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-white/5 px-1.5 py-0.5 rounded shrink-0">
                            append
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {onInsertBackground && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        Animated backgrounds
                      </span>
                      {/* Insert-time options: palette + pacing for bg templates */}
                      <div className="flex items-center gap-3 bg-zinc-950 border border-white/5 rounded-md px-2.5 py-2">
                        <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <input
                            type="color"
                            value={bgPrimary}
                            onChange={(e) => setBgPrimary(e.target.value)}
                            aria-label="Background primary color"
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border border-white/10"
                          />
                          Primary
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <input
                            type="color"
                            value={bgAccent}
                            onChange={(e) => setBgAccent(e.target.value)}
                            aria-label="Background accent color"
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border border-white/10"
                          />
                          Accent
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 ml-auto">
                          Speed
                          <select
                            value={bgSpeed}
                            onChange={(e) => setBgSpeed(Number(e.target.value))}
                            aria-label="Background animation speed"
                            className="bg-zinc-900 border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-zinc-200 outline-none cursor-pointer"
                          >
                            <option value={0.5}>0.5×</option>
                            <option value={1}>1×</option>
                            <option value={2}>2×</option>
                          </select>
                        </label>
                      </div>
                      {BACKGROUND_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          role="menuitem"
                          onClick={() => {
                            onInsertBackground(t.id, { primary: bgPrimary, accent: bgAccent, speed: bgSpeed });
                            setTplOpen(false);
                          }}
                          className="flex justify-between items-center bg-zinc-950 hover:bg-zinc-800/80 p-2.5 rounded-md border border-white/5 transition-all text-left group cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="flex -space-x-1" aria-hidden="true">
                              {t.previewColors.map((color) => (
                                <span
                                  key={color}
                                  className="w-3.5 h-3.5 rounded-full border border-black/50"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </span>
                            <span>
                              <span className="block text-xs font-medium text-zinc-200 group-hover:text-white">
                                {t.name}
                              </span>
                              <span className="block text-[11px] text-zinc-500">{t.desc}</span>
                            </span>
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-white/5 px-1.5 py-0.5 rounded shrink-0">
                            replace bg
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>,
                document.body,
              )}
          </div>
        </>
      )}

      {/* Right-aligned Design / Animate / Export — mirrors RightBar tabs, aligned with toolbar */}
      {activeRightTab && onRightTabChange && (
        <>
          <div className="flex-1" aria-hidden="true" />
          <Divider />
          <div className="flex items-center gap-1" role="tablist" aria-label="Right sidebar tabs">
            {(["design", "animate", "export"] as RightBarTab[]).map((tab) => {
              const active = activeRightTab === tab;
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={active}
                  onClick={() => onRightTabChange(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    active
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
