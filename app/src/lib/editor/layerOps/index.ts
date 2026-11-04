export {
  flattenLayers,
  canFlattenSelection,
  type FlattenResult,
} from "./flattenGroup";
export {
  buildSelectionExportDocument,
  buildElementCss,
  type SelectionExportDocument,
} from "./selectionExport";
export { findMatchingLayerIds } from "./selectMatching";
export { wrapInFrame, toggleLayerMask } from "./frameOps";
export { applyBooleanOp, type BooleanOp } from "./booleanOps";
export { outlineText, outlineStroke } from "./outlineOps";
export { smartDelete } from "./smartDelete";
export {
  addAutoLayout,
  applyAutoLayout,
  layerBounds,
  resolveAutoLayoutSettings,
  type AddAutoLayoutResult,
  type AutoLayoutSettingsInput,
  type Bounds,
} from "./autoLayout";
export {
  createComponent,
  detachInstances,
  isComponentInstance,
  linkInstancesToMasters,
  type CreateComponentResult,
} from "./components";
export { flipLayers, type FlipAxis } from "./flip";
