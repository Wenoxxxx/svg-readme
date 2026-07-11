import type { FieldSchema } from "../../../templates/schema";
import { FieldSwitch } from "./fields/Fields";

export function EditorPanel({
  name,
  typeName,
  fields,
  props,
  saving,
  lastSaved,
  error,
  onChange,
  onSave,
  onDownload,
}: {
  name: string;
  typeName: string;
  fields: FieldSchema[];
  props: Record<string, unknown>;
  saving: boolean;
  lastSaved: string | null;
  error: string | null;
  onChange: (key: string, value: unknown) => void;
  onSave: () => void;
  onDownload: () => void;
}) {
  // Group fields by their `group` label, preserving declaration order.
  const groups: { name: string; fields: FieldSchema[] }[] = [];
  for (const f of fields) {
    const g = f.group ?? "Content";
    let bucket = groups.find((b) => b.name === g);
    if (!bucket) {
      bucket = { name: g, fields: [] };
      groups.push(bucket);
    }
    bucket.fields.push(f);
  }

  return (
    <aside
      style={{
        width: 340,
        flexShrink: 0,
        borderLeft: "1px solid var(--oj-border)",
        background: "var(--oj-surface)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--oj-border)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
        <span
          style={{
            fontFamily: "var(--oj-font-mono)",
            fontSize: 10,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "var(--oj-text-dim)",
          }}
        >
          {typeName}
        </span>
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: "16px 18px" }}>
        {groups.map((g) => (
          <section key={g.name} style={{ marginBottom: 22 }}>
            <h3
              style={{
                margin: "0 0 12px",
                fontFamily: "var(--oj-font-mono)",
                fontSize: 10,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: "var(--oj-accent)",
              }}
            >
              {g.name}
            </h3>
            {g.fields.map((f) => (
              <FieldSwitch
                key={f.key}
                schema={f}
                props={props}
                onChange={onChange}
              />
            ))}
          </section>
        ))}
      </div>

      <div
        style={{
          borderTop: "1px solid var(--oj-border)",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {error && (
          <div
            style={{
              fontSize: 11,
              fontFamily: "var(--oj-font-mono)",
              color: "var(--oj-danger)",
              padding: "6px 8px",
              background: "rgba(239,68,68,0.08)",
              borderRadius: "var(--oj-radius-sm)",
            }}
          >
            {error}
          </div>
        )}
        {lastSaved && !error && (
          <div
            style={{
              fontSize: 11,
              fontFamily: "var(--oj-font-mono)",
              color: "var(--oj-text-dim)",
              padding: "2px 4px",
            }}
          >
            ✓ saved to {lastSaved}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              flex: 1,
              background: "var(--oj-accent)",
              border: "none",
              borderRadius: "var(--oj-radius-sm)",
              color: "#fff",
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 500,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save to repo"}
          </button>
          <button
            onClick={onDownload}
            style={{
              background: "var(--oj-surface-2)",
              border: "1px solid var(--oj-border)",
              borderRadius: "var(--oj-radius-sm)",
              color: "var(--oj-text)",
              padding: "10px 14px",
              fontSize: 13,
            }}
          >
            Download
          </button>
        </div>
      </div>
    </aside>
  );
}
