import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { Preview } from "./components/Preview";
import { EditorPanel } from "./components/EditorPanel";
import {
  fetchState,
  fetchTemplates,
  renderSvg,
  saveState,
  saveToRepo,
  type ComponentInstance,
  type EditorState,
  type FieldSchema,
  type TemplateMeta,
} from "./lib/api";
import { setPath } from "./components/fields/access";

function uid(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [components, setComponents] = useState<ComponentInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // live preview
  const [svg, setSvg] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const stateDirty = useRef(false);

  // ---- load on mount -------------------------------------------------------
  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => setTemplates([]));
    fetchState()
      .then((s: EditorState) => {
        setComponents(s.components);
        if (s.components[0]) setSelectedId(s.components[0].id);
      })
      .catch(() => setComponents([]));
  }, []);

  // ---- persist state (debounced) ------------------------------------------
  useEffect(() => {
    if (!stateDirty.current) return;
    stateDirty.current = false;
    const t = setTimeout(() => {
      saveState({ components }).catch((e) =>
        console.error("[state] persist failed:", e)
      );
    }, 400);
    return () => clearTimeout(t);
  }, [components]);

  const selected = useMemo(
    () => components.find((c) => c.id === selectedId) ?? null,
    [components, selectedId]
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.type === selected?.type) ?? null,
    [templates, selected]
  );

  const dims = useMemo<{ w: number; h: number }>(
    () =>
      selectedTemplate
        ? { w: selectedTemplate.width, h: selectedTemplate.height }
        : { w: 800, h: 300 },
    [selectedTemplate]
  );

  const fields: FieldSchema[] = selectedTemplate?.fields ?? [];

  // ---- live render (debounced) --------------------------------------------
  const renderSeq = useRef(0);
  useEffect(() => {
    if (!selected) {
      setSvg(null);
      return;
    }
    const seq = ++renderSeq.current;
    setRendering(true);
    setRenderError(null);
    const t = setTimeout(async () => {
      try {
        const out = await renderSvg(selected.type, selected.props);
        if (seq === renderSeq.current) setSvg(out); // discard stale responses
      } catch (e) {
        if (seq === renderSeq.current) {
          setRenderError(e instanceof Error ? e.message : String(e));
          setSvg(null);
        }
      } finally {
        if (seq === renderSeq.current) setRendering(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [selected]);

  // ---- mutations -----------------------------------------------------------
  const markDirty = useCallback(() => {
    stateDirty.current = true;
  }, []);

  const addComponent = useCallback(
    (type: string) => {
      const tpl = templates.find((t) => t.type === type);
      if (!tpl) return;
      const id = uid();
      const newInstance: ComponentInstance = {
        id,
        type,
        name: `${tpl.name} ${components.length + 1}`,
        props: structuredClone(tpl.defaults),
      };
      setComponents((prev) => [...prev, newInstance]);
      setSelectedId(id);
      markDirty();
    },
    [templates, components.length, markDirty]
  );

  const deleteComponent = useCallback(
    (id: string) => {
      setComponents((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
      markDirty();
    },
    [selectedId, markDirty]
  );

  const renameComponent = useCallback(
    (id: string, name: string) => {
      setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
      markDirty();
    },
    [markDirty]
  );

  const updateProp = useCallback(
    (key: string, value: unknown) => {
      if (!selected) return;
      setComponents((prev) =>
        prev.map((c) =>
          c.id === selected.id ? { ...c, props: setPath(c.props, key, value) } : c
        )
      );
      markDirty();
    },
    [selected, markDirty]
  );

  // ---- export --------------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { file } = await saveToRepo(selected.type, selected.name, selected.props);
      setLastSaved(file);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [selected]);

  const handleDownload = useCallback(() => {
    if (!svg || !selected) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.name.replace(/\s+/g, "-").toLowerCase() || "component"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [svg, selected]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Topbar onNew={addComponent} templateOptions={templates} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          components={components}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={deleteComponent}
          onRename={renameComponent}
        />

        {selected ? (
          <>
            <Preview
              svg={svg}
              loading={rendering}
              error={renderError}
              naturalWidth={dims.w}
              naturalHeight={dims.h}
            />
            <EditorPanel
              name={selected.name}
              typeName={selectedTemplate?.name ?? selected.type}
              fields={fields}
              props={selected.props}
              saving={saving}
              lastSaved={lastSaved}
              error={saveError}
              onChange={updateProp}
              onSave={handleSave}
              onDownload={handleDownload}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <main
      className="oj-grid-texture"
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--oj-text-dim)",
        fontFamily: "var(--oj-font-mono)",
        fontSize: 13,
      }}
    >
      Select a component — or add a new one from the top bar.
    </main>
  );
}
