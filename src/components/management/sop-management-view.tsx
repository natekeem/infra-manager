"use client";

import { useState, useEffect } from "react";
import type { Asset, SopDocument, TopologyGroup } from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";
import { SlideDrawer } from "@/components/common/slide-drawer";

export function SopManagementView({
  initialSops,
  availableAssets = [],
  availableGroups = [],
}: {
  initialSops: SopDocument[];
  availableAssets?: Asset[];
  availableGroups?: TopologyGroup[];
}) {
  const [sops, setSops] = useState<SopDocument[]>(initialSops);

  useEffect(() => {
    let isMounted = true;
    managementRepo.getSops().then((all) => {
      if (!isMounted) return;
      if (all && all.length > 0) setSops(all);
    });
    return () => {
      isMounted = false;
    };
  }, []);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSop, setEditingSop] = useState<SopDocument | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<SopDocument>>({
    title: "",
    category: "RECOVERY",
    severity: "CRITICAL",
    owner: "RPA Operations Team",
    summary: "",
    url: "",
    relatedVmIds: [],
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  function addVm(vmId: string) {
    if (!vmId) return;
    setFormData((prev) => {
      const current = prev.relatedVmIds ?? [];
      if (current.includes(vmId)) return prev;
      return { ...prev, relatedVmIds: [...current, vmId] };
    });
  }

  function removeVm(vmId: string) {
    setFormData((prev) => ({
      ...prev,
      relatedVmIds: (prev.relatedVmIds ?? []).filter((id) => id !== vmId),
    }));
  }

  function addGroupVms(groupKey: string) {
    if (!groupKey) return;
    let targetVms: Asset[] = [];
    if (groupKey === "ALL_PROD") {
      targetVms = availableAssets.filter((a) => a.environment === "PROD");
    } else if (groupKey === "ALL_QA") {
      targetVms = availableAssets.filter((a) => a.environment === "QA");
    } else if (groupKey === "ALL_DEV") {
      targetVms = availableAssets.filter((a) => a.environment === "DEV");
    } else if (groupKey === "ROLE_DB") {
      targetVms = availableAssets.filter((a) => (a.role ?? "").includes("DB"));
    } else if (groupKey === "ROLE_AP") {
      targetVms = availableAssets.filter((a) => (a.role ?? "").includes("AP"));
    } else {
      const group = availableGroups.find((g) => g.id === groupKey);
      if (group) {
        targetVms = availableAssets.filter((a) =>
          (group.domain && a.domain === group.domain) ||
          (group.system && a.system === group.system) ||
          (group.environment && a.environment === group.environment && (!group.domain || a.domain === group.domain))
        );
      }
    }

    const idsToAdd = targetVms.map((v) => v.id);
    setFormData((prev) => {
      const set = new Set([...(prev.relatedVmIds ?? []), ...idsToAdd]);
      return { ...prev, relatedVmIds: Array.from(set) };
    });
  }

  function clearVms() {
    setFormData((prev) => ({ ...prev, relatedVmIds: [] }));
  }

  const categories = Array.from(new Set(sops.map((s) => s.category)));

  const filtered = sops.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      `${s.title} ${s.summary ?? ""} ${s.category} ${s.relatedVmIds.join(" ")}`
        .toLowerCase()
        .includes(q);
    const matchCat = categoryFilter === "ALL" || s.category === categoryFilter;
    return matchQ && matchCat;
  });

  function openCreateDrawer() {
    setEditingSop(null);
    setFormData({
      title: "",
      category: "RECOVERY",
      severity: "HIGH",
      owner: "RPA Operations Team",
      summary: "",
      url: "https://wiki.internal/ops/",
      relatedVmIds: [],
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(sop: SopDocument) {
    setEditingSop(sop);
    setFormData({ ...sop });
    setIsDrawerOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title || !formData.summary) return;

    if (editingSop) {
      const updated = await managementRepo.updateSop(editingSop.id, formData);
      setSops((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const created = await managementRepo.createSop(formData as SopDocument);
      setSops((prev) => [created, ...prev]);
    }
    setIsDrawerOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 이 SOP 문서를 등록 해제(삭제)하시겠습니까?")) return;
    await managementRepo.deleteSop(id);
    setSops((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter category"
            className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] text-[var(--foreground)] outline-none"
          >
            <option value="ALL">전체 분류</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex h-7 w-[240px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[10px] text-[var(--foreground)] outline-none"
              placeholder="SOP 제목, 요약, VM 검색..."
            />
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex h-7 items-center gap-1 rounded-md bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
        >
          <span>+ SOP 등록</span>
        </button>
      </div>

      {/* SOP Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[10px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <Th>제목</Th>
                <Th>분류</Th>
                <Th>중요도</Th>
                <Th>요약</Th>
                <Th>대상 / 연결된 VM</Th>
                <Th>수정일</Th>
                <Th className="text-right">관리</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[11px] text-[var(--muted)]">
                    등록된 SOP 문서가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openEditDrawer(s)}
                    className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <Td>
                      <a
                        href={s.url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-[#5750f1] hover:underline"
                      >
                        {s.title}
                      </a>
                    </Td>
                    <Td>
                      <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px]">
                        {s.category}
                      </span>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          s.severity === "CRITICAL"
                            ? "danger"
                            : s.severity === "HIGH"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {s.severity}
                      </Badge>
                    </Td>
                    <Td className="max-w-[320px] truncate text-[var(--muted)]">{s.summary}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {s.relatedVmIds.map((vmId) => (
                          <span
                            key={vmId}
                            className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.2 font-mono text-[8.5px]"
                          >
                            {vmId}
                          </span>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <span className="font-mono text-[9px] text-[var(--muted)]">
                        {s.updatedAt ?? "-"}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(s.id);
                        }}
                        className="rounded border border-[var(--border)] px-2 py-0.5 text-[9px] text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-surface)] transition-colors"
                      >
                        삭제
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SlideDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingSop ? "SOP 수정" : "SOP 등록"}
        width={460}
      >
        <form onSubmit={handleSave} className="space-y-2.5 text-[10px] p-4">
          <div>
            <label className="mb-1 block font-medium text-[var(--muted)]">SOP 제목 *</label>
            <input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. MSSQL Failover Recovery Procedure"
              className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">분류</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
              >
                <option value="RECOVERY">RECOVERY</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="NETWORK">NETWORK</option>
                <option value="SECURITY">SECURITY</option>
                <option value="MONITORING">MONITORING</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">중요도</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--muted)]">요약 *</label>
            <textarea
              required
              rows={3}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="절차 요약 및 초기 조치사항을 입력하세요..."
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 outline-none text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--muted)]">문서 URL</label>
            <input
              type="url"
              value={formData.url ?? ""}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://wiki.internal/ops/sop-123"
              className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
            />
          </div>

          <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[var(--foreground)]">
                연결 대상 VM ({formData.relatedVmIds?.length ?? 0}대 선택됨)
              </label>
              {(formData.relatedVmIds?.length ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={clearVms}
                  className="text-[9px] text-rose-600 hover:underline"
                >
                  선택 전체 해제
                </button>
              )}
            </div>

            {/* Quick selectors: Group and Individual VM */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="mb-1 block text-[9px] text-[var(--muted)]">그룹 단위 일괄 추가</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addGroupVms(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                >
                  <option value="">+ 그룹 일괄 선택...</option>
                  <optgroup label="환경별 전체">
                    <option value="ALL_PROD">PROD 환경 전체 VM</option>
                    <option value="ALL_QA">QA 환경 전체 VM</option>
                    <option value="ALL_DEV">DEV 환경 전체 VM</option>
                  </optgroup>
                  <optgroup label="역할별 전체">
                    <option value="ROLE_DB">모든 DB 서버</option>
                    <option value="ROLE_AP">모든 AP 서버</option>
                  </optgroup>
                  {availableGroups.length > 0 && (
                    <optgroup label="토폴로지 그룹">
                      {availableGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.environment})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <span className="mb-1 block text-[9px] text-[var(--muted)]">개별 VM 추가</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addVm(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                >
                  <option value="">+ 개별 VM 선택...</option>
                  {availableAssets
                    .filter((a) => !formData.relatedVmIds?.includes(a.id))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.hostname} ({a.ipAddress} · {a.role})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Selected VM Tags */}
            <div className="min-h-[46px] max-h-36 overflow-y-auto rounded border border-[var(--border)] bg-[var(--surface)] p-1.5 flex flex-wrap gap-1">
              {!formData.relatedVmIds || formData.relatedVmIds.length === 0 ? (
                <div className="w-full py-2 text-center text-[9px] text-[var(--muted)]">
                  연결된 VM이 없습니다. 위의 그룹 또는 개별 VM 목록에서 선택해 주세요.
                </div>
              ) : (
                formData.relatedVmIds.map((vmId) => {
                  const vm = availableAssets.find((a) => a.id === vmId || a.hostname === vmId);
                  return (
                    <span
                      key={vmId}
                      className="inline-flex items-center gap-1 rounded border border-[#5750f1]/30 bg-[#5750f1]/10 px-1.5 py-0.5 font-mono text-[9px] text-[#5750f1]"
                    >
                      <span className="font-semibold">{vm?.hostname ?? vmId}</span>
                      {vm?.role && <span className="text-[7.5px] text-[var(--muted)] font-sans">({vm.role})</span>}
                      <button
                        type="button"
                        onClick={() => removeVm(vmId)}
                        className="ml-0.5 rounded text-[10px] text-[var(--muted)] hover:text-rose-600 font-bold"
                        title="제거"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* Manual entry fallback */}
            <div className="flex items-center gap-1 pt-0.5">
              <input
                id="sop-manual-vm"
                placeholder="직접 VM ID/호스트명 입력 (예: vm-ext01)"
                className="h-6 flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[9px] outline-none text-[var(--foreground)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      addVm(val);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("sop-manual-vm") as HTMLInputElement;
                  if (el && el.value.trim()) {
                    addVm(el.value.trim());
                    el.value = "";
                  }
                }}
                className="h-6 rounded border border-[var(--border)] px-2 text-[9px] text-[var(--muted)] hover:bg-[var(--surface-3)]"
              >
                + 직접 추가
              </button>
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
