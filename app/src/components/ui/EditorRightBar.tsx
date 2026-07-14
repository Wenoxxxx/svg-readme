export default function EditorRightBar() {
  return (
    <aside className="w-64 shrink-0 border-l border-white/10 p-3 flex flex-col gap-3">
      <div className="text-xs font-[JetBrains_Mono] text-white/40 uppercase">
        Properties
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Text
        <input
          className="bg-transparent border border-white/20 px-2 py-1 text-sm focus:border-[#1b5def] outline-none"
          placeholder="Enter text"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Color
        <input type="color" className="h-8 w-full bg-transparent border border-white/20" />
      </label>
    </aside>
  );
}