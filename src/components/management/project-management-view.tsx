"use client";

import { useState, useEffect } from "react";
import type { ProjectGroup } from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";
import { useProjectGroup } from "@/context/project-group-context";
import { SlideDrawer } from "@/components/common/slide-drawer";

export function ProjectManagementView({
  initialProjects,
}: {
  initialProjects: ProjectGroup[];
}) {
  const { setActiveProjectId, addProjectGroup, updateProjectGroup } = useProjectGroup();
  const [projects, setProjects] = useState<ProjectGroup[]>(initialProjects);

  useEffect(() => {
    let isMounted = true;
    managementRepo.getProjects().then((all) => {
      if (!isMounted) return;
      if (all && all.length > 0) setProjects(all);
    });
    return () => {
      isMounted = false;
    };
  }, []);
  const [query, setQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectGroup | null>(null);

  const [formData, setFormData] = useState<Partial<ProjectGroup>>({
    name: "",
    code: "",
    description: "",
    owner: "",
    status: "ACTIVE",
  });

  const filtered = projects.filter((p) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      `${p.name} ${p.code} ${p.owner ?? ""} ${p.description ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  });

  function openCreateDrawer() {
    setEditingProject(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      owner: "",
      status: "ACTIVE",
    });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(project: ProjectGroup) {
    setEditingProject(project);
    setFormData({ ...project });
    setIsDrawerOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    if (editingProject) {
      const updated = await managementRepo.updateProject(editingProject.id, formData);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      updateProjectGroup(editingProject.id, formData);
    } else {
      const created = await managementRepo.createProject({
        ...formData,
        id: formData.id || formData.code.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      } as ProjectGroup);
      setProjects((prev) => [created, ...prev]);
      addProjectGroup(created);
    }
    setIsDrawerOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 이 프로젝트 그룹을 삭제하시겠습니까?")) return;
    await managementRepo.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex h-7 w-[280px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
          <SearchIcon className="h-3 w-3 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="프로젝트 그룹명, 코드 검색..."
            className="w-full bg-transparent text-[10px] outline-none"
          />
        </div>

        <button
          onClick={openCreateDrawer}
          className="h-7 rounded bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
        >
          + 프로젝트 그룹 추가
        </button>
      </div>

      {/* Projects Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-wider text-[var(--muted)]">
              <th className="px-3 py-2 font-medium">코드</th>
              <th className="px-3 py-2 font-medium">프로젝트명</th>
              <th className="px-3 py-2 font-medium">담당자</th>
              <th className="px-3 py-2 font-medium">설명</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => openEditDrawer(p)}
                className="cursor-pointer hover:bg-[var(--surface-2)] transition"
              >
                <td className="px-3 py-2 font-mono font-bold text-[#5750f1]">{p.code}</td>
                <td className="px-3 py-2 font-semibold text-[var(--foreground)]">{p.name}</td>
                <td className="px-3 py-2 text-[var(--muted)]">{p.owner || "-"}</td>
                <td className="px-3 py-2 text-[var(--muted)] max-w-[320px] truncate">{p.description || "-"}</td>
                <td className="px-3 py-2">
                  <Badge tone={p.status === "ACTIVE" ? "success" : "neutral"}>{p.status}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveProjectId(p.id);
                    }}
                    className="mr-2 text-[9px] font-semibold text-[#5750f1] hover:underline"
                  >
                    선택
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.id);
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
        title={editingProject ? `프로젝트 그룹 수정: ${editingProject.name}` : "프로젝트 그룹 생성"}
        width={460}
      >
        <form onSubmit={handleSave} className="p-4 space-y-3 text-[10px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">프로젝트명 *</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. RPA Platform"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">프로젝트 코드 *</label>
              <input
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. RPA"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono uppercase outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">담당자 / 리드</label>
              <input
                value={formData.owner ?? ""}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                placeholder="e.g. Automation COE"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">상태</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--muted)]">설명</label>
            <textarea
              value={formData.description ?? ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="이 프로젝트 그룹에 포함된 시스템을 설명하세요..."
              rows={3}
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
