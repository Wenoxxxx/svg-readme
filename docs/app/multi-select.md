# Shift+Click Multi-Select

> **Modifier key:** Hold `Shift` while clicking with the Move Tool

The multi-select feature allows users to select multiple layers simultaneously by holding the Shift key while clicking. This matches Figma's layer multi-selection behavior.

## Behaviors

| Action | Result |
|--------|--------|
| **Click** layer (no Shift) | Selects only that layer (replaces any previous selection) |
| **Shift+click** unselected layer | Adds it to the current selection |
| **Shift+click** already-selected layer | Removes it from the selection |
| **Shift+click** the only selected layer | Deselects everything (empty selection) |
| **Click** empty canvas | Clears all selection |

## Visual Feedback

- Each selected layer shows a **blue bounding box** (`stroke="#3b82f6"`)
- Multiple layers selected = multiple blue bounding boxes
- Unselected layers have no bounding box

## Implementation Details

### State Model (`EditorContext.tsx`)

```typescript
interface EditorState {
  selectedLayerIds: string[];   // Array of selected layer IDs
  selectedLayerId: string | null;  // @deprecated — kept for backward compat
}
```

### Actions

```typescript
// Multi-select aware: toggles layer in/out based on Shift state
selectLayer(id: string, isShift: boolean): void

// Clears all selected layers
clearSelection(): void
```

### `selectLayer` Logic

```typescript
if (isShift) {
  // Shift+click: toggle this layer in/out of the selection
  if (selectedLayerIds.includes(id)) {
    remove from selection;  // already selected → deselect
  } else {
    add to selection;       // not selected → select
  }
  // selectedLayerId points to first remaining selection (or null)
} else {
  // Normal click: replace selection with just this layer
  selectedLayerIds = [id];
  selectedLayerId = id;
}
```

### Canvas Integration (`Canvas.tsx`)

- `handleElementMouseDown` reads `e.shiftKey`
- When `shiftKey` is true, calls `onShiftSelectLayer?.(layerId)` instead of `onSelectLayer(layerId)`
- When clicking empty canvas, calls `onClearSelection?.()` instead of `onSelectLayer(null)`
- New props: `onShiftSelectLayer`, `onClearSelection`

### ElementsRenderer (`ElementsRenderer.tsx`)

- Accepts new `selectedLayerIds: string[]` prop
- Builds a `Set` from the selected IDs
- Each layer whose ID is in the set gets a selection highlight (blue rect)
- Falls back to legacy `selectedLayerId` when `selectedLayerIds` is not provided

## Files

| File | Purpose |
|------|---------|
| `app/src/context/EditorContext.tsx` | `selectedLayerIds` state, `selectLayer()`, `clearSelection()` actions |
| `app/src/components/editor-canvas/Canvas.tsx` | `e.shiftKey` handling, new callback props |
| `app/src/components/editor-canvas/ElementsRenderer.tsx` | `selectedLayerIds` prop for multi-highlight rendering |
| `app/src/pages/editor/Editor.tsx` | Multi-select callbacks wired up |
| `app/src/__tests__/MultiSelect.test.tsx` | 9 tests covering all multi-select behaviors |
