import EditorLayout from "../../layouts/EditorLayout";

export default function Editor() {
  return (
    <EditorLayout>
      {/* Canvas Area wrapper for zoom/pan context */}
      <div className="relative w-full h-full flex items-center justify-center p-12 overflow-hidden">
        
        {/* The actual SVG Canvas/Artboard */}
        <div className="w-[700px] h-[350px] bg-zinc-900 rounded-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden flex flex-col group transition-transform duration-500 hover:scale-[1.01]">
          
          {/* Mock Canvas Content to make it look premium */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black p-8 flex flex-col justify-center">
            {/* Top colorful accent border */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-1 shadow-[0_0_40px_rgba(59,130,246,0.4)]">
                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center border-[3px] border-zinc-900">
                  <img src="https://avatars.githubusercontent.com/u/9919?v=4" alt="GitHub" className="w-full h-full rounded-full opacity-90" />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 relative">
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 font-[Poppins] tracking-tight">
                  Hi, I'm a Developer
                </h1>
                
                {/* Active Element Selection Box (Mock) */}
                <div className="absolute -inset-x-4 -inset-y-3 border-[1.5px] border-blue-500 bg-blue-500/5 rounded-lg pointer-events-none hidden group-hover:block transition-all z-20">
                  <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-white border-[1.5px] border-blue-500 rounded-sm"></div>
                  <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-white border-[1.5px] border-blue-500 rounded-sm"></div>
                  <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-white border-[1.5px] border-blue-500 rounded-sm"></div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-white border-[1.5px] border-blue-500 rounded-sm"></div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] px-2.5 py-1 rounded font-mono shadow-md whitespace-nowrap tracking-wide">Main Title</div>
                </div>

                <p className="text-xl text-zinc-400 font-[JetBrains_Mono]">Building beautiful things for the web</p>
              </div>
            </div>
            
            <div className="mt-8 flex gap-3 z-10">
              <div className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium shadow-[0_0_15px_rgba(59,130,246,0.1)]">React</div>
              <div className="px-4 py-1.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-white/5 text-sm font-medium backdrop-blur-sm hover:bg-zinc-800 transition-colors cursor-pointer">TypeScript</div>
              <div className="px-4 py-1.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-white/5 text-sm font-medium backdrop-blur-sm hover:bg-zinc-800 transition-colors cursor-pointer">Tailwind</div>
            </div>
          </div>
        </div>

        {/* Canvas Controls (Zoom, Pan) */}
        <div className="absolute bottom-6 right-6 flex items-center bg-[#09090b]/90 backdrop-blur-xl border border-white/10 rounded-lg p-1.5 shadow-2xl z-20">
          <button className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
          </button>
          <div className="px-3 text-xs font-mono text-zinc-300 select-none">100%</div>
          <button className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
        </div>

      </div>
    </EditorLayout>
  );
}