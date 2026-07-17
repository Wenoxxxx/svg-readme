import { useState } from "react";
import EditorLayout from "../../layouts/EditorLayout";

export default function Editor() {
  const [frameSize, setFrameSize] = useState({ width: 700, height: 350 });
  const [isProjectActive, setIsProjectActive] = useState(false);
  const [customWidth, setCustomWidth] = useState("800");
  const [customHeight, setCustomHeight] = useState("200");

  if (!isProjectActive) {
    return (
      <EditorLayout frameSize={frameSize} setFrameSize={setFrameSize}>
        <div className="relative w-full h-full flex items-center justify-center p-12 overflow-hidden">
          <div className="bg-zinc-900 border border-white/10 p-8 w-full max-w-md rounded-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] flex flex-col gap-6 z-30">
            <div>
              <h2 className="text-xl font-semibold text-white font-[Poppins]">Create a new banner</h2>
              <p className="text-xs text-zinc-400 mt-1">Get started by creating a blank canvas or picking a standard template.</p>
            </div>

            {/* Custom size inputs */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Custom Dimensions</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 bg-zinc-950 border border-white/5 rounded-md px-3 py-2">
                  <span className="text-zinc-500 text-xs font-mono">W</span>
                  <input 
                    type="number" 
                    value={customWidth} 
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className="bg-transparent text-sm w-full outline-none text-zinc-300 focus:text-white"
                  />
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 border border-white/5 rounded-md px-3 py-2">
                  <span className="text-zinc-500 text-xs font-mono">H</span>
                  <input 
                    type="number" 
                    value={customHeight} 
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className="bg-transparent text-sm w-full outline-none text-zinc-300 focus:text-white"
                  />
                </div>
              </div>
              <button 
                onClick={() => {
                  const w = parseInt(customWidth) || 800;
                  const h = parseInt(customHeight) || 200;
                  setFrameSize({ width: w, height: h });
                  setIsProjectActive(true);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-md shadow-lg shadow-blue-500/20 transition-all cursor-pointer border border-blue-500/50"
              >
                Create Blank Canvas
              </button>
            </div>

            <div className="h-px bg-white/5" />

            {/* Predefined Templates */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Templates</span>
              <div className="flex flex-col gap-2">
                {[
                  { name: "Standard Banner", desc: "Recommended for profiles", w: 800, h: 200 },
                  { name: "Wide Profile Banner", desc: "Fits wide layouts", w: 1000, h: 220 },
                  { name: "Compact Banner", desc: "Perfect for tight spaces", w: 640, h: 160 }
                ].map((t) => (
                  <button 
                    key={t.name}
                    onClick={() => {
                      setFrameSize({ width: t.w, height: t.h });
                      setIsProjectActive(true);
                    }}
                    className="flex justify-between items-center bg-zinc-950 hover:bg-zinc-800/80 p-3 rounded-md border border-white/5 transition-all text-left group cursor-pointer"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{t.name}</h4>
                      <p className="text-[11px] text-zinc-500">{t.desc}</p>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded">
                      {t.w} × {t.h}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </EditorLayout>
    );
  }

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