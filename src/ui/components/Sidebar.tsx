import type { ComponentInstance } from "../lib/api";

const typeLabel: Record<string, string> = {
  banner: "Banner",
  "stat-card": "Stat card",
  "tech-stack": "Tech stack",
  "quote-card": "Quote card",
};

export function Sidebar({
  components,
  selectedId,
  onSelect,
  onDelete,
  onRename,
}: {
  components: ComponentInstance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  return (
    <aside
      style={{
        width: 248,
        flexShrink: 0,
        borderRight: "1px solid var(--oj-border)",
        background: "var(--oj-surface)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          fontFamily: "var(--oj-font-mono)",
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: "var(--oj-text-dim)",
          borderBottom: "1px solid var(--oj-border)",
        }}
      >
        Components · {components.length}
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: "8px" }}>
        {components.length === 0 && (
          <div
            style={{
              padding: "20px 12px",
              fontSize: 13,
              color: "var(--oj-text-dim)",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            No components yet. Add one from the top bar.
          </div>
        )}
        {components.map((c) => {
          const selected = c.id === selectedId;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 10px",
                marginBottom: 4,
                borderRadius: "var(--oj-radius-sm)",
                cursor: "pointer",
                border: selected
                  ? "1px solid var(--oj-accent)"
                  : "1px solid transparent",
                background: selected ? "var(--oj-accent-soft)" : "transparent",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: selected ? "var(--oj-accent)" : "var(--oj-text-dim)",
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <input
                  value={c.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onRename(c.id, e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--oj-text)",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: 0,
                    outline: "none",
                    minWidth: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--oj-font-mono)",
                    fontSize: 10,
                    color: "var(--oj-text-dim)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {typeLabel[c.type] ?? c.type}
                </span>
              </div>
              <button
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--oj-text-dim)",
                  fontSize: 15,
                  padding: "0 2px",
                  opacity: selected ? 1 : 0,
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
