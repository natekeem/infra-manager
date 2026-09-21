"use client";

import { CloseIcon } from "./icons";
import { cn } from "@/utils/cn";

export function SlideDrawer({ open, title, subtitle, onClose, children, width = 440 }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return <>
    <button aria-label="drawer backdrop" onClick={onClose} className={cn("fixed bottom-0 left-[216px] right-0 top-[52px] z-40 bg-black/10 transition-opacity", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")} />
    <aside style={{ width }} className={cn("fixed bottom-0 left-[216px] top-[52px] z-50 flex max-w-[calc(100vw-216px)] flex-col border-r border-[var(--border)] bg-[var(--surface)] shadow-[8px_0_24px_rgba(15,23,42,0.08)] transition-transform duration-200 ease-out", open ? "translate-x-0" : "-translate-x-[calc(100%+8px)]")}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="min-w-0"><div className="truncate text-[13px] font-semibold">{title}</div>{subtitle && <div className="truncate text-[9px] text-[var(--muted)]">{subtitle}</div>}</div>
        <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"><CloseIcon className="h-4 w-4"/></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  </>;
}
