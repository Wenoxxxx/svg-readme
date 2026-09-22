import { describe, expect, it } from "vitest";
import {
  layerTreeClasses,
  layerTreeTheme,
  menuItemClasses,
} from "../../../components/editor-sidebar/LayerPanel/theme";

/**
 * The theme is the single source of truth for the panel's Tailwind classes, so
 * these tests pin the slot/variant contract rather than any exact class string:
 * base slots always resolve, a variant state overrides only its own slots, and
 * unset props fall back to `defaultVariants`.
 */
describe("layerTreeClasses", () => {
  it("resolves a non-empty class for every slot", () => {
    const classes = layerTreeClasses();
    for (const slot of Object.keys(layerTreeTheme.slots) as Array<
      keyof typeof layerTreeTheme.slots
    >) {
      expect(typeof classes[slot]).toBe("string");
      expect(classes[slot].length).toBeGreaterThan(0);
    }
  });

  it("applies the default variants when nothing is passed", () => {
    const classes = layerTreeClasses();
    // selected: false and actionsVisible: false land their row/actions classes.
    expect(classes.row).toContain("text-zinc-300");
    expect(classes.actions).toContain("opacity-0");
  });

  it("overrides only the slots a variant targets", () => {
    const selected = layerTreeClasses({ selected: true });
    expect(selected.row).toContain("bg-blue-600/10");
    // The base row class survives the variant merge.
    expect(selected.row).toContain("absolute left-0 right-0");
    // Unrelated slots are untouched.
    expect(selected.label).toBe(layerTreeTheme.slots.label);
  });

  it("composes mutually exclusive variant slots", () => {
    const classes = layerTreeClasses({
      selected: true,
      dragging: true,
      childDropTarget: true,
      hidden: true,
      masked: true,
      locked: true,
      visible: false,
      actionsVisible: true,
      hasChildren: true,
      dropPosition: "below",
    });
    expect(classes.row).toContain("opacity-40"); // dragging
    expect(classes.row).toContain("ring-1"); // childDropTarget
    expect(classes.label).toContain("opacity-40"); // hidden
    expect(classes.label).toContain("italic"); // masked
    expect(classes.dropIndicator).toContain("-bottom-px"); // dropPosition below
    expect(classes.childBadge).toContain("bg-zinc-800/80"); // hasChildren
    expect(classes.actions).toBe("flex items-center gap-1.5 transition-opacity ml-2 shrink-0 opacity-100");
  });

  it("ignores a null drop position (no indicator rendered)", () => {
    const classes = layerTreeClasses({ dropPosition: null });
    expect(classes.dropIndicator).toBe(layerTreeTheme.slots.dropIndicator);
  });
});

describe("menuItemClasses", () => {
  it("defaults to the neutral entry styling", () => {
    expect(menuItemClasses()).toContain("text-zinc-300");
  });

  it("switches to disabled and destructive styling", () => {
    expect(menuItemClasses({ disabled: true })).toContain("cursor-not-allowed");
    expect(menuItemClasses({ destructive: true })).toContain("text-red-400");
  });
});
