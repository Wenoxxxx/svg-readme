import type { ReactElement } from "react";
import { createElement } from "react";
import type { FieldSchema, TemplateMeta } from "./schema";
import type { Renderable } from "../render/render";
import { whiteBackground } from "../render/animations";
import { ACCENT_PRESETS } from "./banner";

export interface QuoteCardProps {
  quote: string;
  author: string;
  primary: string;
  background: string;
  quoteColor: string;
  authorColor: string;
}

function QuoteCard({
  quote,
  author,
  primary,
  background,
  quoteColor,
  authorColor,
}: QuoteCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "600px",
        height: "260px",
        background,
        borderRadius: 16,
        padding: 40,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* left accent bar */}
      <div
        style={{
          position: "absolute",
          top: 30,
          bottom: 30,
          left: 0,
          width: 6,
          background: primary,
        }}
      />
      <span
        style={{
          fontFamily: "Poppins",
          fontWeight: 500,
          fontSize: 30,
          color: quoteColor,
          lineHeight: 1.35,
        }}
      >
        {quote}
      </span>
      <span
        style={{
          display: "flex",
          fontFamily: "JetBrains Mono",
          fontSize: 16,
          color: authorColor,
          marginTop: 18,
        }}
      >
        — {author}
      </span>
    </div>
  );
}

export const quoteCardMeta: TemplateMeta = {
  type: "quote-card",
  name: "Quote card",
  description: "A styled quote with attribution.",
};

export const quoteCardDefaults: QuoteCardProps = {
  quote: "Simplicity is the soul of efficiency.",
  author: "Austin Freeman",
  primary: "#1b5def",
  background: "#0f1117",
  quoteColor: "#ffffff",
  authorColor: "#9CA3AF",
};

export const quoteCardFields: FieldSchema[] = [
  { key: "quote", label: "Quote", type: "textarea", group: "Content" },
  { key: "author", label: "Author", type: "text", group: "Content", placeholder: "Austin Freeman" },
  { key: "primary", label: "Accent", type: "color", group: "Colors", presets: ACCENT_PRESETS },
  { key: "background", label: "Background", type: "color", group: "Colors" },
  { key: "quoteColor", label: "Quote color", type: "color", group: "Colors" },
  { key: "authorColor", label: "Author color", type: "color", group: "Colors" },
];

export const quoteCardRenderable: Renderable<QuoteCardProps> = {
  width: 600,
  height: 260,
  render: (props: QuoteCardProps): ReactElement => createElement(QuoteCard, props),
  inject: ({ width, height }) =>
    `<style>${whiteBackground(width, height)}</style>`,
};
