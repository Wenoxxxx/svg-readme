# Move Tool

> **Keyboard shortcut:** `V`

The Move Tool is the default interaction tool for selecting, dragging, and manipulating layers on the canvas. The implementation matches Figma's Move Tool behavior.

## Features

### 1. Cursor Behavior

| Context | Cursor |
|---------|--------|
| Default state | `default` (arrow) |
| Dragging an element | `grabbing` |
| Text Tool active | `text` (I-beam) |

**Key detail:** The cursor is controlled **solely** by the parent SVG element's `style={{ cursor: getCursor() }}`. Individual elements do NOT override the cursor:

- The invisible hit area rect in `ElementsRenderer.tsx` previously had `className="cursor-pointer"` — this was **removed** so the cursor stays consistent with the active tool.
- With the Move Tool active, hovering over elements shows the default arrow cursor, not a pointer or text cursor.

### 2. Layer Selection

| Action | Behavior |
|--------|----------|
| **Single click** on layer | Selects the **layer/component** (blue bounding box appears) |
| **Single click** on empty canvas | Deselects all layers |
| **Click on different layer** | Switches selection to that layer |

The selection model distinguishes between:
- **Layer selection** (Move Tool single click) — selects the container, blue bounding box shown
- **Text editing** (double-click or Text Tool click) — enters edit mode with I-beam cursor

### 3. No Text Content Selection

The SVG element has `userSelect: "none"` and `WebkitUserSelect: "none"` applied via inline style. This prevents the browser from allowing text content selection inside the canvas — clicking/dragging with the Move Tool selects the **layer**, not the text characters inside it.

### 4. Double-Click on Text

Double-clicking a text layer with the Move Tool enters text edit mode (calls `onEditText`), matching Figma's behavior where double-click opens the text for editing.

### 5. Dragging Elements

Clicking and holding a layer with the Move Tool initiates drag state. Moving the mouse updates the element's position via `onMoveElement`. Releasing ends the drag.

### 6. No Canvas Hover

The canvas wrapper's `hover:scale-[1.01]` effect was **removed** — the canvas no longer scales up on hover.

### 7. Editing + Click Outside

When editing text and clicking on empty canvas:
1. Text is committed (via `onCommitText`)
2. Canvas action proceeds (deselect, create text, etc.) on the **same click**

When editing text and clicking on another element:
1. `e.stopPropagation()` prevents deselect
2. Text is committed
3. Clicked element is selected

## Files

| File | Purpose |
|------|---------|
| `app/src/components/editor-canvas/Canvas.tsx` | Move Tool event handlers (mouseDown, element mouseDown, double-click, drag) |
| `app/src/components/editor-canvas/ElementsRenderer.tsx` | Selection highlights, hit area, cursor control |
| `app/src/pages/editor/Editor.tsx` | Layer selection state management |
| `app/src/context/EditorContext.tsx` | Tool state (`activeTool`, `isEditingText`) |
