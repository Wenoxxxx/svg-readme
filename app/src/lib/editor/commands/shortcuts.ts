/**
 * Shortcut bindings and their platform-specific display form.
 *
 * Command definitions store a *canonical* binding (`"Mod+Alt+G"`, `"]"`,
 * `"Backspace"`) rather than a pre-rendered string. `formatShortcut` turns that
 * into what the menu shows, so the same registry drives the `Ctrl+…` labels in
 * the reference design on Windows/Linux and the `⌘⌥…` glyphs on macOS.
 *
 * Only display is affected — key handling lives with the shortcut hook, which
 * reads the same canonical bindings.
 */

export type ShortcutPlatform = "mac" | "windows" | "linux";

/** Modifier tokens understood in a canonical binding, in display order. */
const MAC_MODIFIERS: Record<string, string> = {
  Mod: "\u2318", // ⌘
  Alt: "\u2325", // ⌥
  Shift: "\u21E7", // ⇧
};

const PC_MODIFIERS: Record<string, string> = {
  Mod: "Ctrl",
  Alt: "Alt",
  Shift: "Shift",
};

/** Keys that always render as a glyph, whatever the platform. */
const KEY_GLYPHS: Record<string, string> = {
  Backspace: "\u232B", // ⌫
};

/**
 * Render a canonical binding for display.
 *
 * macOS glues its modifier glyphs straight to the key (`⌘⌥G`), while
 * Windows/Linux spell them out and join with `+` (`Ctrl+Alt+G`), which is what
 * the reference menu shows.
 */
export function formatShortcut(
  binding: string,
  platform: ShortcutPlatform,
): string {
  const tokens = binding.split("+");
  const key = tokens.pop() ?? "";
  const displayKey = KEY_GLYPHS[key] ?? key;

  // A bare key (`]`, `[`) has no modifier to render.
  if (tokens.length === 0) return displayKey;

  if (platform === "mac") {
    return tokens.map((token) => MAC_MODIFIERS[token] ?? token).join("") + displayKey;
  }

  const modifiers = tokens.map((token) => PC_MODIFIERS[token] ?? token);
  return [...modifiers, displayKey].join("+");
}

/** The keyboard fields a canonical binding is matched against. */
export interface ShortcutEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/**
 * Does this key event match a canonical binding?
 *
 * Modifiers must match *exactly*: `"Shift+H"` does not fire on Ctrl+Shift+H, and
 * `"Mod+Shift+H"` does not fire on Shift+H. Without that, every binding would
 * also trigger on the longer combinations that share its suffix.
 *
 * `Mod` accepts Ctrl or Cmd so one table serves every platform. Letter keys
 * compare case-insensitively (the shift state is already checked).
 */
export function matchesShortcut(
  binding: string,
  event: ShortcutEventLike,
): boolean {
  const tokens = binding.split("+");
  const key = tokens.pop() ?? "";

  const wantsMod = tokens.includes("Mod");
  const wantsAlt = tokens.includes("Alt");
  const wantsShift = tokens.includes("Shift");

  if (wantsMod !== (event.ctrlKey || event.metaKey)) return false;
  if (wantsAlt !== event.altKey) return false;
  if (wantsShift !== event.shiftKey) return false;

  // Backspace and Delete are the same physical key on most layouts, and the
  // reference binds the row to the backspace glyph.
  if (key === "Backspace") return event.key === "Backspace" || event.key === "Delete";

  if (key.length === 1 && /[a-z]/i.test(key)) {
    return event.key.toLowerCase() === key.toLowerCase();
  }
  return event.key === key;
}

/** The platform the editor is running on, best-effort from the user agent. */
export function currentPlatform(): ShortcutPlatform {
  if (typeof navigator === "undefined") return "windows";

  const agent =
    (
      navigator as Navigator & { userAgentData?: { platform?: string } }
    ).userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent ||
    "";

  if (/mac|iphone|ipad|ipod/i.test(agent)) return "mac";
  if (/linux|android/i.test(agent)) return "linux";
  return "windows";
}
