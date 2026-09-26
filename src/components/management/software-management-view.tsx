"use client";

import { useState } from "react";
import type { SoftwareProduct, SoftwareRelease } from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";
import { SlideDrawer } from "@/components/common/slide-drawer";

export function SoftwareManagementView({
  initialProducts,
  initialReleases,
}: {
  initialProducts: SoftwareProduct[];
  initialReleases: SoftwareRelease[];
}) {
  const [products, setProducts] = useState<SoftwareProduct[]>(initialProducts);
  const [releases, setReleases] = useState<SoftwareRelease[]>(initialReleases);
  const [query, setQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<SoftwareRelease | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<SoftwareRelease>>({
    productId: products[0]?.id ?? "sp-1",
    productName: products[0]?.name ?? "",
    version: "",
    vendor: products[0]?.vendor ?? "",
    versionMatchRule: "exact",
    matchPattern: "",
    supportEndDate: "",
    eoslDate: "",
    status: "SUPPORTED",
  });

  const filteredReleases = releases.filter((r) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      `${r.productName} ${r.version} ${r.vendor} ${r.versionMatchRule}`
        .toLowerCase()
        .includes(q)
    );
  });

  function openCreateDrawer() {
    setEditingRelease(null);
    const firstP = products[0];
    setFormData({
      productId: firstP?.id ?? "",
      productName: firstP?.name ?? "",
      version: "",
      vendor: firstP?.vendor ?? "",
      versionMatchRule: "exact",
      matchPattern: "",
      supportEndDate: "",
      eoslDate: "",
      status: "SUPPORTED",
    });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(release: SoftwareRelease) {
    setEditingRelease(release);
    setFormData({ ...release });
    setIsDrawerOpen(true);
  }

  function handleProductChange(prodId: string) {
    const p = products.find((prod) => prod.id === prodId);
    if (p) {
      setFormData({
        ...formData,
        productId: p.id,
        productName: p.name,
        vendor: p.vendor,
      });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.productName || !formData.version) return;

    if (editingRelease) {
      const updated = await managementRepo.updateRelease(editingRelease.id, formData);
      setReleases((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const created = await managementRepo.createRelease(formData as SoftwareRelease);
      setReleases((prev) => [created, ...prev]);
    }
    setIsDrawerOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 이 소프트웨어 릴리스 규칙을 삭제하시겠습니까?")) return;
    await managementRepo.deleteRelease(id);
    setReleases((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex h-7 w-[240px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-[10px] text-[var(--foreground)] outline-none"
            placeholder="소프트웨어 카탈로그 릴리스 검색..."
          />
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex h-7 items-center gap-1 rounded-md bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
        >
          <span>+ 릴리스 추가</span>
        </button>
      </div>

      {/* Catalog Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[10px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <Th>제품명</Th>
                <Th>버전</Th>
                <Th>벤더</Th>
                <Th>매칭 규칙</Th>
                <Th>매칭 패턴</Th>
                <Th>지원 종료</Th>
                <Th>EOSL 일자</Th>
                <Th>상태</Th>
                <Th className="text-right">관리</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredReleases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-[11px] text-[var(--muted)]">
                    등록된 카탈로그 릴리스가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredReleases.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openEditDrawer(r)}
                    className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <Td>
                      <span className="font-bold text-[var(--foreground)]">{r.productName}</span>
                    </Td>
                    <Td>
                      <span className="font-mono font-semibold text-[var(--foreground)]">{r.version}</span>
                    </Td>
                    <Td>{r.vendor}</Td>
                    <Td>
                      <Badge tone="info">{r.versionMatchRule.toUpperCase()}</Badge>
                    </Td>
                    <Td>
                      <span className="font-mono text-[9px] text-[var(--muted)]">
                        {r.matchPattern ?? r.version}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono">{r.supportEndDate || "-"}</span>
                    </Td>
                    <Td>
                      <span className="font-mono font-medium">{r.eoslDate || "미매핑"}</span>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          r.status === "SUPPORTED"
                            ? "success"
                            : r.status === "EOSL"
                              ? "danger"
                              : "warning"
                        }
                        dot
                      >
                        {r.status}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r.id);
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
        title={editingRelease ? `릴리스 수정: ${editingRelease.productName} ${editingRelease.version}` : "릴리스 추가"}
        width={460}
      >
        <form onSubmit={handleSave} className="p-4 space-y-3 text-[10px]">
          <div>
            <label className="mb-1 block font-medium text-[var(--muted)]">제품 *</label>
            <select
              value={formData.productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.vendor})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">릴리스 버전 *</label>
              <input
                required
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g. 2023.10"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">벤더</label>
              <input
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="e.g. UiPath"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">버전 매칭 규칙</label>
              <select
                value={formData.versionMatchRule}
                onChange={(e) =>
                  setFormData({ ...formData, versionMatchRule: e.target.value as any })
                }
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
              >
                <option value="exact">정확 일치</option>
                <option value="prefix">접두어 일치</option>
                <option value="regex">정규식 일치</option>
                <option value="range">범위 일치</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">매칭 패턴</label>
              <input
                value={formData.matchPattern ?? ""}
                onChange={(e) => setFormData({ ...formData, matchPattern: e.target.value })}
                placeholder="e.g. 2023.10.*"
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">지원 종료일</label>
              <input
                type="date"
                value={formData.supportEndDate ?? ""}
                onChange={(e) => setFormData({ ...formData, supportEndDate: e.target.value })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-[var(--muted)]">EOSL 일자</label>
              <input
                type="date"
                value={formData.eoslDate ?? ""}
                onChange={(e) => setFormData({ ...formData, eoslDate: e.target.value })}
                className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--muted)]">상태</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
            >
              <option value="SUPPORTED">SUPPORTED</option>
              <option value="D180">D180</option>
              <option value="D90">D90</option>
              <option value="D30">D30</option>
              <option value="EOSL">EOSL</option>
            </select>
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border)] pt-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="h-7 rounded border border-[var(--border)] px-3 text-[10px] text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="h-7 rounded bg-[#5750f1] px-4 text-[10px] font-semibold text-white hover:bg-[#463fc9] transition-colors"
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
