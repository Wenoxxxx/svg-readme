import { useState } from "react";
import {
  Layers,
  Eye,
  Lock,
  EyeOff,
  Unlock,
  Plus,
  GripVertical,
  Trash2,
} from "lucide-react";

export type LayerType = {
  id: string;
  name: string;
  type: string;
  locked: boolean;
  visible: boolean;
  active?: boolean;
};

interface LayerPanelProps {
  layers: LayerType[];
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  /** Called when the user clicks +, after optimistic UI update */
  onAdd?: (layer: LayerType, insertIndex: number) => void;
  /** Called after the layer list has been optimistically reordered */
  onReorder?: (ordered: { id: string; orderIndex: number }[]) => void;
  /** Called after a layer's name has been updated optimistically */
  onRename?: (id: string, name: string) => void;
  /** Called after visibility is toggled optimistically */
  onToggleVisibility?: (id: string, visible: boolean) => void;
  /** Called after lock is toggled optimistically */
  onToggleLock?: (id: string, locked: boolean) => void;
  /** Called after a layer is removed optimistically */
  onDelete?: (id: string) => void;
}

export default function LayerPanel({
  layers,
  setLayers,
  onAdd,
  onReorder,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onDelete,
}: LayerPanelProps) {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLayerId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropId: string) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === dropId) {
      setDraggedLayerId(null);
      return;
    }

    setLayers((prev) => {
      const draggedIndex = prev.findIndex((l) => l.id === draggedLayerId);
      const dropIndex = prev.findIndex((l) => l.id === dropId);

      if (draggedIndex === -1 || dropIndex === -1) return prev;

      const newLayers = [...prev];
      const [draggedLayer] = newLayers.splice(draggedIndex, 1);
      newLayers.splice(dropIndex, 0, draggedLayer);

      // Notify parent to persist new order
      onReorder?.(newLayers.map((l, i) => ({ id: l.id, orderIndex: i })));

      return newLayers;
    });

    setDraggedLayerId(null);
  };

  const handleDragEnd = () => {
    setDraggedLayerId(null);
  };

  const toggleVisibility = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        onToggleVisibility?.(id, !l.visible);
        return { ...l, visible: !l.visible };
      }),
    );
  };

  const toggleLock = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        onToggleLock?.(id, !l.locked);
        return { ...l, locked: !l.locked };
      }),
    );
  };

  const setActiveLayer = (id: string) => {
    setLayers((prev) => prev.map((l) => ({ ...l, active: l.id === id })));
  };

  const handleAddLayer = () => {
    const newLayer: LayerType = {
      id: Date.now().toString(),
      name: "New Layer",
      type: "shape",
      locked: false,
      visible: true,
      active: true,
    };
    setLayers((prev) => {
      const activeIndex = prev.findIndex((l) => l.active);
      const insertIndex = activeIndex >= 0 ? activeIndex : 0;
      const newLayers = prev.map((l) => ({ ...l, active: false }) as LayerType);
      newLayers.splice(insertIndex, 0, newLayer);
      onAdd?.(newLayer, insertIndex);
      return newLayers;
    });
  };

  const handleDeleteLayer = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete?.(id);
    setLayers((prev) => prev.filter((l) => l.id !== id));
  };

  const startEditing = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setEditingLayerId(id);
    setEditingName(name);
  };

  const saveEditing = () => {
    if (editingLayerId) {
      const newName = editingName.trim() || "Untitled Layer";
      onRename?.(editingLayerId, newName);
      setLayers((prev) =>
        prev.map((l) =>
          l.id === editingLayerId ? { ...l, name: newName } : l,
        ),
      );
      setEditingLayerId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEditing();
    } else if (e.key === "Escape") {
      setEditingLayerId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2 text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase font-semibold tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          Layers
        </div>
        <button
          onClick={handleAddLayer}
          className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          title="Add Layer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 py-3 overflow-y-auto overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent">
        <ul className="space-y-1.5 px-3">
          {layers.map((layer) => (
            <li
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, layer.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, layer.id)}
              onDragEnd={handleDragEnd}
              onClick={() => setActiveLayer(layer.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors group ${
                layer.active
                  ? "bg-blue-600/10 text-blue-400"
                  : "text-zinc-300 hover:bg-white/5"
              } ${draggedLayerId === layer.id ? "opacity-50 border-dashed border border-white/20" : "border border-transparent"}`}
            >
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                <div className="cursor-grab active:cursor-grabbing text-zinc-600 group-hover:text-zinc-400 shrink-0">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${layer.active ? "bg-blue-500" : "bg-transparent"}`}
                />
                {editingLayerId === layer.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveEditing}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="flex-1 min-w-0 bg-black/20 border border-blue-500 rounded px-1 text-sm text-white outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className={`truncate flex-1 ${layer.visible ? "" : "opacity-40"}`}
                    onDoubleClick={(e) => startEditing(e, layer.id, layer.name)}
                  >
                    {layer.name}
                  </span>
                )}
              </div>

              <div
                className={`flex items-center gap-2 transition-opacity ml-2 shrink-0 ${layer.active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                <button
                  onClick={(e) => handleDeleteLayer(e, layer.id)}
                  className="hover:text-red-400 transition-colors flex items-center justify-center text-zinc-500 hover:bg-white/5 p-1 rounded"
                  title="Delete Layer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => toggleLock(e, layer.id)}
                  className="hover:text-white transition-colors flex items-center justify-center p-1 rounded hover:bg-white/5"
                  title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                >
                  {layer.locked ? (
                    <Lock className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-zinc-600 opacity-40 hover:opacity-100" />
                  )}
                </button>
                <button
                  onClick={(e) => toggleVisibility(e, layer.id)}
                  className="hover:text-white transition-colors flex items-center justify-center p-1 rounded hover:bg-white/5"
                  title={layer.visible ? "Hide Layer" : "Show Layer"}
                >
                  {layer.visible ? (
                    <Eye className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-zinc-600 opacity-40 hover:opacity-100" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
