export function Topbar({
  onNew,
  templateOptions,
}: {
  onNew: (type: string) => void;
  templateOptions: { type: string; name: string; description: string }[];
}) {
  return (
    <header
      className="oj-grid-texture"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        height: 56,
        padding: "0 18px",
        borderBottom: "1px solid var(--oj-border)",
        background: "var(--oj-surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "var(--oj-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--oj-font-mono)",
            fontWeight: 500,
            fontSize: 14,
            color: "#fff",
          }}
        >
          s
        </div>
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: 0.2 }}>
          svg-readme
        </span>
        <span
          style={{
            fontFamily: "var(--oj-font-mono)",
            fontSize: 11,
            color: "var(--oj-text-dim)",
            padding: "2px 7px",
            border: "1px solid var(--oj-border)",
            borderRadius: 999,
          }}
        >
          editor
        </span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        {templateOptions.map((t) => (
          <button
            key={t.type}
            title={t.description}
            onClick={() => onNew(t.type)}
            style={{
              background: "var(--oj-surface-2)",
              border: "1px solid var(--oj-border)",
              borderRadius: "var(--oj-radius-sm)",
              color: "var(--oj-text-muted)",
              padding: "7px 12px",
              fontSize: 13,
            }}
          >
            + {t.name}
          </button>
        ))}
      </div>
    </header>
  );
}
