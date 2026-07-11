import satori from "satori";
import type { ReactElement } from "react";
import { loadFonts } from "./fonts";
import { injectAfterSvgOpen, keyframesCss } from "./animations";

/**
 * A resolved, renderable template instance: the component factory (props → JSX),
 * its canvas size, and an injector that runs after Satori produces its static
 * output. The injector returns arbitrary SVG/markup (a <style> block, animated
 * backgrounds, backing rects — everything Satori can't generate itself). The
 * shared @keyframes are always available.
 */
export interface Renderable<P = Record<string, unknown>> {
  width: number;
  height: number;
  render: (props: P) => ReactElement;
  /** Content inserted right after <svg ...>. Receives canvas size + keyframes. */
  inject?: (ctx: { width: number; height: number; keyframes: string }) => string;
}

/**
 * Render a Renderable + props to a complete SVG string. Single source of truth
 * for both the CLI (`npm run build`) and the editor's API. The keyframes are
 * always injected so any template's CSS can reference them.
 */
export async function renderToSvg<P = Record<string, unknown>>(
  template: Renderable<P>,
  props: P
): Promise<string> {
  const fonts = loadFonts();
  const { width, height } = template;

  const rawSvg = await satori(template.render(props), {
    width,
    height,
    fonts: fonts.map((f) => ({ ...f, data: f.data })),
  });

  const keyframesBlock = `<style>${keyframesCss}</style>`;
  const injected = template.inject?.({ width, height, keyframes: keyframesCss }) ?? "";
  return injectAfterSvgOpen(rawSvg, `${keyframesBlock}${injected}`);
}
