import { cn } from "@/utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";
const toneClass: Record<Tone, string> = {
  neutral: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
  success: "border-[#abefc6] bg-[var(--success-soft)] text-[#067647] dark:border-[#1f5c45] dark:text-[#75e0aa]",
  warning: "border-[#fedf89] bg-[var(--warning-soft)] text-[#b54708] dark:border-[#654c14] dark:text-[#fdbf5a]",
  danger: "border-[#fecdca] bg-[var(--danger-soft)] text-[#b42318] dark:border-[#66302e] dark:text-[#ff8a82]",
  info: "border-[#b2ddff] bg-[var(--info-soft)] text-[#175cd3] dark:border-[#234f74] dark:text-[#78b8ff]",
  primary: "border-[#d9d6fe] bg-[var(--primary-soft)] text-[#4938d6] dark:border-[#4b4492] dark:text-[#aaa4ff]",
};

export function Badge({ children, tone = "neutral", dot = false, className }: { children: React.ReactNode; tone?: Tone; dot?: boolean; className?: string }) {
  const dotClass = tone === "success" ? "bg-[#12b76a]" : tone === "warning" ? "bg-[#f79009]" : tone === "danger" ? "bg-[#f04438]" : tone === "info" ? "bg-[#2e90fa]" : tone === "primary" ? "bg-[#5750f1]" : "bg-[#98a2b3]";
  return <span className={cn("inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[9px] font-semibold uppercase tracking-[0.02em]", toneClass[tone], className)}>{dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)}/>} {children}</span>;
}
