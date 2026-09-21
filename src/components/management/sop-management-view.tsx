"use client";

import { useState } from "react";
import type { SopDocument } from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";

export function SopManagementView({ initialSops }: { initialSops: SopDocument[] }) {
  const [sops, setSops] = useState<SopDocument[]>(initialSops);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  function openCreateModal() {
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
    setIsModalOpen(true);
  }

  function openEditModal(sop: SopDocument) {
    setEditingSop(sop);
    setFormData({ ...sop });
    setIsModalOpen(true);
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
    setIsModalOpen(false);
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
            <option value="ALL">All Categories</option>
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
              placeholder="Search SOP title, summary, vm..."
            />
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex h-7 items-center gap-1 rounded-md bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
        >
          <span>+ Register SOP</span>
        </button>
      </div>

      {/* SOP Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[10px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Severity</Th>
                <Th>Summary</Th>
                <Th>Target / Linked VMs</Th>
                <Th>Updated Date</Th>
                <Th className="text-right">Actions</Th>
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
                  <tr key={s.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <Td>
                      <a
                        href={s.url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
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
                    <Td className="text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(s)}
                        className="rounded border border-[var(--border)] px-2 py-0.5 text-[9px] hover:border-[#5750f1] hover:text-[#5750f1] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="rounded border border-[var(--border)] px-2 py-0.5 text-[9px] text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-surface)] transition-colors"
                      >
                        Delete
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                {editingSop ? "Edit SOP Document" : "Register New SOP"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-2.5 text-[10px]">
              <div>
                <label className="mb-1 block font-medium text-[var(--muted)]">SOP Title *</label>
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
                  <label className="mb-1 block font-medium text-[var(--muted)]">Category</label>
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
                  <label className="mb-1 block font-medium text-[var(--muted)]">Severity</label>
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
                <label className="mb-1 block font-medium text-[var(--muted)]">Summary *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief summary of procedure and first action..."
                  className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 outline-none text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-[var(--muted)]">Document URL</label>
                <input
                  type="url"
                  value={formData.url ?? ""}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://wiki.internal/ops/sop-123"
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-[var(--muted)]">
                  Linked VM IDs (comma separated)
                </label>
                <input
                  value={
                    Array.isArray(formData.relatedVmIds)
                      ? formData.relatedVmIds.join(", ")
                      : formData.relatedVmIds ?? ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      relatedVmIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. vm-db01, vm-db02"
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border)] pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-7 rounded border border-[var(--border)] px-3 text-[10px] text-[var(--muted)] hover:bg-[var(--surface-2)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-7 rounded bg-[#5750f1] px-4 text-[10px] font-semibold text-white hover:bg-[#463fc9]"
                >
                  Save SOP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={`px-3 py-2 font-medium ${className ?? ""}`}>{children}</th>
);

const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2 align-middle ${className ?? ""}`}>{children}</td>
);
