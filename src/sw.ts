/// <reference lib="webworker" />
export {};

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string }> };

const CACHE_NAME = 'hubora-precache-v9-0-2';
const SHARE_DB = 'hubora-share-inbox';
const SHARE_STORE = 'items';
const MAX_SHARE_FILE_BYTES = 15 * 1024 * 1024;

function openShareDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SHARE_STORE)) db.createObjectStore(SHARE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir a caixa de compartilhamento.'));
  });
}

async function saveSharedItem(item: Record<string, unknown>): Promise<void> {
  const db = await openShareDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(SHARE_STORE, 'readwrite');
      transaction.objectStore(SHARE_STORE).put(item);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

async function handleShare(request: Request): Promise<Response> {
  const form = await request.formData();
  const title = String(form.get('title') || '').slice(0, 500);
  const text = String(form.get('text') || '').slice(0, 10_000);
  const url = String(form.get('url') || '').slice(0, 4_000);
  const files = form.getAll('media').filter((value): value is File => value instanceof File);
  const image = files.find((file) => file.type.startsWith('image/') && file.size <= MAX_SHARE_FILE_BYTES);
  const now = Date.now();

  await saveSharedItem({
    id: crypto.randomUUID(),
    createdAt: now,
    kind: image ? 'image' : url ? 'link' : 'text',
    title: title || undefined,
    text: text || undefined,
    url: url || undefined,
    imageBlob: image || undefined,
    processed: false,
  });

  return Response.redirect('/radar?shared=1', 303);
}

self.addEventListener('install', (event) => {
  const urls = self.__WB_MANIFEST.map((entry) => entry.url);
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urls)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('hubora-precache-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(handleShare(event.request));
    return;
  }
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok && url.origin === self.location.origin) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match('/index.html') as Promise<Response>)),
  );
});
