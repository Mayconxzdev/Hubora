import { afterEach, describe, expect, it, vi } from 'vitest';
import configCheck from '../netlify/functions/config-check.mts';

const REQUIRED_ENV = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  TMDB_API_KEY: 'tmdb-test',
  IGDB_CLIENT_ID: 'igdb-client',
  IGDB_CLIENT_SECRET: 'igdb-secret',
  GOOGLE_BOOKS_API_KEY: 'books-test',
};

afterEach(() => vi.unstubAllEnvs());

describe('diagnóstico da configuração do deploy', () => {
  it('lista somente os nomes ausentes sem expor valores', async () => {
    for (const [name, value] of Object.entries(REQUIRED_ENV)) vi.stubEnv(name, value);

    const response = await configCheck(new Request('https://hubora.test/api/health/config'));
    expect(response.status).toBe(200);
    const payload = await response.json() as Record<string, unknown>;

    expect(payload.ready).toBe(true);
    expect(payload.missingRequired).toEqual([]);
    const serialized = JSON.stringify(payload);
    for (const [name, value] of Object.entries(REQUIRED_ENV)) {
      expect(serialized).not.toContain(value);
      expect(serialized).not.toContain(name === 'SUPABASE_URL' ? 'example.supabase.co' : value);
    }
    expect(payload.checks).toMatchObject({
      requireAuthentication: null,
      allowPublicSignup: null,
      allowGuestMode: null,
    });
  });

  it('reporta somente dependências realmente obrigatórias como ausentes', async () => {
    for (const [name, value] of Object.entries(REQUIRED_ENV)) vi.stubEnv(name, value);
    vi.stubEnv('TMDB_API_KEY', '');
    vi.stubEnv('TMDB_API_READ_TOKEN', '');

    const response = await configCheck(new Request('https://hubora.test/api/health/config'));
    const payload = await response.json() as { ready: boolean; missingRequired: string[] };

    expect(payload.ready).toBe(false);
    expect(payload.missingRequired).toContain('TMDB_API_KEY ou TMDB_API_READ_TOKEN');
  });
});
