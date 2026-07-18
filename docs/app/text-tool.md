# Text Tool

> **Keyboard shortcut:** `T`

The Text Tool allows users to create and edit text layers on the canvas. The implementation follows Figma's text editing behavior.

## Features

### 1. Creating Text

| Action | Behavior |
|--------|----------|
| **Single click** on canvas | Creates an auto-width text box at the click location |
| **Click and drag** on canvas | Creates a fixed-width text box sized to the drag area |
| **Click on existing text** (with text tool) | Enters text edit mode for that layer |

### 2. Text Alignment

Text alignment is handled through both the SVG rendering and the editing overlay:

- **Left-aligned** — `textAnchor="start"`, overlay positioned at `x - 4`
- **Center-aligned** — `textAnchor="middle"`, overlay centered at `x - overlayWidth / 2`
- **Right-aligned** — `textAnchor="end"`, overlay right-aligned at `x - overlayWidth`

The textarea overlay (`TextOverlay.tsx`) adjusts its `adjustedX` position based on the `textAlign` prop to match exactly where the SVG `<text>` element renders with its `textAnchor` attribute.

### 3. Dynamic Resizing

When the user types or presses **Enter** to create a new line, the textarea automatically expands:

```
useLayoutEffect → el.style.height = "auto" → read scrollHeight → set height
```

- Uses `useLayoutEffect` (not `useEffect`) so the resize happens **synchronously before the browser paints** — no visible flash.
- The textarea height is controlled directly on the DOM element, not through React state, avoiding render-cycle conflicts.

### 4. Editing State

| Action | Behavior |
|--------|----------|
| **Click outside** textarea | Commits text (blur → `onCommit`) |
| **Press Escape** | Commits text (matches Figma — does NOT discard) |
| **Empty text commit** | Layer is removed entirely |
| **Non-empty text commit** | Layer stays selected with committed content |

### 5. Clicking Elements While Editing

Handled in `Canvas.tsx` `handleElementMouseDown`:

1. `e.stopPropagation()` is called **first** (always), preventing the canvas-level handler from deselecting everything
2. `onCommitText?.()` is called to commit the current text
3. Normal element action proceeds (select, enter edit mode on the clicked element, etc.)

Matches Figma: clicking on another layer while editing commits the text AND selects the clicked element in a single click.

## Files

| File | Purpose |
|------|---------|
| `app/src/components/editor-canvas/TextOverlay.tsx` | Text editing textarea overlay |
| `app/src/components/editor-canvas/Canvas.tsx` | Canvas event handling wired to text edit callbacks |
| `app/src/components/editor-canvas/ElementsRenderer.tsx` | SVG text element rendering |
| `app/src/pages/editor/Editor.tsx` | Text commit/create/edit logic |
