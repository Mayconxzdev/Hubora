import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

const root = resolve(import.meta.dirname, '..');
config({ path: resolve(root, '.env'), quiet: true });
config({ path: resolve(root, '.env.test.local'), override: true, quiet: true });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const email = process.env.HUBORA_E2E_EMAIL;
const password = process.env.HUBORA_E2E_PASSWORD;

if (!url || !publishableKey || !secretKey || !email || !password) {
  throw new Error('BLOCKED_AUTH: faltam variáveis locais para verificar Supabase/RLS.');
}

const e2eEmail = email;
const e2ePassword = password;

const clientOptions = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const admin = createClient(url, secretKey, clientOptions);
const primary = createClient(url, publishableKey, clientOptions);
const restored = createClient(url, publishableKey, clientOptions);
const secondary = createClient(url, publishableKey, clientOptions);
const probe = 'hubora-e2e-sync-probe';
const now = new Date().toISOString();
let primaryId = '';
let secondaryId = '';
let originalProfile: unknown = null;
let originalProfileExists = false;

function failureCode(error: { code?: string; status?: number } | null): string {
  return error?.code || String(error?.status || 'unknown');
}

async function signIn(client: SupabaseClient, accountEmail: string, accountPassword: string): Promise<string> {
  const { data, error } = await client.auth.signInWithPassword({ email: accountEmail, password: accountPassword });
  if (error || !data.user) throw new Error(`login:${failureCode(error)}`);
  return data.user.id;
}

async function cleanup() {
  if (primaryId) {
    await Promise.allSettled([
      admin.from('notifications').delete().eq('user_id', primaryId).eq('entry_id', probe),
      admin.from('release_subscriptions').delete().eq('user_id', primaryId).eq('entry_id', probe),
      admin.from('consumption_events').delete().eq('user_id', primaryId).eq('event_id', probe),
      admin.from('custom_lists').delete().eq('user_id', primaryId).eq('list_id', probe),
      admin.from('library_entries').delete().eq('user_id', primaryId).eq('entry_id', probe),
    ]);
    if (originalProfileExists) {
      await admin.from('profiles').upsert({ id: primaryId, payload: originalProfile, updated_at: new Date().toISOString() });
    } else {
      await admin.from('profiles').delete().eq('id', primaryId);
    }
  }
  if (secondaryId) await admin.auth.admin.deleteUser(secondaryId);
  await Promise.allSettled([primary.auth.signOut(), restored.auth.signOut(), secondary.auth.signOut()]);
}

async function verify() {
  let step = 'login-primary';
  try {
    primaryId = await signIn(primary, e2eEmail, e2ePassword);

    step = 'profile-read';
    const profileBefore = await primary.from('profiles').select('payload').eq('id', primaryId).maybeSingle();
    if (profileBefore.error) throw new Error(failureCode(profileBefore.error));
    originalProfileExists = Boolean(profileBefore.data);
    originalProfile = profileBefore.data?.payload || {};

    step = 'profile-write';
    const profileWrite = await primary.from('profiles').upsert({
      id: primaryId,
      payload: { ...(originalProfile as Record<string, unknown>), e2eProbeAt: now },
      updated_at: now,
    });
    if (profileWrite.error) throw new Error(failureCode(profileWrite.error));

    step = 'library-write';
    const libraryWrite = await primary.from('library_entries').upsert({
      user_id: primaryId,
      entry_id: probe,
      payload: { id: probe, title: 'Hubora E2E Sync Seed', mediaType: 'movie', visibility: 'private', adultPrivate: false, lastUpdated: Date.now() },
      updated_at: now,
      deleted_at: null,
    });
    if (libraryWrite.error) throw new Error(failureCode(libraryWrite.error));

    step = 'list-write';
    const listWrite = await primary.from('custom_lists').upsert({ user_id: primaryId, list_id: probe, payload: { id: probe, name: 'E2E', items: [], createdAt: Date.now(), updatedAt: Date.now() }, updated_at: now, deleted_at: null });
    if (listWrite.error) throw new Error(failureCode(listWrite.error));

    step = 'event-write';
    const eventWrite = await primary.from('consumption_events').upsert({ user_id: primaryId, event_id: probe, entry_id: probe, payload: { id: probe, entryId: probe, kind: 'status', occurredAt: Date.now(), value: 'planning' }, occurred_at: now });
    if (eventWrite.error) throw new Error(failureCode(eventWrite.error));

    step = 'subscription-write';
    const subscriptionWrite = await primary.from('release_subscriptions').upsert({ user_id: primaryId, entry_id: probe, provider: 'e2e', provider_id: probe, media_type: 'movie', title: 'Hubora E2E Sync Seed', preferences: {}, next_check_at: now, updated_at: now });
    if (subscriptionWrite.error) throw new Error(failureCode(subscriptionWrite.error));

    step = 'notification-server-write';
    const notificationWrite = await admin.from('notifications').insert({ user_id: primaryId, entry_id: probe, kind: 'system', title: 'E2E', body: 'RLS probe', url: '/library' });
    if (notificationWrite.error) throw new Error(failureCode(notificationWrite.error));

    step = 'second-context-login';
    const restoredId = await signIn(restored, e2eEmail, e2ePassword);
    if (restoredId !== primaryId) throw new Error('identity-mismatch');
    for (const [table, key] of [
      ['profiles', 'id'],
      ['library_entries', 'entry_id'],
      ['custom_lists', 'list_id'],
      ['consumption_events', 'event_id'],
      ['release_subscriptions', 'entry_id'],
      ['notifications', 'entry_id'],
    ] as const) {
      step = `second-context-read:${table}`;
      const value = table === 'profiles' ? primaryId : probe;
      const read = await restored.from(table).select('*').eq(key, value);
      if (read.error || read.data?.length !== 1) throw new Error(failureCode(read.error));
    }

    step = 'secondary-create';
    const secondaryEmail = `hubora-e2e-isolation-${Date.now()}@hubora.test`;
    const secondaryPassword = `Aa1!${randomBytes(24).toString('base64url')}`;
    const created = await admin.auth.admin.createUser({ email: secondaryEmail, password: secondaryPassword, email_confirm: true, user_metadata: { hubora_e2e_isolation: true } });
    if (created.error || !created.data.user) throw new Error(failureCode(created.error));
    secondaryId = created.data.user.id;
    await signIn(secondary, secondaryEmail, secondaryPassword);

    for (const [table, key] of [
      ['profiles', 'id'],
      ['library_entries', 'entry_id'],
      ['custom_lists', 'list_id'],
      ['consumption_events', 'event_id'],
      ['release_subscriptions', 'entry_id'],
      ['notifications', 'entry_id'],
    ] as const) {
      step = `cross-account-read:${table}`;
      const value = table === 'profiles' ? primaryId : probe;
      const read = await secondary.from(table).select('*').eq(key, value);
      if (read.error || read.data?.length !== 0) throw new Error(failureCode(read.error));
    }

    step = 'cross-account-write-rejected';
    const foreignWrite = await secondary.from('library_entries').insert({ user_id: primaryId, entry_id: `${probe}-foreign`, payload: {}, updated_at: now });
    if (!foreignWrite.error) throw new Error('foreign-write-was-accepted');

    console.info('[PASS] Supabase Auth, sincronização em segundo contexto e isolamento RLS verificados; sementes removidas.');
  } catch (error) {
    const code = error instanceof Error ? error.message.replace(/[^A-Za-z0-9:_-]/g, '') : 'unknown';
    throw new Error(`BLOCKED_ENV: contrato remoto falhou em ${step} (${code || 'unknown'}).`);
  } finally {
    await cleanup();
  }
}

await verify();
