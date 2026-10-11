"use client";

import { useState, useMemo, useEffect } from "react";
import type { Asset, AssetType } from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";
import { useProjectGroup } from "@/context/project-group-context";
import { SlideDrawer } from "@/components/common/slide-drawer";

export function AssetManagementView({ initialAssets }: { initialAssets: Asset[] }) {
  const { activeProject } = useProjectGroup();
  const [assets, setAssets] = useState<Asset[]>(initialAssets);

  useEffect(() => {
    let isMounted = true;
    managementRepo.getAssets().then((all) => {
      if (!isMounted) return;
      if (all && all.length > 0) {
        setAssets(all);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Asset>>({
    assetType: "VM",
    hostname: "",
    ipAddress: "",
    environment: "PROD",
    domain: "MEMORY",
    system: "A360",
    zone: "APP",
    role: "AP",
    service: "A360 Memory",
    criticality: "HIGH",
    health: "healthy",
    owner: "",
  });

  const projectAssets = useMemo(
    () => assets.filter((a) => !a.projectGroupId || a.projectGroupId === activeProject.id),
    [assets, activeProject.id]
  );

  const filtered = projectAssets.filter((a) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      `${a.hostname} ${a.ipAddress} ${a.role} ${a.service} ${a.domain ?? ""} ${a.system ?? ""}`
        .toLowerCase()
        .includes(q);
    const matchType = typeFilter === "ALL" || (a.assetType ?? "VM") === typeFilter;
    return matchQ && matchType;
  });

  function openCreateDrawer() {
    setEditingAsset(null);
    setFormData({
      projectGroupId: activeProject.id,
      assetType: "VM",
      hostname: "",
      ipAddress: "",
      environment: "PROD",
      domain: "MEMORY",
      system: "A360",
      zone: "APP",
      role: "AP",
      service: "A360 Memory",
      criticality: "HIGH",
      health: "healthy",
      owner: "",
    });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(asset: Asset) {
    setEditingAsset(asset);
    setFormData({ ...asset });
    setIsDrawerOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.hostname || !formData.ipAddress) return;

    if (editingAsset) {
      const updated = await managementRepo.updateAsset(editingAsset.id, formData);
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } else {
      const created = await managementRepo.createAsset({
        ...formData,
        projectGroupId: formData.projectGroupId || activeProject.id,
      } as Asset);
      setAssets((prev) => [created, ...prev]);
    }
    setIsDrawerOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 이 자산을 삭제하시겠습니까?")) return;
    await managementRepo.deleteAsset(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter asset type"
            className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] text-[var(--foreground)] outline-none"
          >
            <option value="ALL">전체 자산 유형</option>
            <option value="VM">가상 머신 (VM)</option>
            <option value="NAS">NAS 스토리지</option>
            <option value="DBAAS">DBaaS</option>
            <option value="K8S_WORKLOAD">K8s 워크로드 / 컨테이너</option>
            <option value="PHYSICAL_SERVER">물리 서버</option>
            <option value="OTHER">기타</option>
          </select>

          <div className="flex h-7 w-[240px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
            <SearchIcon className="h-3 w-3 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="호스트명, IP, 도메인 검색..."
              className="w-full bg-transparent text-[10px] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--muted)]">
            전체: <b>{filtered.length}</b>개
          </span>
          <button
            onClick={openCreateDrawer}
            className="h-7 rounded bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
          >
            + 자산 등록
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-wider text-[var(--muted)]">
                <Th>유형</Th>
                <Th>호스트명</Th>
                <Th>IP 주소</Th>
                <Th>환경</Th>
                <Th>도메인</Th>
                <Th>시스템</Th>
                <Th>역할</Th>
                <Th>상태</Th>
                <Th className="text-right">관리</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => openEditDrawer(a)}
                  className="cursor-pointer hover:bg-[var(--surface-2)] transition"
                >
                  <Td>
                    <span className="font-mono text-[9px] text-[var(--muted)]">
                      {a.assetType || "VM"}
                    </span>
                  </Td>
                  <Td className="font-semibold text-[var(--foreground)]">{a.hostname}</Td>
                  <Td className="font-mono text-[10px] text-[var(--muted)]">{a.ipAddress}</Td>
                  <Td>
                    <Badge tone="neutral">{a.environment}</Badge>
                  </Td>
                  <Td className="font-mono text-[9.5px]">{a.domain || "-"}</Td>
                  <Td className="font-mono text-[9.5px]">{a.system || a.service}</Td>
                  <Td>{a.role}</Td>
                  <Td>
                    <Badge tone={a.health === "critical" ? "danger" : a.health === "warning" ? "warning" : "success"}>
                      {a.health}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(a.id);
                      }}
                      className="text-[9px] text-rose-600 hover:underline"
                    >
                      삭제
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SlideDrawer */}
      <SlideDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingAsset ? `자산 수정: ${editingAsset.hostname}` : "자산 등록"}
        width={460}
      >
        <form onSubmit={handleSave} className="p-4 space-y-3 text-[10px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">자산 유형</label>
              <select
                value={formData.assetType}
                onChange={(e) => setFormData({ ...formData, assetType: e.target.value as AssetType })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              >
                <option value="VM">VM</option>
                <option value="NAS">NAS</option>
                <option value="DBAAS">DBaaS</option>
                <option value="K8S_WORKLOAD">K8s Workload</option>
                <option value="PHYSICAL_SERVER">Physical Server</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">환경</label>
              <select
                value={formData.environment}
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
              <label className="mb-1 block font-medium text-[var(--muted)]">호스트명 *</label>
              <input
                required
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                placeholder="e.g. RPA-P-MEM-AP01"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">IP 주소 *</label>
              <input
                required
                value={formData.ipAddress}
                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                placeholder="e.g. 10.20.10.11"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">도메인</label>
              <input
                value={formData.domain ?? ""}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="e.g. MEMORY / FOUNDRY / PORTAL"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">시스템</label>
              <input
                value={formData.system ?? ""}
                onChange={(e) => setFormData({ ...formData, system: e.target.value })}
                placeholder="e.g. A360 / RPA Portal / APM"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">역할</label>
              <input
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g. AP / DB / Worker"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">상태</label>
              <select
                value={formData.health}
                onChange={(e) => setFormData({ ...formData, health: e.target.value as any })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none"
              >
                <option value="healthy">Healthy</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
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

const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={`px-3 py-2 font-medium ${className ?? ""}`}>{children}</th>
);

const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2 align-middle ${className ?? ""}`}>{children}</td>
);
