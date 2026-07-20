const KEY_DB = 'hubora-secure-keys';
const KEY_STORE = 'keys';
const DEVICE_KEY_ID = 'integration-token-key-v1';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o cofre local de chaves.'));
  });
}

async function getStoredKey(db: IDBDatabase): Promise<CryptoKey | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE, 'readonly');
    const request = transaction.objectStore(KEY_STORE).get(DEVICE_KEY_ID);
    request.onsuccess = () => resolve(request.result as CryptoKey | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function saveKey(db: IDBDatabase, key: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE, 'readwrite');
    transaction.objectStore(KEY_STORE).put(key, DEVICE_KEY_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getDeviceKey(): Promise<CryptoKey> {
  const db = await openKeyDb();
  try {
    const existing = await getStoredKey(db);
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await saveKey(db, key);
    return key;
  } finally {
    db.close();
  }
}

export async function encryptLocalSecret(value: string): Promise<{ version: 1; iv: string; ciphertext: string }> {
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, new TextEncoder().encode(value) as BufferSource);
  return { version: 1, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

export async function decryptLocalSecret(record?: { version: 1; iv: string; ciphertext: string }): Promise<string | undefined> {
  if (!record) return undefined;
  const key = await getDeviceKey();
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(record.iv) as BufferSource }, key, fromBase64(record.ciphertext) as BufferSource);
  return new TextDecoder().decode(plaintext);
}
