import type { ConsumptionEvent, UserMediaEntry } from '@/types';
import { classifyAdult } from '@/services/adultPolicy';

export function isAdultEntry(entry: UserMediaEntry): boolean {
  return Boolean(entry.adultPrivate) || classifyAdult(entry.media) !== 'safe';
}

export function entriesForPrivateAnalytics(entries: UserMediaEntry[]): UserMediaEntry[] {
  return entries;
}

export function entriesSafeForSharing(entries: UserMediaEntry[]): UserMediaEntry[] {
  return entries.filter((entry) => !isAdultEntry(entry));
}

export function eventsSafeForSharing(events: ConsumptionEvent[], entries: UserMediaEntry[]): ConsumptionEvent[] {
  const allowedIds = new Set(entriesSafeForSharing(entries).map((entry) => entry.id));
  return events.filter((event) => allowedIds.has(event.entryId));
}
