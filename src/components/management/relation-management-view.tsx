"use client";

import { useState, useMemo } from "react";
import type {
  ArchitectureRelation,
  Asset,
  ClusterEntity,
  RelationType,
  TopologyGroup,
} from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";
import { useProjectGroup } from "@/context/project-group-context";
import { SlideDrawer } from "@/components/common/slide-drawer";

export function RelationManagementView({
  initialRelations,
  availableAssets = [],
  availableGroups = [],
  availableClusters = [],
}: {
  initialRelations: ArchitectureRelation[];
  availableAssets?: Asset[];
  availableGroups?: TopologyGroup[];
  availableClusters?: ClusterEntity[];
}) {
  const { activeProject } = useProjectGroup();
  const [relations, setRelations] = useState<ArchitectureRelation[]>(initialRelations);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRelation, setEditingRelation] = useState<ArchitectureRelation | null>(null);

  const [formData, setFormData] = useState<Partial<ArchitectureRelation>>({
    sourceEntityType: "TOPOLOGY_GROUP",
    sourceEntityId: "",
    targetEntityType: "CLUSTER",
    targetEntityId: "",
    relationType: "SERVICE",
    protocol: "TCP",
    port: 8080,
    description: "",
  });

  const projectRelations = useMemo(
    () => relations.filter((r) => !r.projectGroupId || r.projectGroupId === activeProject.id),
    [relations, activeProject.id]
  );

  const filtered = projectRelations.filter((r) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      `${r.sourceEntityId} ${r.targetEntityId} ${r.relationType} ${r.protocol ?? ""} ${r.port ?? ""} ${r.description ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  });

  // Source options based on sourceEntityType
  const sourceOptions = useMemo(() => {
    switch (formData.sourceEntityType) {
      case "TOPOLOGY_GROUP":
        return availableGroups.map((g) => ({
          value: g.id,
          label: `${g.name} (${g.groupType} · ${g.environment})`,
        }));
      case "ASSET":
        return availableAssets.map((a) => ({
          value: a.id,
          label: `${a.hostname} (${a.ipAddress} · ${a.role})`,
        }));
      case "CLUSTER":
        return availableClusters.map((c) => ({
          value: c.id,
          label: `${c.name} (VIP: ${c.vip})`,
        }));
      default:
        return [];
    }
  }, [formData.sourceEntityType, availableGroups, availableAssets, availableClusters]);

  // Target options based on targetEntityType
  const targetOptions = useMemo(() => {
    switch (formData.targetEntityType) {
      case "CLUSTER":
        return availableClusters.map((c) => ({
          value: c.id,
          label: `${c.name} (VIP: ${c.vip})`,
        }));
      case "NAS":
        return availableAssets
          .filter((a) => a.assetType === "NAS")
          .map((a) => ({
            value: a.id,
            label: `${a.hostname} (${a.ipAddress})`,
          }));
      case "ASSET":
        return availableAssets.map((a) => ({
          value: a.id,
          label: `${a.hostname} (${a.ipAddress} · ${a.role})`,
        }));
      case "TOPOLOGY_GROUP":
        return availableGroups.map((g) => ({
          value: g.id,
          label: `${g.name} (${g.groupType})`,
        }));
      default:
        return [];
    }
  }, [formData.targetEntityType, availableClusters, availableAssets, availableGroups]);

  function openCreateDrawer() {
    setEditingRelation(null);
    setFormData({
      sourceEntityType: "TOPOLOGY_GROUP",
      sourceEntityId: availableGroups[0]?.id || "",
      targetEntityType: "CLUSTER",
      targetEntityId: availableClusters[0]?.id || "",
      relationType: "SERVICE",
      protocol: "TCP",
      port: 8080,
      description: "",
      projectGroupId: activeProject.id,
    });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(r: ArchitectureRelation) {
    setEditingRelation(r);
    setFormData({ ...r });
    setIsDrawerOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.sourceEntityId || !formData.targetEntityId) return;

    if (editingRelation) {
      const updated = await managementRepo.updateRelation(editingRelation.id, formData);
      setRelations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const created = await managementRepo.createRelation({
        ...formData,
        projectGroupId: formData.projectGroupId || activeProject.id,
      } as ArchitectureRelation);
      setRelations((prev) => [created, ...prev]);
    }
    setIsDrawerOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 이 아키텍처 연결 관계를 삭제하시겠습니까?")) return;
    await managementRepo.deleteRelation(id);
    setRelations((prev) => prev.filter((r) => r.id !== id));
  }

  const relationTypes: RelationType[] = [
    "SERVICE",
    "DATABASE",
    "STORAGE",
    "MONITORING",
    "MANAGEMENT",
    "CLUSTER",
    "EXTERNAL",
    "OTHER",
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
            <option value="ALL">전체 연결 유형</option>
            {relationTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="flex h-7 w-[260px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
            <SearchIcon className="h-3 w-3 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="출발지, 목적지, 포트 검색..."
              className="w-full bg-transparent text-[10px] outline-none"
            />
          </div>
        </div>

        <button
          onClick={openCreateDrawer}
          className="h-7 rounded bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
        >
          + 연결 관계 추가
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-wider text-[var(--muted)]">
              <th className="px-3 py-2 font-medium">출발 엔티티</th>
              <th className="px-3 py-2 font-medium">목적 엔티티</th>
              <th className="px-3 py-2 font-medium">연결 유형</th>
              <th className="px-3 py-2 font-medium">프로토콜 / 포트</th>
              <th className="px-3 py-2 font-medium">설명</th>
              <th className="px-3 py-2 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => openEditDrawer(r)}
                className="cursor-pointer hover:bg-[var(--surface-2)] transition"
              >
                <td className="px-3 py-2 font-mono text-[10px] font-semibold text-[var(--foreground)]">
                  {r.sourceEntityId}{" "}
                  <span className="text-[8px] text-[var(--muted)] font-normal">({r.sourceEntityType})</span>
                </td>
                <td className="px-3 py-2 font-mono text-[10px] font-semibold text-[var(--foreground)]">
                  {r.targetEntityId}{" "}
                  <span className="text-[8px] text-[var(--muted)] font-normal">({r.targetEntityType})</span>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    tone={
                      r.relationType === "DATABASE"
                        ? "primary"
                        : r.relationType === "STORAGE"
                          ? "info"
                          : r.relationType === "MONITORING"
                            ? "neutral"
                            : "success"
                    }
                  >
                    {r.relationType}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono text-[10px]">
                  {r.protocol || "TCP"} / {r.port || "-"}
                </td>
                <td className="px-3 py-2 text-[var(--muted)] max-w-[280px] truncate">{r.description || "-"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r.id);
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
        title={editingRelation ? "연결 관계 수정" : "연결 관계 생성"}
        width={460}
      >
        <form onSubmit={handleSave} className="p-4 space-y-3 text-[10px]">
          {/* Source Entity */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">출발 엔티티 유형</label>
              <select
                value={formData.sourceEntityType}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  setFormData({ ...formData, sourceEntityType: newType, sourceEntityId: "" });
                }}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              >
                <option value="TOPOLOGY_GROUP">TOPOLOGY_GROUP (토폴로지 그룹)</option>
                <option value="ASSET">ASSET (VM / 호스트)</option>
                <option value="CLUSTER">CLUSTER (클러스터)</option>
                <option value="COMPONENT">COMPONENT (컴포넌트)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">출발 엔티티 *</label>
              {sourceOptions.length > 0 ? (
                <select
                  value={formData.sourceEntityId}
                  onChange={(e) => setFormData({ ...formData, sourceEntityId: e.target.value })}
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
                >
                  <option value="">-- 선택하세요 --</option>
                  {sourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {formData.sourceEntityId &&
                    !sourceOptions.some((o) => o.value === formData.sourceEntityId) && (
                      <option value={formData.sourceEntityId}>
                        직접입력: {formData.sourceEntityId}
                      </option>
                    )}
                </select>
              ) : (
                <input
                  required
                  value={formData.sourceEntityId}
                  onChange={(e) => setFormData({ ...formData, sourceEntityId: e.target.value })}
                  placeholder="e.g. tg-a360-prod-mem"
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none"
                />
              )}
            </div>
          </div>

          {/* Target Entity */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">목적 엔티티 유형</label>
              <select
                value={formData.targetEntityType}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  setFormData({ ...formData, targetEntityType: newType, targetEntityId: "" });
                }}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              >
                <option value="CLUSTER">CLUSTER (클러스터)</option>
                <option value="NAS">NAS (스토리지)</option>
                <option value="ASSET">ASSET (VM / 호스트)</option>
                <option value="TOPOLOGY_GROUP">TOPOLOGY_GROUP (그룹)</option>
                <option value="EXTERNAL">EXTERNAL (외부 시스템)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">목적 엔티티 *</label>
              {targetOptions.length > 0 ? (
                <select
                  value={formData.targetEntityId}
                  onChange={(e) => setFormData({ ...formData, targetEntityId: e.target.value })}
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
                >
                  <option value="">-- 선택하세요 --</option>
                  {targetOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {formData.targetEntityId &&
                    !targetOptions.some((o) => o.value === formData.targetEntityId) && (
                      <option value={formData.targetEntityId}>
                        직접입력: {formData.targetEntityId}
                      </option>
                    )}
                </select>
              ) : (
                <input
                  required
                  value={formData.targetEntityId}
                  onChange={(e) => setFormData({ ...formData, targetEntityId: e.target.value })}
                  placeholder="e.g. rpa-p-mem-mssql"
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">연결 유형</label>
              <select
                value={formData.relationType}
                onChange={(e) => setFormData({ ...formData, relationType: e.target.value as any })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              >
                {relationTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">프로토콜</label>
              <input
                value={formData.protocol ?? "TCP"}
                onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                placeholder="e.g. TCP, HTTPS"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">포트</label>
              <input
                type="number"
                value={formData.port ?? ""}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) || undefined })}
                placeholder="e.g. 1433"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--muted)]">설명</label>
            <textarea
              value={formData.description ?? ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="논리적 연결 관계를 설명하세요..."
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
