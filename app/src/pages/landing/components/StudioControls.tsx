import { QUICK_SWATCHES, QUICK_FONTS, QUICK_MOTIONS } from "../lib/quickBanner";
import type { QuickMotion, QuickTheme, QuickFont } from "../lib/quickBanner";

interface Props {
  handle: string;
  tagline: string;
  color: string;
  motion: QuickMotion;
  size: string;
  theme: QuickTheme;
  font: QuickFont;
  gradient: boolean;
  onHandle: (v: string) => void;
  onTagline: (v: string) => void;
  onColor: (v: string) => void;
  onMotion: (v: QuickMotion) => void;
  onSize: (v: string) => void;
  onTheme: (v: QuickTheme) => void;
  onFont: (v: QuickFont) => void;
  onGradient: (v: boolean) => void;
  onRandomize: () => void;
  onReset: () => void;
}

const inputCls =
  "w-full px-3 py-2.5 border border-zinc-200 text-[13px] text-zinc-900 bg-white outline-none transition-all focus:border-[#1b5def] focus:shadow-[0_0_0_3px_rgba(27,93,239,0.1)]";
const sectionLabel =
  "font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400 flex items-center gap-2";
const toggleWrap = "flex bg-zinc-100 p-1 gap-1";

function toggleBtn(active: boolean) {
  return `flex-1 py-2 text-xs font-medium transition-all ${
    active
      ? "bg-white text-zinc-900 shadow-sm"
      : "text-zinc-500 hover:text-zinc-700"
  }`;
}

export default function StudioControls(p: Props) {
  return (
    <div className="p-7 border-b md:border-b-0 md:border-r border-zinc-200 bg-white flex flex-col gap-7 overflow-y-auto max-h-[720px] md:max-h-none">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={p.onRandomize}
          className="flex-1 py-2 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
        >
          Shuffle 🎲
        </button>
        <button
          type="button"
          onClick={p.onReset}
          className="flex-1 py-2 text-xs font-semibold border border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionLabel}>
          <span className="text-[#1b5def] font-semibold">01</span>
          Content
        </div>
        <div>
          <label htmlFor="quick-handle" className="sr-only">
            Your name or handle
          </label>
          <input
            id="quick-handle"
            className={inputCls}
            type="text"
            value={p.handle}
            onChange={(e) => p.onHandle(e.target.value)}
            maxLength={28}
            placeholder="Your name or handle"
          />
          <div className="text-[10px] text-zinc-400 text-right mt-1 font-mono">
            {p.handle.length}/28
          </div>
        </div>
        <div>
          <label htmlFor="quick-tagline" className="sr-only">
            Your tagline
          </label>
          <input
            id="quick-tagline"
            className={inputCls}
            type="text"
            value={p.tagline}
            onChange={(e) => p.onTagline(e.target.value)}
            maxLength={60}
            placeholder="Your tagline"
          />
          <div className="text-[10px] text-zinc-400 text-right mt-1 font-mono">
            {p.tagline.length}/60
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionLabel} id="quick-accent-label">
          <span className="text-[#1b5def] font-semibold">02</span>
          Accent Color
        </div>
        <div
          className="flex gap-2.5 flex-wrap items-center"
          role="group"
          aria-labelledby="quick-accent-label"
        >
          {QUICK_SWATCHES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-label={s.name}
              aria-pressed={p.color === s.value}
              className={`w-8 h-8 border-2 cursor-pointer transition-all hover:scale-110 relative ${
                p.color === s.value
                  ? "border-zinc-900 shadow-[0_0_0_2px_white,0_0_0_4px_#18181b]"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: s.value }}
              onClick={() => p.onColor(s.value)}
              title={s.name}
            />
          ))}
          <label
            className="w-8 h-8 border-2 border-dashed border-zinc-300 cursor-pointer relative overflow-hidden hover:border-zinc-900 transition-colors"
            title="Custom color"
          >
            <span className="sr-only">Custom color</span>
            <input
              type="color"
              aria-label="Custom accent color"
              className="absolute inset-0 w-full h-full cursor-pointer opacity-100 p-0 border-0"
              value={/^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : "#1b5def"}
              onChange={(e) => p.onColor(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionLabel}>
          <span className="text-[#1b5def] font-semibold">03</span>
          Typography
        </div>
        <label htmlFor="quick-font" className="sr-only">
          Font
        </label>
        <select
          id="quick-font"
          className={inputCls}
          value={p.font}
          onChange={(e) => p.onFont(e.target.value as QuickFont)}
        >
          {QUICK_FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} — {f.stack.split(",")[0].replace(/'/g, "")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionLabel} id="quick-motion-label">
          <span className="text-[#1b5def] font-semibold">04</span>
          Motion
        </div>
        <div
          className="grid grid-cols-2 bg-zinc-100 p-1 gap-1"
          role="group"
          aria-labelledby="quick-motion-label"
        >
          {QUICK_MOTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={p.motion === m.id}
              className={toggleBtn(p.motion === m.id)}
              onClick={() => p.onMotion(m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionLabel}>
          <span className="text-[#1b5def] font-semibold">05</span>
          Style
        </div>
        <div className={toggleWrap} role="group" aria-label="Theme">
          <button
            type="button"
            aria-pressed={p.theme === "light"}
            className={toggleBtn(p.theme === "light")}
            onClick={() => p.onTheme("light")}
          >
            Light
          </button>
          <button
            type="button"
            aria-pressed={p.theme === "dark"}
            className={toggleBtn(p.theme === "dark")}
            onClick={() => p.onTheme("dark")}
          >
            Dark
          </button>
        </div>
        <label className="flex items-center gap-2.5 text-[13px] text-zinc-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={p.gradient}
            onChange={(e) => p.onGradient(e.target.checked)}
            className="w-4 h-4 accent-[#1b5def]"
          />
          Accent gradient wash
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionLabel}>
          <span className="text-[#1b5def] font-semibold">06</span>
          Size
        </div>
        <label htmlFor="quick-size" className="sr-only">
          Banner size
        </label>
        <select
          id="quick-size"
          className={inputCls}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2352525B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: "32px",
          }}
          value={p.size}
          onChange={(e) => p.onSize(e.target.value)}
        >
          <option value="800x200">800 × 200 — Standard</option>
          <option value="1000x220">1000 × 220 — Wide</option>
          <option value="640x160">640 × 160 — Compact</option>
        </select>
      </div>
    </div>
  );
}
