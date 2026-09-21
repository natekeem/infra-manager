import { cn } from "@/utils/cn";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-[var(--border)] bg-[var(--surface)]", className)}>{children}</section>;
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex min-h-11 items-center justify-between border-b border-[var(--border)] px-3.5 py-2.5">
    <div><h2 className="text-[12px] font-semibold">{title}</h2>{description && <p className="mt-0.5 text-[10px] text-[var(--muted)]">{description}</p>}</div>
    {action}
  </div>;
}
