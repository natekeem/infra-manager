import { daysUntil } from "./network-status";

export type EoslState = "EOSL" | "D30" | "D90" | "D180" | "SUPPORTED" | "UNKNOWN" | "UNMAPPED";

export function getEoslState(date?: string | null, now = new Date()): { state: EoslState; days: number | null } {
  if (!date) return { state: "UNMAPPED", days: null };
  const days = daysUntil(date, now);
  if (days === null) return { state: "UNKNOWN", days };
  if (days < 0) return { state: "EOSL", days };
  if (days <= 30) return { state: "D30", days };
  if (days <= 90) return { state: "D90", days };
  if (days <= 180) return { state: "D180", days };
  return { state: "SUPPORTED", days };
}

export function matchVersionRule(
  detectedVersion: string,
  rule: "exact" | "prefix" | "regex" | "range",
  pattern?: string
): boolean {
  if (!pattern) return false;
  const v = detectedVersion.trim().toLowerCase();
  const p = pattern.trim().toLowerCase();

  switch (rule) {
    case "exact":
      return v === p;
    case "prefix":
      return v.startsWith(p);
    case "regex":
      try {
        return new RegExp(pattern, "i").test(detectedVersion);
      } catch {
        return false;
      }
    case "range":
      // Simple range match, e.g. ">=17 <18" or prefix fallback
      return v.includes(p);
    default:
      return false;
  }
}
