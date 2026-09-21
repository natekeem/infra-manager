"use client";

import { useState } from "react";
import type { InfraAsset } from "@/domain/models";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";

interface ServiceMapping {
  id: string;
  serviceName: string;
  tier: string;
  criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  primaryContact: string;
  assetCount: number;
  dependencies: string[];
}

export function TopologyManagementView({ initialAssets }: { initialAssets: InfraAsset[] }) {
  // Aggregate services from assets
  const serviceNames = Array.from(new Set(initialAssets.map((a) => a.service)));

  const [services, setServices] = useState<ServiceMapping[]>([
    {
      id: "svc-rpa-core",
      serviceName: "RPA-CORE",
      tier: "CONTROL",
      criticality: "CRITICAL",
      primaryContact: "DevOps Team",
      assetCount: initialAssets.filter((a) => a.service === "RPA-CORE").length,
      dependencies: ["MSSQL-PRD", "LDAP-CORP", "RPA-NAS01"],
    },
    {
      id: "svc-ocr",
      serviceName: "OCR-SERVICE",
      tier: "APP",
      criticality: "HIGH",
      primaryContact: "AI Platform Team",
      assetCount: initialAssets.filter((a) => a.service === "OCR-SERVICE").length,
      dependencies: ["RPA-CORE", "RPA-NAS02"],
    },
    {
      id: "svc-mssql",
      serviceName: "DB-MSSQL",
      tier: "DB",
      criticality: "CRITICAL",
      primaryContact: "DBA Team",
      assetCount: initialAssets.filter((a) => a.zone === "DB").length,
      dependencies: ["SAN-STORAGE", "BACKUP-APPLIANCE"],
    },
    {
      id: "svc-vdi",
      serviceName: "VDI-FARMS",
      tier: "VDI",
      criticality: "HIGH",
      primaryContact: "Infra Ops",
      assetCount: initialAssets.filter((a) => a.zone === "VDI").length,
      dependencies: ["AD-DOMAIN", "CONTROL-CENTER"],
    },
  ]);

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSvc, setEditingSvc] = useState<ServiceMapping | null>(null);

  const [formData, setFormData] = useState<Partial<ServiceMapping>>({
    serviceName: "",
    tier: "APP",
    criticality: "HIGH",
    primaryContact: "",
    dependencies: [],
  });

  const filtered = services.filter((s) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      `${s.serviceName} ${s.tier} ${s.primaryContact} ${s.dependencies.join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  });

  function openCreateModal() {
    setEditingSvc(null);
    setFormData({
      serviceName: "",
      tier: "APP",
      criticality: "HIGH",
      primaryContact: "",
      dependencies: [],
    });
    setIsModalOpen(true);
  }

  function openEditModal(svc: ServiceMapping) {
    setEditingSvc(svc);
    setFormData({ ...svc });
    setIsModalOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.serviceName) return;

    if (editingSvc) {
      setServices((prev) =>
        prev.map((s) => (s.id === editingSvc.id ? { ...s, ...formData } as ServiceMapping : s))
      );
    } else {
      const newSvc: ServiceMapping = {
        id: `svc-${Date.now().toString(36)}`,
        serviceName: formData.serviceName!,
        tier: formData.tier ?? "APP",
        criticality: formData.criticality ?? "HIGH",
        primaryContact: formData.primaryContact ?? "-",
        assetCount: initialAssets.filter((a) => a.service === formData.serviceName).length,
        dependencies: typeof formData.dependencies === "string"
          ? (formData.dependencies as string).split(",").map((s) => s.trim()).filter(Boolean)
          : (formData.dependencies ?? []),
      };
      setServices((prev) => [newSvc, ...prev]);
    }
    setIsModalOpen(false);
  }

  function handleDelete(id: string) {
    if (!confirm("정말 이 서비스 정의를 삭제하시겠습니까?")) return;
    setServices((prev) => prev.filter((s) => s.id !== id));
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
            placeholder="Search service, tier, dependency..."
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex h-7 items-center gap-1 rounded-md bg-[#5750f1] px-3 text-[10px] font-semibold text-white transition hover:bg-[#463fc9]"
        >
          <span>+ Define Service</span>
        </button>
      </div>

      {/* Services Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[10px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase tracking-[0.04em] text-[var(--muted)]">
                <Th>Service Name</Th>
                <Th>Primary Tier</Th>
                <Th>Criticality</Th>
                <Th>Contact / Owner</Th>
                <Th>Assigned Assets</Th>
                <Th>External / Upstream Dependencies</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[11px] text-[var(--muted)]">
                    등록된 서비스 토폴로지 정의가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <Td>
                      <span className="font-mono font-bold text-[var(--foreground)]">{s.serviceName}</span>
                    </Td>
                    <Td>
                      <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px]">
                        {s.tier}
                      </span>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          s.criticality === "CRITICAL"
                            ? "danger"
                            : s.criticality === "HIGH"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {s.criticality}
                      </Badge>
                    </Td>
                    <Td>{s.primaryContact}</Td>
                    <Td>
                      <span className="font-mono text-[var(--foreground)]">{s.assetCount} assets</span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {s.dependencies.map((dep) => (
                          <span
                            key={dep}
                            className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.2 font-mono text-[8.5px] text-[var(--muted)]"
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
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
                {editingSvc ? "Edit Service Definition" : "Define New Service"}
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
                <label className="mb-1 block font-medium text-[var(--muted)]">Service Name *</label>
                <input
                  required
                  value={formData.serviceName}
                  onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                  placeholder="e.g. PAYMENT-GATEWAY"
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 font-mono outline-none text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-[var(--muted)]">Primary Tier</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                  >
                    <option value="WEB">WEB</option>
                    <option value="APP">APP</option>
                    <option value="DB">DB</option>
                    <option value="CONTROL">CONTROL</option>
                    <option value="BOT">BOT</option>
                    <option value="VDI">VDI</option>
                    <option value="SUPPORT">SUPPORT</option>
                  </select>
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
                <label className="mb-1 block font-medium text-[var(--muted)]">Primary Contact / Owner</label>
                <input
                  value={formData.primaryContact}
                  onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
                  placeholder="e.g. ERP Integration Team"
                  className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 outline-none text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-[var(--muted)]">
                  Dependencies (comma separated)
                </label>
                <input
                  value={
                    Array.isArray(formData.dependencies)
                      ? formData.dependencies.join(", ")
                      : formData.dependencies ?? ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dependencies: e.target.value.split(",").map((s) => s.trim()),
                    })
                  }
                  placeholder="e.g. MSSQL-PRD, RPA-NAS01, TAX-GW"
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
                  Save Service
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
