import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";

// LANDING PAGES
import LandingLayout from "./layouts/LandingLayout";
import Home from "./pages/landing/Home";
import About from "./pages/landing/About";
import Contacts from "./pages/landing/Contacts";

// EDITOR PAGES
import Editor from "./pages/editor/Editor";

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
      <Routes>
        <Route element={<LandingLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contacts" element={<Contacts />} />
        </Route>

        <Route path="/editor" element={<Editor />} />
      </Routes>
      </Router>
    </ErrorBoundary>
  );
}
