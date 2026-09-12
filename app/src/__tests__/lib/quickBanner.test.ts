import { describe, it, expect } from "vitest";
import {
  buildQuickBanner,
  escapeQuickXml,
  parseQuickSize,
  quickUid,
} from "../../pages/landing/lib/quickBanner";
import { buildHandoffDocument } from "../../pages/landing/lib/quickHandoff";

const base = {
  handle: "Owen",
  tagline: "builder designer",
  color: "#1b5def",
  motion: "fade" as const,
  size: "800x200",
  theme: "light" as const,
};

describe("escapeQuickXml", () => {
  it("escapes quotes for attribute use", () => {
    expect(escapeQuickXml('a"b')).toBe("a&quot;b");
    expect(escapeQuickXml("a&b<c>")).toBe("a&amp;b&lt;c&gt;");
  });
});

describe("parseQuickSize", () => {
  it("falls back on garbage", () => {
    expect(parseQuickSize("nope")).toEqual({ w: 800, h: 200 });
    expect(parseQuickSize("0x0")).toEqual({ w: 800, h: 200 });
    expect(parseQuickSize("800x200")).toEqual({ w: 800, h: 200 });
  });
});

describe("quickUid", () => {
  it("is deterministic and has no dashes", () => {
    const a = quickUid(["x", "y"]);
    expect(quickUid(["x", "y"])).toBe(a);
    expect(a).not.toContain("-");
  });
});

describe("buildQuickBanner", () => {
  it("uses default name on empty handle and hides empty tagline words", () => {
    const svg = buildQuickBanner({ ...base, handle: "   ", tagline: "" });
    expect(svg).toContain("Your Name");
    expect(svg).toContain('aria-label="Your Name banner"');
  });

  it("emits keyframes for all four motions", () => {
    for (const motion of ["fade", "sweep", "rise", "type"] as const) {
      const svg = buildQuickBanner({ ...base, motion });
      expect(svg).toContain("@keyframes");
    }
  });

  it("adds gradient defs only when enabled", () => {
    expect(buildQuickBanner({ ...base, gradient: false })).not.toContain("linearGradient");
    expect(buildQuickBanner({ ...base, gradient: true })).toContain("linearGradient");
  });

  it("uses chosen font stack", () => {
    expect(buildQuickBanner({ ...base, font: "display" })).toContain("Poppins");
    expect(buildQuickBanner({ ...base, font: "sans" })).toContain("Inter");
  });
});

describe("buildHandoffDocument", () => {
  it("builds frame + layers, skips tagline layer when empty", () => {
    const doc = buildHandoffDocument({ ...base, size: "1000x220" });
    expect(doc.frameSize).toEqual({ width: 1000, height: 220 });
    expect(doc.layers.map((l) => l.id)).toContain("quick-handle");
    expect(doc.layers.map((l) => l.id)).toContain("quick-tagline");

    const empty = buildHandoffDocument({ ...base, tagline: "  " });
    expect(empty.layers.map((l) => l.id)).not.toContain("quick-tagline");
  });
});
