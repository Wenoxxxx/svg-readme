const mockLayers = [
  { id: "1", name: "Background" },
  { id: "2", name: "Name Text" },
  { id: "3", name: "Typing Animation" },
];

export default function EditorSidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-white/10 flex flex-col">
      <div className="px-3 py-2 text-xs font-mono text-white/40 uppercase">
        Layers
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul>
          {mockLayers.map((layer) => (
            <li
              key={layer.id}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-white/5 border-l-2 border-transparent hover:border-brand"
            >
              {layer.name}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}