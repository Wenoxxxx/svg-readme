import { useEffect, useRef, useState } from "react";

export function Preview({
  svg,
  loading,
  error,
  naturalWidth,
  naturalHeight,
}: {
  svg: string | null;
  loading: boolean;
  error: string | null;
  naturalWidth: number;
  naturalHeight: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Fit the (usually oversized) SVG inside the available canvas area.
  useEffect(() => {
    function recompute() {
      const el = containerRef.current;
      if (!el) return;
      const availW = el.clientWidth - 64; // padding
      const availH = el.clientHeight - 64;
      const s = Math.min(availW / naturalWidth, availH / naturalHeight, 1);
      setScale(s > 0 ? s : 1);
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [naturalWidth, naturalHeight]);

  return (
    <main
      ref={containerRef}
      className="oj-grid-texture"
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        background: "var(--oj-bg)",
      }}
    >
      {loading && (
        <div style={{ position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Spinner />
          <span style={{ fontSize: 12, color: "var(--oj-text-dim)", fontFamily: "var(--oj-font-mono)" }}>
            rendering…
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            maxWidth: 420,
            padding: 18,
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "var(--oj-radius)",
            color: "var(--oj-text)",
            fontFamily: "var(--oj-font-mono)",
            fontSize: 13,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}

      {!error && svg && (
        <div
          style={{
            width: naturalWidth * scale,
            height: naturalHeight * scale,
            borderRadius: "var(--oj-radius)",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      {!error && svg && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 20,
            fontFamily: "var(--oj-font-mono)",
            fontSize: 11,
            color: "var(--oj-text-dim)",
          }}
        >
          {naturalWidth}×{naturalHeight} · {Math.round(scale * 100)}%
        </div>
      )}
    </main>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        border: "2px solid var(--oj-border-strong)",
        borderTopColor: "var(--oj-accent)",
        animation: "spin 0.7s linear infinite",
        display: "inline-block",
      }}
    />
  );
}
