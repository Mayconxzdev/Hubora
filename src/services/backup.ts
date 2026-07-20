import { z } from 'zod';
import type { ConsumptionEvent, CustomList, Goal, UserMediaEntry, UserProfile } from '@/types';

const mediaTypeSchema = z.enum(['movie', 'tv', 'anime', 'manga', 'comic', 'book', 'novel', 'game']);
const statusSchema = z.enum(['planning', 'consuming', 'completed', 'dropped', 'paused']);

const mediaSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().min(1),
  mediaType: mediaTypeSchema,
}).passthrough();

const libraryEntrySchema = z.object({
  id: z.string().min(1),
  mediaId: z.union([z.string(), z.number()]),
  sourceId: z.union([z.string(), z.number()]),
  source: z.string().min(1),
  mediaType: mediaTypeSchema,
  title: z.string().min(1),
  media: mediaSchema,
  status: statusSchema,
  progress: z.record(z.string(), z.unknown()),
  priority: z.enum(['low', 'medium', 'high', 'must']),
  tags: z.array(z.string()),
  isFavorite: z.boolean(),
  isTrackedRelease: z.boolean(),
  dateAdded: z.number(),
  lastUpdated: z.number(),
  lastInteractedAt: z.number(),
}).passthrough();

const customListSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  items: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  description: z.string().optional(),
}).passthrough();

const consumptionEventSchema = z.object({
  id: z.string().min(1),
  entryId: z.string().min(1),
  kind: z.enum(['progress', 'completed', 'rating', 'status', 'session']),
  occurredAt: z.number(),
  value: z.union([z.number(), z.string(), z.boolean()]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).passthrough();


const goalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  metric: z.enum(['items', 'minutes', 'pages', 'episodes', 'chapters', 'hours']),
  target: z.number().positive(),
  current: z.number().nonnegative(),
  startAt: z.number(),
  endAt: z.number(),
  restDaysAllowed: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  mediaType: mediaTypeSchema.optional(),
}).passthrough();

const profileSchema = z.object({
  uid: z.string().min(1),
  name: z.string().min(1),
  preferences: z.object({
    theme: z.enum(['dark', 'light', 'system']),
    adultContent: z.boolean(),
    language: z.string().min(1),
  }).passthrough(),
  stats: z.object({
    totalWatched: z.number(),
    totalRead: z.number(),
    timeSpent: z.number(),
  }).passthrough(),
}).passthrough();

const backupSchema = z.object({
  format: z.literal('hubora-backup'),
  version: z.number().int().min(2),
  exportedAt: z.string(),
  user: profileSchema.nullable(),
  library: z.array(libraryEntrySchema),
  customLists: z.array(customListSchema),
  consumptionEvents: z.array(consumptionEventSchema),
  goals: z.array(goalSchema).default([]),
});

export interface HuboraBackup {
  format: 'hubora-backup';
  version: 3;
  exportedAt: string;
  user: UserProfile | null;
  library: UserMediaEntry[];
  customLists: CustomList[];
  consumptionEvents: ConsumptionEvent[];
  goals: Goal[];
}

export function createHuboraBackup(input: Omit<HuboraBackup, 'format' | 'version' | 'exportedAt' | 'goals'> & { goals?: Goal[] }): HuboraBackup {
  return {
    format: 'hubora-backup',
    version: 3,
    exportedAt: new Date().toISOString(),
    ...input,
    goals: input.goals || [],
  };
}

export function parseHuboraBackup(input: unknown): HuboraBackup {
  // Compatibility with the original backup shape, which stored library as a map.
  if (input && typeof input === 'object' && !('format' in input)) {
    const legacy = input as Record<string, unknown>;
    input = {
      format: 'hubora-backup',
      version: 3,
      exportedAt: typeof legacy.exportedAt === 'string' ? legacy.exportedAt : new Date().toISOString(),
      user: legacy.user ?? null,
      library: legacy.library && typeof legacy.library === 'object' ? Object.values(legacy.library) : [],
      customLists: legacy.customLists && typeof legacy.customLists === 'object' ? Object.values(legacy.customLists) : [],
      consumptionEvents: Array.isArray(legacy.consumptionEvents) ? legacy.consumptionEvents : [],
      goals: Array.isArray(legacy.goals) ? legacy.goals : [],
    };
  }

  const parsed = backupSchema.parse(input);
  return parsed as unknown as HuboraBackup;
}
