import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import {
  TOUR_STEPS,
  ANCHORED_STEPS,
  anchoredIndexOfTourValue,
  walkthroughIndexOfAnchored,
} from "./tourSteps";

export const TOUR_EVENT = "toggle-editor-tour";
export const TOUR_STATE_EVENT = "editor-tour-state";

export function startEditorTour() {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT));
}

type TourMode = "closed" | "explore" | "walkthrough";

interface TargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_EST_HEIGHT = 270;
/** Targets taller than this get the popup pinned to their top edge. */
const TALL_TARGET_PX = 400;
/** About button in the top nav — the hint card docks under it. */
const ABOUT_BTN_SELECTOR = '[aria-label="About editor tools"]';
/**
 * Grace before the popup clears after the cursor leaves a group.
 * Lets the user cross the gap to the card and hit "Take full tour"
 * without the popup unmounting mid-travel (no chasing).
 */
const LEAVE_GRACE_MS = 250;

function readRect(selector?: string, scroll = true): TargetRect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return null;
  if (scroll) {
    try {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch {
      /* scrollIntoView may throw in odd containers — highlight still works */
    }
  }
  const r = el.getBoundingClientRect();
  // jsdom / hidden targets report 0-size — treat as "no target", center card.
  if (r.width === 0 && r.height === 0) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

export default function EditorTour() {
  const [mode, setMode] = useState<TourMode>("closed");
  const [stepIndex, setStepIndex] = useState(0);
  const [hovered, setHovered] = useState(-1);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Ref mirrors hovered for the mouseover listener (synced in an effect below).
  const hoveredRef = useRef(hovered);
  useEffect(() => {
    hoveredRef.current = hovered;
  });

  const measureFor = useCallback((m: TourMode, hov: number, step: number) => {
    if (m === "explore" && hov >= 0) {
      setRect(readRect(ANCHORED_STEPS[hov]?.selector, false));
    } else if (m === "explore") {
      // Nothing hovered: ring + dock the hint card at the About button.
      setRect(readRect(ABOUT_BTN_SELECTOR, false));
    } else if (m === "walkthrough") {
      setRect(readRect(TOUR_STEPS[step]?.selector, true));
    } else {
      setRect(null);
    }
  }, []);

  // Pending leave-clear timeout (cleared on re-enter / popup hover / close).
  const leaveTimer = useRef<number | null>(null);
  const cancelLeave = useCallback(() => {
    if (leaveTimer.current !== null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);
  const scheduleLeave = useCallback(() => {
    cancelLeave();
    leaveTimer.current = window.setTimeout(() => {
      leaveTimer.current = null;
      setHovered(-1);
      measureFor("explore", -1, 0);
    }, LEAVE_GRACE_MS);
  }, [cancelLeave, measureFor]);

  const close = useCallback(() => {
    cancelLeave();
    setMode("closed");
    setHovered(-1);
    setRect(null);
  }, [cancelLeave]);

  // Toggle on About-button event.
  useEffect(() => {
    const handler = () => {
      cancelLeave();
      setMode((m) => (m === "closed" ? "explore" : "closed"));
      setHovered(-1);
      // Opening: dock at the About button right away (closing unmounts anyway).
      setRect(readRect(ABOUT_BTN_SELECTOR, false));
    };
    window.addEventListener(TOUR_EVENT, handler);
    return () => window.removeEventListener(TOUR_EVENT, handler);
  }, [cancelLeave]);

  // Broadcast open state so the About button can show its active style.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(TOUR_STATE_EVENT, { detail: { open: mode !== "closed" } }));
  }, [mode]);

  // Explore: track hovered [data-tour] group (event callbacks only).
  useEffect(() => {
    if (mode !== "explore") return;
    const pick = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      // Ignore hovers inside the tour overlay itself (keeps popup clickable).
      if (t.closest('[data-testid="editor-tour"]')) return;
      const anchor = t.closest("[data-tour]");
      const idx = anchoredIndexOfTourValue(anchor?.getAttribute("data-tour") ?? null);
      if (idx >= 0) {
        cancelLeave();
        if (idx !== hoveredRef.current) {
          setHovered(idx);
          measureFor("explore", idx, 0);
        }
      } else if (hoveredRef.current >= 0 && leaveTimer.current === null) {
        // Cursor left the group — grace before clearing so the card
        // (and its buttons) stay clickable while the mouse travels.
        scheduleLeave();
      }
    };
    document.addEventListener("mouseover", pick);
    document.addEventListener("click", pick, true);
    return () => {
      document.removeEventListener("mouseover", pick);
      document.removeEventListener("click", pick, true);
      cancelLeave();
    };
  }, [mode, measureFor, cancelLeave, scheduleLeave]);

  // Re-measure on resize / scroll + lock body scroll in walkthrough only.
  useEffect(() => {
    if (mode === "closed") return;
    const onResize = () => measureFor(mode, hovered, stepIndex);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const prevOverflow = document.body.style.overflow;
    if (mode === "walkthrough") document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [mode, hovered, stepIndex, measureFor]);

  // Focus the card on mode enter + walkthrough step change (never on hover).
  useEffect(() => {
    if (mode !== "closed") cardRef.current?.focus();
  }, [mode, stepIndex]);

  const enterWalkthrough = useCallback(
    (anchored: number) => {
      cancelLeave();
      const idx = anchored >= 0 ? walkthroughIndexOfAnchored(anchored) : 0;
      setStepIndex(idx);
      setMode("walkthrough");
      measureFor("walkthrough", hovered, idx);
    },
    [hovered, measureFor, cancelLeave],
  );

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      setMode("closed");
      setHovered(-1);
      setRect(null);
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    measureFor("walkthrough", hovered, nextIndex);
  }, [stepIndex, hovered, measureFor]);
  const back = useCallback(() => {
    const prevIndex = Math.max(0, stepIndex - 1);
    setStepIndex(prevIndex);
    measureFor("walkthrough", hovered, prevIndex);
  }, [stepIndex, hovered, measureFor]);

  // Keyboard: Esc always closes; arrows only drive the walkthrough.
  useEffect(() => {
    if (mode === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (mode === "walkthrough" && e.key === "ArrowRight") next();
      else if (mode === "walkthrough" && e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode, close, next, back]);

  if (mode === "closed" || typeof document === "undefined") return null;

  const step = TOUR_STEPS[stepIndex]!;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const hoveredStep = hovered >= 0 ? ANCHORED_STEPS[hovered] : null;

  // Tooltip position: below target when it fits, else above; tall targets
  // (canvas, sidebars) pin the card to their top edge.
  const tooltipStyleFor = (r: TargetRect | null): React.CSSProperties => {
    if (!r) return {};
    const left = Math.min(
      Math.max(16, r.left),
      Math.max(16, window.innerWidth - TOOLTIP_WIDTH - 16),
    );
    if (r.height > TALL_TARGET_PX) {
      return { position: "absolute", left, top: Math.max(8, r.top + 12), width: TOOLTIP_WIDTH };
    }
    const below = r.top + r.height + 12;
    if (below + TOOLTIP_EST_HEIGHT <= window.innerHeight) {
      return { position: "absolute", left, top: below, width: TOOLTIP_WIDTH };
    }
    return {
      position: "absolute",
      left,
      top: Math.max(8, r.top - TOOLTIP_EST_HEIGHT - 12),
      width: TOOLTIP_WIDTH,
    };
  };

  const cardShell =
    "pointer-events-auto bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-5 flex flex-col gap-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60";

  return createPortal(
    <div className="fixed inset-0 z-[200] pointer-events-none" data-testid="editor-tour" data-mode={mode}>
      {/* Dim layer — visual only in explore (click-through), dismissive in walkthrough */}
      <div
        className={`absolute inset-0 bg-black/70 ${mode === "walkthrough" ? "pointer-events-auto" : "pointer-events-none"}`}
        onClick={mode === "walkthrough" ? close : undefined}
        data-testid="tour-dim"
        aria-hidden="true"
      />
      {/* Spotlight ring on the active target */}
      {rect && (
        <div
          aria-hidden="true"
          className="absolute rounded-xl border-2 border-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.55)] pointer-events-none transition-all duration-200"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
          data-testid="tour-highlight"
        />
      )}

      {mode === "explore" && !hoveredStep && (
        <div
          className={
            rect
              ? "absolute"
              : "absolute inset-0 flex items-center justify-center p-4 pointer-events-none"
          }
          onMouseOver={cancelLeave}
        >
          <div
            ref={cardRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="false"
            aria-label="Editor guide: hover any highlighted tool group"
            className={`${cardShell} ${rect ? "" : "w-full max-w-sm"}`}
            style={
              rect
                ? tooltipStyleFor(rect)
                : { width: TOOLTIP_WIDTH, maxWidth: "calc(100vw - 32px)" }
            }
            data-testid="tour-hint"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                  Guide active
                </span>
                <h3 className="text-sm font-semibold text-zinc-100">What does this do?</h3>
              </div>
              <button
                onClick={close}
                aria-label="Close guide"
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Hover any glowing tool group and its description pops up — no need to step
              through all {ANCHORED_STEPS.length}. Click About again or press Esc to exit.
            </p>
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                onClick={() => enterWalkthrough(-1)}
                data-testid="tour-full-tour-btn"
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-all"
              >
                Take full tour
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "explore" && hoveredStep && (
        <div className="absolute" onMouseOver={cancelLeave}>
          <div
            ref={cardRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="false"
            aria-label={`Guide: ${hoveredStep.title} (${hovered + 1} of ${ANCHORED_STEPS.length})`}
            className={cardShell}
            style={tooltipStyleFor(rect)}
            data-testid="tour-explore-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                  {hovered + 1} / {ANCHORED_STEPS.length}
                </span>
                <h3 className="text-sm font-semibold text-zinc-100">{hoveredStep.title}</h3>
              </div>
              <button
                onClick={close}
                aria-label="Close guide"
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">{hoveredStep.body}</p>
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                onClick={() => enterWalkthrough(hovered)}
                data-testid="tour-full-tour-btn"
                className="px-3 py-1.5 text-xs font-medium text-zinc-300 border border-white/10 rounded-md hover:bg-white/5 transition-all"
              >
                Take full tour
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "walkthrough" && (
        <div
          className={
            rect
              ? "absolute pointer-events-none"
              : "absolute inset-0 flex items-center justify-center p-4 pointer-events-none"
          }
        >
          <div
            ref={cardRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Tour step ${stepIndex + 1} of ${TOUR_STEPS.length}: ${step.title}`}
            className={`${cardShell} ${rect ? "" : "w-full max-w-sm"}`}
            style={rect ? tooltipStyleFor(rect) : { width: TOOLTIP_WIDTH, maxWidth: "calc(100vw - 32px)" }}
            data-testid="tour-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                  {stepIndex + 1} / {TOUR_STEPS.length}
                </span>
                <h3 className="text-sm font-semibold text-zinc-100">{step.title}</h3>
              </div>
              <button
                onClick={close}
                aria-label="Close tour"
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">{step.body}</p>
            {/* Progress dots */}
            <div className="flex items-center gap-1.5 flex-wrap" aria-hidden="true">
              {TOUR_STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex ? "w-5 bg-blue-500" : "w-1.5 bg-white/15"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <button
                onClick={close}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 rounded-md transition-colors"
              >
                Skip
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={back}
                  disabled={stepIndex === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-300 border border-white/10 rounded-md hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={next}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-all"
                >
                  {isLast ? "Done" : "Next"}
                  {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
