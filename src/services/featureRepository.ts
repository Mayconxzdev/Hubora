import { huboraDb } from '@/lib/db';
import type { CaptureInboxItem, Goal, IntegrationConfig, ScreenshotDiaryEntry } from '@/types';
import { decryptLocalSecret, encryptLocalSecret } from '@/services/secretStorage';
import { isSupportedIntegrationKind } from '@/services/personalMedia';

async function listIntegrations(): Promise<IntegrationConfig[]> {
  const records = await huboraDb.integrations.orderBy('kind').toArray();
  const supportedRecords = records.filter((record) => isSupportedIntegrationKind(record.kind));
  return Promise.all(supportedRecords.map(async (record) => {
    try {
      return { ...record, token: await decryptLocalSecret(record.encryptedToken) };
    } catch {
      return { ...record, token: undefined };
    }
  }));
}

async function putIntegration(config: IntegrationConfig): Promise<string> {
  const persisted: IntegrationConfig = { ...config };
  if (config.token) persisted.encryptedToken = await encryptLocalSecret(config.token);
  delete persisted.token;
  return huboraDb.integrations.put(persisted);
}

export const featureRepository = {
  goals: {
    list: () => huboraDb.goals.orderBy('endAt').toArray(),
    put: (goal: Goal) => huboraDb.goals.put(goal),
    delete: (id: string) => huboraDb.goals.delete(id),
  },
  screenshots: {
    list: (entryId?: string) => entryId ? huboraDb.screenshots.where('entryId').equals(entryId).reverse().sortBy('createdAt') : huboraDb.screenshots.orderBy('createdAt').reverse().toArray(),
    put: (entry: ScreenshotDiaryEntry) => huboraDb.screenshots.put(entry),
    delete: (id: string) => huboraDb.screenshots.delete(id),
  },
  integrations: {
    list: listIntegrations,
    put: putIntegration,
    delete: (id: string) => huboraDb.integrations.delete(id),
  },
  inbox: {
    list: () => huboraDb.captureInbox.orderBy('createdAt').reverse().toArray(),
    put: (item: CaptureInboxItem) => huboraDb.captureInbox.put(item),
    markProcessed: (id: string) => huboraDb.captureInbox.update(id, { processed: true }),
    delete: (id: string) => huboraDb.captureInbox.delete(id),
  },
};
