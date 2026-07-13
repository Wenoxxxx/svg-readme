import TopNav from "../components/ui/TopNav";
import { Outlet } from "react-router-dom";

export default function LandingLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Shared navigation bar */}
      <TopNav />

      {/* Page content changes depending on route */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}