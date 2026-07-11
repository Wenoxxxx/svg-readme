// CSS + hand-written SVG that Satori can't generate on its own. Each template
// composes whichever pieces it needs inside its own cssInjector.

/** Entrance + ambient animations. Shared across templates. */
export const keyframesCss = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(15px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-30px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes growBar {
    from { transform: scaleY(0); }
    to   { transform: scaleY(1); }
  }
  @keyframes gridDrift {
    from { transform: translate(0, 0); }
    to   { transform: translate(40px, 40px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.5; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

/**
 * Banner-specific animation CSS — targets elements by structural order since
 * Satori strips className from its output. Kept verbatim from the original
 * build-svg.tsx so existing banners render identically.
 */
export function bannerAnimationCss(): string {
  return `
    text:nth-of-type(1) {
      opacity: 0;
      animation: fadeUp 0.8s ease-out 0.6s forwards;
    }
    text:nth-of-type(2) {
      opacity: 0;
      animation: fadeUp 0.8s ease-out 1s forwards;
    }
    rect[width="8"] {
      transform-box: fill-box;
      transform-origin: center;
      animation: growBar 1.2s ease-in-out forwards;
    }
    rect[fill="#f8fafc"] {
      opacity: 0;
      animation: slideIn 1s ease-out 0.2s forwards;
    }
    .grid-bg {
      animation: gridDrift 6s linear infinite;
    }
  `;
}

/** A solid white backing rect so transparent pixels don't show through. */
export function whiteBackground(width: number, height: number): string {
  return `<rect x="0" y="0" width="${width}" height="${height}" fill="white" />`;
}

/**
 * Hand-written grid background — Satori can't do repeating tile patterns. The
 * rect is drawn one tile (40px) larger than the canvas on every side and
 * clipped to the canvas bounds, so animating it exactly one tile-width creates
 * a seamless infinite drift with no visible jump on loop.
 */
export function gridBackground(width: number, height: number): string {
  return `
    <defs>
      <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDE9E6" stroke-width="1" />
      </pattern>
      <clipPath id="gridClip">
        <rect x="0" y="0" width="${width}" height="${height}" />
      </clipPath>
    </defs>
    <g clip-path="url(#gridClip)">
      <rect class="grid-bg" x="-40" y="-40" width="${width + 80}" height="${
    height + 80
  }" fill="url(#gridPattern)" opacity="100" />
    </g>
  `;
}

/** Splice content right after the opening <svg ...> tag, before Satori's body. */
export function injectAfterSvgOpen(rawSvg: string, content: string): string {
  return rawSvg.replace(/<svg([^>]*)>/, `<svg$1>${content}`);
}
