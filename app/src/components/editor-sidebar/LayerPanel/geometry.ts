// Virtualized offsets and both the display row and the inline rename row must
// use the same geometry, otherwise the scroll offsets drift (upstream keeps
// `LAYER_TREE_ROW_HEIGHT` in `src/components/LayerTree/geometry.ts` for this).

/** Fixed height of one layer row, in CSS pixels. */
export const LAYER_TREE_ROW_HEIGHT = 32;

/** Rows rendered above/below the visible window so scrolling never flashes. */
export const LAYER_TREE_OVERSCAN = 8;
