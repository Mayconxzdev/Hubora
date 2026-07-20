import { huboraDb } from '@/lib/db';
import type { ConsumptionEvent, CustomList, SyncEntity, SyncOperation, UserMediaEntry, UserProfile } from '@/types';

const consumptionEventListeners = new Set<() => void>();

function notifyConsumptionEventsChanged() {
  for (const listener of consumptionEventListeners) listener();
}

function operationId(entity: SyncEntity, entityId: string): string {
  // One pending operation per entity: the latest local action wins.
  return `${entity}:${entityId}`;
}

export const localRepository = {
  getLibrary: () => huboraDb.library.toArray() as unknown as Promise<UserMediaEntry[]>,
  getCustomLists: () => huboraDb.customLists.toArray(),
  getProfile: (uid: string) => huboraDb.profiles.get(uid),

  putLibraryEntry: async (entry: UserMediaEntry, enqueue = true) => {
    await huboraDb.transaction('rw', huboraDb.library, huboraDb.syncOutbox, async () => {
      await huboraDb.library.put(entry as unknown as Record<string, unknown>);
      if (enqueue) {
        await huboraDb.syncOutbox.put({
          operationId: operationId('library', entry.id),
          entity: 'library',
          entityId: entry.id,
          action: 'upsert',
          payload: entry,
          createdAt: Date.now(),
          attempts: 0,
          nextAttemptAt: Date.now(),
        });
      }
    });
  },

  deleteLibraryEntry: async (id: string, enqueue = true) => {
    await huboraDb.transaction('rw', huboraDb.library, huboraDb.syncOutbox, async () => {
      await huboraDb.library.delete(id);
      if (enqueue) {
        await huboraDb.syncOutbox.put({
          operationId: operationId('library', id),
          entity: 'library',
          entityId: id,
          action: 'delete',
          createdAt: Date.now(),
          attempts: 0,
          nextAttemptAt: Date.now(),
        });
      }
    });
  },

  putCustomList: async (list: CustomList, enqueue = true) => {
    await huboraDb.transaction('rw', huboraDb.customLists, huboraDb.syncOutbox, async () => {
      await huboraDb.customLists.put(list);
      if (enqueue) {
        await huboraDb.syncOutbox.put({
          operationId: operationId('custom_list', list.id),
          entity: 'custom_list',
          entityId: list.id,
          action: 'upsert',
          payload: list,
          createdAt: Date.now(),
          attempts: 0,
          nextAttemptAt: Date.now(),
        });
      }
    });
  },

  deleteCustomList: async (id: string, enqueue = true) => {
    await huboraDb.transaction('rw', huboraDb.customLists, huboraDb.syncOutbox, async () => {
      await huboraDb.customLists.delete(id);
      if (enqueue) {
        await huboraDb.syncOutbox.put({
          operationId: operationId('custom_list', id),
          entity: 'custom_list',
          entityId: id,
          action: 'delete',
          createdAt: Date.now(),
          attempts: 0,
          nextAttemptAt: Date.now(),
        });
      }
    });
  },

  putProfile: async (profile: UserProfile, enqueue = true) => {
    await huboraDb.transaction('rw', huboraDb.profiles, huboraDb.syncOutbox, async () => {
      await huboraDb.profiles.put(profile);
      if (enqueue) {
        await huboraDb.syncOutbox.put({
          operationId: operationId('profile', profile.uid),
          entity: 'profile',
          entityId: profile.uid,
          action: 'upsert',
          payload: profile,
          createdAt: Date.now(),
          attempts: 0,
          nextAttemptAt: Date.now(),
        });
      }
    });
  },

  addConsumptionEvent: async (event: ConsumptionEvent, enqueue = true) => {
    await huboraDb.transaction('rw', huboraDb.consumptionEvents, huboraDb.syncOutbox, async () => {
      await huboraDb.consumptionEvents.put(event);
      if (enqueue) {
        await huboraDb.syncOutbox.put({
          operationId: operationId('consumption_event', event.id),
          entity: 'consumption_event',
          entityId: event.id,
          action: 'upsert',
          payload: event,
          createdAt: Date.now(),
          attempts: 0,
          nextAttemptAt: Date.now(),
        });
      }
    });
    notifyConsumptionEventsChanged();
  },

  getConsumptionEvents: (limit = 250) => huboraDb.consumptionEvents.orderBy('occurredAt').reverse().limit(limit).toArray(),


  replaceConsumptionEvents: async (events: ConsumptionEvent[], enqueue = true) => {
    await huboraDb.transaction('rw', huboraDb.consumptionEvents, huboraDb.syncOutbox, async () => {
      await huboraDb.consumptionEvents.clear();
      if (events.length) await huboraDb.consumptionEvents.bulkPut(events);
      if (enqueue && events.length) {
        await huboraDb.syncOutbox.bulkPut(events.map((event) => ({
          operationId: operationId('consumption_event', event.id),
          entity: 'consumption_event' as const,
          entityId: event.id,
          action: 'upsert' as const,
          payload: event,
          createdAt: Date.now(),
          attempts: 0,
          nextAttemptAt: Date.now(),
        })));
      }
    });
    notifyConsumptionEventsChanged();
  },

  getOutbox: async (limit = 100) => {
    const now = Date.now();
    return huboraDb.syncOutbox
      .filter((operation) => (operation.nextAttemptAt || 0) <= now)
      .sortBy('createdAt')
      .then((operations) => operations.slice(0, limit));
  },
  countOutbox: () => huboraDb.syncOutbox.count(),
  acknowledgeOperation: (id: string) => huboraDb.syncOutbox.delete(id),
  markOperationFailed: async (operation: SyncOperation, message: string) => {
    const attempts = operation.attempts + 1;
    const delay = Math.min(60 * 60_000, 5_000 * (2 ** Math.min(attempts - 1, 8)));
    await huboraDb.syncOutbox.put({
      ...operation,
      attempts,
      nextAttemptAt: Date.now() + delay,
      lastError: message.slice(0, 500),
    });
  },

  applyRemoteLibrary: async (entries: UserMediaEntry[], deletedIds: string[] = []) => {
    await huboraDb.transaction('rw', huboraDb.library, async () => {
      if (entries.length) await huboraDb.library.bulkPut(entries as unknown as Record<string, unknown>[]);
      if (deletedIds.length) await huboraDb.library.bulkDelete(deletedIds);
    });
  },

  applyRemoteLists: async (lists: CustomList[], deletedIds: string[] = []) => {
    await huboraDb.transaction('rw', huboraDb.customLists, async () => {
      if (lists.length) await huboraDb.customLists.bulkPut(lists);
      if (deletedIds.length) await huboraDb.customLists.bulkDelete(deletedIds);
    });
  },

  importRemoteConsumptionEvents: async (events: ConsumptionEvent[]) => {
    if (!events.length) return;
    await huboraDb.consumptionEvents.bulkPut(events);
    notifyConsumptionEventsChanged();
  },

  subscribeConsumptionEvents: (listener: () => void) => {
    consumptionEventListeners.add(listener);
    return () => consumptionEventListeners.delete(listener);
  },
};
