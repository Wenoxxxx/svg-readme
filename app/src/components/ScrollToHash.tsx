import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router does not scroll to `#hash` targets on navigation. This keeps
 * landing-page anchors ("/#studio", "/#how") working without a full reload:
 * it jumps to the element after the route renders, and to the top when the
 * hash is empty.
 */
export default function ScrollToHash() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const id = decodeURIComponent(hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, pathname]);

  return null;
}
