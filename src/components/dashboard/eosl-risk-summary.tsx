"use client";

import { useMemo } from "react";
import type { AssetSoftwareInstallation, SoftwareLifecyclePhase, SoftwareRelease } from "@/domain/models";
import { deriveLifecycleStatus } from "@/domain/software-lifecycle";
import { EoslTimelineChart } from "@/components/software/eosl-timeline-chart";

export function EoslRiskSummary({ installations, releases, phases }: {
  installations: AssetSoftwareInstallation[];
  releases: SoftwareRelease[];
  phases: SoftwareLifecyclePhase[];
}) {
  const counts = useMemo(() => Object.fromEntries(releases.map((release) => [release.id, installations.filter((installation) => installation.matchedReleaseId === release.id).length])), [releases, installations]);
  const ranked = useMemo(() => releases.filter((release) => counts[release.id] > 0).sort((a, b) => rank(deriveLifecycleStatus(a.eoslDate)) - rank(deriveLifecycleStatus(b.eoslDate))).slice(0, 8), [releases, counts]);
  return <div className="p-3"><EoslTimelineChart releases={ranked} phases={phases} installedCounts={counts} maxRows={8} compact displayMode="all" /></div>;
}

function rank(status: string) {
  return ({ EOSL: 0, D30: 1, D90: 2, D180: 3, SUPPORTED: 4, UNMAPPED: 5 } as Record<string, number>)[status] ?? 9;
}
