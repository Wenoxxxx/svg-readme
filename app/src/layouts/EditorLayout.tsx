// src/layouts/EditorLayout.tsx
import type { ReactNode } from "react";
import EditorTopNav from "../components/ui/EditorTopNav";
import EditorSidebar from "../components/ui/EditorSidebar";
import EditorRightBar from "../components/ui/EditorRightBar";

interface EditorLayoutProps {
  children: ReactNode;
}

export default function EditorLayout({ children }: EditorLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0e0e0e] text-white font-[Poppins]">
      <EditorTopNav />

      <div className="flex flex-1 overflow-hidden">
        <EditorSidebar />

        <main className="flex-1 overflow-auto flex items-center justify-center bg-[#151515]">
          {children}
        </main>

        <EditorRightBar />
      </div>
    </div>
  );
}