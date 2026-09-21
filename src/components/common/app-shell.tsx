import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--bg)]">
    <Sidebar />
    <Header />
    <main className="ml-[216px] min-h-screen pt-[52px]">
      <div className="mx-auto max-w-[1680px] px-5 py-4">{children}</div>
    </main>
  </div>;
}
