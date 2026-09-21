"use client";

import { useState } from "react";
import { managementRepo } from "@/services/management/mock-repository";
import type { BatchImportResult } from "@/services/management/repository";
import { Badge } from "@/components/tailgrids/core/badge";

const SAMPLE_PAYLOAD = JSON.stringify(
  {
    assets: [
      {
        id: "vm-bot09",
        assetType: "VM",
        hostname: "RPA-BOT09",
        ipAddress: "10.10.40.19",
        environment: "PROD",
        role: "Worker",
        service: "RPA-CORE",
        zone: "BOT",
        criticality: "HIGH",
        health: "healthy",
        owner: "RPA Operations",
      },
      {
        id: "nas-backup",
        assetType: "NAS",
        hostname: "RPA-NAS-BCK",
        ipAddress: "10.10.50.20",
        environment: "PROD",
        role: "Storage",
        service: "BACKUP",
        zone: "SUPPORT",
        criticality: "MEDIUM",
        health: "healthy",
        owner: "Infra Team",
      },
    ],
    policies: [
      {
        id: "p-new-1",
        sourceVmId: "vm-bot09",
        sourceName: "RPA-BOT09",
        sourceIp: "10.10.40.19",
        targetVmId: "vm-db01",
        targetName: "RPA-DB01",
        targetIp: "10.10.30.11",
        port: 1433,
        protocol: "TCP",
        direction: "BIDIRECTIONAL",
        approvalStatus: "APPROVED",
        expiresAt: "2027-09-30",
        purpose: "MSSQL Database Access",
        requestId: "REQ-2026-9901",
      },
    ],
    releases: [
      {
        id: "rel-uipath-2024",
        productId: "sp-1",
        productName: "UiPath Robot",
        version: "2024.10",
        vendor: "UiPath",
        status: "SUPPORTED",
        versionMatchRule: "prefix",
        matchPattern: "2024.10.*",
        eoslDate: "2028-10-31",
      },
    ],
    sops: [
      {
        id: "sop-bot-fail",
        title: "RPA Bot Node Failover Procedure",
        category: "RECOVERY",
        severity: "HIGH",
        summary: "Emergency recovery steps when RPA worker robot terminates abnormally.",
        url: "https://wiki.internal/ops/sop-bot-recovery",
        relatedVmIds: ["vm-bot09"],
        updatedAt: "2026-09-21",
      },
    ],
  },
  null,
  2
);

export function BatchImportView() {
  const [jsonText, setJsonText] = useState(SAMPLE_PAYLOAD);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    counts?: { assets: number; policies: number; releases: number; sops: number };
    errors: string[];
  } | null>(null);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  function handleValidate() {
    setImportResult(null);
    try {
      const parsed = JSON.parse(jsonText);
      const assets = parsed.assets || parsed.vms || [];
      const policies = parsed.policies || [];
      const releases = parsed.releases || parsed.software || [];
      const sops = parsed.sops || [];

      const errors: string[] = [];

      if (!Array.isArray(assets) && !Array.isArray(policies) && !Array.isArray(releases) && !Array.isArray(sops)) {
        errors.push("JSON must contain at least one array of 'assets' (or 'vms'), 'policies', 'releases', or 'sops'.");
      }

      // Validate assets
      assets.forEach((a: any, idx: number) => {
        if (!a.hostname) errors.push(`Asset[${idx}]: missing hostname`);
        if (!a.ipAddress) errors.push(`Asset[${idx}]: missing ipAddress`);
      });

      // Validate policies
      policies.forEach((p: any, idx: number) => {
        if (!p.sourceIp) errors.push(`Policy[${idx}]: missing sourceIp`);
        if (!p.targetIp) errors.push(`Policy[${idx}]: missing targetIp`);
        if (!p.port || isNaN(Number(p.port))) errors.push(`Policy[${idx}]: missing or invalid port`);
      });

      setValidationResult({
        valid: errors.length === 0,
        counts: {
          assets: assets.length,
          policies: policies.length,
          releases: releases.length,
          sops: sops.length,
        },
        errors,
      });
    } catch (err: any) {
      setValidationResult({
        valid: false,
        errors: [`JSON Syntax Error: ${err.message}`],
      });
    }
  }

  async function handleImport() {
    setIsProcessing(true);
    setImportResult(null);

    try {
      const parsed = JSON.parse(jsonText);
      const assets = parsed.assets || parsed.vms || [];
      const policies = parsed.policies || [];
      const releases = parsed.releases || [];
      const sops = parsed.sops || [];

      const result = await managementRepo.importBatch({
        assets,
        policies,
        releases,
        sops,
      });

      setImportResult(result);
    } catch (err: any) {
      setImportResult({
        importedCount: 0,
        assetsCount: 0,
        policiesCount: 0,
        releasesCount: 0,
        sopsCount: 0,
        errors: [`Import Failed: ${err.message}`],
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-[10px] text-[var(--muted)] leading-relaxed">
        <b className="text-[var(--foreground)]">Data Integration Order:</b> 표준 JSON 형식(Normalized Shape)으로 정제된 인프라 자산, 방화벽 정책(방향성 포함), 소프트웨어 릴리스 및 SOP를 일괄 검증하고 내부 레포지토리에 반영합니다. 누락된 데이터는 절대 임의 추정하지 않고 <span className="font-mono text-[var(--foreground)]">UNKNOWN / null</span>로 유지됩니다.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: JSON Input Textarea */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--foreground)]">
              Raw JSON Input Payload
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setJsonText(SAMPLE_PAYLOAD)}
                className="h-6 rounded border border-[var(--border)] px-2 text-[9px] text-[var(--muted)] hover:bg-[var(--surface-2)]"
              >
                Reset to Sample
              </button>
              <button
                type="button"
                onClick={() => setJsonText("{}")}
                className="h-6 rounded border border-[var(--border)] px-2 text-[9px] text-[var(--muted)] hover:bg-[var(--surface-2)]"
              >
                Clear
              </button>
            </div>
          </div>

          <textarea
            rows={18}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 font-mono text-[10px] leading-relaxed outline-none text-[var(--foreground)] focus:border-[#5750f1]"
          />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleValidate}
              className="h-8 rounded border border-[var(--border)] bg-[var(--surface)] px-4 text-[10.5px] font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition"
            >
              Validate & Dry Run
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleImport}
              className="h-8 rounded bg-[#5750f1] px-5 text-[10.5px] font-semibold text-white hover:bg-[#463fc9] disabled:opacity-50 transition"
            >
              {isProcessing ? "Importing..." : "Execute Batch Import"}
            </button>
          </div>
        </div>

        {/* Right: Validation & Results Panel */}
        <div className="space-y-3">
          {/* Validation Box */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-[11px] font-bold text-[var(--foreground)]">Validation Result</span>
              {validationResult && (
                <Badge tone={validationResult.valid ? "success" : "danger"}>
                  {validationResult.valid ? "PASSED" : "FAILED"}
                </Badge>
              )}
            </div>

            {validationResult ? (
              <div className="space-y-2 text-[10px]">
                {validationResult.counts && (
                  <div className="grid grid-cols-2 gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 font-mono">
                    <div>Assets: {validationResult.counts.assets}</div>
                    <div>Policies: {validationResult.counts.policies}</div>
                    <div>Releases: {validationResult.counts.releases}</div>
                    <div>SOPs: {validationResult.counts.sops}</div>
                  </div>
                )}

                {validationResult.errors.length > 0 ? (
                  <div className="rounded border border-[var(--danger)]/30 bg-[var(--danger-surface)] p-2 text-[9.5px] text-[var(--danger)] space-y-1">
                    <div className="font-semibold">Validation Errors ({validationResult.errors.length}):</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {validationResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-[9.5px] text-[#12b76a]">
                    All schema checks passed. The payload is valid and ready for batch ingestion.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[10px] text-[var(--muted)]">
                Click &apos;Validate & Dry Run&apos; to inspect schema compliance and detect missing required fields.
              </div>
            )}
          </div>

          {/* Import Execution Box */}
          {importResult && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[11px] font-bold text-[var(--foreground)]">Execution Report</span>
                <Badge tone={importResult.importedCount > 0 ? "success" : "danger"}>
                  {importResult.importedCount > 0 ? "SUCCESS" : "NO ITEMS"}
                </Badge>
              </div>

              <div className="space-y-2 text-[10px]">
                <div className="font-semibold text-[var(--foreground)]">
                  Total Items Ingested: <span className="font-mono text-[#5750f1]">{importResult.importedCount}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 font-mono text-[9px]">
                  <div>Assets: +{importResult.assetsCount}</div>
                  <div>Policies: +{importResult.policiesCount}</div>
                  <div>Releases: +{importResult.releasesCount}</div>
                  <div>SOPs: +{importResult.sopsCount}</div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="rounded border border-[var(--warning)]/30 bg-[var(--warning-surface)] p-2 text-[9px] text-[var(--warning)]">
                    <div className="font-semibold">Skipped Records:</div>
                    <ul className="list-disc pl-4">
                      {importResult.errors.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
