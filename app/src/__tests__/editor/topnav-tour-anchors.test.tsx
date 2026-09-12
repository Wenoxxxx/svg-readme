import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EditorProvider } from "../../context/EditorContext";
import EditorTopNav from "../../components/ui/EditorTopNav";

function renderTopNav() {
  return render(
    <MemoryRouter>
      <EditorProvider initial={{ isProjectActive: true }}>
        <EditorTopNav isProjectActive onExport={() => {}} onNewProject={() => {}} />
      </EditorProvider>
    </MemoryRouter>,
  );
}

describe("EditorTopNav tour anchors", () => {
  it("history highlight covers shortcuts/undo/redo but excludes the About button", () => {
    const { container } = renderTopNav();
    const history = container.querySelector('[data-tour="history"]');
    expect(history).not.toBeNull();
    // Shortcuts + undo + redo live inside the highlight…
    expect(history!.querySelector('[aria-label="Keyboard shortcuts"]')).not.toBeNull();
    expect(history!.querySelector('[title^="Undo"]')).not.toBeNull();
    expect(history!.querySelector('[title^="Redo"]')).not.toBeNull();
    // …but the About button sits outside it.
    const about = screen.getByLabelText("About editor tools");
    expect(history!.contains(about)).toBe(false);
  });

  it("file-actions highlight wraps Open, Save and New together", () => {
    const { container } = renderTopNav();
    const fileActions = container.querySelector('[data-tour="file-actions"]');
    expect(fileActions).not.toBeNull();
    expect(fileActions!.querySelector('[title="Open design JSON file"]')).not.toBeNull();
    expect(fileActions!.querySelector('[title^="Save design"]')).not.toBeNull();
    expect(fileActions!.querySelector('[title="New Project"]')).not.toBeNull();
  });
});
