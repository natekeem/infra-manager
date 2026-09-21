export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return <div className="mb-3 flex min-h-10 items-start justify-between gap-4">
    <div><h1 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h1>{description && <p className="mt-0.5 text-[11px] text-[var(--muted)]">{description}</p>}</div>
    {actions && <div className="flex items-center gap-1.5">{actions}</div>}
  </div>;
}
