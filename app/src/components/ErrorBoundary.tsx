import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render crashes anywhere below and shows a recovery card instead
 * of a blank page. State resets on reload; editor work persists in
 * localStorage so little is lost.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("Uncaught render error:", error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#09090b] text-zinc-100 p-6">
        <div className="max-w-md w-full rounded-xl border border-white/10 bg-zinc-900 p-8 shadow-2xl flex flex-col gap-4">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-zinc-400">
            The editor hit an unexpected error. Your work is autosaved in this
            browser — reload to keep going.
          </p>
          <button
            onClick={this.handleReload}
            className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-md transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
