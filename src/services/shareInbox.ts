import type { CaptureInboxItem } from '@/types';

const SHARE_DB = 'hubora-share-inbox';
const SHARE_STORE = 'items';

function openShareDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SHARE_STORE)) request.result.createObjectStore(SHARE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function drainSharedItems(): Promise<CaptureInboxItem[]> {
  const db = await openShareDb();
  try {
    const items = await new Promise<CaptureInboxItem[]>((resolve, reject) => {
      const transaction = db.transaction(SHARE_STORE, 'readonly');
      const request = transaction.objectStore(SHARE_STORE).getAll();
      request.onsuccess = () => resolve((request.result || []) as CaptureInboxItem[]);
      request.onerror = () => reject(request.error);
    });
    if (items.length) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(SHARE_STORE, 'readwrite');
        transaction.objectStore(SHARE_STORE).clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
    return items.sort((a, b) => b.createdAt - a.createdAt);
  } finally {
    db.close();
  }
}
