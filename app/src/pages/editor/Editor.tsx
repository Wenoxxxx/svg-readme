import { EditorProvider } from "../../context/EditorContext";
import { EditorInner } from "./EditorInner";

// ─── Outer component with provider ────────────────────────────────────────────

export default function Editor() {
  return (
    <EditorProvider>
      <EditorInner />
    </EditorProvider>
  );
}
