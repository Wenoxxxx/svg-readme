import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import EditorTour, { TOUR_EVENT } from "../../components/ui/EditorTour/EditorTour";
import {
  TOUR_STEPS,
  ANCHORED_STEPS,
  anchoredIndexOfTourValue,
  walkthroughIndexOfAnchored,
} from "../../components/ui/EditorTour/tourSteps";

function toggleTour() {
  act(() => {
    window.dispatchEvent(new CustomEvent(TOUR_EVENT));
  });
}

/** EditorTour + one hoverable anchor fixture. */
function renderWithAnchor(value = "nav-tools") {
  return render(
    <>
      <div data-tour={value}>anchor fixture</div>
      <EditorTour />
    </>,
  );
}

describe("EditorTour explore mode", () => {
  it("stays hidden until the About button event fires, then shows the hint", () => {
    renderWithAnchor();
    expect(screen.queryByTestId("editor-tour")).not.toBeInTheDocument();
    toggleTour();
    expect(screen.getByTestId("editor-tour")).toHaveAttribute("data-mode", "explore");
    expect(screen.getByTestId("tour-hint")).toBeInTheDocument();
  });

  it("toggles closed when the About event fires again", () => {
    renderWithAnchor();
    toggleTour();
    expect(screen.getByTestId("editor-tour")).toBeInTheDocument();
    toggleTour();
    expect(screen.queryByTestId("editor-tour")).not.toBeInTheDocument();
  });

  it("shows the hovered group's popup with its n/14 counter", () => {
    renderWithAnchor("shape-tools");
    toggleTour();
    fireEvent.mouseOver(screen.getByText("anchor fixture"));
    const card = screen.getByTestId("tour-explore-card");
    expect(card).toBeInTheDocument();
    expect(screen.getByText("Shapes")).toBeInTheDocument();
    // shape-tools is the 3rd anchored step
    expect(screen.getByText("3 / 14")).toBeInTheDocument();
    expect(screen.queryByTestId("tour-hint")).not.toBeInTheDocument();
  });

  it("returns to the hint when the cursor leaves all groups", () => {
    renderWithAnchor();
    toggleTour();
    fireEvent.mouseOver(screen.getByText("anchor fixture"));
    expect(screen.getByTestId("tour-explore-card")).toBeInTheDocument();
    fireEvent.mouseOver(document.body);
    expect(screen.getByTestId("tour-hint")).toBeInTheDocument();
  });

  it("does not close when the dim layer is clicked in explore mode", () => {
    renderWithAnchor();
    toggleTour();
    fireEvent.click(screen.getByTestId("tour-dim"));
    expect(screen.getByTestId("editor-tour")).toBeInTheDocument();
  });

  it("closes on Escape and on the X button", () => {
    renderWithAnchor();
    toggleTour();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("editor-tour")).not.toBeInTheDocument();

    toggleTour();
    fireEvent.click(screen.getByLabelText("Close guide"));
    expect(screen.queryByTestId("editor-tour")).not.toBeInTheDocument();
  });
});

describe("EditorTour walkthrough fallback", () => {
  it("Take full tour jumps the walkthrough to the hovered step", () => {
    renderWithAnchor("shape-tools");
    toggleTour();
    fireEvent.mouseOver(screen.getByText("anchor fixture"));
    fireEvent.click(screen.getByText("Take full tour"));
    expect(screen.getByTestId("editor-tour")).toHaveAttribute("data-mode", "walkthrough");
    const card = screen.getByTestId("tour-card");
    expect(card).toBeInTheDocument();
    expect(screen.getByText("Shapes")).toBeInTheDocument();
  });

  it("Take full tour from the hint starts at the welcome step", () => {
    renderWithAnchor();
    toggleTour();
    fireEvent.click(screen.getByText("Take full tour"));
    expect(screen.getByTestId("tour-card")).toBeInTheDocument();
    expect(screen.getByText("Welcome to the full editor")).toBeInTheDocument();
  });

  it("walkthrough still advances, goes back, and closes on dim click", () => {
    renderWithAnchor();
    toggleTour();
    fireEvent.click(screen.getByText("Take full tour"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Navigate: Move / Hand")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Welcome to the full editor")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tour-dim"));
    expect(screen.queryByTestId("editor-tour")).not.toBeInTheDocument();
  });

  it("shows Done on the last step and finishes", () => {
    renderWithAnchor();
    toggleTour();
    fireEvent.click(screen.getByText("Take full tour"));
    for (let i = 0; i < TOUR_STEPS.length - 1; i++) {
      fireEvent.click(screen.getByText("Next"));
    }
    expect(screen.getByText("Export SVG")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Done"));
    expect(screen.queryByTestId("editor-tour")).not.toBeInTheDocument();
  });
});

describe("tourSteps helpers", () => {
  it("defines 14 anchored steps with unique ids and data-tour selectors", () => {
    expect(ANCHORED_STEPS).toHaveLength(14);
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of ANCHORED_STEPS) {
      expect(step.selector).toMatch(/^\[data-tour="/);
    }
  });

  it("maps data-tour values to anchored indexes and walkthrough indexes", () => {
    expect(anchoredIndexOfTourValue("nav-tools")).toBe(0);
    expect(anchoredIndexOfTourValue("export")).toBe(ANCHORED_STEPS.length - 1);
    expect(anchoredIndexOfTourValue("nope")).toBe(-1);
    expect(anchoredIndexOfTourValue(null)).toBe(-1);
    // nav-tools is TOUR_STEPS[1] (welcome is [0])
    expect(walkthroughIndexOfAnchored(0)).toBe(1);
    expect(walkthroughIndexOfAnchored(999)).toBe(0);
  });
});
