// ─── Shape Path Helpers ───────────────────────────────────────────────────────

/**
 * Direction of a line shape inside its bounding box.
 * - undefined / "horizontal": legacy documents — a horizontal line through the
 *   vertical middle of the box.
 * - "down": top-left → bottom-right.
 * - "up": bottom-left → top-right.
 */
export type LineDirection = "horizontal" | "down" | "up";

/** Endpoints of a line shape in world coordinates (before rotation/flip). */
export function getLineEndpoints(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  lineDirection?: LineDirection;
}): { x1: number; y1: number; x2: number; y2: number } {
  const { x, y, width, height, lineDirection } = props;
  if (lineDirection === "down") return { x1: x, y1: y, x2: x + width, y2: y + height };
  if (lineDirection === "up") return { x1: x, y1: y + height, x2: x + width, y2: y };
  const midY = y + height / 2;
  return { x1: x, y1: midY, x2: x + width, y2: midY };
}

/**
 * Line geometry from a creation drag. Shift snaps the angle to 45° steps
 * (Figma). A click without a drag yields an 80px horizontal line.
 */
export function lineFromDrag(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  shiftKey = false,
): { x: number; y: number; width: number; height: number; lineDirection: LineDirection; x1: number; y1: number; x2: number; y2: number } {
  let dx = currentX - startX;
  let dy = currentY - startY;
  if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
    return { x: startX - 40, y: startY, width: 80, height: 0, lineDirection: "down", x1: startX - 40, y1: startY, x2: startX + 40, y2: startY };
  }
  if (shiftKey) {
    const len = Math.hypot(dx, dy);
    const step = Math.PI / 4;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    dx = len * Math.cos(angle);
    dy = len * Math.sin(angle);
    if (Math.abs(dx) < 1e-9) dx = 0;
    if (Math.abs(dy) < 1e-9) dy = 0;
  }
  const x2 = startX + dx;
  const y2 = startY + dy;
  return {
    x: Math.min(startX, x2),
    y: Math.min(startY, y2),
    width: Math.abs(dx),
    height: Math.abs(dy),
    lineDirection: dx * dy >= 0 ? "down" : "up",
    x1: startX,
    y1: startY,
    x2,
    y2,
  };
}

/** Triangle SVG path (pointing up). */
export function trianglePath(x: number, y: number, w: number, h: number): string {
  return `M ${x + w / 2} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/** 5-pointed star SVG path. */
export function starPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR * 0.4;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M ${points.join(" L ")} Z`;
}

/** Hexagon SVG path. */
export function hexagonPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push(
      `${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`,
    );
  }
  return `M ${points.join(" L ")} Z`;
}
