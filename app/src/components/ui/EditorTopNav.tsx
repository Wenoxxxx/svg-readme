export default function EditorTopNav() {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/10">
      <div className="flex items-center gap-2">
        <span className="font-[Poppins] font-semibold text-lg">SVG README</span>
        <span className="font-[JetBrains_Mono] text-xs text-white/40">editor</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="px-3 py-1.5 text-sm border border-white/20 hover:bg-white/10 transition-colors">
          Save
        </button>
        <button className="px-3 py-1.5 text-sm bg-[#1b5def] hover:bg-[#1b5def]/90 transition-colors">
          Export SVG
        </button>
      </div>
    </header>
  );
}