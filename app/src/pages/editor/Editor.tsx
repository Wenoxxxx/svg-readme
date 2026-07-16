import { useState } from "react";
import EditorLayout from "../../layouts/EditorLayout";

export default function Editor() {
  const [frameSize, setFrameSize] = useState({ width: 700, height: 350 });

  return (
    <EditorLayout frameSize={frameSize} setFrameSize={setFrameSize}>
      {/* Canvas Area wrapper for zoom/pan context */}
      <div className="relative w-full h-full flex items-center justify-center p-12 overflow-hidden">
        
        {/* The actual SVG Canvas/Artboard */}
        <div 
          className="bg-zinc-900 rounded-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden flex flex-col group transition-all duration-300 hover:scale-[1.01]"
          style={{ width: `${frameSize.width}px`, height: `${frameSize.height}px` }}
        >
        </div>

        {/* Canvas Controls (Zoom, Pan) */}
        <div className="absolute bottom-6 right-6 flex items-center bg-[#09090b]/90 backdrop-blur-xl border border-white/10 rounded-lg p-1.5 shadow-2xl z-20">
          <button className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
          </button>
          <div className="px-3 text-xs font-mono text-zinc-300 select-none">100%</div>
          <button className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
          </button>
        </div>

      </div>
    </EditorLayout>
  );
}