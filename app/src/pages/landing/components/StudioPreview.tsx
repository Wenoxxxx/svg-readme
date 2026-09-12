import { useState } from "react";

interface Props {
  svgString: string;
  aspectRatio: number;
  toast: string;
  toastVisible: boolean;
  onDownload: () => void;
  onCopyMarkdown: () => void;
  onCopySvg: () => void;
  onOpenEditor: () => void;
}

export default function StudioPreview({
  svgString,
  aspectRatio,
  toast,
  toastVisible,
  onDownload,
  onCopyMarkdown,
  onCopySvg,
  onOpenEditor,
}: Props) {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="bg-zinc-950 p-8 flex flex-col gap-5 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="flex items-center justify-between relative z-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          Live Preview
        </div>
        <div className="flex bg-white/[0.06] p-0.5 gap-0.5" role="group" aria-label="Preview view">
          <button
            type="button"
            aria-pressed={!showCode}
            onClick={() => setShowCode(false)}
            className={`px-3 py-1 text-[11px] font-medium transition-colors ${!showCode ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            Preview
          </button>
          <button
            type="button"
            aria-pressed={showCode}
            onClick={() => setShowCode(true)}
            className={`px-3 py-1 text-[11px] font-medium transition-colors ${showCode ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            SVG
          </button>
        </div>
      </div>

      {showCode ? (
        <pre className="flex-1 min-h-[200px] max-h-[320px] overflow-auto bg-black/40 border border-white/[0.08] p-4 font-mono text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-all relative z-10">
          {svgString}
        </pre>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[200px] relative z-10">
          <div
            className="bg-zinc-900 border border-white/[0.08] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.8)] overflow-hidden transition-transform duration-300 hover:scale-[1.01] w-full max-w-[800px]"
            style={{ aspectRatio }}
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
        </div>
      )}

      <div className="flex gap-2.5 items-center flex-wrap relative z-10">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#1b5def] text-white text-[13px] font-medium border-0 hover:bg-[#164ecb] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(27,93,239,0.3)] cursor-pointer transition-all whitespace-nowrap"
          onClick={onDownload}
        >
          Download SVG
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/[0.06] text-zinc-200 text-[13px] font-medium border border-white/10 hover:bg-white/10 hover:border-white/[0.15] cursor-pointer transition-all whitespace-nowrap"
          onClick={onCopySvg}
        >
          Copy SVG
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/[0.06] text-zinc-200 text-[13px] font-medium border border-white/10 hover:bg-white/10 hover:border-white/[0.15] cursor-pointer transition-all whitespace-nowrap"
          onClick={onCopyMarkdown}
        >
          Copy Markdown
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-transparent text-zinc-200 text-[13px] font-semibold border border-[#1b5def] hover:bg-[#1b5def] hover:text-white cursor-pointer transition-all whitespace-nowrap"
          onClick={onOpenEditor}
        >
          Open in Full Editor →
        </button>
        <span
          aria-live="polite"
          className={`font-mono text-[11px] text-green-400 transition-opacity duration-300 ml-auto ${
            toastVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {toast}
        </span>
      </div>
      <div className="bg-white/[0.04] border border-white/[0.08] py-2.5 px-3.5 relative z-10">
        <code className="text-[12px] text-zinc-400 overflow-x-auto whitespace-nowrap block font-mono">
          <span className="text-green-400">![banner]</span>
          (./banner.svg)
        </code>
      </div>
    </div>
  );
}
