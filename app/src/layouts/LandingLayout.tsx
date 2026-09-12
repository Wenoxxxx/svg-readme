import TopNav from "../components/ui/TopNav";
import LandingFooter from "../pages/landing/components/LandingFooter";
import { Outlet } from "react-router-dom";

export default function LandingLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      {/* Shared navigation bar */}
      <TopNav />

      {/* Page content changes depending on route */}
      <main className="flex-1">
        <Outlet />
      </main>

      <LandingFooter />
    </div>
  );
}
