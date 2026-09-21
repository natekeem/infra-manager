"use client";

import { useState } from "react";
import type { NetworkPolicy, PolicyApprovalStatus, PolicyDirection } from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";

export function PolicyManagementView({ initialPolicies }: { initialPolicies: NetworkPolicy[] }) {
  const [policies, setPolicies] = useState<NetworkPolicy[]>(initialPolicies);
  const [query, setQuery] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<NetworkPolicy | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<NetworkPolicy>>({
    sourceName: "",
    sourceIp: "",
    sourceVmId: "",
    targetName: "",
    targetIp: "",
    targetVmId: "",
    protocol: "TCP",
    port: 443,
    direction: "ONE_WAY",
    approvalStatus: "APPROVED",
    expiresAt: "",
    purpose: "",
    requestId: "",
  });

  const filtered = policies.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      `${p.sourceName} ${p.sourceIp} ${p.targetName} ${p.targetIp} ${p.port} ${p.requestId ?? ""}`
        .toLowerCase()
        .includes(q);
    const matchApproval = approvalFilter === "ALL" || p.approvalStatus === approvalFilter;
    return matchQ && matchApproval;
  });

  function openCreateModal() {
    setEditingPolicy(null);
    setFormData({
      sourceName: "",
      sourceIp: "",
      sourceVmId: "vm-custom",
      targetName: "",
      targetIp: "",
      targetVmId: "vm-target",
      protocol: "TCP",
      port: 443,
      direction: "ONE_WAY",
      approvalStatus: "APPROVED",
      expiresAt: "",
      purpose: "",
      requestId: `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    setIsModalOpen(true);
  }

  function openEditModal(policy: NetworkPolicy) {
    setEditingPolicy(policy);
    setFormData({ ...policy });
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.sourceIp || !formData.targetIp || !formData.port) return;

    if (editingPolicy) {
      const updated = await managementRepo.updatePolicy(editingPolicy.id, formData);
      setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const created = await managementRepo.createPolicy(formData as NetworkPolicy);
      setPolicies((prev) => [created, ...prev]);
    }
    setIsModalOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 이 방화벽 정책을 삭제(회수)하시겠습니까?")) return;
    await managementRepo.deletePolicy(id);
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex items-center gap-2">
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            aria-label="Filter approval status"
            className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] text-[var(--foreground)] outline-none"
          >
            <option value="ALL">All Approvals</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PENDING">PENDING</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <div className="flex h-7 w-[240px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[10px] text-[var(--foreground)] outline-none"
              placeholder="Search source, target, port, request..."
            />
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex h-7 items-center gap-1 rounded-md bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
        >
          <span>+ Register Policy</span>
        </button>
      </div>

      {/* Policies Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[10px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <Th>Request ID</Th>
                <Th>Direction</Th>
                <Th>Source Host · IP</Th>
                <Th>Target Host · IP</Th>
                <Th>Protocol / Port</Th>
                <Th>Approval</Th>
                <Th>Expires At</Th>
                <Th>Purpose</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-[11px] text-[var(--muted)]">
                    등록된 방화벽 정책이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isBidi = p.direction === "BIDIRECTIONAL";
                  return (
                    <tr key={p.id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <Td>
                        <span className="font-mono text-[9px] text-[var(--muted)]">
                          {p.requestId ?? "-"}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={isBidi ? "info" : "neutral"}>
                          {isBidi ? "⇄ BIDI" : "→ ONE"}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="font-bold text-[var(--foreground)]">{p.sourceName}</div>
                        <div className="font-mono text-[9px] text-[var(--muted)]">{p.sourceIp}</div>
                      </Td>
                      <Td>
                        <div className="font-bold text-[var(--foreground)]">{p.targetName}</div>
                        <div className="font-mono text-[9px] text-[var(--muted)]">{p.targetIp}</div>
                      </Td>
                      <Td>
                        <span className="font-mono font-semibold text-[var(--foreground)]">
                          {p.protocol} / {p.port}
                        </span>
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            p.approvalStatus === "APPROVED"
                              ? "success"
                              : p.approvalStatus === "PENDING"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {p.approvalStatus}
                        </Badge>
                      </Td>
                      <Td>
                        <span className="font-mono">{p.expiresAt ?? "Unlimited"}</span>
                      </Td>
                      <Td className="max-w-[140px] truncate text-[var(--muted)]">
                        {p.purpose ?? "-"}
                      </Td>
                      <Td className="text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="rounded border border-[var(--border)] px-2 py-0.5 text-[9px] hover:border-[#5750f1] hover:text-[#5750f1] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="rounded border border-[var(--border)] px-2 py-0.5 text-[9px] text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-surface)] transition-colors"
                        >
                          Delete
                        </button>
                      </Td>
                    </tr>
                  );
                })
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
                {editingPolicy ? "Edit Network Policy" : "Register Network Policy"}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Request ID</label>
                  <input
                    value={formData.requestId ?? ""}
                    onChange={(e) => setFormData({ ...formData, requestId: e.target.value })}
                    placeholder="e.g. REQ-2026-0042"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Direction</label>
                  <select
                    value={formData.direction}
                    onChange={(e) =>
                      setFormData({ ...formData, direction: e.target.value as PolicyDirection })
                    }
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  >
                    <option value="ONE_WAY">단방향 (One-Way: A → B)</option>
                    <option value="BIDIRECTIONAL">양방향 (Bidirectional: A ⇄ B)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Source Name *</label>
                  <input
                    required
                    value={formData.sourceName}
                    onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                    placeholder="e.g. RPA-BOT01"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Source IP *</label>
                  <input
                    required
                    value={formData.sourceIp}
                    onChange={(e) => setFormData({ ...formData, sourceIp: e.target.value })}
                    placeholder="e.g. 10.10.40.11"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Target Name *</label>
                  <input
                    required
                    value={formData.targetName}
                    onChange={(e) => setFormData({ ...formData, targetName: e.target.value })}
                    placeholder="e.g. RPA-DB01"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Target IP *</label>
                  <input
                    required
                    value={formData.targetIp}
                    onChange={(e) => setFormData({ ...formData, targetIp: e.target.value })}
                    placeholder="e.g. 10.10.30.11"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Protocol</label>
                  <select
                    value={formData.protocol}
                    onChange={(e) => setFormData({ ...formData, protocol: e.target.value as "TCP" | "UDP" })}
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Port *</label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Approval Status</label>
                  <select
                    value={formData.approvalStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, approvalStatus: e.target.value as PolicyApprovalStatus })
                    }
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiresAt ?? ""}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Purpose</label>
                  <input
                    value={formData.purpose ?? ""}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="e.g. DB Query Flow"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  />
                </div>
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
                  Save Policy
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
