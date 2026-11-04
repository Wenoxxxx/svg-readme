// ─── XML / CSS escaping for exported SVG ─────────────────────────────────────
// Every value interpolated into the exported SVG that is derived from document
// data must pass through one of these helpers: a crafted design file must not
// be able to inject markup (attributes, elements, scripts) into the export.

/** Escape text for XML element content or a double-quoted attribute value. */
export const escXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** Escape any value (numbers included — a crafted file may smuggle strings
 *  where numbers are expected) for use inside a double-quoted attribute. */
export const attr = (v: unknown): string => escXml(String(v ?? ""));

/** Reduce an arbitrary id to a token safe for XML ids, url(#…) refs and CSS
 *  class selectors. Deterministic, so markup and CSS always agree. */
export const safeToken = (id: string): string => String(id).replace(/[^a-zA-Z0-9_-]/g, "_");

/**
 * Make CSS text safe to embed in an SVG <style> element: removes characters
 * that could end the element / start markup (`<`) or form XML entities (`&`),
 * plus CDATA terminators. CSS keyframes never need either character.
 */
export const sanitizeStyleText = (css: string): string => {
  let out = String(css ?? "").replace(/[<&]/g, "");
  // Loop: a single pass can be bypassed ("]]]]>>" collapses to "]]>").
  while (out.includes("]]>")) out = out.replace(/\]\]>/g, "");
  return out;
};

/** Sanitise a single CSS value (timing function, keyword, name…): also
 *  removes characters that could close the declaration / rule. */
export const sanitizeCssValue = (v: unknown): string =>
  String(v ?? "").replace(/[<>&{};"'\\]/g, "");
