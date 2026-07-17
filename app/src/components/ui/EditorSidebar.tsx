import { useState } from "react";
import { Type, Image as ImageIcon, Square, Circle, PenTool, Maximize, MousePointer2 } from "lucide-react";
import LayerPanel, { type LayerType } from "../editorSidebar/LayerPanel";
import FramePanel, { type FrameSize } from "../editorSidebar/FramePanel";

const initialLayers: LayerType[] = [
  { id: "4", name: "Main Title", type: "text", locked: false, visible: true, active: true },
  { id: "5", name: "Subtitle", type: "text", locked: false, visible: true },
  { id: "2", name: "Avatar Ring", type: "circle", locked: false, visible: true },
  { id: "3", name: "Hero Image", type: "image", locked: false, visible: true },
  { id: "6", name: "Decorative Dots", type: "group", locked: false, visible: false },
  { id: "1", name: "Background", type: "shape", locked: true, visible: true },
];

const tools = [
  { id: "select", icon: <MousePointer2 className="w-4 h-4" />, name: "Select" },
  { id: "frame", icon: <Maximize className="w-4 h-4" />, name: "Frame" },
  { id: "rect", icon: <Square className="w-4 h-4" />, name: "Rectangle" },
  { id: "circle", icon: <Circle className="w-4 h-4" />, name: "Circle" },
  { id: "text", icon: <Type className="w-4 h-4" />, name: "Text" },
  { id: "pen", icon: <PenTool className="w-4 h-4" />, name: "Pen" },
  { id: "image", icon: <ImageIcon className="w-4 h-4" />, name: "Image" },
];

interface EditorSidebarProps {
  frameSize: FrameSize;
  setFrameSize: (size: FrameSize) => void;
}

export default function EditorSidebar({ frameSize, setFrameSize }: EditorSidebarProps) {
  const [layers, setLayers] = useState<LayerType[]>(initialLayers);
  const [activeTool, setActiveTool] = useState("select");

  const handleToolClick = (toolId: string, toolName: string) => {
    setActiveTool(toolId);

    // Add new layer for certain tools
    if (["rect", "circle", "text", "image"].includes(toolId)) {
      const newLayer = {
        id: Date.now().toString(),
        name: `New ${toolName}`,
        type: toolId,
        locked: false,
        visible: true,
        active: true
      };

      setLayers(prev => {
        const activeIndex = prev.findIndex(l => l.active);
        const insertIndex = activeIndex >= 0 ? activeIndex : 0;
        const newLayers = prev.map(l => ({ ...l, active: false }));
        newLayers.splice(insertIndex, 0, newLayer);
        return newLayers;
      });

      // Revert back to select tool after adding
      setTimeout(() => setActiveTool("select"), 100);
    }
  };

  return (
    <aside className="w-72 shrink-0 border-r border-white/5 bg-[#09090b]/95 backdrop-blur-xl flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      {/* Tools Section */}
      <div className="p-4 border-b border-white/5">
        <div className="grid grid-cols-4 gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id, tool.name)}
              title={tool.name}
              className={`p-2.5 rounded-md flex items-center justify-center transition-all ${activeTool === tool.id
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                }`}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Panels */}
      {activeTool === 'frame' && (
        <FramePanel frameSize={frameSize} setFrameSize={setFrameSize} />
      )}

      {/* Layers Section */}
      <LayerPanel layers={layers} setLayers={setLayers} />
    </aside>
  );
}