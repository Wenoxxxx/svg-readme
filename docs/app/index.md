# SVG Readme — Feature Documentation

> **Editor features implemented to match Figma-like design tool behavior.**

## Table of Contents

- [Text Tool](./text-tool.md) — Text creation, editing, alignment, and dynamic resizing
- [Move Tool](./move-tool.md) — Layer selection, dragging, and cursor behavior
- [Shift+Click Multi-Select](./multi-select.md) — Holding Shift to select/deselect multiple layers
- [Testing](./testing.md) — Unit test infrastructure and test coverage

---

## Quick Summary

| Feature | Status | Figma Alignment |
|---------|--------|----------------|
| Text Tool: Alignment | ✅ | Left/center/right positioning matches SVG textAnchor |
| Text Tool: Dynamic Resizing | ✅ | Auto-expands on Enter key |
| Text Tool: Editing State | ✅ | Click outside commits; Escape commits (matches Figma) |
| Move Tool: Layer Selection | ✅ | Selects layer, not text content |
| Move Tool: No Canvas Hover | ✅ | Canvas no longer scales on hover |
| Move Tool: Cursor | ✅ | Default cursor (no pointer/text override) |
| Shift+Click Multi-Select | ✅ | Toggle layers in/out of selection |
| Testing | ✅ | 57 tests across 3 test suites |
