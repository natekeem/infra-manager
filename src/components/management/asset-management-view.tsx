"use client";

import { useState } from "react";
import type { InfraAsset, AssetType } from "@/domain/models";
import { managementRepo } from "@/services/management/mock-repository";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";

export function AssetManagementView({ initialAssets }: { initialAssets: InfraAsset[] }) {
  const [assets, setAssets] = useState<InfraAsset[]>(initialAssets);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InfraAsset | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<InfraAsset>>({
    assetType: "VM",
    hostname: "",
    ipAddress: "",
    environment: "PROD",
    zone: "APP",
    role: "BOT",
    service: "RPA-CORE",
    criticality: "HIGH",
    health: "healthy",
    owner: "",
    sourceRef: "MANUAL_INPUT",
  });

  const filtered = assets.filter((a) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      `${a.hostname} ${a.ipAddress} ${a.role} ${a.service} ${a.owner ?? ""}`
        .toLowerCase()
        .includes(q);
    const matchType = typeFilter === "ALL" || (a.assetType ?? "VM") === typeFilter;
    return matchQ && matchType;
  });

  function openCreateModal() {
    setEditingAsset(null);
    setFormData({
      assetType: "VM",
      hostname: "",
      ipAddress: "",
      environment: "PROD",
      zone: "APP",
      role: "BOT",
      service: "RPA-CORE",
      criticality: "HIGH",
      health: "healthy",
      owner: "",
      sourceRef: "MANUAL_INPUT",
    });
    setIsModalOpen(true);
  }

  function openEditModal(asset: InfraAsset) {
    setEditingAsset(asset);
    setFormData({ ...asset });
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.hostname || !formData.ipAddress) return;

    if (editingAsset) {
      const updated = await managementRepo.updateAsset(editingAsset.id, formData);
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } else {
      const created = await managementRepo.createAsset(formData as InfraAsset);
      setAssets((prev) => [created, ...prev]);
    }
    setIsModalOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 이 자산을 등록 해제(삭제)하시겠습니까?")) return;
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
            <option value="ALL">All Asset Types</option>
            <option value="VM">Virtual Machine (VM)</option>
            <option value="NAS">NAS Storage</option>
            <option value="PHYSICAL_SERVER">Physical Server</option>
          </select>

          <div className="flex h-7 w-[220px] items-center gap-1.5 rounded-md border border-[var(--border)] px-2">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[10px] text-[var(--foreground)] outline-none"
              placeholder="Search hostname, IP, role..."
            />
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex h-7 items-center gap-1 rounded-md bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
        >
          <span>+ Register Asset</span>
        </button>
      </div>

      {/* Asset Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[10px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <Th>Type</Th>
                <Th>Hostname</Th>
                <Th>IP Address</Th>
                <Th>Environment</Th>
                <Th>Tier / Zone</Th>
                <Th>Service / Role</Th>
                <Th>Criticality</Th>
                <Th>Owner</Th>
                <Th>Source Ref</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-[11px] text-[var(--muted)]">
                    등록된 인프라 자산이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <Td>
                      <Badge tone={a.assetType === "NAS" ? "info" : "neutral"}>
                        {a.assetType ?? "VM"}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="font-mono font-bold text-[var(--foreground)]">{a.hostname}</span>
                    </Td>
                    <Td>
                      <span className="font-mono">{a.ipAddress}</span>
                    </Td>
                    <Td>
                      <span className="rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[8.5px]">
                        {a.environment}
                      </span>
                    </Td>
                    <Td>
                      <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px]">
                        {a.zone}
                      </span>
                    </Td>
                    <Td>
                      <div className="font-medium text-[var(--foreground)]">{a.service}</div>
                      <div className="text-[9px] text-[var(--muted)]">{a.role}</div>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          a.criticality === "CRITICAL"
                            ? "danger"
                            : a.criticality === "HIGH"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {a.criticality}
                      </Badge>
                    </Td>
                    <Td>{a.owner ?? "-"}</Td>
                    <Td>
                      <span className="font-mono text-[9px] text-[var(--muted)]">{a.sourceRef ?? "-"}</span>
                    </Td>
                    <Td className="text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(a)}
                        className="rounded border border-[var(--border)] px-2 py-0.5 text-[9px] hover:border-[#5750f1] hover:text-[#5750f1] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
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
                {editingAsset ? "Edit Asset" : "Register New Asset"}
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
                  <label className="mb-1 block font-medium text-[var(--muted)]">Asset Type</label>
                  <select
                    value={formData.assetType}
                    onChange={(e) => setFormData({ ...formData, assetType: e.target.value as AssetType })}
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  >
                    <option value="VM">VM</option>
                    <option value="NAS">NAS</option>
                    <option value="PHYSICAL_SERVER">Physical Server</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Environment</label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  >
                    <option value="PROD">PROD</option>
                    <option value="STG">STG</option>
                    <option value="DEV">DEV</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Hostname *</label>
                  <input
                    required
                    value={formData.hostname}
                    onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                    placeholder="e.g. RPA-BOT05"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">IP Address *</label>
                  <input
                    required
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    placeholder="e.g. 10.10.40.25"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Zone / Tier</label>
                  <select
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  >
                    <option value="BOT">BOT</option>
                    <option value="APP">APP</option>
                    <option value="DB">DB</option>
                    <option value="WEB">WEB</option>
                    <option value="CONTROL">CONTROL</option>
                    <option value="VDI">VDI</option>
                    <option value="SUPPORT">SUPPORT</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Role</label>
                  <input
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Worker"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Criticality</label>
                  <select
                    value={formData.criticality}
                    onChange={(e) => setFormData({ ...formData, criticality: e.target.value as any })}
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
                <label className="mb-1 block font-medium text-[var(--muted)]">Service</label>
                <input
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  placeholder="e.g. RPA-CORE"
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Owner</label>
                  <input
                    value={formData.owner ?? ""}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    placeholder="e.g. RPA Platform Team"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Source Ref</label>
                  <input
                    value={formData.sourceRef ?? ""}
                    onChange={(e) => setFormData({ ...formData, sourceRef: e.target.value })}
                    placeholder="e.g. CMDB-202609"
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
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
                  Save Asset
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
