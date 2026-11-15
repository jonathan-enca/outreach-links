export const BATCH_LIMITS = {
  defaultSize: 10,
  minSize: 1,
  maxSize: 50,
} as const;

export function clampBatchSize(n: unknown): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return BATCH_LIMITS.defaultSize;
  return Math.min(BATCH_LIMITS.maxSize, Math.max(BATCH_LIMITS.minSize, v));
}
