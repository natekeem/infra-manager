export type HandleDirection = "t" | "b" | "l" | "r";

const VALID_DIRECTIONS = new Set<HandleDirection>(["t", "b", "l", "r"]);

export function normalizeHandleSide(value: unknown, fallback?: HandleDirection): HandleDirection | undefined {
  if (typeof value !== "string") return fallback;
  const side = value.replace(/-(?:src|tgt)$/, "") as HandleDirection;
  return VALID_DIRECTIONS.has(side) ? side : fallback;
}

export function normalizeHandleMap(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([id, handles]) => {
      const record = handles && typeof handles === "object" ? handles as Record<string, unknown> : {};
      return [id, {
        source: normalizeHandleSide(record.source),
        target: normalizeHandleSide(record.target),
      }];
    })
  ) as Record<string, { source?: HandleDirection; target?: HandleDirection }>;
}
