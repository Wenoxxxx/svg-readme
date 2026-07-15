import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Move, Eye } from "lucide-react";

export default function EditorRightBar() {
  return (
    <aside className="w-80 shrink-0 border-l border-white/5 bg-[#09090b]/95 backdrop-blur-xl flex flex-col z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.2)] ">
      
      {/* Design Tab Header */}
      <div className="flex border-b border-white/5 px-2 pt-2">
        <button className="px-4 py-2 text-xs font-medium border-b-2 border-blue-500 text-zinc-100">Design</button>
        <button className="px-4 py-2 text-xs font-medium border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 transition-colors">Animate</button>
        <button className="px-4 py-2 text-xs font-medium border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 transition-colors">Export</button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent">
        {/* Layout Section */}
        <div className="p-6 border-b border-white/5">
          <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider mb-4 font-semibold">
            Layout
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
              <span className="text-zinc-500 text-xs font-mono">X</span>
              <input type="text" defaultValue="120" className="bg-transparent text-sm w-full outline-none text-zinc-300" />
            </div>
            <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
              <span className="text-zinc-500 text-xs font-mono">Y</span>
              <input type="text" defaultValue="45" className="bg-transparent text-sm w-full outline-none text-zinc-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
              <span className="text-zinc-500 text-xs font-mono">W</span>
              <input type="text" defaultValue="auto" className="bg-transparent text-sm w-full outline-none text-zinc-300" />
            </div>
            <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
              <span className="text-zinc-500 text-xs font-mono">H</span>
              <input type="text" defaultValue="auto" className="bg-transparent text-sm w-full outline-none text-zinc-300" />
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
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
            <div className="w-20 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 flex items-center focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
              <input type="text" defaultValue="48" className="bg-transparent text-sm w-full outline-none text-zinc-300 text-center" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900/50 p-1.5 rounded-md border border-white/5">
            <button className="flex-1 p-2 rounded bg-zinc-800 text-zinc-100 shadow-sm flex items-center justify-center"><AlignLeft className="w-4 h-4" /></button>
            <button className="flex-1 p-2 rounded text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"><AlignCenter className="w-4 h-4" /></button>
            <button className="flex-1 p-2 rounded text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"><AlignRight className="w-4 h-4" /></button>
            <button className="flex-1 p-2 rounded text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"><AlignJustify className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Fill Section */}
        <div className="p-6 border-b border-white/5">
          <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider mb-4 font-semibold">
            Fill
          </div>
          <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 rounded-md p-3 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all cursor-pointer hover:border-white/10">
            <div className="w-6 h-6 rounded border border-white/10" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }} />
            <div className="flex-1 flex flex-col">
              <span className="text-sm text-zinc-300">Gradient</span>
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Linear</span>
            </div>
            <span className="text-xs text-zinc-500 font-mono">100%</span>
          </div>
        </div>
        
        {/* Effects Section */}
        <div className="p-6 border-b border-white/5">
          <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider mb-4 font-semibold flex justify-between items-center">
            Effects
            <button className="text-zinc-400 hover:text-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
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
      </div>
    </aside>
  );
}