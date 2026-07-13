import TopNav from "../components/ui/TopNav";
import Sidebar from "../components/ui/Sidebar";
import RightBar from "../components/ui/RightBar";
import { Outlet } from "react-router-dom";

export default function EditorLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navigation */}
      <TopNav />

      {/* Body: sidebar + content + rightbar */}
      <div className="flex flex-1">
        {/* Left sidebar */}
        <Sidebar className="w-64 bg-gray-800 text-white" />

        {/* Main content */}
        <main className="flex-1 p-4 bg-gray-100">
          <Outlet />
        </main>

        {/* Right bar */}
        <RightBar className="w-64 bg-gray-200" />
      </div>
    </div>
  );
}
