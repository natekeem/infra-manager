"use client";

import { useState } from "react";
import type { SoftwareProduct, SoftwareRelease } from "@/domain/models";
import { applyCatalogDiff, diffCatalog, parseCatalogFile, type CatalogImportDiff } from "@/domain/catalog-import";
import { getAppNow } from "@/domain/app-time";

export function CatalogImportPanel({ products, releases, onApply }: { products: SoftwareProduct[]; releases: SoftwareRelease[]; onApply: (products: SoftwareProduct[], releases: SoftwareRelease[], diff: CatalogImportDiff, fileName: string) => void }) {
  const [fileName, setFileName] = useState("");
  const [diff, setDiff] = useState<CatalogImportDiff | null>(null);
  const [message, setMessage] = useState("");
  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name); setMessage("");
    try { setDiff(diffCatalog(parseCatalogFile(await file.text(), file.name), products, releases)); }
    catch (error) { setDiff(null); setMessage(error instanceof Error ? error.message : "파일을 처리하지 못했습니다."); }
  };
  const apply = () => { if (!diff || diff.errors.length) return; const result = applyCatalogDiff(diff, products, releases, getAppNow().toISOString()); onApply(result.products, result.releases, diff, fileName); setMessage("Catalog 적용 완료: 누락 항목은 삭제하지 않고 STALE로 표시했습니다."); };
  return <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[10px] font-semibold">Import Company Catalog</div><div className="text-[9px] text-[var(--muted)]">CSV / JSON · Upload → Normalize → Dry Run → Diff → Apply</div></div><label className="cursor-pointer rounded border border-[var(--border)] px-3 py-1.5 text-[9px] font-medium text-[#5750f1]">파일 선택<input type="file" accept=".csv,.json" className="hidden" onChange={(event) => onFile(event.target.files?.[0])}/></label></div>
    {message && <div className="mt-2 text-[9px] text-[var(--muted)]">{message}</div>}
    {diff && <div className="mt-3"><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[["New",diff.newRows.length],["Changed",diff.changedRows.length],["Unchanged",diff.unchangedRows.length],["Missing",diff.missingReleases.length],["Errors",diff.errors.length]].map(([label,count]) => <div key={String(label)} className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2"><div className="text-[8px] uppercase text-[var(--muted)]">{label}</div><div className="font-mono text-[14px] font-semibold">{count}</div></div>)}</div>
      {diff.changedRows.length > 0 && <div className="mt-2 max-h-28 overflow-auto rounded border border-[var(--border)] text-[9px]">{diff.changedRows.map(({ row, release, changes }) => <div key={release.id} className="border-b border-[var(--border)] p-2 last:border-0"><b>{row.productName} {row.version}</b> · {changes.map((field) => `${field}: ${String(release[field as keyof SoftwareRelease] ?? "NULL")} → ${String(row[field as keyof typeof row] ?? "NULL")}`).join(" / ")}</div>)}</div>}
      {diff.errors.map((error) => <div key={error} className="mt-1 text-[9px] text-red-500">{error}</div>)}
      <div className="mt-2 flex justify-end"><button disabled={diff.errors.length > 0} onClick={apply} className="h-7 rounded bg-[#5750f1] px-3 text-[9px] font-semibold text-white disabled:opacity-40">Apply {fileName}</button></div></div>}
  </div>;
}
