// Thin fetch wrappers around the local editor API (served by src/server).

export async function fetchTemplates(): Promise<TemplateMeta[]> {
  const res = await fetch("/api/templates");
  return res.json();
}

export async function fetchState(): Promise<EditorState> {
  const res = await fetch("/api/state");
  return res.json();
}

export async function saveState(state: EditorState): Promise<void> {
  await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

export async function renderSvg(
  type: string,
  props: Record<string, unknown>
): Promise<string> {
  const res = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, props }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Render failed");
  }
  return res.text();
}

export async function saveToRepo(
  type: string,
  name: string,
  props: Record<string, unknown>
): Promise<{ file: string }> {
  const res = await fetch("/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, name, props }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Save failed");
  }
  return res.json();
}

export type FieldType = "text" | "textarea" | "color" | "image" | "toggle" | "number";

export type FieldSchema = {
  key: string;
  label: string;
  type: FieldType;
  presets?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  group?: string;
};

export type TemplateMeta = {
  type: string;
  name: string;
  description: string;
  defaults: Record<string, unknown>;
  fields: FieldSchema[];
  width: number;
  height: number;
};

export type ComponentInstance = {
  id: string;
  type: string;
  name: string;
  props: Record<string, unknown>;
};

export type EditorState = {
  components: ComponentInstance[];
};
