const PIN_RECORD_KEY = 'hubora_adult_vault_pin_record';
const LEGACY_PIN_HASH_KEY = 'hubora_adult_vault_pin_hash';
const SESSION_KEY = 'hubora_adult_vault_unlocked';
const FAILURE_KEY = 'hubora_adult_vault_failures';
const PBKDF2_ITERATIONS = 310_000;
const MAX_FAILURES_BEFORE_DELAY = 5;

interface VaultPinRecord {
  version: 2;
  salt: string;
  iterations: number;
  hash: string;
  createdAt: number;
}

interface FailureRecord {
  attempts: number;
  blockedUntil: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

async function sha256Legacy(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function readFailures(): FailureRecord {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(FAILURE_KEY) || '{}') as Partial<FailureRecord>;
    return { attempts: Number(parsed.attempts || 0), blockedUntil: Number(parsed.blockedUntil || 0) };
  } catch {
    return { attempts: 0, blockedUntil: 0 };
  }
}

function writeFailures(record: FailureRecord): void {
  sessionStorage.setItem(FAILURE_KEY, JSON.stringify(record));
}

function registerFailure(): void {
  const record = readFailures();
  const attempts = record.attempts + 1;
  const delaySeconds = attempts >= MAX_FAILURES_BEFORE_DELAY ? Math.min(300, 2 ** Math.min(8, attempts - MAX_FAILURES_BEFORE_DELAY) * 5) : 0;
  writeFailures({ attempts, blockedUntil: delaySeconds ? Date.now() + delaySeconds * 1000 : 0 });
}

function clearFailures(): void {
  sessionStorage.removeItem(FAILURE_KEY);
}

export function getVaultLockoutRemaining(): number {
  const remaining = readFailures().blockedUntil - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

export async function setVaultPin(pin: string): Promise<void> {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('O PIN deve ter de 4 a 8 números.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
  const record: VaultPinRecord = {
    version: 2,
    salt: bytesToBase64(salt),
    iterations: PBKDF2_ITERATIONS,
    hash: bytesToBase64(hash),
    createdAt: Date.now(),
  };
  localStorage.setItem(PIN_RECORD_KEY, JSON.stringify(record));
  localStorage.removeItem(LEGACY_PIN_HASH_KEY);
  clearFailures();
}

export function hasVaultPin(): boolean {
  return Boolean(localStorage.getItem(PIN_RECORD_KEY) || localStorage.getItem(LEGACY_PIN_HASH_KEY));
}

export async function verifyVaultPin(pin: string): Promise<boolean> {
  if (getVaultLockoutRemaining() > 0) return false;

  const raw = localStorage.getItem(PIN_RECORD_KEY);
  if (raw) {
    try {
      const record = JSON.parse(raw) as VaultPinRecord;
      if (record.version !== 2 || !record.salt || !record.hash) throw new Error('Registro inválido');
      const actual = await derive(pin, base64ToBytes(record.salt), record.iterations);
      const valid = constantTimeEqual(actual, base64ToBytes(record.hash));
      if (valid) clearFailures(); else registerFailure();
      return valid;
    } catch {
      registerFailure();
      return false;
    }
  }

  const legacy = localStorage.getItem(LEGACY_PIN_HASH_KEY);
  if (!legacy) return true;
  const valid = (await sha256Legacy(pin)) === legacy;
  if (valid) {
    await setVaultPin(pin);
    clearFailures();
  } else registerFailure();
  return valid;
}

export function unlockVaultForSession(): void {
  sessionStorage.setItem(SESSION_KEY, '1');
  clearFailures();
}

export function lockVault(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isVaultUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function removeVaultPin(): void {
  localStorage.removeItem(PIN_RECORD_KEY);
  localStorage.removeItem(LEGACY_PIN_HASH_KEY);
  clearFailures();
  lockVault();
}
