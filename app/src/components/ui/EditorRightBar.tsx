import { useState } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Move,
  Eye,
  Download,
  Clipboard,
  Code,
  Image,
  Check,
} from "lucide-react";

interface EditorRightBarProps {
  onExport?: () => void;
}

export default function EditorRightBar({ onExport }: EditorRightBarProps) {
  const [activeTab, setActiveTab] = useState<"design" | "animate" | "export">(
    "design",
  );
  const [copiedType, setCopiedType] = useState<"svg" | "markdown" | null>(null);

  const handleCopySvg = async () => {
    // We need to get the SVG string - we'll copy from the export function
    // For now, dispatch a custom event that Editor.tsx listens to
    window.dispatchEvent(new CustomEvent("copy-svg-code"));
    setCopiedType("svg");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyMarkdown = async () => {
    window.dispatchEvent(new CustomEvent("copy-markdown"));
    setCopiedType("markdown");
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <aside className="w-80 shrink-0 border-l border-white/5 bg-[#09090b]/95 backdrop-blur-xl flex flex-col z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.2)]">
      {/* Tab Headers */}
      <div className="flex border-b border-white/5 px-2 pt-2">
        <button
          onClick={() => setActiveTab("design")}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "design"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setActiveTab("animate")}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "animate"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Animate
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "export"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Export
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent">
        {activeTab === "design" && <DesignTab />}
        {activeTab === "animate" && <AnimateTab />}
        {activeTab === "export" && (
          <ExportTab
            onExport={onExport}
            onCopySvg={handleCopySvg}
            onCopyMarkdown={handleCopyMarkdown}
            copiedType={copiedType}
          />
        )}
      </div>
    </aside>
  );
}

// ─── Design Tab ───────────────────────────────────────────────────────────────

function DesignTab() {
  return (
    <>
      {/* Layout Section */}
      <div className="p-6 border-b border-white/5">
        <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider mb-4 font-semibold">
          Layout
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <span className="text-zinc-500 text-xs font-mono">X</span>
            <input
              type="text"
              defaultValue="120"
              className="bg-transparent text-sm w-full outline-none text-zinc-300"
            />
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <span className="text-zinc-500 text-xs font-mono">Y</span>
            <input
              type="text"
              defaultValue="45"
              className="bg-transparent text-sm w-full outline-none text-zinc-300"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <span className="text-zinc-500 text-xs font-mono">W</span>
            <input
              type="text"
              defaultValue="auto"
              className="bg-transparent text-sm w-full outline-none text-zinc-300"
            />
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <span className="text-zinc-500 text-xs font-mono">H</span>
            <input
              type="text"
              defaultValue="auto"
              className="bg-transparent text-sm w-full outline-none text-zinc-300"
            />
          </div>
        </div>
      </div>

      {/* Typography Section */}
      <div className="p-6 border-b border-white/5">
        <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider mb-4 font-semibold">
          Typography
        </div>

        <div className="relative mb-4">
          <select className="w-full bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer">
            <option>Inter</option>
            <option selected>Poppins</option>
            <option>JetBrains Mono</option>
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-500">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <select className="w-full bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer">
              <option>Regular</option>
              <option>Medium</option>
              <option>SemiBold</option>
              <option selected>Bold</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-500">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
          <div className="w-20 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 flex items-center focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <input
              type="text"
              defaultValue="48"
              className="bg-transparent text-sm w-full outline-none text-zinc-300 text-center"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900/50 p-1.5 rounded-md border border-white/5">
          <button className="flex-1 p-2 rounded bg-zinc-800 text-zinc-100 shadow-sm flex items-center justify-center">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button className="flex-1 p-2 rounded text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button className="flex-1 p-2 rounded text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors">
            <AlignRight className="w-4 h-4" />
          </button>
          <button className="flex-1 p-2 rounded text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors">
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fill Section */}
      <div className="p-6 border-b border-white/5">
        <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider mb-4 font-semibold">
          Fill
        </div>
        <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 rounded-md p-3 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all cursor-pointer hover:border-white/10">
          <div
            className="w-6 h-6 rounded border border-white/10"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          />
          <div className="flex-1 flex flex-col">
            <span className="text-sm text-zinc-300">Gradient</span>
            <span className="text-[10px] text-zinc-500 uppercase font-mono">
              Linear
            </span>
          </div>
          <span className="text-xs text-zinc-500 font-mono">100%</span>
        </div>
      </div>

      {/* Effects Section */}
      <div className="p-6 border-b border-white/5">
        <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider mb-4 font-semibold flex justify-between items-center">
          Effects
          <button className="text-zinc-400 hover:text-white transition-colors">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between text-sm text-zinc-300 py-2 group cursor-pointer hover:bg-white/5 rounded px-3 -mx-3 transition-colors">
          <span className="flex items-center gap-3">
            <Eye className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            Drop Shadow
          </span>
          <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <Move className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Animate Tab ──────────────────────────────────────────────────────────────

function AnimateTab() {
  return (
    <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-400"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-1">Animation</h3>
        <p className="text-xs text-zinc-500">
          Animate individual layers with CSS keyframes baked into the exported
          SVG.
        </p>
      </div>
      <button className="px-4 py-2 text-xs font-medium bg-zinc-800 text-zinc-300 border border-white/5 rounded-md hover:bg-zinc-700 transition-colors">
        Coming soon
      </button>
    </div>
  );
}

// ─── Export Tab ───────────────────────────────────────────────────────────────

interface ExportTabProps {
  onExport?: () => void;
  onCopySvg: () => void;
  onCopyMarkdown: () => void;
  copiedType: "svg" | "markdown" | null;
}

function ExportTab({
  onExport,
  onCopySvg,
  onCopyMarkdown,
  copiedType,
}: ExportTabProps) {
  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider mb-4 font-semibold">
          Export
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed mb-5">
          Export your banner as a standalone SVG file. Drop it in your repo and
          reference it with a standard markdown image tag.
        </p>

        {/* Format selector */}
        <div className="flex border border-white/5 rounded-md overflow-hidden mb-5">
          <div className="flex-1 py-2.5 px-3 bg-blue-600/20 text-blue-400 text-xs font-medium flex items-center justify-center gap-2 border-r border-white/5">
            <Image className="w-3.5 h-3.5" />
            SVG
          </div>
          <div className="flex-1 py-2.5 px-3 bg-zinc-900 text-zinc-500 text-xs font-medium flex items-center justify-center gap-2">
            <Code className="w-3.5 h-3.5" />
            PNG
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onExport}
            className="w-full flex items-center justify-center gap-2.5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md shadow-lg shadow-blue-500/20 transition-all duration-200 border border-blue-500/50"
          >
            <Download className="w-4 h-4" />
            Download SVG
          </button>

          <button
            onClick={onCopySvg}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm font-medium rounded-md border border-white/5 transition-all duration-200"
          >
            {copiedType === "svg" ? (
              <>
                <Check className="w-4 h-4 text-green-400" /> Copied!
              </>
            ) : (
              <>
                <Clipboard className="w-4 h-4" /> Copy SVG Code
              </>
            )}
          </button>

          <button
            onClick={onCopyMarkdown}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm font-medium rounded-md border border-white/5 transition-all duration-200"
          >
            {copiedType === "markdown" ? (
              <>
                <Check className="w-4 h-4 text-green-400" /> Copied!
              </>
            ) : (
              <>
                <Clipboard className="w-4 h-4" /> Copy Markdown
              </>
            )}
          </button>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="p-6 border-b border-white/5">
        <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider mb-3 font-semibold">
          Usage
        </div>
        <ol className="flex flex-col gap-3">
          {[
            { num: "1", text: "Download the SVG file to your project" },
            { num: "2", text: "Place it in your repo alongside README.md" },
            { num: "3", text: "Reference it with a markdown image tag" },
          ].map((step) => (
            <li key={step.num} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-mono text-zinc-400 shrink-0 mt-0.5">
                {step.num}
              </span>
              <span className="text-xs text-zinc-400 leading-relaxed">
                {step.text}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Markdown snippet */}
      <div className="p-6">
        <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider mb-3 font-semibold">
          Markdown
        </div>
        <div className="bg-zinc-950 border border-white/5 rounded-md p-3">
          <code className="text-xs text-zinc-400 font-mono break-all">
            ![banner](./banner.svg)
          </code>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed">
          GitHub, GitLab, and most other markdown renderers will display the SVG
          with any embedded animations.
        </p>
      </div>
    </div>
  );
}
