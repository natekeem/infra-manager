"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoxIcon, DocIcon, GridIcon, LayersIcon, NetworkIcon, ServerIcon, ShieldIcon } from "./icons";
import { cn } from "@/utils/cn";

const groups = [
  { label: "OVERVIEW", items: [{ href: "/", label: "Dashboard", icon: GridIcon }] },
  { label: "INFRASTRUCTURE", items: [
    { href: "/infrastructure/vms", label: "Virtual Machines", icon: ServerIcon },
    { href: "/infrastructure/architecture", label: "Architecture", icon: LayersIcon },
    { href: "/infrastructure/software", label: "Software & EOSL", icon: BoxIcon },
  ]},
  { label: "NETWORK", items: [
    { href: "/network/policies", label: "Policy Registry", icon: ShieldIcon },
    { href: "/network/connectivity", label: "Connectivity", icon: NetworkIcon },
  ]},
  { label: "OPERATIONS", items: [{ href: "/operations/sop", label: "SOP", icon: DocIcon }] },
];

export function Sidebar() {
  const pathname = usePathname();
  return <aside className="fixed inset-y-0 left-0 z-40 w-[216px] border-r border-[var(--border)] bg-[var(--surface)]">
    <div className="flex h-[52px] items-center border-b border-[var(--border)] px-4">
      <div className="mr-2 grid h-7 w-7 place-items-center rounded-md bg-[#5750f1] text-[11px] font-bold text-white">R</div>
      <div className="leading-tight"><div className="text-[13px] font-semibold">RPA Control Center</div><div className="text-[10px] text-[var(--muted)]">Infrastructure Operations</div></div>
    </div>
    <nav className="h-[calc(100vh-52px)] overflow-y-auto px-2.5 py-4">
      {groups.map((group) => <div key={group.label} className="mb-5">
        <div className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--muted-2)]">{group.label}</div>
        <div className="space-y-0.5">{group.items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className={cn("flex h-8 items-center gap-2.5 rounded-md px-2 text-[12px] font-medium transition", active ? "bg-[var(--primary-soft)] text-[#5750f1]" : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]")}>
            <Icon className="shrink-0"/><span>{item.label}</span>
          </Link>;
        })}</div>
      </div>)}
      <div className="absolute bottom-3 left-3 right-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]"/> Data source</div>
        <div className="text-[10px] text-[var(--muted)]">MOCK · ready for MySQL / Influx</div>
      </div>
    </nav>
  </aside>;
}
