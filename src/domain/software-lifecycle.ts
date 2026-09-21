import type {
  AssetSoftwareInstallation,
  SoftwareInstall,
  SoftwareProduct,
  SoftwareRelease,
} from "./models";
import { daysUntil } from "./network-status";

/**
 * Compare two dot-separated version strings (e.g. "17.0.8" vs "17.0").
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, and 0 if equal.
 */
function compareVersions(v1: string, v2: string): number {
  const segs1 = v1.split(/[.-]/).map((s) => (isNaN(Number(s)) ? s : Number(s)));
  const segs2 = v2.split(/[.-]/).map((s) => (isNaN(Number(s)) ? s : Number(s)));
  const len = Math.max(segs1.length, segs2.length);

  for (let i = 0; i < len; i++) {
    const s1 = segs1[i] ?? 0;
    const s2 = segs2[i] ?? 0;

    if (typeof s1 === "number" && typeof s2 === "number") {
      if (s1 !== s2) return s1 - s2;
    } else {
      const cmp = String(s1).localeCompare(String(s2));
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

/**
 * Evaluate a version string against a range expression (e.g. ">= 1.0 < 2.0" or ">= 2016" or "1.0 - 2.0").
 */
function matchRange(version: string, rangeExpr: string): boolean {
  const parts = rangeExpr.split(/\s*-\s*/);
  if (parts.length === 2) {
    const [min, max] = parts;
    return compareVersions(version, min) >= 0 && compareVersions(version, max) <= 0;
  }

  // Tokenize clauses like ">= 1.0", "< 2.0", "> 3.0", "<= 4.0", "= 5.0"
  const clauseRegex = /(>=|<=|>|<|=)?\s*([0-9a-zA-Z._-]+)/g;
  let match: RegExpExecArray | null;
  let matchedAny = false;

  while ((match = clauseRegex.exec(rangeExpr)) !== null) {
    matchedAny = true;
    const op = match[1] ?? "=";
    const target = match[2];
    const cmp = compareVersions(version, target);

    if (op === ">=" && cmp < 0) return false;
    if (op === "<=" && cmp > 0) return false;
    if (op === ">" && cmp <= 0) return false;
    if (op === "<" && cmp >= 0) return false;
    if (op === "=" && cmp !== 0) return false;
  }

  return matchedAny;
}

/**
 * Match a detected version against a release rule (exact, prefix, regex, range).
 */
export function matchVersionRule(
  detectedVersion: string,
  rule: "exact" | "prefix" | "regex" | "range",
  pattern?: string,
  releaseVersion?: string
): boolean {
  const targetPattern = pattern?.trim() || releaseVersion?.trim() || "";
  if (!targetPattern) return false;
  const version = detectedVersion.trim();

  switch (rule) {
    case "exact":
      return version.toLowerCase() === targetPattern.toLowerCase();

    case "prefix":
      return version.toLowerCase().startsWith(targetPattern.toLowerCase());

    case "regex": {
      try {
        const regex = new RegExp(targetPattern, "i");
        return regex.test(version);
      } catch {
        return false;
      }
    }

    case "range":
      return matchRange(version, targetPattern);

    default:
      return version.toLowerCase() === targetPattern.toLowerCase();
  }
}

/**
 * Determine lifecycle status based on EOSL date.
 */
export function deriveLifecycleStatus(
  eoslDate: string | null | undefined,
  now = new Date()
): "SUPPORTED" | "D180" | "D90" | "D30" | "EOSL" | "UNMAPPED" {
  if (!eoslDate) return "UNMAPPED";
  const days = daysUntil(eoslDate, now);
  if (days === null) return "UNMAPPED";
  if (days < 0) return "EOSL";
  if (days <= 30) return "D30";
  if (days <= 90) return "D90";
  if (days <= 180) return "D180";
  return "SUPPORTED";
}

/**
 * Find matching SoftwareRelease for a legacy SoftwareInstall item.
 */
export function matchLegacySoftwareRelease(
  sw: SoftwareInstall,
  products: SoftwareProduct[],
  releases: SoftwareRelease[]
): SoftwareRelease | undefined {
  const swName = sw.name.toLowerCase().trim();
  const swVendor = sw.vendor?.toLowerCase().trim();
  const swVersion = sw.version?.trim() ?? "";

  // 1. Find product candidates
  const matchingProducts = products.filter((p) => {
    const pName = p.name.toLowerCase();
    const isNameMatch = swName.includes(pName) || pName.includes(swName);
    if (!isNameMatch) return false;
    if (swVendor && p.vendor) {
      return swVendor.includes(p.vendor.toLowerCase()) || p.vendor.toLowerCase().includes(swVendor);
    }
    return true;
  });

  const candidateProductIds = new Set(
    matchingProducts.length > 0 ? matchingProducts.map((p) => p.id) : products.map((p) => p.id)
  );

  // 2. Find releases belonging to candidate products
  const candidateReleases = releases.filter((r) => candidateProductIds.has(r.productId));

  // Try matching with detected version
  for (const rel of candidateReleases) {
    if (swVersion && matchVersionRule(swVersion, rel.versionMatchRule, rel.matchPattern, rel.version)) {
      return rel;
    }
    // If version is embedded in software name (e.g. "Microsoft SQL Server 2019 Standard")
    if (matchVersionRule(swName, rel.versionMatchRule, rel.matchPattern, rel.version)) {
      return rel;
    }
  }

  return undefined;
}

/**
 * Enrich legacy SoftwareInstall list with catalog release dates.
 */
export function enrichLegacySoftware(
  software: SoftwareInstall[],
  products: SoftwareProduct[],
  releases: SoftwareRelease[]
): SoftwareInstall[] {
  return software.map((sw) => {
    const matched = matchLegacySoftwareRelease(sw, products, releases);
    if (!matched) {
      return {
        ...sw,
        eoslDate: sw.eoslDate ?? null,
      };
    }
    return {
      ...sw,
      eoslDate: matched.eoslDate ?? sw.eoslDate ?? null,
    };
  });
}

/**
 * Enrich modern AssetSoftwareInstallation list with catalog releases.
 * When matching fails, marks as UNMAPPED without guessing EOSL.
 */
export function enrichInstallations(
  installations: AssetSoftwareInstallation[],
  releases: SoftwareRelease[]
): AssetSoftwareInstallation[] {
  const releaseById = new Map(releases.map((r) => [r.id, r]));

  return installations.map((inst) => {
    // 1. Direct release ID match
    if (inst.matchedReleaseId && releaseById.has(inst.matchedReleaseId)) {
      const rel = releaseById.get(inst.matchedReleaseId)!;
      return {
        ...inst,
        matchedReleaseVersion: rel.version,
        eoslDate: rel.eoslDate,
        lifecycleStatus: rel.status,
      };
    }

    // 2. Match by productId + versionMatchRule
    const candidateReleases = releases.filter(
      (r) => r.productId === inst.productId || r.productName.toLowerCase() === inst.productName.toLowerCase()
    );

    for (const rel of candidateReleases) {
      if (
        matchVersionRule(inst.detectedVersion, rel.versionMatchRule, rel.matchPattern, rel.version)
      ) {
        return {
          ...inst,
          matchedReleaseId: rel.id,
          matchedReleaseVersion: rel.version,
          eoslDate: rel.eoslDate,
          lifecycleStatus: rel.status,
        };
      }
    }

    // 3. Match failed -> UNMAPPED without guessing EOSL
    return {
      ...inst,
      matchedReleaseId: null,
      matchedReleaseVersion: null,
      eoslDate: null,
      lifecycleStatus: "UNMAPPED",
    };
  });
}
