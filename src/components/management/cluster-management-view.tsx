"use client";

import { useState, useMemo, useEffect } from "react";
import type { Asset, ClusterEntity, ClusterMember } from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";
import { useProjectGroup } from "@/context/project-group-context";
import { SlideDrawer } from "@/components/common/slide-drawer";

export function ClusterManagementView({
  initialClusters,
  availableAssets = [],
}: {
  initialClusters: ClusterEntity[];
  availableAssets?: Asset[];
}) {
  const { activeProject } = useProjectGroup();
  const [clusters, setClusters] = useState<ClusterEntity[]>(initialClusters);

  useEffect(() => {
    let isMounted = true;
    managementRepo.getClusters().then((all) => {
      if (!isMounted) return;
      if (all && all.length > 0) {
        setClusters(all);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);
  const [query, setQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<ClusterEntity | null>(null);

  const [formData, setFormData] = useState<Partial<ClusterEntity>>({
    name: "",
    type: "MSCS",
    vip: "",
    environment: "PROD",
    domain: "MEMORY",
    zone: "DB",
    status: "HEALTHY",
    description: "",
    members: [],
  });

  function addMember() {
    setFormData((prev) => {
      const current = prev.members ?? [];
      const newMember: ClusterMember = {
        clusterId: prev.id || `cluster-${Date.now()}`,
        assetId: "",
        hostname: "",
        ipAddress: "",
        role: current.length === 0 ? "ACTIVE" : "PASSIVE",
        priority: current.length + 1,
        status: current.length === 0 ? "ONLINE" : "STANDBY",
      };
      return { ...prev, members: [...current, newMember] };
    });
  }

  function updateMember(index: number, updates: Partial<ClusterMember>) {
    setFormData((prev) => {
      const current = [...(prev.members ?? [])];
      current[index] = { ...current[index], ...updates };
      return { ...prev, members: current };
    });
  }

  function removeMember(index: number) {
    setFormData((prev) => {
      const current = [...(prev.members ?? [])];
      current.splice(index, 1);
      return { ...prev, members: current };
    });
  }

  const projectClusters = useMemo(
    () => clusters.filter((c) => !c.projectGroupId || c.projectGroupId === activeProject.id),
    [clusters, activeProject.id]
  );

  const filtered = projectClusters.filter((c) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      `${c.name} ${c.vip} ${c.type} ${c.domain ?? ""} ${c.environment}`
        .toLowerCase()
        .includes(q)
    );
  });

  function openCreateDrawer() {
    setEditingCluster(null);
    setFormData({
      name: "",
      type: "MSCS",
      vip: "",
      environment: "PROD",
      domain: "MEMORY",
      zone: "DB",
      status: "HEALTHY",
      description: "",
      projectGroupId: activeProject.id,
      members: [
        {
          clusterId: "",
          assetId: "",
          hostname: "",
          ipAddress: "",
          role: "ACTIVE",
          priority: 1,
          status: "ONLINE",
        },
        {
          clusterId: "",
          assetId: "",
          hostname: "",
          ipAddress: "",
          role: "PASSIVE",
          priority: 2,
          status: "STANDBY",
        },
      ],
    });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(c: ClusterEntity) {
    setEditingCluster(c);
    setFormData({
      ...c,
      members: c.members ? [...c.members] : [],
    });
    setIsDrawerOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.vip) return;

    const validMembers: ClusterMember[] = (formData.members ?? [])
      .filter((m) => m.hostname.trim())
      .map((m, idx) => ({
        ...m,
        clusterId: formData.id || `cluster-${Date.now()}`,
        assetId: m.assetId || `asset-${m.hostname.toLowerCase()}`,
        ipAddress: m.ipAddress || "0.0.0.0",
        priority: m.priority ?? (idx + 1),
        status: m.role === "ACTIVE" ? "ONLINE" : "STANDBY",
      }));

    const payload: ClusterEntity = {
      ...(formData as ClusterEntity),
      id: formData.id || `cluster-${Date.now().toString(36)}`,
      projectGroupId: formData.projectGroupId || activeProject.id,
      members: validMembers,
      services: formData.services || [
        {
          clusterId: formData.id || "c1",
          serviceType: "MSSQLSERVER",
          instanceName: "MSSQL-INST",
          port: 1433,
        },
      ],
    };

    if (editingCluster) {
      const updated = await managementRepo.updateCluster(editingCluster.id, payload);
      setClusters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      const created = await managementRepo.createCluster(payload);
      setClusters((prev) => [created, ...prev]);
    }
    setIsDrawerOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 이 클러스터를 삭제하시겠습니까?")) return;
    await managementRepo.deleteCluster(id);
    setClusters((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex h-7 w-[260px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
          <SearchIcon className="h-3 w-3 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="클러스터명, VIP 검색..."
            className="w-full bg-transparent text-[10px] outline-none"
          />
        </div>

        <button
          onClick={openCreateDrawer}
          className="h-7 rounded bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
        >
          + 클러스터 추가
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-wider text-[var(--muted)]">
              <th className="px-3 py-2 font-medium">클러스터명</th>
              <th className="px-3 py-2 font-medium">유형</th>
              <th className="px-3 py-2 font-medium">Virtual IP (VIP)</th>
              <th className="px-3 py-2 font-medium">환경 / 도메인</th>
              <th className="px-3 py-2 font-medium">멤버 및 역할</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((c) => (
              <tr
                key={c.id}
                onClick={() => openEditDrawer(c)}
                className="cursor-pointer hover:bg-[var(--surface-2)] transition"
              >
                <td className="px-3 py-2 font-semibold text-[var(--foreground)]">{c.name}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-purple-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-purple-700 dark:text-purple-300">
                    {c.type}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[10px] font-bold text-[#5750f1]">{c.vip}</td>
                <td className="px-3 py-2 font-mono text-[9.5px]">
                  {c.environment} · {c.domain || "-"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 flex-wrap">
                    {c.members.map((m) => (
                      <span
                        key={m.hostname}
                        className={`rounded px-1.5 py-0.5 font-mono text-[8px] ${
                          m.role === "ACTIVE"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold"
                            : "bg-[var(--surface-2)] text-[var(--muted)]"
                        }`}
                      >
                        {m.hostname} ({m.role.slice(0, 1)})
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={c.status === "HEALTHY" ? "success" : "warning"}>{c.status}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c.id);
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
        title={editingCluster ? `클러스터 수정: ${editingCluster.name}` : "클러스터 생성"}
        width={460}
      >
        <form onSubmit={handleSave} className="p-4 space-y-3 text-[10px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">클러스터명 *</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. RPA-P-MEM-MSSQL"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">유형</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              >
                <option value="MSCS">MSCS 장애 조치 클러스터</option>
                <option value="KUBERNETES">Kubernetes 클러스터</option>
                <option value="ORACLE_RAC">Oracle RAC</option>
                <option value="OTHER">기타 HA 클러스터</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">Virtual IP (VIP) *</label>
              <input
                required
                value={formData.vip}
                onChange={(e) => setFormData({ ...formData, vip: e.target.value })}
                placeholder="e.g. 10.20.10.10"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none"
              />
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
              <label className="mb-1 block font-medium text-[var(--muted)]">상태</label>
              <select
                value={formData.status ?? "HEALTHY"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              >
                <option value="HEALTHY">HEALTHY</option>
                <option value="DEGRADED">DEGRADED</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          {/* Member Nodes Management */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="font-medium text-[var(--muted)]">
                클러스터 멤버 노드 ({formData.members?.length ?? 0}개)
              </label>
              <button
                type="button"
                onClick={addMember}
                className="text-[9px] font-semibold text-[#5750f1] hover:underline"
              >
                + 직접 추가
              </button>
            </div>

            {/* Quick add from available assets */}
            {availableAssets.length > 0 && (
              <div className="mb-2">
                <select
                  value=""
                  onChange={(e) => {
                    const sel = availableAssets.find((a) => a.hostname === e.target.value);
                    if (sel) {
                      setFormData((prev) => ({
                        ...prev,
                        members: [
                          ...(prev.members ?? []),
                          {
                            clusterId: prev.id || `cluster-${Date.now()}`,
                            assetId: sel.id,
                            hostname: sel.hostname,
                            ipAddress: sel.ipAddress,
                            role: (prev.members?.length ?? 0) === 0 ? "ACTIVE" : "PASSIVE",
                            priority: (prev.members?.length ?? 0) + 1,
                            status: (prev.members?.length ?? 0) === 0 ? "ONLINE" : "STANDBY",
                          },
                        ],
                      }));
                    }
                  }}
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-[9.5px] outline-none"
                >
                  <option value="">+ 등록된 VM에서 노드 추가...</option>
                  {availableAssets
                    .filter((a) => !(formData.members ?? []).some((m) => m.hostname === a.hostname))
                    .map((a) => (
                      <option key={a.id} value={a.hostname}>
                        {a.hostname} ({a.ipAddress} · {a.role})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Member rows */}
            <div className="max-h-[160px] space-y-1.5 overflow-y-auto pr-1">
              {(formData.members ?? []).map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] p-1.5"
                >
                  <input
                    value={m.hostname}
                    onChange={(e) => updateMember(idx, { hostname: e.target.value })}
                    placeholder="호스트명 (e.g. RPA-P-MEM-DB01)"
                    className="h-6 flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 font-mono text-[9px] outline-none"
                  />
                  <select
                    value={m.role}
                    onChange={(e) => updateMember(idx, { role: e.target.value as any })}
                    className="h-6 w-[84px] rounded border border-[var(--border)] bg-[var(--surface)] px-1 font-mono text-[9px] outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PASSIVE">PASSIVE</option>
                    <option value="WITNESS">WITNESS</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMember(idx)}
                    className="flex h-6 w-6 items-center justify-center rounded text-[var(--muted)] hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950"
                    title="노드 제거"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {(formData.members?.length ?? 0) === 0 && (
                <div className="rounded border border-dashed border-[var(--border)] p-2 text-center text-[9px] text-[var(--muted)]">
                  등록된 멤버 노드가 없습니다. 상단에서 노드를 추가하세요.
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--muted)]">설명</label>
            <textarea
              value={formData.description ?? ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="클러스터 용도 및 특이사항..."
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
