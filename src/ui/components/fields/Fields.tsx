import { useRef } from "react";
import type { FieldSchema } from "../../../../templates/schema";
import { getPath } from "./access";

type ChangeFn = (key: string, value: unknown) => void;

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--oj-font-mono)",
  fontSize: 11,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: "var(--oj-text-muted)",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "var(--oj-surface-2)",
  border: "1px solid var(--oj-border)",
  borderRadius: "var(--oj-radius-sm)",
  color: "var(--oj-text)",
  padding: "9px 11px",
  fontSize: 14,
  fontFamily: "var(--oj-font-sans)",
  outline: "none",
};

/** Wraps a field with its uppercase mono label. */
function Field({
  schema,
  children,
}: {
  schema: FieldSchema;
  children: React.ReactNode;
}) {
  return (
    <div style={rowStyle}>
      <label style={labelStyle}>{schema.label}</label>
      {children}
    </div>
  );
}

export function TextField({
  schema,
  value,
  onChange,
}: {
  schema: FieldSchema;
  value: unknown;
  onChange: ChangeFn;
}) {
  return (
    <Field schema={schema}>
      <input
        type="text"
        value={(value as string) ?? ""}
        placeholder={schema.placeholder}
        style={inputBase}
        onChange={(e) => onChange(schema.key, e.target.value)}
      />
    </Field>
  );
}

export function TextareaField({
  schema,
  value,
  onChange,
}: {
  schema: FieldSchema;
  value: unknown;
  onChange: ChangeFn;
}) {
  return (
    <Field schema={schema}>
      <textarea
        value={(value as string) ?? ""}
        placeholder={schema.placeholder}
        rows={4}
        style={{ ...inputBase, resize: "vertical", fontFamily: "var(--oj-font-mono)", fontSize: 13 }}
        onChange={(e) => onChange(schema.key, e.target.value)}
      />
    </Field>
  );
}

export function NumberField({
  schema,
  value,
  onChange,
}: {
  schema: FieldSchema;
  value: unknown;
  onChange: ChangeFn;
}) {
  return (
    <Field schema={schema}>
      <input
        type="number"
        value={value === undefined || value === null ? "" : Number(value)}
        min={schema.min}
        max={schema.max}
        step={schema.step}
        placeholder={schema.placeholder}
        style={inputBase}
        onChange={(e) =>
          onChange(schema.key, e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    </Field>
  );
}

export function ToggleField({
  schema,
  value,
  onChange,
}: {
  schema: FieldSchema;
  value: unknown;
  onChange: ChangeFn;
}) {
  const on = Boolean(value);
  return (
    <Field schema={schema}>
      <button
        onClick={() => onChange(schema.key, !on)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "transparent",
          border: "1px solid var(--oj-border)",
          borderRadius: 999,
          padding: "6px 14px 6px 6px",
          color: "var(--oj-text)",
          width: "fit-content",
        }}
      >
        <span
          style={{
            width: 34,
            height: 20,
            borderRadius: 999,
            background: on ? "var(--oj-accent)" : "var(--oj-surface-3)",
            position: "relative",
            transition: "background 0.15s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: on ? 16 : 2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.15s",
            }}
          />
        </span>
        <span style={{ fontSize: 13 }}>{on ? "On" : "Off"}</span>
      </button>
    </Field>
  );
}

export function ColorField({
  schema,
  value,
  onChange,
}: {
  schema: FieldSchema;
  value: unknown;
  onChange: ChangeFn;
}) {
  const current = (value as string) ?? "#000000";
  return (
    <Field schema={schema}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="color"
            value={current}
            style={{
              width: 38,
              height: 38,
              padding: 0,
              border: "1px solid var(--oj-border)",
              borderRadius: "var(--oj-radius-sm)",
              background: "transparent",
              cursor: "pointer",
            }}
            onChange={(e) => onChange(schema.key, e.target.value)}
          />
          <input
            type="text"
            value={current}
            style={{ ...inputBase, fontFamily: "var(--oj-font-mono)", fontSize: 13 }}
            onChange={(e) => onChange(schema.key, e.target.value)}
          />
        </div>
        {schema.presets && schema.presets.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {schema.presets.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => onChange(schema.key, c)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border:
                    current.toLowerCase() === c.toLowerCase()
                      ? "2px solid var(--oj-text)"
                      : "2px solid transparent",
                  background: c,
                  padding: 0,
                  outline:
                    current.toLowerCase() === c.toLowerCase()
                      ? "1px solid var(--oj-bg)"
                      : "none",
                  outlineOffset: -1,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}

export function ImageField({
  schema,
  value,
  onChange,
}: {
  schema: FieldSchema;
  value: unknown;
  onChange: ChangeFn;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const current = (value as string) ?? "";

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => onChange(schema.key, reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <Field schema={schema}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {current && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 6,
              background: "var(--oj-surface-2)",
              border: "1px solid var(--oj-border)",
              borderRadius: "var(--oj-radius-sm)",
            }}
          >
            <img
              src={current}
              alt=""
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                objectFit: "cover",
                background: "var(--oj-surface-3)",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: "var(--oj-text-muted)",
                fontFamily: "var(--oj-font-mono)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 220,
              }}
            >
              {current.startsWith("data:") ? "uploaded file" : current}
            </span>
            <button
              onClick={() => onChange(schema.key, "")}
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "none",
                color: "var(--oj-text-dim)",
                fontSize: 16,
                padding: "0 4px",
              }}
              title="Clear"
            >
              ×
            </button>
          </div>
        )}
        <input
          type="text"
          value={current.startsWith("data:") ? "" : current}
          placeholder="Paste image URL…"
          style={inputBase}
          onChange={(e) => onChange(schema.key, e.target.value)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            background: "var(--oj-surface-2)",
            border: "1px dashed var(--oj-border-strong)",
            borderRadius: "var(--oj-radius-sm)",
            color: "var(--oj-text-muted)",
            padding: "9px 11px",
            fontSize: 13,
          }}
        >
          ⬆ Upload from disk
        </button>
      </div>
    </Field>
  );
}

/** Dispatch to the right field component based on schema.type. */
export function FieldSwitch({
  schema,
  props,
  onChange,
}: {
  schema: FieldSchema;
  props: Record<string, unknown>;
  onChange: ChangeFn;
}) {
  const value = getPath(props, schema.key);
  switch (schema.type) {
    case "textarea":
      return <TextareaField schema={schema} value={value} onChange={onChange} />;
    case "number":
      return <NumberField schema={schema} value={value} onChange={onChange} />;
    case "toggle":
      return <ToggleField schema={schema} value={value} onChange={onChange} />;
    case "color":
      return <ColorField schema={schema} value={value} onChange={onChange} />;
    case "image":
      return <ImageField schema={schema} value={value} onChange={onChange} />;
    case "text":
    default:
      return <TextField schema={schema} value={value} onChange={onChange} />;
  }
}
