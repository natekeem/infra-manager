"use client";

import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { ProjectGroupProvider } from "@/context/project-group-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProjectGroupProvider>
      <div className="min-h-screen bg-[var(--bg)]">
        <Sidebar />
        <Header />
        <main className="ml-[216px] min-h-screen pt-[52px]">
          <div className="mx-auto max-w-[1680px] px-5 py-4">{children}</div>
        </main>
      </div>
    </ProjectGroupProvider>
  );
}
