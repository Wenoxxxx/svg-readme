import type { ReactElement } from "react";
import { createElement } from "react";
import type { FieldSchema, TemplateMeta } from "./schema";
import type { Renderable } from "../render/render";
import { whiteBackground } from "../render/animations";
import { ACCENT_PRESETS } from "./banner";

export interface TechStackProps {
  title: string;
  items: string;
  primary: string;
  background: string;
  textColor: string;
  pillColor: string;
}

// Parses a newline-or-comma list into trimmed tokens.
function parseItems(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function TechStack({
  title,
  items,
  primary,
  background,
  textColor,
  pillColor,
}: TechStackProps) {
  const list = parseItems(items);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "600px",
        height: "300px",
        background,
        borderRadius: 16,
        padding: 32,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        <div style={{ width: 8, height: 28, background: primary, marginRight: 14 }} />
        <span
          style={{
            fontFamily: "Poppins",
            fontWeight: 500,
            fontSize: 28,
            color: textColor,
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {list.map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              fontFamily: "JetBrains Mono",
              fontSize: 15,
              color: pillColor,
              border: `1.5px solid ${primary}`,
              borderRadius: 8,
              paddingLeft: 14,
              paddingRight: 14,
              paddingTop: 7,
              paddingBottom: 7,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export const techStackMeta: TemplateMeta = {
  type: "tech-stack",
  name: "Tech stack",
  description: "Monospace pill grid of technologies.",
};

export const techStackDefaults: TechStackProps = {
  title: "Tech I use",
  items: "TypeScript\nReact\nNode.js\nPython\nTailwind\nPostgreSQL\nDocker",
  primary: "#1b5def",
  background: "#0f1117",
  textColor: "#ffffff",
  pillColor: "#e5e7eb",
};

export const techStackFields: FieldSchema[] = [
  { key: "title", label: "Title", type: "text", group: "Content", placeholder: "Tech I use" },
  { key: "items", label: "Items (one per line)", type: "textarea", group: "Content" },
  { key: "primary", label: "Accent", type: "color", group: "Colors", presets: ACCENT_PRESETS },
  { key: "background", label: "Background", type: "color", group: "Colors" },
  { key: "textColor", label: "Title color", type: "color", group: "Colors" },
  { key: "pillColor", label: "Pill text color", type: "color", group: "Colors" },
];

export const techStackRenderable: Renderable<TechStackProps> = {
  width: 600,
  height: 300,
  render: (props: TechStackProps): ReactElement => createElement(TechStack, props),
  inject: ({ width, height }) =>
    `<style>${whiteBackground(width, height)}</style>`,
};
