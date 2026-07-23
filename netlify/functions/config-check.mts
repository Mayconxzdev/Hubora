import type { Config } from '@netlify/functions';
import { json } from './_shared/http.js';

const value = (name: string) => process.env[name]?.trim() || '';
const explicitBoolean = (name: string): boolean | null => {
  const setting = value(name);
  if (setting === 'true') return true;
  if (setting === 'false') return false;
  return null;
};

export default async function configCheck(request: Request) {
  if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, { status: 405 });

  const checks = {
    viteSupabaseUrl: Boolean(value('VITE_SUPABASE_URL')),
    viteSupabasePublishableKey: Boolean(value('VITE_SUPABASE_PUBLISHABLE_KEY')),
    supabaseUrl: Boolean(value('SUPABASE_URL')),
    supabaseSecretKey: Boolean(value('SUPABASE_SECRET_KEY') || value('SUPABASE_SERVICE_ROLE_KEY')),
    supabasePublishableKey: Boolean(value('SUPABASE_PUBLISHABLE_KEY') || value('VITE_SUPABASE_PUBLISHABLE_KEY')),
    tmdb: Boolean(value('TMDB_API_KEY') || value('TMDB_API_READ_TOKEN')),
    igdb: Boolean(value('IGDB_CLIENT_ID') && value('IGDB_CLIENT_SECRET')),
    googleBooks: Boolean(value('GOOGLE_BOOKS_API_KEY')),
    rawg: Boolean(value('RAWG_API_KEY')),
    requireAuthentication: explicitBoolean('VITE_REQUIRE_AUTH'),
    allowPublicSignup: explicitBoolean('VITE_ALLOW_PUBLIC_SIGNUP'),
    allowGuestMode: explicitBoolean('VITE_ALLOW_GUEST_MODE'),
  };

  const required: Array<[string, boolean]> = [
    ['VITE_SUPABASE_URL', checks.viteSupabaseUrl],
    ['VITE_SUPABASE_PUBLISHABLE_KEY', checks.viteSupabasePublishableKey],
    ['SUPABASE_URL', checks.supabaseUrl],
    ['SUPABASE_SECRET_KEY', checks.supabaseSecretKey],
    ['TMDB_API_KEY ou TMDB_API_READ_TOKEN', checks.tmdb],
    ['IGDB_CLIENT_ID + IGDB_CLIENT_SECRET', checks.igdb],
    ['GOOGLE_BOOKS_API_KEY', checks.googleBooks],
  ];
  const recommended: Array<[string, boolean]> = [
    ['RAWG_API_KEY', checks.rawg],
  ];

  const missingRequired = required.filter(([, ok]) => !ok).map(([name]) => name);
  const missingRecommended = recommended.filter(([, ok]) => !ok).map(([name]) => name);

  return json({
    ready: missingRequired.length === 0,
    checks,
    missingRequired,
    missingRecommended,
    checkedAt: new Date().toISOString(),
    note: 'Esta verificação confirma somente a presença de configuração. Ela não confirma schema/RLS do Supabase, direitos de reprodução ou disponibilidade de cada obra.',
  }, {
    headers: { 'cache-control': 'no-store' },
  });
}

export const config: Config = {
  path: '/api/health/config',
  method: 'GET',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['domain', 'ip'],
    windowSize: 60,
    windowLimit: 20,
  },
};
