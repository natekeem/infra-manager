export function ArchitectureLegend() {
  return <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded border border-[var(--border)] bg-[var(--surface)]/95 px-2.5 py-1.5 text-[9px] text-[var(--muted)] shadow-sm"><span><b className="text-[#5750f1]">→</b> 필요한 자원</span><span><b className="text-[#0e9384]">←</b> 영향 대상</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" /> Normal</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-500" /> Warning</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-500" /> Critical</span></div>;
}

