import { daysUntil } from "./network-status";

export type EoslState = "EOSL" | "D90" | "D180" | "SUPPORTED" | "UNKNOWN";
export function getEoslState(date?: string | null, now = new Date()): { state: EoslState; days: number | null } {
  const days = daysUntil(date, now);
  if (days === null) return { state: "UNKNOWN", days };
  if (days < 0) return { state: "EOSL", days };
  if (days <= 90) return { state: "D90", days };
  if (days <= 180) return { state: "D180", days };
  return { state: "SUPPORTED", days };
}
