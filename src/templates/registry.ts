import type { FieldSchema, TemplateMeta } from "./schema";
import type { Renderable } from "../render/render";
import {
  bannerDefaults,
  bannerFields,
  bannerMeta,
  bannerRenderable,
} from "./banner";
import {
  statCardDefaults,
  statCardFields,
  statCardMeta,
  statCardRenderable,
} from "./stat-card";
import {
  techStackDefaults,
  techStackFields,
  techStackMeta,
  techStackRenderable,
} from "./tech-stack";
import {
  quoteCardDefaults,
  quoteCardFields,
  quoteCardMeta,
  quoteCardRenderable,
} from "./quote-card";

/**
 * A template bundles everything the editor needs to render + edit a component
 * type: metadata, default props, the field schema (drives the form), and the
 * renderable (drives the SVG).
 */
export interface Template<P = Record<string, unknown>> {
  meta: TemplateMeta;
  defaults: P;
  fields: FieldSchema[];
  renderable: Renderable<P>;
}

// Using `any` for the registry value because each template carries a different
// props shape; lookups are narrowed by the caller based on `meta.type`.
export const TEMPLATES: Record<string, Template<any>> = {
  [bannerMeta.type]: {
    meta: bannerMeta,
    defaults: bannerDefaults,
    fields: bannerFields,
    renderable: bannerRenderable,
  },
  [statCardMeta.type]: {
    meta: statCardMeta,
    defaults: statCardDefaults,
    fields: statCardFields,
    renderable: statCardRenderable,
  },
  [techStackMeta.type]: {
    meta: techStackMeta,
    defaults: techStackDefaults,
    fields: techStackFields,
    renderable: techStackRenderable,
  },
  [quoteCardMeta.type]: {
    meta: quoteCardMeta,
    defaults: quoteCardDefaults,
    fields: quoteCardFields,
    renderable: quoteCardRenderable,
  },
};

export const TEMPLATE_LIST: TemplateMeta[] = Object.values(TEMPLATES).map(
  (t) => t.meta
);

export function getTemplate(type: string): Template<any> | undefined {
  return TEMPLATES[type];
}
