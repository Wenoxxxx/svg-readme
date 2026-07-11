/**
 * Field schema — drives the auto-generated edit form in the UI. Each template
 * declares the props it wants exposed as fields. The UI renders the matching
 * input and writes back into the component's props object.
 */
export type FieldType = "text" | "textarea" | "color" | "image" | "toggle" | "number";

export interface FieldSchema {
  /** The props key this field reads/writes. Supports dot-path (e.g. "a.b"). */
  key: string;
  label: string;
  type: FieldType;
  /** Optional preset swatches, mainly for color fields. */
  presets?: string[];
  placeholder?: string;
  /** For number fields. */
  min?: number;
  max?: number;
  step?: number;
  /** Group label used to section the form. */
  group?: string;
}

export interface TemplateMeta {
  type: string;
  /** Human-friendly name shown in the "New component" menu. */
  name: string;
  description: string;
}
