export const API_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_API_RATE_LIMIT_PER_MINUTE = 600;

const MIN_API_RATE_LIMIT_PER_MINUTE = 120;
const MAX_API_RATE_LIMIT_PER_MINUTE = 5_000;

export function resolveApiRateLimit(rawValue: string | undefined): number {
  if (!rawValue) return DEFAULT_API_RATE_LIMIT_PER_MINUTE;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed)) return DEFAULT_API_RATE_LIMIT_PER_MINUTE;

  return Math.min(MAX_API_RATE_LIMIT_PER_MINUTE, Math.max(MIN_API_RATE_LIMIT_PER_MINUTE, parsed));
}
