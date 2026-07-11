import type { ReactElement } from "react";
import { createElement } from "react";
import type { BannerProps } from "../components/Banner";
import { Banner } from "../components/Banner";
import type { FieldSchema, TemplateMeta } from "./schema";
import {
  bannerAnimationCss,
  gridBackground,
  whiteBackground,
} from "../render/animations";
import type { Renderable } from "../render/render";

/** ojtrack-derived accent presets, surfaced in the color picker. */
export const ACCENT_PRESETS = [
  "#1b5def", // ojtrack blue (default)
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#111827",
];

export const bannerMeta: TemplateMeta = {
  type: "banner",
  name: "Banner",
  description: "Profile README banner — avatar, name, subtitle, badge.",
};

export const bannerDefaults: BannerProps = {
  name: "Owen Jerusalem",
  subtitle: "IT STUDENT | BUKSU",
  avatarUrl: "https://github.com/Wenoxxxxxx.png?size=200",
  primary: "#1b5def",
  subtitleColor: "#9CA3AF",
  nameColor: "#111827",
  badgeText: "Hello World!",
};

export const bannerFields: FieldSchema[] = [
  { key: "name", label: "Name", type: "text", group: "Content", placeholder: "Your name" },
  { key: "subtitle", label: "Subtitle", type: "text", group: "Content", placeholder: "IT STUDENT | BUKSU" },
  { key: "badgeText", label: "Badge text", type: "text", group: "Content", placeholder: "Hello World!" },
  { key: "avatarUrl", label: "Avatar", type: "image", group: "Content" },
  { key: "primary", label: "Accent", type: "color", group: "Colors", presets: ACCENT_PRESETS },
  { key: "nameColor", label: "Name color", type: "color", group: "Colors" },
  { key: "subtitleColor", label: "Subtitle color", type: "color", group: "Colors" },
];

export const bannerRenderable: Renderable<BannerProps> = {
  width: 1500,
  height: 300,
  render: (props: BannerProps): ReactElement => createElement(Banner, props),
  inject: ({ width, height }) =>
    `<style>${bannerAnimationCss()}</style>${whiteBackground(
      width,
      height
    )}${gridBackground(width, height)}`,
};
