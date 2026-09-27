"use client";

import { useMemo, useState } from "react";
import type { SoftwareLifecyclePhase, SoftwareRelease } from "@/domain/models";
import { deriveLifecycleStatus, getCenteredReleaseWindow, getReleaseTimeline } from "@/domain/software-lifecycle";
import { getAppNow } from "@/domain/app-time";

const phaseStyle: Record<SoftwareLifecyclePhase["phaseType"], string> = {
  ACTIVE_SUPPORT: "bg-emerald-500/75",
  SECURITY_SUPPORT: "bg-sky-500/70",
  EXTENDED_SUPPORT: "bg-amber-500/75",
  MAINTENANCE: "bg-violet-500/65",
  OTHER: "bg-slate-400/55",
};

export function EoslTimelineChart({ releases, phases = [], selectedReleaseId, installedCounts = {}, maxRows = 7,
  onSelectRelease, compact = false, displayMode = "selected-window" }: {
  releases: SoftwareRelease[];
  phases?: SoftwareLifecyclePhase[];
  selectedReleaseId?: string | null;
  installedCounts?: Record<string, number>;
  maxRows?: number;
  onSelectRelease?: (release: SoftwareRelease) => void;
  compact?: boolean;
  displayMode?: "all" | "selected-window";
}) {
  const [showAll, setShowAll] = useState(false);
  const ordered = useMemo(() => [...releases].sort((a, b) => (a.releaseDate ?? a.eoslDate ?? a.version).localeCompare(b.releaseDate ?? b.eoslDate ?? b.version)), [releases]);
  const visible = displayMode === "all" || showAll
    ? ordered
    : getCenteredReleaseWindow(ordered, selectedReleaseId, maxRows);
  const now = getAppNow();
  const dates = ordered.flatMap((release) => [release.releaseDate, release.eoslDate, ...getReleaseTimeline(release, phases).flatMap((phase) => [phase.startDate, phase.endDate])]).filter(Boolean) as string[];
  const timestamps = dates.map((date) => new Date(date).getTime()).filter(Number.isFinite);
  const min = timestamps.length ? Math.min(...timestamps) : now.getTime() - 86400000;
  const max = timestamps.length ? Math.max(...timestamps) : now.getTime() + 86400000;
  const span = Math.max(max - min, 86400000);
  const pct = (date: string) => Math.max(0, Math.min(100, ((new Date(date).getTime() - min) / span) * 100));
  const todayPct = pct(now.toISOString());

  if (!releases.length) return <div className="rounded border border-dashed border-[var(--border)] p-4 text-center text-[10px] text-[var(--muted)]">표시할 릴리스가 없습니다.</div>;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2 text-[9px] text-[var(--muted)]">
        <div className="flex flex-wrap gap-3">
          <Legend color="bg-emerald-500/75" label="Active Support" /><Legend color="bg-sky-500/70" label="Security Support" />
          <Legend color="bg-amber-500/75" label="Extended Support" /><Legend color="bg-slate-400/55" label="Known range" />
        </div>
        <span className="font-mono">TODAY {now.toISOString().slice(0, 10)}</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {visible.map((release) => {
          const timeline = getReleaseTimeline(release, phases);
          const status = deriveLifecycleStatus(release.eoslDate, now);
          return (
            <button key={release.id} type="button" onClick={() => onSelectRelease?.(release)}
              className={`grid w-full grid-cols-[105px_1fr_70px] items-center gap-2 px-2 text-left hover:bg-[var(--surface-2)] ${compact ? "h-8" : "h-10"} ${selectedReleaseId === release.id ? "bg-[#5750f1]/8 ring-1 ring-inset ring-[#5750f1]/40" : ""}`}>
              <div className="min-w-0"><div className="truncate font-mono text-[10px] font-semibold">{release.productName} {release.version}</div>
                <div className={`text-[8px] ${status === "EOSL" ? "text-red-500" : "text-emerald-600"}`}>{status}</div></div>
              <div className="relative h-4 rounded-sm bg-[var(--surface-2)]">
                {timeline.map((phase) => <span key={phase.id} className={`absolute top-1 h-2 rounded-sm ${phaseStyle[phase.phaseType]}`}
                  style={{ left: `${pct(phase.startDate)}%`, width: `${Math.max(1, pct(phase.endDate) - pct(phase.startDate))}%` }}
                  title={`${release.productName} ${release.version}\n${phase.label}\n${phase.startDate} ~ ${phase.endDate}\nEOSL ${release.eoslDate ?? "UNKNOWN"}`} />)}
                {release.eoslDate && <span className="absolute top-0 h-4 w-px bg-red-500" style={{ left: `${pct(release.eoslDate)}%` }} title={`EOSL ${release.eoslDate}`} />}
                <span className="absolute -top-1 h-6 border-l border-dashed border-[#5750f1]" style={{ left: `${todayPct}%` }} aria-label="Today" />
              </div>
              <div className="text-right font-mono text-[9px] text-[var(--muted)]">{installedCounts[release.id] ?? 0} assets</div>
            </button>
          );
        })}
      </div>
      {displayMode === "selected-window" && ordered.length > maxRows && <button type="button" onClick={() => setShowAll((value) => !value)} className="w-full border-t border-[var(--border)] py-2 text-[9px] font-medium text-[#5750f1] hover:bg-[var(--surface-2)]">{showAll ? "선택 버전 중심으로 보기" : `모든 버전 보기 (${ordered.length})`}</button>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1"><i className={`h-2 w-3 rounded-sm ${color}`} />{label}</span>;
}
