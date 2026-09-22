import { useState, useCallback, useEffect, useRef } from "react";
import {
  layerMenuTheme,
  menuItemClasses,
  menuShortcutClasses,
} from "./LayerPanel/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  /**
   * Render with the accent (violet) treatment. The reference menu reserves it
   * for Create component, the one "primary" action in the list.
   */
  accent?: boolean;
  separator?: false;
  children?: ContextMenuAction[];
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuItem = ContextMenuAction | ContextMenuSeparator;

interface LayerContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: ContextMenuItem[];
  /**
   * Optional direct action handler. When omitted the menu falls back to the
   * legacy `layer-context-action` window event (used by the layer panel).
   *
   * Surfaces that own their own menu (e.g. the canvas) pass this so exactly one
   * listener per menu handles the click, and no window-wide event has to be
   * routed back to the right selection.
   */
  onAction?: (actionId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LayerContextMenu({
  x,
  y,
  onClose,
  items,
  onAction,
}: LayerContextMenuProps) {
  const [subMenuOpen, setSubMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setSubMenuOpen(null);
    onClose();
  }, [onClose]);

  const runAction = useCallback(
    (actionId: string) => {
      if (onAction) {
        onAction(actionId);
        return;
      }
      window.dispatchEvent(
        new CustomEvent("layer-context-action", {
          detail: { actionId },
        }),
      );
    },
    [onAction],
  );

  // Close on click outside or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClick);
    };
  }, [handleClose]);

  // Adjust position to stay within viewport
  const adjustedPos = useAdjustedPosition(x, y, menuRef);

  return (
    <div
      ref={menuRef}
      className={layerMenuTheme.slots.root}
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      {items.map((item, index) => {
        if ("separator" in item && item.separator) {
          return (
            <div
              key={`sep-${index}`}
              className={layerMenuTheme.slots.separator}
            />
          );
        }

        const action = item as ContextMenuAction;

        if (action.children && action.children.length > 0) {
          return (
            <div key={action.id} className="relative">
              <button
                className={menuItemClasses({
                  disabled: action.disabled,
                  destructive: action.destructive,
                  accent: action.accent,
                })}
                disabled={action.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setSubMenuOpen(
                    subMenuOpen === action.id ? null : action.id,
                  );
                }}
                onMouseEnter={() => setSubMenuOpen(action.id)}
              >
                <span className={layerMenuTheme.slots.itemLabel}>
                  {action.icon && (
                    <span className={layerMenuTheme.slots.iconSlot}>
                      {action.icon}
                    </span>
                  )}
                  <span>{action.label}</span>
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={layerMenuTheme.slots.chevron}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              {subMenuOpen === action.id && (
                <div className={layerMenuTheme.slots.submenu}>
                  {action.children.map((child) => (
                    <button
                      key={child.id}
                      className={menuItemClasses({
                        disabled: child.disabled,
                        destructive: child.destructive,
                        accent: child.accent,
                      })}
                      disabled={child.disabled}
                      onClick={() => {
                        if (!child.disabled) {
                          handleClose();
                          runAction(child.id);
                        }
                      }}
                    >
                      <span className={layerMenuTheme.slots.itemLabel}>
                        {child.icon && (
                          <span className={layerMenuTheme.slots.iconSlot}>
                            {child.icon}
                          </span>
                        )}
                        <span>{child.label}</span>
                      </span>
                      {child.shortcut && (
                        <span
                          className={menuShortcutClasses({
                            disabled: child.disabled,
                            accent: child.accent,
                          })}
                        >
                          {child.shortcut}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={action.id}
            className={menuItemClasses({
              disabled: action.disabled,
              destructive: action.destructive,
              accent: action.accent,
            })}
            disabled={action.disabled}
            onClick={() => {
              if (!action.disabled) {
                handleClose();
                runAction(action.id);
              }
            }}
          >
            <span className={layerMenuTheme.slots.itemLabel}>
              {action.icon && (
                <span className={layerMenuTheme.slots.iconSlot}>
                  {action.icon}
                </span>
              )}
              <span>{action.label}</span>
            </span>
            {action.shortcut && (
              <span
                className={menuShortcutClasses({
                  disabled: action.disabled,
                  accent: action.accent,
                })}
              >
                {action.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Hook: Adjust position to stay within viewport ─────────────────────────────

function useAdjustedPosition(
  x: number,
  y: number,
  ref: React.RefObject<HTMLElement | null>,
) {
  const [pos, setPos] = useState({ x, y });
  const [hasMeasured, setHasMeasured] = useState(false);

  useEffect(() => {
    // On first render after mount, measure and adjust
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > vw) adjustedX = Math.max(4, vw - rect.width - 8);
    if (y + rect.height > vh) adjustedY = Math.max(4, vh - rect.height - 8);

    if (!hasMeasured) {
      // Legitimate measure-layout-then-set-state effect: stores the clamped
      // position once the menu has been painted so it never overflows.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasMeasured(true);
      setPos({ x: adjustedX, y: adjustedY });
    }
  }, [x, y, ref, hasMeasured]);

  // Also compute a fallback inline if ref isn't available yet
  if (!hasMeasured) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const estimatedWidth = 200;
    const estimatedHeight = 400;
    let adjustedX = x;
    let adjustedY = y;
    if (x + estimatedWidth > vw) adjustedX = Math.max(4, vw - estimatedWidth - 8);
    if (y + estimatedHeight > vh) adjustedY = Math.max(4, vh - estimatedHeight - 8);
    return { x: adjustedX, y: adjustedY };
  }

  return pos;
}

