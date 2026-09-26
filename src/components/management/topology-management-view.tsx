"use client";

import { useState, useMemo, useEffect } from "react";
import type { TopologyGroup, TopologyGroupType } from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";
import { useProjectGroup } from "@/context/project-group-context";
import { SlideDrawer } from "@/components/common/slide-drawer";

export function TopologyManagementView({
  initialGroups,
}: {
  initialGroups: TopologyGroup[];
}) {
  const { activeProject } = useProjectGroup();
  const [groups, setGroups] = useState<TopologyGroup[]>(initialGroups);

  useEffect(() => {
    let isMounted = true;
    managementRepo.getTopologyGroups().then((all) => {
      if (!isMounted) return;
      if (all && all.length > 0) setGroups(all);
    });
    return () => {
      isMounted = false;
    };
  }, []);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TopologyGroup | null>(null);

  const [formData, setFormData] = useState<Partial<TopologyGroup>>({
    name: "",
    groupType: "DOMAIN",
    parentGroupId: null,
    environment: "PROD",
    domain: "",
    system: "",
    description: "",
  });

  const projectGroupsList = useMemo(
    () => groups.filter((g) => !g.projectGroupId || g.projectGroupId === activeProject.id),
    [groups, activeProject.id]
  );

  const filtered = projectGroupsList.filter((g) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      `${g.name} ${g.groupType} ${g.environment ?? ""} ${g.domain ?? ""} ${g.system ?? ""}`
        .toLowerCase()
        .includes(q);
    const matchType = typeFilter === "ALL" || g.groupType === typeFilter;
    return matchQ && matchType;
  });

  function openCreateDrawer() {
    setEditingGroup(null);
    setFormData({
      name: "",
      groupType: "DOMAIN",
      parentGroupId: null,
      environment: "PROD",
      domain: "",
      system: "",
      description: "",
      projectGroupId: activeProject.id,
    });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(g: TopologyGroup) {
    setEditingGroup(g);
    setFormData({ ...g });
    setIsDrawerOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name) return;

    if (editingGroup) {
      const updated = await managementRepo.updateTopologyGroup(editingGroup.id, formData);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } else {
      const created = await managementRepo.createTopologyGroup({
        ...formData,
        projectGroupId: formData.projectGroupId || activeProject.id,
      } as TopologyGroup);
      setGroups((prev) => [created, ...prev]);
    }
    setIsDrawerOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 이 토폴로지 그룹을 삭제하시겠습니까?")) return;
    await managementRepo.deleteTopologyGroup(id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  const groupTypes: TopologyGroupType[] = [
    "SYSTEM",
    "DOMAIN",
    "ENVIRONMENT",
    "STACK",
    "CLUSTER",
    "RUNTIME",
    "SERVICE_GROUP",
    "CUSTOM",
  ];

  return (
    <div className="space-y-3">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] outline-none"
          >
            <option value="ALL">전체 그룹 유형</option>
            {groupTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="flex h-7 w-[240px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
            <SearchIcon className="h-3 w-3 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="그룹명, 도메인, 시스템 검색..."
              className="w-full bg-transparent text-[10px] outline-none"
            />
          </div>
        </div>

        <button
          onClick={openCreateDrawer}
          className="h-7 rounded bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
        >
          + 토폴로지 그룹 추가
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-wider text-[var(--muted)]">
              <th className="px-3 py-2 font-medium">그룹명</th>
              <th className="px-3 py-2 font-medium">유형</th>
              <th className="px-3 py-2 font-medium">상위 그룹</th>
              <th className="px-3 py-2 font-medium">환경</th>
              <th className="px-3 py-2 font-medium">도메인</th>
              <th className="px-3 py-2 font-medium">시스템</th>
              <th className="px-3 py-2 font-medium">설명</th>
              <th className="px-3 py-2 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((g) => (
              <tr
                key={g.id}
                onClick={() => openEditDrawer(g)}
                className="cursor-pointer hover:bg-[var(--surface-2)] transition"
              >
                <td className="px-3 py-2 font-semibold text-[var(--foreground)]">{g.name}</td>
                <td className="px-3 py-2">
                  <Badge tone={g.groupType === "SYSTEM" ? "primary" : g.groupType === "DOMAIN" ? "info" : "neutral"}>
                    {g.groupType}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono text-[9px] text-[var(--muted)]">
                  {groups.find((p) => p.id === g.parentGroupId)?.name || g.parentGroupId || "-"}
                </td>
                <td className="px-3 py-2 font-mono text-[9px]">{g.environment || "-"}</td>
                <td className="px-3 py-2 font-mono text-[9.5px]">{g.domain || "-"}</td>
                <td className="px-3 py-2 font-mono text-[9.5px]">{g.system || "-"}</td>
                <td className="px-3 py-2 text-[var(--muted)] max-w-[280px] truncate">{g.description || "-"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(g.id);
                    }}
                    className="text-[9px] text-rose-600 hover:underline"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingGroup ? `토폴로지 그룹 수정: ${editingGroup.name}` : "토폴로지 그룹 생성"}
        width={460}
      >
        <form onSubmit={handleSave} className="p-4 space-y-3 text-[10px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">그룹명 *</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. MEMORY PROD"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">그룹 유형</label>
              <select
                value={formData.groupType}
                onChange={(e) => setFormData({ ...formData, groupType: e.target.value as TopologyGroupType })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              >
                {groupTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">상위 그룹</label>
              <select
                value={formData.parentGroupId ?? ""}
                onChange={(e) => setFormData({ ...formData, parentGroupId: e.target.value || null })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] outline-none"
              >
                <option value="">없음 (최상위 루트 그룹)</option>
                {projectGroupsList
                  .filter((g) => !editingGroup || g.id !== editingGroup.id)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.groupType} · {g.environment})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">환경</label>
              <select
                value={formData.environment ?? "PROD"}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              >
                <option value="PROD">PROD</option>
                <option value="QA">QA</option>
                <option value="DEV">DEV</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">도메인</label>
              <input
                value={formData.domain ?? ""}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="e.g. MEMORY / FOUNDRY"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">시스템</label>
              <input
                value={formData.system ?? ""}
                onChange={(e) => setFormData({ ...formData, system: e.target.value })}
                placeholder="e.g. A360 / RPA Portal"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--muted)]">설명</label>
            <textarea
              value={formData.description ?? ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="토폴로지 그룹의 용도를 설명하세요..."
              rows={2}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 outline-none"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border)] pt-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="h-7 rounded border border-[var(--border)] px-3 text-[10px] text-[var(--muted)] hover:bg-[var(--surface-2)]"
            >
              취소
            </button>
            <button
              type="submit"
              className="h-7 rounded bg-[#5750f1] px-4 text-[10px] font-semibold text-white hover:bg-[#463fc9]"
            >
              저장
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
}
