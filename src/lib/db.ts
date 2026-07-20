import Dexie, { type Table } from 'dexie';
import type {
  CaptureInboxItem,
  ConsumptionEvent,
  CustomList,
  Goal,
  IntegrationConfig,
  ProviderConfig,
  HuboraNotification,
  ScreenshotDiaryEntry,
  SyncOperation,
  UserProfile,
} from '@/types';

export interface LocalBackupSnapshot {
  id: string;
  userId: string;
  createdAt: number;
  payload: unknown;
}

export interface MetadataRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}

export class HuboraDatabase extends Dexie {
  library!: Table<Record<string, unknown>, string>;
  customLists!: Table<CustomList, string>;
  consumptionEvents!: Table<ConsumptionEvent, string>;
  syncOutbox!: Table<SyncOperation, string>;
  profiles!: Table<UserProfile, string>;
  metadata!: Table<MetadataRecord, string>;
  goals!: Table<Goal, string>;
  screenshots!: Table<ScreenshotDiaryEntry, string>;
  integrations!: Table<IntegrationConfig, string>;
  captureInbox!: Table<CaptureInboxItem, string>;
  backupSnapshots!: Table<LocalBackupSnapshot, string>;
  providerConfigs!: Table<ProviderConfig, string>;
  notifications!: Table<HuboraNotification, string>;

  constructor() {
    super('hubora-db');

    this.version(1).stores({
      library: '&id, mediaId, canonicalId, mediaType, status, isFavorite, lastUpdated, lastInteractedAt',
      customLists: '&id, createdAt, updatedAt',
      consumptionEvents: '&id, entryId, kind, occurredAt',
      syncOutbox: '&operationId, entity, entityId, createdAt, attempts',
      profiles: '&uid',
      metadata: '&key, updatedAt',
    });

    this.version(2).stores({
      library: '&id, mediaId, canonicalId, mediaType, status, isFavorite, lastUpdated, lastInteractedAt',
      customLists: '&id, createdAt, updatedAt',
      consumptionEvents: '&id, entryId, kind, occurredAt',
      syncOutbox: '&operationId, entity, entityId, createdAt, attempts, nextAttemptAt',
      profiles: '&uid',
      metadata: '&key, updatedAt',
    });

    this.version(3).stores({
      library: '&id, mediaId, canonicalId, mediaType, status, isFavorite, lastUpdated, lastInteractedAt, visibility, adultPrivate',
      customLists: '&id, createdAt, updatedAt',
      consumptionEvents: '&id, entryId, kind, occurredAt',
      syncOutbox: '&operationId, entity, entityId, createdAt, attempts, nextAttemptAt',
      profiles: '&uid',
      metadata: '&key, updatedAt',
      goals: '&id, mediaType, metric, startAt, endAt, updatedAt',
      screenshots: '&id, entryId, createdAt, localOnly, isAdult',
      integrations: '&id, kind, enabled, updatedAt',
      captureInbox: '&id, kind, createdAt, processed',
    });

    this.version(4).stores({
      library: '&id, mediaId, canonicalId, mediaType, status, isFavorite, lastUpdated, lastInteractedAt, visibility, adultPrivate',
      customLists: '&id, createdAt, updatedAt',
      consumptionEvents: '&id, entryId, kind, occurredAt',
      syncOutbox: '&operationId, entity, entityId, createdAt, attempts, nextAttemptAt',
      profiles: '&uid',
      metadata: '&key, updatedAt',
      goals: '&id, mediaType, metric, startAt, endAt, updatedAt',
      screenshots: '&id, entryId, createdAt, localOnly, isAdult',
      integrations: '&id, kind, enabled, updatedAt',
      captureInbox: '&id, kind, createdAt, processed',
      backupSnapshots: '&id, userId, createdAt',
    });

    this.version(5).stores({
      library: '&id, mediaId, canonicalId, mediaType, status, isFavorite, lastUpdated, lastInteractedAt, visibility, adultPrivate, isTrackedRelease',
      customLists: '&id, createdAt, updatedAt',
      consumptionEvents: '&id, entryId, kind, occurredAt',
      syncOutbox: '&operationId, entity, entityId, createdAt, attempts, nextAttemptAt',
      profiles: '&uid',
      metadata: '&key, updatedAt',
      goals: '&id, mediaType, metric, startAt, endAt, updatedAt',
      screenshots: '&id, entryId, createdAt, localOnly, isAdult',
      integrations: '&id, kind, enabled, updatedAt',
      captureInbox: '&id, kind, createdAt, processed',
      backupSnapshots: '&id, userId, createdAt',
      providerConfigs: '&id, enabled, updatedAt',
      notifications: '&id, userId, kind, createdAt, readAt',
    });

  }
}

export const huboraDb = new HuboraDatabase();

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return navigator.storage.persist();
  } catch {
    return false;
  }
}
