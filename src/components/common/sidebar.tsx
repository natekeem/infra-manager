"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BoxIcon,
  DocIcon,
  GridIcon,
  LayersIcon,
  NetworkIcon,
  ServerIcon,
  ShieldIcon,
} from "./icons";
import { cn } from "@/utils/cn";
import { useProjectGroup } from "@/context/project-group-context";

const groups = [
  {
    label: "개요",
    items: [{ href: "/", label: "대시보드", icon: GridIcon }],
  },
  {
    label: "인프라",
    items: [
      { href: "/infrastructure/vms", label: "자산 목록", icon: ServerIcon },
      { href: "/infrastructure/architecture", label: "아키텍처", icon: LayersIcon },
      { href: "/infrastructure/software", label: "Software & EOSL", icon: BoxIcon },
    ],
  },
  {
    label: "네트워크",
    items: [
      { href: "/network/connectivity", label: "정책 및 연결 상태", icon: NetworkIcon },
    ],
  },
  {
    label: "운영",
    items: [{ href: "/operations/sop", label: "SOP", icon: DocIcon }],
  },
  {
    label: "관리",
    items: [
      { href: "/management/projects", label: "프로젝트 그룹", icon: GridIcon },
      { href: "/management/assets", label: "자산 관리", icon: ServerIcon },
      { href: "/management/topology", label: "토폴로지 그룹", icon: LayersIcon },
      { href: "/management/clusters", label: "클러스터", icon: ServerIcon },
      { href: "/management/relations", label: "연결 관계", icon: NetworkIcon },
      { href: "/management/policies", label: "네트워크 정책", icon: ShieldIcon },
      { href: "/management/software", label: "소프트웨어 카탈로그", icon: BoxIcon },
      { href: "/management/sops", label: "SOP 레지스트리", icon: DocIcon },
      { href: "/management/import", label: "일괄 가져오기", icon: GridIcon },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { projectGroups, activeProjectId, setActiveProjectId } = useProjectGroup();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-[216px] border-r border-[var(--border)] bg-[var(--surface)]">
      {/* Brand Header */}
      <div className="flex h-[52px] items-center border-b border-[var(--border)] px-4">
        <div className="mr-2 grid h-7 w-7 place-items-center rounded-md bg-[#5750f1] text-[11px] font-bold text-white">
          R
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold">RPA 통합 관제</div>
          <div className="text-[10px] text-[var(--muted)]">인프라 운영 관리</div>
        </div>
      </div>

      {/* Top Project Selector */}
      <div className="border-b border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2.5">
        <div className="mb-1 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-2)]">
          <span>PROJECT</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />
        </div>
        <select
          value={activeProjectId}
          onChange={(e) => setActiveProjectId(e.target.value)}
          aria-label="활성 프로젝트 그룹"
          className="h-7 w-full cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-medium text-[var(--foreground)] outline-none transition hover:border-[#5750f1] focus:border-[#5750f1]"
        >
          {projectGroups.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <nav className="h-[calc(100vh-112px)] overflow-y-auto px-2.5 py-3 pb-28">
        {groups.map((group) => (
          <div key={group.label} className="mb-3.5">
            <div className="mb-1 px-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--muted-2)]">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex h-7 items-center gap-2.5 rounded-md px-2 text-[11px] font-medium transition",
                      active
                        ? "bg-[var(--primary-soft)] text-[#5750f1]"
                        : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="sticky bottom-0 left-0 right-0 mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-2.5 shadow-sm">
          <div className="mb-0.5 flex items-center gap-1.5 text-[10.5px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" /> 데이터 소스
          </div>
          <div className="text-[9px] text-[var(--muted)]">MOCK · ready for MySQL / Influx</div>
        </div>
      </nav>
    </aside>
  );
}
