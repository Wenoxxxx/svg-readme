export interface TourStep {
  id: string;
  /** CSS selector for the spotlight target. Omit for a centered card. */
  selector?: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to the full editor",
    body: "Hover any highlighted tool group to learn what it does — only what you care about. Want the guided version instead? Hit Take full tour.",
  },
  {
    id: "nav-tools",
    selector: '[data-tour="nav-tools"]',
    title: "Navigate: Move / Hand",
    body: "Move (V) selects, moves, resizes and rotates layers. Hand (H) pans around the workspace.",
  },
  {
    id: "create-tools",
    selector: '[data-tour="create-tools"]',
    title: "Create: Pen / Text",
    body: "Pen (P) draws freeform paths. Text (T) drops editable text — double-click existing text to edit it.",
  },
  {
    id: "shape-tools",
    selector: '[data-tour="shape-tools"]',
    title: "Shapes",
    body: "Rectangle (R), Circle (O) and Line (L) live here. Click the caret to open the flyout for Triangle, Star and Hexagon.",
  },
  {
    id: "utility-tools",
    selector: '[data-tour="utility-tools"]',
    title: "Utilities: Image / Paint",
    body: "Image uploads a picture onto the canvas. Paint Bucket recolors the clicked layer — the color picker appears here while it is active.",
  },
  {
    id: "templates",
    selector: '[data-tour="templates"]',
    title: "Templates",
    body: "Animated components append to your design; animated backgrounds replace the background. Pick primary / accent colors and speed before inserting.",
  },
  {
    id: "right-tabs",
    selector: '[data-tour="right-tabs"]',
    title: "Design / Animate / Export tabs",
    body: "These switch the right sidebar: tweak properties in Design, add motion in Animate, copy code or download in Export.",
  },
  {
    id: "frame",
    selector: '[data-tour="frame"]',
    title: "Frame",
    body: "Set canvas width and height directly, or jump to a Banner / Square / Mobile preset.",
  },
  {
    id: "layers",
    selector: '[data-tour="layers"]',
    title: "Layers",
    body: "Search, add and group layers here. Toggle visibility and locks, drag to reorder, right-click a row for group, duplicate and boolean options.",
  },
  {
    id: "canvas",
    selector: '[data-tour="canvas"]',
    title: "Canvas",
    body: "Draw with the active tool, drag a rubber-band box to multi-select, and drop an .svg file anywhere here to import it.",
  },
  {
    id: "viewport",
    selector: '[data-tour="viewport"]',
    title: "Viewport controls",
    body: "Zoom in / out, pick a zoom preset, fit the canvas to screen, and toggle the grid (G) and snapping.",
  },
  {
    id: "properties",
    selector: '[data-tour="properties"]',
    title: "Properties panel",
    body: "With a layer selected, the Design tab edits position, size, fill, text and alignment. Multi-select to bulk-edit shared values.",
  },
  {
    id: "history",
    selector: '[data-tour="history"]',
    title: "Shortcuts / Undo / Redo",
    body: "Open the keyboard-shortcut sheet (Ctrl+/), then step backward (Ctrl/Cmd+Z) or forward (Ctrl/Cmd+Shift+Z) through edits.",
  },
  {
    id: "file-actions",
    selector: '[data-tour="file-actions"]',
    title: "Open / Save / New",
    body: "Open a design JSON file, Save to file plus autosave (Ctrl+S), or start a New project. Unsaved changes always ask first.",
  },
  {
    id: "export",
    selector: '[data-tour="export"]',
    title: "Export SVG",
    body: "One click renders the canvas to SVG. For PNG, Markdown or copy-to-clipboard, switch the right sidebar to the Export tab.",
  },
];

/** Hoverable steps — everything with a real on-screen target (welcome dropped). */
export const ANCHORED_STEPS: (TourStep & { selector: string })[] = TOUR_STEPS.filter(
  (s): s is TourStep & { selector: string } => typeof s.selector === "string",
);

/** data-tour value (e.g. "nav-tools") → anchored index for the n/14 counter. */
const SELECTOR_TO_ANCHORED = new Map(
  ANCHORED_STEPS.map((s, i) => [s.selector.replace(/^\[data-tour="(.+)"\]$/, "$1"), i]),
);

export function anchoredIndexOfTourValue(value: string | null): number {
  if (!value) return -1;
  return SELECTOR_TO_ANCHORED.get(value) ?? -1;
}

/** Anchored index → index in TOUR_STEPS (for jumping into the walkthrough). */
export function walkthroughIndexOfAnchored(anchoredIndex: number): number {
  const step = ANCHORED_STEPS[anchoredIndex];
  if (!step) return 0;
  return TOUR_STEPS.indexOf(step);
}
