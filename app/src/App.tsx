import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToHash from "./components/ScrollToHash";

// LANDING PAGES
import LandingLayout from "./layouts/LandingLayout";
import Home from "./pages/landing/Home";
import About from "./pages/landing/About";
import Contacts from "./pages/landing/Contacts";
import NotFound from "./pages/NotFound";

// EDITOR PAGES — split into its own chunk; the landing page never needs it.
const Editor = lazy(() => import("./pages/editor/Editor"));

function EditorFallback() {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#09090b] text-zinc-400 font-mono text-sm">
      Loading editor…
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ScrollToHash />
        <Suspense fallback={<EditorFallback />}>
          <Routes>
            <Route element={<LandingLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="/editor" element={<Editor />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}
