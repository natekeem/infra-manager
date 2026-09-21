"use client";

import { SearchIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return <header className="fixed left-[216px] right-0 top-0 z-30 flex h-[52px] items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5">
    <div className="flex w-[420px] items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 text-[var(--muted)]">
      <SearchIcon className="h-4 w-4"/>
      <input className="h-8 w-full bg-transparent text-[12px] outline-none placeholder:text-[var(--muted-2)]" placeholder="Search VM, IP, port, request ID..." />
      <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[9px]">⌘K</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="hidden text-right md:block"><div className="text-[11px] font-medium">PROD</div><div className="text-[10px] text-[var(--muted)]">Last sync 00:28</div></div>
      <ThemeToggle />
      <div className="grid h-8 w-8 place-items-center rounded-full bg-[#eef0f4] text-[11px] font-semibold text-[#475467] dark:bg-[#273244] dark:text-[#cbd5e1]">OP</div>
    </div>
  </header>;
}
