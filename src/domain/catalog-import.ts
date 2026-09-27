import type { SoftwareProduct, SoftwareRelease } from "./models";

export interface CatalogImportRow {
  productName: string;
  version: string;
  vendor?: string;
  category?: string;
  releaseDate?: string | null;
  supportEndDate?: string | null;
  securitySupportEndDate?: string | null;
  extendedSupportEndDate?: string | null;
  eoslDate?: string | null;
}

export interface CatalogImportDiff {
  rows: CatalogImportRow[];
  newRows: CatalogImportRow[];
  changedRows: Array<{ row: CatalogImportRow; release: SoftwareRelease; changes: string[] }>;
  unchangedRows: CatalogImportRow[];
  missingReleases: SoftwareRelease[];
  errors: string[];
}

export function parseCatalogFile(text: string, fileName: string): CatalogImportRow[] {
  if (fileName.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.rows ?? parsed.releases;
    if (!Array.isArray(rows)) throw new Error("JSON은 배열 또는 rows/releases 배열을 포함해야 합니다.");
    return rows.map(normalizeRow);
  }
  if (!fileName.toLowerCase().endsWith(".csv")) throw new Error("현재 CSV와 JSON Import를 지원합니다.");
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift() ?? "").map((header) => header.trim());
  return lines.map((line) => normalizeRow(Object.fromEntries(headers.map((header, index) => [header, parseCsvLine(line)[index] ?? ""]))));
}

export function diffCatalog(rows: CatalogImportRow[], products: SoftwareProduct[], releases: SoftwareRelease[]): CatalogImportDiff {
  const errors: string[] = [];
  const valid = rows.filter((row, index) => {
    if (!row.productName || !row.version) { errors.push(`${index + 2}행: productName과 version은 필수입니다.`); return false; }
    for (const [field, value] of Object.entries(row)) if (field.toLowerCase().includes("date") && value && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) errors.push(`${index + 2}행: ${field} 날짜 형식이 잘못되었습니다.`);
    return true;
  });
  const byKey = new Map(releases.map((release) => [`${release.productName.toLowerCase()}|${release.version.toLowerCase()}`, release]));
  const incomingKeys = new Set(valid.map((row) => `${row.productName.toLowerCase()}|${row.version.toLowerCase()}`));
  const newRows: CatalogImportRow[] = [], unchangedRows: CatalogImportRow[] = [];
  const changedRows: CatalogImportDiff["changedRows"] = [];
  for (const row of valid) {
    const release = byKey.get(`${row.productName.toLowerCase()}|${row.version.toLowerCase()}`);
    if (!release) { newRows.push(row); continue; }
    const changes = (["releaseDate","supportEndDate","securitySupportEndDate","extendedSupportEndDate","eoslDate"] as const).filter((field) => (release[field] ?? null) !== (row[field] ?? null));
    if (changes.length) changedRows.push({ row, release, changes }); else unchangedRows.push(row);
  }
  return { rows: valid, newRows, changedRows, unchangedRows, missingReleases: releases.filter((release) => !incomingKeys.has(`${release.productName.toLowerCase()}|${release.version.toLowerCase()}`)), errors };
}

export function applyCatalogDiff(diff: CatalogImportDiff, products: SoftwareProduct[], releases: SoftwareRelease[], importedAt: string) {
  const nextProducts = [...products];
  const productByName = new Map(nextProducts.map((product) => [product.name.toLowerCase(), product]));
  for (const row of diff.rows) if (!productByName.has(row.productName.toLowerCase())) {
    const product: SoftwareProduct = { id: `imported-product-${slug(row.productName)}`, name: row.productName, vendor: row.vendor ?? "Unknown", category: row.category ?? "General", catalogStatus: "ACTIVE", lastCatalogSeenAt: importedAt };
    nextProducts.push(product); productByName.set(product.name.toLowerCase(), product);
  }
  const nextReleases = releases.map((release) => diff.missingReleases.some((missing) => missing.id === release.id) ? { ...release, catalogStatus: "STALE" as const } : release);
  for (const row of diff.rows) {
    const product = productByName.get(row.productName.toLowerCase())!;
    const index = nextReleases.findIndex((release) => release.productName.toLowerCase() === row.productName.toLowerCase() && release.version.toLowerCase() === row.version.toLowerCase());
    const value: SoftwareRelease = { ...(index >= 0 ? nextReleases[index] : { id: `imported-release-${slug(row.productName)}-${slug(row.version)}`, productId: product.id, productName: product.name, version: row.version, vendor: row.vendor ?? product.vendor, status: "SUPPORTED", versionMatchRule: "exact" }),
      releaseDate: row.releaseDate ?? undefined, supportEndDate: row.supportEndDate ?? undefined, securitySupportEndDate: row.securitySupportEndDate, extendedSupportEndDate: row.extendedSupportEndDate, eoslDate: row.eoslDate ?? null, catalogStatus: "ACTIVE", lastCatalogSeenAt: importedAt };
    if (index >= 0) nextReleases[index] = value; else nextReleases.push(value);
  }
  return { products: nextProducts, releases: nextReleases };
}

function normalizeRow(value: Record<string, unknown>): CatalogImportRow {
  const read = (...keys: string[]) => { const key = Object.keys(value).find((candidate) => keys.includes(candidate.toLowerCase())); const item = key ? value[key] : undefined; return item == null || item === "" ? undefined : String(item).trim(); };
  return { productName: read("productname","product","name") ?? "", version: read("version","release") ?? "", vendor: read("vendor"), category: read("category"), releaseDate: read("releasedate","release_date"), supportEndDate: read("supportenddate","support_end_date"), securitySupportEndDate: read("securitysupportenddate","security_support_end_date"), extendedSupportEndDate: read("extendedsupportenddate","extended_support_end_date"), eoslDate: read("eosldate","eosl_date") };
}
function parseCsvLine(line: string) { const values: string[] = []; let value = "", quoted = false; for (let i = 0; i < line.length; i++) { const char = line[i]; if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; } else if (char === '"') quoted = !quoted; else if (char === "," && !quoted) { values.push(value); value = ""; } else value += char; } values.push(value); return values; }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
