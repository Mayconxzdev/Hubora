import type { ProviderConfig } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { decryptLocalSecret, encryptLocalSecret } from '@/services/secretStorage';
import { listProviderConfigs, removeProviderConfig, saveProviderConfig } from '@/services/providerProtocol';

const VERSION = 1 as const;
const ITERATIONS = 310_000;
const CACHE_PREFIX = 'hubora-provider-vault-passphrase:';
const DELETIONS_PREFIX = 'hubora-provider-vault-deletions:';
const encoder = new TextEncoder();

interface ProviderVaultRecord {
  version: typeof VERSION;
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

interface ProviderVaultPayload {
  version: typeof VERSION;
  providers: ProviderConfig[];
  deletedAtById: Record<string, number>;
}

function requireClient() {
  if (!supabase || !isSupabaseConfigured) throw new Error('A sincronização do Hubora não está configurada.');
  return supabase;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function contextFor(userId: string): Uint8Array {
  return encoder.encode(`hubora-provider-vault:${userId}:v${VERSION}`);
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (passphrase.trim().length < 16) throw new Error('Use uma frase de sincronização com pelo menos 16 caracteres.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function readDeletions(userId: string): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${DELETIONS_PREFIX}${userId}`) || '{}') as Record<string, number>;
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => Number.isFinite(value)));
  } catch {
    return {};
  }
}

function writeDeletions(userId: string, value: Record<string, number>): void {
  localStorage.setItem(`${DELETIONS_PREFIX}${userId}`, JSON.stringify(value));
}

function combineDeletions(...groups: Record<string, number>[]): Record<string, number> {
  const output: Record<string, number> = {};
  for (const group of groups) {
    for (const [id, timestamp] of Object.entries(group)) output[id] = Math.max(output[id] || 0, timestamp);
  }
  return output;
}

function mergeProviders(local: ProviderConfig[], remote: ProviderConfig[], deletions: Record<string, number>): ProviderConfig[] {
  const merged = new Map(local.map((provider) => [provider.id, provider]));
  for (const provider of remote) {
    const current = merged.get(provider.id);
    if (!current || provider.updatedAt > current.updatedAt) merged.set(provider.id, provider);
  }
  return Array.from(merged.values())
    .filter((provider) => (deletions[provider.id] || 0) < provider.updatedAt)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

async function persistLocalSnapshot(userId: string, providers: ProviderConfig[]): Promise<void> {
  const ownerProviders = providers.map((provider) => ({ ...provider, ownerId: userId }));
  const keep = new Set(ownerProviders.map((provider) => provider.id));
  const current = await listProviderConfigs(userId);

  for (const provider of ownerProviders) await saveProviderConfig(provider);
  await Promise.all(current.filter((provider) => !keep.has(provider.id)).map((provider) => removeProviderConfig(provider.id)));
}

async function readRemote(userId: string): Promise<ProviderVaultRecord | null> {
  const { data, error } = await requireClient()
    .from('provider_config_vault')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('Não foi possível ler o cofre sincronizado. Verifique a migração do Supabase.');
  if (!data?.payload) return null;
  const record = data.payload as ProviderVaultRecord;
  if (record.version !== VERSION || !record.salt || !record.iv || !record.ciphertext) {
    throw new Error('O cofre sincronizado usa uma versão incompatível.');
  }
  return record;
}

async function writeRemote(userId: string, payload: ProviderVaultRecord): Promise<void> {
  const { error } = await requireClient().from('provider_config_vault').upsert({
    user_id: userId,
    payload,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('Não foi possível salvar o cofre sincronizado. Verifique a migração do Supabase.');
}

async function encryptPayload(userId: string, payload: ProviderVaultPayload, passphrase: string, salt: Uint8Array): Promise<ProviderVaultRecord> {
  const key = await deriveKey(passphrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: contextFor(userId) as BufferSource },
    key,
    encoder.encode(JSON.stringify(payload)) as BufferSource,
  );
  return { version: VERSION, iterations: ITERATIONS, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

async function decryptPayload(userId: string, record: ProviderVaultRecord, passphrase: string): Promise<ProviderVaultPayload> {
  if (record.iterations !== ITERATIONS) throw new Error('O cofre usa parâmetros de criptografia incompatíveis.');
  try {
    const key = await deriveKey(passphrase, fromBase64(record.salt));
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(record.iv) as BufferSource, additionalData: contextFor(userId) as BufferSource },
      key,
      fromBase64(record.ciphertext) as BufferSource,
    );
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as ProviderVaultPayload;
    if (parsed.version !== VERSION || !Array.isArray(parsed.providers) || !parsed.deletedAtById) throw new Error('invalid payload');
    return parsed;
  } catch {
    throw new Error('A frase de sincronização não confere ou o cofre está corrompido.');
  }
}

async function cachePassphrase(userId: string, passphrase: string): Promise<void> {
  const encrypted = await encryptLocalSecret(passphrase);
  localStorage.setItem(`${CACHE_PREFIX}${userId}`, JSON.stringify(encrypted));
}

export async function getCachedProviderVaultPassphrase(userId: string): Promise<string | null> {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as { version: 1; iv: string; ciphertext: string };
    return (await decryptLocalSecret(value)) || null;
  } catch {
    return null;
  }
}

export async function hasRemoteProviderVault(userId: string): Promise<boolean> {
  return Boolean(await readRemote(userId));
}

export async function unlockProviderVault(userId: string, passphrase: string, localProviders: ProviderConfig[]): Promise<ProviderConfig[]> {
  const record = await readRemote(userId);
  const localDeletions = readDeletions(userId);
  let providers = localProviders;
  let deletions = localDeletions;

  if (record) {
    const remote = await decryptPayload(userId, record, passphrase);
    deletions = combineDeletions(localDeletions, remote.deletedAtById);
    providers = mergeProviders(localProviders, remote.providers, deletions);
  }

  writeDeletions(userId, deletions);
  await writeRemote(userId, await encryptPayload(userId, { version: VERSION, providers, deletedAtById: deletions }, passphrase, record ? fromBase64(record.salt) : crypto.getRandomValues(new Uint8Array(16))));
  await cachePassphrase(userId, passphrase);
  await persistLocalSnapshot(userId, providers);
  return providers;
}

export async function syncProviderVault(userId: string, localProviders: ProviderConfig[], deletedId?: string): Promise<ProviderConfig[]> {
  const passphrase = await getCachedProviderVaultPassphrase(userId);
  if (!passphrase) throw new Error('Desbloqueie a sincronização de fontes para atualizar sua conta.');

  const localDeletions = readDeletions(userId);
  if (deletedId) localDeletions[deletedId] = Date.now();
  const record = await readRemote(userId);
  let providers = localProviders;
  let deletions = localDeletions;
  let salt: Uint8Array<ArrayBufferLike> = crypto.getRandomValues(new Uint8Array(16));

  if (record) {
    const remote = await decryptPayload(userId, record, passphrase);
    deletions = combineDeletions(localDeletions, remote.deletedAtById);
    providers = mergeProviders(localProviders, remote.providers, deletions);
    salt = fromBase64(record.salt);
  }

  writeDeletions(userId, deletions);
  await writeRemote(userId, await encryptPayload(userId, { version: VERSION, providers, deletedAtById: deletions }, passphrase, salt));
  await cachePassphrase(userId, passphrase);
  await persistLocalSnapshot(userId, providers);
  return providers;
}

/** Loads this account's local sources and merges the encrypted snapshot when this device is unlocked. */
export async function loadProviderConfigsWithVault(userId: string): Promise<ProviderConfig[]> {
  const local = await listProviderConfigs(userId);
  if (!isSupabaseConfigured) return local;
  const passphrase = await getCachedProviderVaultPassphrase(userId);
  if (!passphrase) return local;
  try {
    return await syncProviderVault(userId, local);
  } catch {
    return local;
  }
}

export function markProviderDeleted(userId: string, id: string): void {
  const deletions = readDeletions(userId);
  deletions[id] = Date.now();
  writeDeletions(userId, deletions);
}

export function clearProviderDeletion(userId: string, id: string): void {
  const deletions = readDeletions(userId);
  delete deletions[id];
  writeDeletions(userId, deletions);
}

export function lockProviderVault(userId: string): void {
  localStorage.removeItem(`${CACHE_PREFIX}${userId}`);
}

export function clearLocalProviderVaultState(userId: string): void {
  lockProviderVault(userId);
  localStorage.removeItem(`${DELETIONS_PREFIX}${userId}`);
}

export async function deleteRemoteProviderVault(userId: string): Promise<void> {
  const { error } = await requireClient().from('provider_config_vault').delete().eq('user_id', userId);
  if (error) throw new Error('Não foi possível remover o cofre sincronizado.');
  clearLocalProviderVaultState(userId);
}

