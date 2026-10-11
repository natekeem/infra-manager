"use client";

import { useMemo, useState } from "react";
import type { AssetSoftwareInstallation, ProjectSoftwareScope, SoftwareCatalogImportBatch, SoftwareInstall,
  SoftwareLifecyclePhase, SoftwareProduct, SoftwareRelease, SoftwareReleaseLifecycleHistory, VmAsset } from "@/domain/models";
import { Badge } from "@/components/tailgrids/core/badge";
import { SearchIcon } from "@/components/common/icons";
import { useProjectGroup } from "@/context/project-group-context";
import { deriveLifecycleStatus, daysUntilEosl, getProjectUsedProductIds } from "@/domain/software-lifecycle";
import { getAppNow } from "@/domain/app-time";
import { SoftwareDetailDrawer } from "./software-detail-drawer";
import { EoslTimelineChart } from "./eosl-timeline-chart";

type TabMode = "in-use" | "by-asset" | "lifecycle" | "catalog";

export function SoftwareView({ software: _software, vms, products = [], releases = [], installations = [], phases = [], scopes = [], history = [], importBatches = [] }: {
  software: SoftwareInstall[]; vms: VmAsset[]; products?: SoftwareProduct[]; releases?: SoftwareRelease[];
  installations?: AssetSoftwareInstallation[]; phases?: SoftwareLifecyclePhase[]; scopes?: ProjectSoftwareScope[];
  history?: SoftwareReleaseLifecycleHistory[]; importBatches?: SoftwareCatalogImportBatch[];
}) {
  const { activeProject } = useProjectGroup();
  const [tab, setTab] = useState<TabMode>("in-use");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [catalogStatusFilter, setCatalogStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [localScopes, setLocalScopes] = useState(scopes);
  const [localInstallations, setLocalInstallations] = useState(installations);
  const [selectedRelease, setSelectedRelease] = useState<SoftwareRelease | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SoftwareProduct | null>(null);

  const projectVms = useMemo(() => vms.filter((v) => !v.projectGroupId || v.projectGroupId === activeProject.id), [vms, activeProject.id]);
  const projectVmIds = useMemo(() => new Set(projectVms.map((vm) => vm.id)), [projectVms]);
  const vmMap = useMemo(() => new Map(projectVms.map((vm) => [vm.id, vm])), [projectVms]);
  const projectInstallations = useMemo(() => localInstallations.filter((installation) => projectVmIds.has(installation.assetId) && (!installation.projectGroupId || installation.projectGroupId === activeProject.id)), [localInstallations, projectVmIds, activeProject.id]);
  const usedProductIds = useMemo(() => getProjectUsedProductIds(activeProject.id, localScopes, projectInstallations), [activeProject.id, localScopes, projectInstallations]);
  const usedReleases = useMemo(() => releases.filter((release) => usedProductIds.has(release.productId) && projectInstallations.some((installation) => installation.matchedReleaseId === release.id)), [releases, usedProductIds, projectInstallations]);
  const installedCounts = useMemo(() => Object.fromEntries(releases.map((release) => [release.id, projectInstallations.filter((installation) => installation.matchedReleaseId === release.id).length])), [releases, projectInstallations]);
  const vendors = useMemo(() => [...new Set(products.map((product) => product.vendor))].sort(), [products]);
  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);
  const latestImport = importBatches[0];
  const staleDays = Number(process.env.NEXT_PUBLIC_EOSL_CATALOG_STALE_DAYS ?? 30);
  const catalogAge = latestImport ? Math.floor((getAppNow().getTime() - new Date(latestImport.importedAt).getTime()) / 86400000) : null;

  const filteredInstallations = useMemo(() => projectInstallations.filter((installation) => {
    const haystack = `${installation.productName} ${installation.detectedVersion} ${vmMap.get(installation.assetId)?.hostname ?? installation.assetId}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (statusFilter === "ALL" || installation.matchStatus === statusFilter || installation.lifecycleStatus === statusFilter);
  }), [projectInstallations, vmMap, query, statusFilter]);

  const filteredCatalog = useMemo(() => releases.filter((release) => {
    const product = products.find((item) => item.id === release.productId);
    const lifecycle = deriveLifecycleStatus(release.eoslDate);
    const haystack = `${release.productName} ${release.version} ${release.vendor}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (statusFilter === "ALL" || lifecycle === statusFilter)
      && (vendorFilter === "ALL" || release.vendor === vendorFilter) && (categoryFilter === "ALL" || product?.category === categoryFilter)
      && (catalogStatusFilter === "ALL" || (release.catalogStatus ?? product?.catalogStatus ?? "ACTIVE") === catalogStatusFilter);
  }), [releases, products, query, statusFilter, vendorFilter, categoryFilter, catalogStatusFilter]);
  const pagedCatalog = filteredCatalog.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(filteredCatalog.length / pageSize));

  const aggregates = useMemo(() => [...usedProductIds].map((productId) => {
    const product = products.find((item) => item.id === productId);
    const rows = projectInstallations.filter((installation) => installation.productId === productId);
    const matched = rows.map((row) => releases.find((release) => release.id === row.matchedReleaseId)).filter(Boolean) as SoftwareRelease[];
    const riskiest = [...matched].sort((a, b) => riskRank(deriveLifecycleStatus(a.eoslDate)) - riskRank(deriveLifecycleStatus(b.eoslDate)))[0];
    return { product, rows, matched, riskiest };
  }).filter((item) => item.product), [usedProductIds, products, projectInstallations, releases]);

  const openRelease = (release: SoftwareRelease) => { setSelectedRelease(release); setSelectedProduct(products.find((product) => product.id === release.productId) ?? null); };
  const openProduct = (productId: string) => { const product = products.find((item) => item.id === productId) ?? null; setSelectedProduct(product); setSelectedRelease(releases.find((release) => release.productId === productId) ?? null); };
  const addToProject = () => {
    if (!selectedProduct || usedProductIds.has(selectedProduct.id)) return;
    setLocalScopes((current) => [...current, { id: `local-${activeProject.id}-${selectedProduct.id}`, projectGroupId: activeProject.id, productId: selectedProduct.id, scopeSource: "MANUAL", usageStatus: "IN_USE", createdAt: getAppNow().toISOString() }]);
  };

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <div><div className="text-[10px] font-semibold">Company EOSL Catalog</div><div className="text-[9px] text-[var(--muted)]">{latestImport ? `마지막 Import ${latestImport.importedAt.slice(0, 10)} · ${products.length} products / ${releases.length} releases` : "Import 이력 없음"}</div></div>
      {catalogAge !== null && catalogAge > staleDays && <Badge tone="warning">STALE CATALOG · {catalogAge}일</Badge>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
      <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5">{([
        ["in-use", `사용 중 (${aggregates.length})`], ["by-asset", `자산별 (${projectInstallations.length})`], ["lifecycle", "수명주기"], ["catalog", `전체 카탈로그 (${releases.length})`],
      ] as const).map(([id, label]) => <button key={id} onClick={() => { setTab(id); setPage(1); }} className={`h-7 rounded px-3 text-[10px] font-medium ${tab === id ? "bg-[var(--surface)] shadow-sm" : "text-[var(--muted)]"}`}>{label}</button>)}</div>
      <div className="flex flex-wrap items-center gap-2"><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-7 rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px]"><option value="ALL">전체 상태</option>{["SUPPORTED","D180","D90","D30","EOSL","UNMAPPED","AMBIGUOUS"].map((value) => <option key={value}>{value}</option>)}</select>
        <div className="flex h-7 w-[220px] items-center gap-1.5 rounded border border-[var(--border)] px-2"><SearchIcon className="h-3.5 w-3.5 text-[var(--muted)]"/><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="w-full bg-transparent text-[10px] outline-none" placeholder="제품, 버전, 호스트 검색"/></div></div>
    </div>

    {tab === "in-use" && <Table headers={["Software","Current Version(s)","Installed Assets","EOSL","Remaining","Risk","Match"]}>{aggregates.map(({ product, rows, riskiest }) => {
      const statuses = rows.map((row) => row.matchStatus ?? "MATCHED"); const status = statuses.includes("AMBIGUOUS") ? "AMBIGUOUS" : statuses.includes("UNMAPPED") ? "UNMAPPED" : "MATCHED";
      return <tr key={product!.id} onClick={() => openProduct(product!.id)} className="cursor-pointer border-b border-[var(--border)] hover:bg-[var(--surface-2)]"><Td strong>{product!.name}</Td><Td mono>{[...new Set(rows.map((row) => row.matchedReleaseVersion ?? row.detectedVersion))].join(", ") || "PLANNED"}</Td><Td mono>{new Set(rows.map((row) => row.assetId)).size}</Td><Td mono>{riskiest?.eoslDate ?? "UNKNOWN"}</Td><Td mono>{formatRemaining(daysUntilEosl(riskiest?.eoslDate))}</Td><Td><Status value={deriveLifecycleStatus(riskiest?.eoslDate)} /></Td><Td><Status value={status} /></Td></tr>;
    })}</Table>}

    {tab === "by-asset" && <Table headers={["Asset","Software","Detected Version","Matched Release","EOSL","Remaining","Lifecycle","Match"]}>{filteredInstallations.map((installation) => <tr key={installation.id} onClick={() => installation.matchedReleaseId ? openRelease(releases.find((release) => release.id === installation.matchedReleaseId)!) : openProduct(installation.productId)} className="cursor-pointer border-b border-[var(--border)] hover:bg-[var(--surface-2)]"><Td strong>{vmMap.get(installation.assetId)?.hostname ?? installation.assetId}</Td><Td>{installation.productName}</Td><Td mono>{installation.detectedVersion}</Td><Td mono>{installation.matchedReleaseVersion ?? "-"}</Td><Td mono>{installation.eoslDate ?? "UNKNOWN"}</Td><Td mono>{formatRemaining(daysUntilEosl(installation.eoslDate))}</Td><Td><Status value={installation.lifecycleStatus}/></Td><Td><Status value={installation.matchStatus ?? "MATCHED"}/></Td></tr>)}</Table>}

    {tab === "lifecycle" && <div className="space-y-3"><EoslTimelineChart releases={usedReleases} phases={phases} installedCounts={installedCounts} selectedReleaseId={selectedRelease?.id} onSelectRelease={openRelease} displayMode="all"/><div className="grid gap-3 lg:grid-cols-3"><RiskBox title="Immediate Risk" rows={projectInstallations.filter((row) => ["EOSL","D30"].includes(row.lifecycleStatus))} onOpen={(row) => row.matchedReleaseId && openRelease(releases.find((release) => release.id === row.matchedReleaseId)!)} /><RiskBox title="Upcoming" rows={projectInstallations.filter((row) => ["D90","D180"].includes(row.lifecycleStatus))} onOpen={(row) => row.matchedReleaseId && openRelease(releases.find((release) => release.id === row.matchedReleaseId)!)} /><ReviewBox rows={projectInstallations.filter((row) => row.matchStatus === "UNMAPPED" || row.matchStatus === "AMBIGUOUS")} products={products} releases={releases} onMapProduct={(id, product) => setLocalInstallations((rows) => rows.map((row) => row.id === id ? { ...row, productId: product.id, productName: product.name, vendor: product.vendor, category: product.category, matchStatus: "UNMAPPED" } : row))} onMapRelease={(id, release) => setLocalInstallations((rows) => rows.map((row) => row.id === id ? { ...row, productId: release.productId, productName: release.productName, vendor: release.vendor, matchedReleaseId: release.id, matchedReleaseVersion: release.version, eoslDate: release.eoslDate, lifecycleStatus: deriveLifecycleStatus(release.eoslDate), matchStatus: "MATCHED" } : row))}/></div></div>}

    {tab === "catalog" && <div className="space-y-2"><div className="flex flex-wrap gap-2"><Filter value={vendorFilter} setValue={setVendorFilter} label="벤더" options={vendors}/><Filter value={categoryFilter} setValue={setCategoryFilter} label="카테고리" options={categories}/><Filter value={catalogStatusFilter} setValue={setCatalogStatusFilter} label="Catalog" options={["ACTIVE","STALE","RETIRED"]}/></div><Table headers={["Product","Version","Vendor","EOSL","Lifecycle","Catalog Updated","Used In Project","Installed Assets"]}>{pagedCatalog.map((release) => <tr key={release.id} onClick={() => openRelease(release)} className="cursor-pointer border-b border-[var(--border)] hover:bg-[var(--surface-2)]"><Td strong>{release.productName}</Td><Td mono>{release.version}</Td><Td>{release.vendor}</Td><Td mono>{release.eoslDate ?? "UNKNOWN"}</Td><Td><Status value={deriveLifecycleStatus(release.eoslDate)}/></Td><Td mono>{release.lastCatalogSeenAt?.slice(0,10) ?? products.find((product) => product.id === release.productId)?.lastCatalogSeenAt?.slice(0,10) ?? "-"}</Td><Td>{usedProductIds.has(release.productId) ? "Yes" : "-"}</Td><Td mono>{installedCounts[release.id] ?? 0}</Td></tr>)}</Table><div className="flex items-center justify-end gap-2 text-[9px]"><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-7 rounded border border-[var(--border)] bg-[var(--surface)]"><option value={50}>50 rows</option><option value={100}>100 rows</option></select><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>← 이전</button><span>{page} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>다음 →</button></div></div>}

    <SoftwareDetailDrawer release={selectedRelease} product={selectedProduct} releases={selectedProduct ? releases.filter((release) => release.productId === selectedProduct.id) : []} phases={phases} installations={selectedProduct ? projectInstallations.filter((installation) => installation.productId === selectedProduct.id) : []} history={history} assets={projectVms} inProject={!!selectedProduct && usedProductIds.has(selectedProduct.id)} onAddToProject={addToProject} open={!!selectedProduct || !!selectedRelease} onClose={() => { setSelectedProduct(null); setSelectedRelease(null); }}/>
  </div>;
}

function riskRank(value: string) { return ({ EOSL: 0, D30: 1, D90: 2, D180: 3, SUPPORTED: 4, UNMAPPED: 5 } as Record<string,number>)[value] ?? 9; }
function formatRemaining(days: number | null) { return days == null ? "-" : days < 0 ? `D+${Math.abs(days)}` : `D-${days}`; }
function Status({ value }: { value: string }) { const tone = value === "SUPPORTED" || value === "MATCHED" ? "success" : value === "EOSL" ? "danger" : value === "UNMAPPED" || value === "AMBIGUOUS" ? "neutral" : "warning"; return <Badge tone={tone}>{value}</Badge>; }
function Filter({ value, setValue, label, options }: { value:string; setValue:(value:string)=>void; label:string; options:string[] }) { return <select value={value} onChange={(event) => setValue(event.target.value)} className="h-7 rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px]"><option value="ALL">전체 {label}</option>{options.map((option) => <option key={option}>{option}</option>)}</select>; }
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-[10px]"><thead><tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[9px] uppercase text-[var(--muted)]">{headers.map((header) => <th key={header} className="px-3 py-2 font-medium">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>; }
function Td({ children, mono, strong }: { children: React.ReactNode; mono?: boolean; strong?: boolean }) { return <td className={`px-3 py-2 ${mono ? "font-mono" : ""} ${strong ? "font-semibold" : ""}`}>{children}</td>; }
function RiskBox({ title, rows, onOpen }: { title: string; rows: AssetSoftwareInstallation[]; onOpen: (row: AssetSoftwareInstallation) => void }) { return <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"><div className="mb-2 flex justify-between text-[10px] font-semibold"><span>{title}</span><span>{rows.length}</span></div><div className="space-y-1">{rows.length === 0 ? <div className="text-[9px] text-[var(--muted)]">해당 항목이 없습니다.</div> : rows.map((row) => <button key={row.id} className="block w-full rounded border border-[var(--border)] p-2 text-left text-[9px]" onClick={() => onOpen(row)}><b>{row.productName}</b><div className="font-mono text-[var(--muted)]">{row.detectedVersion} · {row.matchStatus ?? row.lifecycleStatus}</div></button>)}</div></div>; }
function ReviewBox({ rows, products, releases, onMapProduct, onMapRelease }: { rows: AssetSoftwareInstallation[]; products: SoftwareProduct[]; releases: SoftwareRelease[]; onMapProduct:(id:string,product:SoftwareProduct)=>void; onMapRelease:(id:string,release:SoftwareRelease)=>void }) { return <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"><div className="mb-2 flex justify-between text-[10px] font-semibold"><span>Catalog Review</span><span>{rows.length}</span></div><div className="space-y-2">{rows.map((row) => <ReviewRow key={row.id} row={row} products={products} releases={releases} onMapProduct={onMapProduct} onMapRelease={onMapRelease}/>)}</div></div>; }
function ReviewRow({ row, products, releases, onMapProduct, onMapRelease }: { row: AssetSoftwareInstallation; products: SoftwareProduct[]; releases: SoftwareRelease[]; onMapProduct:(id:string,product:SoftwareProduct)=>void; onMapRelease:(id:string,release:SoftwareRelease)=>void }) { const [productId,setProductId]=useState(row.candidateProductIds?.[0] ?? row.productId ?? ""); const choices=releases.filter((release)=>release.productId===productId); const [releaseId,setReleaseId]=useState(""); return <div className="rounded border border-[var(--border)] p-2 text-[9px]"><div className="mb-1"><b>{row.detectedProductName ?? row.productName}</b> <span className="font-mono text-[var(--muted)]">{row.detectedVersion} · {row.matchStatus}</span></div><div className="grid gap-1"><select value={productId} onChange={(event)=>{setProductId(event.target.value);setReleaseId("");}} className="h-7 rounded border border-[var(--border)] bg-[var(--surface)]"><option value="">Map to Product…</option>{products.map((product)=><option key={product.id} value={product.id}>{product.name}</option>)}</select><select value={releaseId} onChange={(event)=>setReleaseId(event.target.value)} className="h-7 rounded border border-[var(--border)] bg-[var(--surface)]"><option value="">Map to Release…</option>{choices.map((release)=><option key={release.id} value={release.id}>{release.version}</option>)}</select><div className="flex flex-wrap gap-1"><button disabled={!productId} onClick={()=>{const product=products.find((item)=>item.id===productId);if(product)onMapProduct(row.id,product);}} className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-40">Create Alias + Map Product</button><button disabled={!releaseId} onClick={()=>{const release=releases.find((item)=>item.id===releaseId);if(release)onMapRelease(row.id,release);}} className="rounded border border-[var(--border)] px-2 py-1 text-[#5750f1] disabled:opacity-40">Map Release</button><a href="/management/software" className="rounded border border-[var(--border)] px-2 py-1">Create Release</a></div></div></div>; }
