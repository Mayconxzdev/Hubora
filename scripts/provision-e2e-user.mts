import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient, type User } from '@supabase/supabase-js';
import { config } from 'dotenv';

const repositoryRoot = resolve(import.meta.dirname, '..');
const testEnvPath = resolve(repositoryRoot, '.env.test.local');

config({ path: resolve(repositoryRoot, '.env'), quiet: true });
config({ path: testEnvPath, override: true, quiet: true });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const email = (process.env.HUBORA_E2E_EMAIL || 'hubora-e2e@example.invalid').trim().toLowerCase();
const password = process.env.HUBORA_E2E_PASSWORD || `Aa1!${randomBytes(24).toString('base64url')}`;
const netlifyUrl = process.env.HUBORA_NETLIFY_URL || 'https://hubora.netlify.app/';
const storageState = process.env.HUBORA_E2E_STORAGE_STATE || '.playwright/hubora-e2e.json';

if (!supabaseUrl || !secretKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente local antes do provisionamento.');
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('HUBORA_E2E_EMAIL não contém um endereço válido.');
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

function updateLocalEnvironment(values: Record<string, string>) {
  let source = existsSync(testEnvPath) ? readFileSync(testEnvPath, 'utf8') : '';
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const matcher = new RegExp(`^${key}=.*$`, 'm');
    source = matcher.test(source) ? source.replace(matcher, line) : `${source.replace(/\s*$/, '')}\n${line}\n`;
  }
  writeFileSync(testEnvPath, source.replace(/^\s+/, ''), { encoding: 'utf8', mode: 0o600 });
}

async function findUserByEmail(): Promise<User | undefined> {
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Não foi possível consultar os usuários E2E: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return undefined;
  }
  throw new Error('A busca administrativa excedeu 10.000 usuários; refine o provisionador antes de continuar.');
}

async function provision() {
  const existingUser = await findUserByEmail();
  if (existingUser) {
    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existingUser.user_metadata, name: 'Hubora E2E', hubora_e2e: true },
    });
    if (error) throw new Error(`Não foi possível atualizar a conta E2E: ${error.message}`);
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Hubora E2E', hubora_e2e: true },
    });
    if (error) throw new Error(`Não foi possível criar a conta E2E: ${error.message}`);
  }

  updateLocalEnvironment({
    HUBORA_E2E_EMAIL: email,
    HUBORA_E2E_PASSWORD: password,
    HUBORA_NETLIFY_URL: netlifyUrl,
    HUBORA_E2E_STORAGE_STATE: storageState,
  });

  console.info('[OK] Conta E2E provisionada; credenciais mantidas somente em .env.test.local.');
}

await provision();
