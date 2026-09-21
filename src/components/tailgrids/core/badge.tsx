import { cn } from "@/utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";
const toneClass: Record<Tone, string> = {
  neutral: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] dark:border-transparent dark:bg-white/[0.06] dark:text-[#94a3b8]",
  success: "border-[#abefc6] bg-[var(--success-soft)] text-[#067647] dark:border-transparent dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "border-[#fedf89] bg-[var(--warning-soft)] text-[#b54708] dark:border-transparent dark:bg-amber-500/15 dark:text-amber-300",
  danger: "border-[#fecdca] bg-[var(--danger-soft)] text-[#b42318] dark:border-transparent dark:bg-rose-500/15 dark:text-rose-300",
  info: "border-[#b2ddff] bg-[var(--info-soft)] text-[#175cd3] dark:border-transparent dark:bg-sky-500/15 dark:text-sky-300",
  primary: "border-[#d9d6fe] bg-[var(--primary-soft)] text-[#4938d6] dark:border-transparent dark:bg-indigo-500/15 dark:text-indigo-300",
};

export function Badge({ children, tone = "neutral", dot = false, className }: { children: React.ReactNode; tone?: Tone; dot?: boolean; className?: string }) {
  const dotClass = tone === "success" ? "bg-[#12b76a]" : tone === "warning" ? "bg-[#f79009]" : tone === "danger" ? "bg-[#f04438]" : tone === "info" ? "bg-[#2e90fa]" : tone === "primary" ? "bg-[#5750f1]" : "bg-[#98a2b3]";
  return <span className={cn("inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[9px] font-medium uppercase tracking-[0.02em]", toneClass[tone], className)}>{dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)}/>} {children}</span>;
}
