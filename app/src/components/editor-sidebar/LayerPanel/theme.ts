// ─── Layer panel theme ────────────────────────────────────────────────────────
//
// One object owns every Tailwind class the panel renders, mirroring upstream's
// `src/theme/layer-tree.ts` (slot names, variant keys and the `tv(...)` call all
// line up). Components stay structural: they resolve classes through
// `layerTreeClasses` / `menuItemClasses` instead of hard-coding class strings,
// so restyling the panel (or adding a per-instance theme later, as upstream's
// `ui.ts` does) never means hunting through JSX.
//
// There is no `tailwind-variants` dependency in this app, so the resolver below
// is a tiny, dependency-free stand-in for `tv(theme)(props)`: slots first, then
// each variant state's slot overrides, then defaults for anything unset.

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Join class fragments, dropping empty ones and collapsing whitespace. */
function join(...parts: Array<string | undefined | null>): string {
  return parts
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Layer tree (rows) ────────────────────────────────────────────────────────

/**
 * Slot names for one layer row. These are the class *targets*; which classes
 * land on each comes from `variants` below.
 */
export const layerTreeTheme = {
  slots: {
    /** The absolutely positioned `<li>` that the virtualizer translates. */
    row: "absolute left-0 right-0 flex items-center justify-between px-3 rounded-md text-sm cursor-pointer transition-all duration-150 group",
    dragHandle:
      "cursor-grab active:cursor-grabbing text-zinc-600 group-hover:text-zinc-400 shrink-0",
    disclosure: "shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors",
    /** Keeps labels aligned when a row has no disclosure caret. */
    disclosurePlaceholder: "w-3.5 flex items-center justify-center shrink-0",
    /** The folder glyph shown in the disclosure column of a group row. */
    folderIcon: "w-3 h-3",
    /** Wrapper that sizes the type icon to the disclosure column. */
    iconSlot: "w-3.5 flex items-center justify-center shrink-0",
    label: "truncate flex-1 min-w-0",
    renameInput:
      "flex-1 min-w-0 bg-black/20 border border-blue-500 rounded px-1 text-sm text-white outline-none",
    childBadge: "shrink-0 text-[10px] font-mono rounded px-1.5 py-0.5",
    actions: "flex items-center gap-1.5 transition-opacity ml-2 shrink-0",
    actionButton:
      "transition-colors flex items-center justify-center p-1 rounded hover:bg-white/5",
    deleteButton:
      "transition-colors flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-white/5 p-1 rounded",
    maskedBadge: "text-[9px] text-amber-500/70 font-mono px-1",
    lockIcon: "w-3.5 h-3.5",
    visibilityIcon: "w-3.5 h-3.5",
    /** The above/below insertion line drawn over the row. */
    dropIndicator:
      "absolute left-2 right-2 h-0.5 bg-blue-500 rounded-full z-10 pointer-events-none",
    /** Vertical tree guide drawn in a row's indent gutter. */
    indentLine: "absolute top-0 bottom-0 w-px bg-white/5 pointer-events-none",
  },
  variants: {
    /** Row is part of the current selection → highlighted; otherwise hover only. */
    selected: {
      true: { row: "bg-blue-600/10 text-blue-400" },
      false: { row: "text-zinc-300 hover:bg-white/5" },
    },
    /** Row being dragged → faded out of the list. */
    dragging: { true: { row: "opacity-40" }, false: {} },
    /** Layer hidden → its label dims (the eye stays visible in the actions). */
    hidden: { true: { label: "opacity-40" }, false: {} },
    /** Layer used as a mask → italic label plus the "M" badge. */
    masked: { true: { label: "italic" }, false: {} },
    /** Drop intent is "make-child" → whole row becomes the drop affordance. */
    childDropTarget: {
      true: { row: "ring-1 ring-inset ring-blue-500/40 bg-blue-500/8" },
      false: {},
    },
    /** Group has children (badge reads a count) vs. empty group (badge reads 0). */
    hasChildren: {
      true: {
        childBadge: "text-zinc-500 bg-zinc-800/80 border border-white/5",
        folderIcon: "text-blue-400",
      },
      false: {
        childBadge: "text-zinc-600 bg-transparent",
        folderIcon: "text-zinc-500",
      },
    },
    locked: {
      true: { lockIcon: "text-zinc-500" },
      false: { lockIcon: "text-zinc-600 opacity-40 hover:opacity-100" },
    },
    visible: {
      true: { visibilityIcon: "text-zinc-500 hover:text-zinc-300" },
      false: { visibilityIcon: "text-zinc-600 opacity-40 hover:opacity-100" },
    },
    /**
     * Actions stay mounted but hidden until hover; they are always shown for the
     * selected row and for any row whose lock/visibility state is non-default so
     * that state is never invisible.
     */
    actionsVisible: {
      true: { actions: "opacity-100" },
      false: { actions: "opacity-0 group-hover:opacity-100" },
    },
    /** Where the insertion line sits for an above/below drop. */
    dropPosition: {
      above: { dropIndicator: "top-0" },
      below: { dropIndicator: "-bottom-px" },
      child: {},
    },
  },
  defaultVariants: {
    selected: false,
    dragging: false,
    hidden: false,
    masked: false,
    childDropTarget: false,
    hasChildren: false,
    locked: false,
    visible: true,
    actionsVisible: false,
  },
} as const;

export type LayerTreeSlot = keyof typeof layerTreeTheme.slots;

/** Where a drop lands relative to its target row, if at all. */
export type LayerTreeDropPosition = "above" | "below" | "child";

export interface LayerTreeVariantProps {
  selected?: boolean;
  dragging?: boolean;
  hidden?: boolean;
  masked?: boolean;
  childDropTarget?: boolean;
  hasChildren?: boolean;
  locked?: boolean;
  visible?: boolean;
  actionsVisible?: boolean;
  dropPosition?: LayerTreeDropPosition | null;
}

type VariantStates = Record<string, Partial<Record<LayerTreeSlot, string>>>;

/**
 * Resolve the class for every row slot for one set of variant props.
 *
 * Pure and total: always returns a class (possibly empty) for each slot, so a
 * row can render `classes.label` without a null check.
 */
export function layerTreeClasses(
  props: LayerTreeVariantProps = {},
): Record<LayerTreeSlot, string> {
  const out: Record<LayerTreeSlot, string> = { ...layerTreeTheme.slots };
  const variants = layerTreeTheme.variants as unknown as Record<
    string,
    VariantStates
  >;
  const defaults = layerTreeTheme.defaultVariants as Record<string, unknown>;

  for (const [name, states] of Object.entries(variants)) {
    const value =
      props[name as keyof LayerTreeVariantProps] ?? defaults[name];
    if (value === undefined || value === null) continue;
    const state = states[String(value)];
    if (!state) continue;
    for (const [slot, cls] of Object.entries(state)) {
      if (!cls) continue;
      const key = slot as LayerTreeSlot;
      out[key] = join(out[key], cls);
    }
  }

  return out;
}

// ─── Panel chrome (header, search, toolbar, viewport) ─────────────────────────

/** Static slots for the layer panel shell — one place for the panel's chrome. */
export const layerPanelTheme = {
  root: "flex-1 flex flex-col min-h-0",
  header: "px-5 py-4 flex items-center justify-between border-b border-white/5",
  headerTitle:
    "flex items-center gap-2 text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase font-semibold tracking-wider",
  headerActions: "flex items-center gap-0.5",
  iconButton:
    "p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors",
  /** Slightly accented variant used by the "add group" button. */
  iconButtonAccent:
    "p-1 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-white/5 transition-colors",
  searchSection: "px-5 pt-3 pb-1",
  searchWrapper: "relative flex items-center",
  searchIcon: "absolute left-3 w-3.5 h-3.5 text-zinc-600",
  searchInput:
    "w-full bg-zinc-900/80 border border-white/5 rounded-md pl-8 pr-8 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all",
  searchClear: "absolute right-2.5 text-zinc-600 hover:text-zinc-300 transition-colors",
  toolbar: "px-5 py-2 flex items-center gap-1 border-b border-white/5",
  viewport:
    "flex-1 relative overflow-y-auto overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent",
  list: "relative mx-3",
  empty: "px-5 py-8 text-center",
  emptyText: "text-xs text-zinc-500",
  /** The small icon button used by the bulk-action toolbar. */
  toolbarButton:
    "p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors",
  /** The left `<aside>` shell the panel is mounted in. */
  sidebar:
    "w-72 shrink-0 border-r border-white/5 bg-[#09090b]/95 backdrop-blur-xl flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]",
} as const;

// ─── Context menu ─────────────────────────────────────────────────────────────

export const layerMenuTheme = {
  slots: {
    root: "fixed z-[100] min-w-[200px] bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.4)] py-1.5 animate-in fade-in zoom-in-95 origin-top-left",
    separator: "my-1 mx-2 h-px bg-white/5",
    submenu:
      "absolute left-full top-0 ml-1 min-w-[180px] bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.4)] py-1.5",
    item: "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
    itemLabel: "flex items-center gap-2.5",
    iconSlot: "w-4 h-4 flex items-center justify-center text-zinc-400",
    shortcut: "ml-4 text-[10px] text-zinc-500 font-mono tracking-wider",
    chevron: "text-zinc-500 ml-4",
  },
} as const;

/** Variant inputs for a context-menu entry's button class. */
export function menuItemClasses({
  disabled = false,
  destructive = false,
}: {
  disabled?: boolean;
  destructive?: boolean;
} = {}): string {
  const state = disabled
    ? "text-zinc-600 cursor-not-allowed"
    : destructive
      ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
      : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100";
  return join(layerMenuTheme.slots.item, state);
}
