import { useRef, useEffect } from "react";
import { layerPanelTheme } from "./theme";

// ─── Bulk action toolbar (render inline in LayerPanel) ───────────────────────

// ─── Small icon button for the bulk-action toolbar ──────────────────────────

export function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={layerPanelTheme.toolbarButton}
    >
      {children}
    </button>
  );
}

// ─── Context action listener component ────────────────────────────────────────

export function ContextActionListener({
  active,
  onAction,
}: {
  active: boolean;
  onAction: (actionId: string) => void;
}) {
  const handlerRef = useRef(onAction);
  useEffect(() => { handlerRef.current = onAction; }, [onAction]);

  useEffect(() => {
    if (!active) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.actionId) {
        handlerRef.current(detail.actionId);
      }
    };
    window.addEventListener("layer-context-action", handler);
    return () => window.removeEventListener("layer-context-action", handler);
  }, [active]);

  return null;
}
