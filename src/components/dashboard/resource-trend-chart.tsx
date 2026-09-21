"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ResourcePoint } from "@/domain/models";

export function ResourceTrendChart({ data }: { data: ResourcePoint[] }) {
  return <div className="h-[210px] w-full px-2 pb-2 pt-3">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: -20 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="2 3" />
        <XAxis dataKey="time" tick={{ fontSize: 9, fill: "var(--muted)" }} axisLine={false} tickLine={false} interval={3} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={{ fontSize: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }} />
        <Line type="monotone" dataKey="cpu" name="CPU" stroke="#5750f1" strokeWidth={1.6} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="memory" name="Memory" stroke="#2e90fa" strokeWidth={1.4} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="disk" name="Disk" stroke="#12b76a" strokeWidth={1.4} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
