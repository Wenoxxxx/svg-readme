# Testing

> **Framework:** Vitest + React Testing Library

The project uses **Vitest** as the test runner and **@testing-library/react** for rendering React components in tests. All tests are in `app/src/__tests__/`.

## Test Suites

| Suite | Tests | Covers |
|-------|-------|--------|
| `EditorContext.test.tsx` | 19 | Editor context defaults, actions, initial values, error handling |
| `MultiSelect.test.tsx` | 9 | Shift+click multi-select behavior, selection toggling, rendering highlights |
| `editor/Canvas.callbacks.test.tsx` | 7 | Canvas callbacks for Move Tool interactions |
| `editor/components/ElementsRenderer.test.tsx` | 6 | ElementsRenderer rendering behavior, selection highlights |
| `editor/move-tool/MoveTool.defaults.test.tsx` | 4 | Move Tool default state (Figma reference) |
| `editor/move-tool/MoveTool.selection.test.tsx` | 4 | Move Tool layer selection (Figma reference) |
| `editor/move-tool/MoveTool.text-edit.test.tsx` | 3 | Move Tool text edit mode (Figma reference) |
| `editor/utils/text-bounding-box.test.tsx` | 5 | getTextBoundingBox utility function |
| **Total** | **58** | |

## Running Tests

```bash
cd app
npx vitest run            # Run all tests once
npx vitest                # Watch mode
npx vitest --reporter verbose  # Verbose output
npx vitest run src/__tests__/editor/move-tool  # Run all Move Tool tests
```

## TypeScript Validation

```bash
cd app
npx tsc --noEmit          # Type-check without emitting files
```

## Test Patterns

### Context Tests

Uses a consumer component pattern:

```tsx
function TestConsumer() {
  const ctx = useEditor();
  return (
    <div>
      <span data-testid="activeTool">{ctx.activeTool}</span>
      <button data-testid="setActiveTool-move" onClick={() => ctx.setActiveTool("move")}>
        Set Move
      </button>
    </div>
  );
}

renderWithProvider(<TestConsumer />);
act(() => screen.getByTestId("setActiveTool-move").click());
expect(screen.getByTestId("activeTool").textContent).toBe("move");
```

### Renderer Tests

Uses direct rendering with props:

```tsx
const { container } = render(
  <svg>
    <ElementsRenderer
      layers={layers}
      elementProperties={elementProps}
      selectedLayerIds={["layer-1", "layer-2"]}
      editingLayerId={null}
      onElementMouseDown={() => {}}
      onElementDoubleClick={() => {}}
    />
  </svg>
);

const rects = container.querySelectorAll("rect[stroke='#3b82f6']");
expect(rects.length).toBe(2);
```

### Callback Tests

Uses `vi.fn()` mocks to verify callback behavior:

```tsx
const onSelectLayer = vi.fn();
// ... trigger action ...
expect(onSelectLayer).toHaveBeenCalledWith("layer-1");
```

## Configuration

| File | Purpose |
|------|---------|
| `app/vitest.config.ts` | Vitest configuration (jsdom environment, setup file) |
| `app/vitest.setup.ts` | Test setup (imports `@testing-library/jest-dom`) |
