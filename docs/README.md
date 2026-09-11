# Documentation

Welcome to the svg-readme documentation hub.

## Table of Contents

- [Getting Started](../README.md) — Project setup and installation
- [App Documentation](./app/) — Feature documentation for the editor application
  - [Feature Index](./app/index.md) — Overview of all implemented features
  - [Text Tool](./app/text-tool.md) — Text creation and editing
  - [Move Tool](./app/move-tool.md) — Layer selection and manipulation
  - [Multi-Select](./app/multi-select.md) — Shift+click multi-selection
  - [Testing](./app/testing.md) — Test infrastructure and coverage
- [Design Files](#design-files) — Local persistence (no backend)

## Design Files

No backend, no database. The editor persists to browser localStorage and
explicit `.svg-readme.json` files (`app/src/lib/designFile.ts`, v1 schema):

- **Save** (navbar / Ctrl+S) downloads `{name}.svg-readme.json`
- **Open** (navbar / drag-drop onto canvas) validates + replaces the document
- SVG drag-drop still appends layers; JSON replaces the whole document

## Project Structure

```
docs/
├── README.md          # This file
└── app/
    ├── README.md       # App-specific setup (Vite, React, Tailwind)
    ├── index.md        # Feature documentation index
    ├── move-tool.md    # Move Tool documentation
    ├── multi-select.md # Multi-select feature documentation
    ├── testing.md      # Testing guide
    └── text-tool.md    # Text Tool documentation
```
