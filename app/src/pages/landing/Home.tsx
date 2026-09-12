import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "./components/Hero";
import StudioControls from "./components/StudioControls";
import StudioPreview from "./components/StudioPreview";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import { buildQuickBanner, QUICK_SWATCHES, QUICK_MOTIONS, QUICK_FONTS } from "./lib/quickBanner";
import type { QuickMotion, QuickTheme, QuickFont } from "./lib/quickBanner";
import { saveQuickHandoff } from "./lib/quickHandoff";

const DEFAULTS = {
  handle: "Owen Jerusalem",
  tagline: "BSIT student · freelance designer · builder",
  color: "#1b5def",
  motion: "fade" as QuickMotion,
  size: "800x200",
  theme: "light" as QuickTheme,
  font: "mono" as QuickFont,
  gradient: false,
};

const SIZES = ["800x200", "1000x220", "640x160"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Home() {
  const navigate = useNavigate();
  const [handle, setHandle] = useState(DEFAULTS.handle);
  const [tagline, setTagline] = useState(DEFAULTS.tagline);
  const [color, setColor] = useState(DEFAULTS.color);
  const [motion, setMotion] = useState<QuickMotion>(DEFAULTS.motion);
  const [size, setSize] = useState(DEFAULTS.size);
  const [theme, setTheme] = useState<QuickTheme>(DEFAULTS.theme);
  const [font, setFont] = useState<QuickFont>(DEFAULTS.font);
  const [gradient, setGradient] = useState(DEFAULTS.gradient);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const flashToast = (msg: string) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setToast(""), 300);
    }, 2200);
  };

  const svgString = useMemo(
    () => buildQuickBanner({ handle, tagline, color, motion, size, theme, font, gradient }),
    [handle, tagline, color, motion, size, theme, font, gradient],
  );

  const handleDownload = () => {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "banner.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flashToast("Downloaded banner.svg");
  };

  const handleCopyMarkdown = () => {
    const md = "![banner](./banner.svg)";
    navigator.clipboard
      .writeText(md)
      .then(() => flashToast("Copied to clipboard"))
      .catch(() => flashToast("Copy needs HTTPS — use download instead"));
  };

  const handleCopySvg = () => {
    navigator.clipboard
      .writeText(svgString)
      .then(() => flashToast("SVG code copied"))
      .catch(() => flashToast("Copy needs HTTPS — use download instead"));
  };

  const handleOpenEditor = () => {
    saveQuickHandoff({ handle, tagline, color, motion, size, theme, font, gradient });
    navigate("/editor");
  };

  const handleRandomize = () => {
    setColor(pick(QUICK_SWATCHES).value);
    setMotion(pick(QUICK_MOTIONS).id);
    setFont(pick(QUICK_FONTS).id);
    setSize(pick(SIZES));
    setGradient(Math.random() < 0.5);
    setTheme(Math.random() < 0.5 ? "dark" : "light");
    flashToast("Shuffled style 🎲");
  };

  const handleReset = () => {
    setHandle(DEFAULTS.handle);
    setTagline(DEFAULTS.tagline);
    setColor(DEFAULTS.color);
    setMotion(DEFAULTS.motion);
    setSize(DEFAULTS.size);
    setTheme(DEFAULTS.theme);
    setFont(DEFAULTS.font);
    setGradient(DEFAULTS.gradient);
    flashToast("Reset to defaults");
  };

  const [svgW, svgH] = size.split("x").map(Number);
  const aspectRatio = svgW / svgH;

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans antialiased">
      <Hero />

      <div className="max-w-[1200px] mx-auto px-6" id="studio">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] border border-zinc-200 overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.06)] mb-20 scroll-mt-20">
          <StudioControls
            handle={handle}
            tagline={tagline}
            color={color}
            motion={motion}
            size={size}
            theme={theme}
            font={font}
            gradient={gradient}
            onHandle={setHandle}
            onTagline={setTagline}
            onColor={setColor}
            onMotion={setMotion}
            onSize={setSize}
            onTheme={setTheme}
            onFont={setFont}
            onGradient={setGradient}
            onRandomize={handleRandomize}
            onReset={handleReset}
          />
          <StudioPreview
            svgString={svgString}
            aspectRatio={aspectRatio}
            toast={toast}
            toastVisible={toastVisible}
            onDownload={handleDownload}
            onCopyMarkdown={handleCopyMarkdown}
            onCopySvg={handleCopySvg}
            onOpenEditor={handleOpenEditor}
          />
        </div>
      </div>

      <Features />
      <HowItWorks />
    </div>
  );
}
