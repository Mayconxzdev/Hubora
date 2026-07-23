import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { accessConfiguration } from '@/config/access';

afterEach(() => vi.unstubAllEnvs());

describe('configuração de contas públicas', () => {
  it('mantém cadastro e visitante disponíveis por padrão', () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', '');
    vi.stubEnv('VITE_ALLOW_PUBLIC_SIGNUP', '');
    vi.stubEnv('VITE_ALLOW_GUEST_MODE', '');

    expect(accessConfiguration()).toEqual({
      requireAuthentication: false,
      allowPublicSignup: true,
      allowGuestMode: true,
    });
  });

  it('mantém cadastro e visitante disponíveis numa instalação aberta', () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', 'false');
    vi.stubEnv('VITE_ALLOW_PUBLIC_SIGNUP', '');
    vi.stubEnv('VITE_ALLOW_GUEST_MODE', '');

    expect(accessConfiguration()).toEqual({
      requireAuthentication: false,
      allowPublicSignup: true,
      allowGuestMode: true,
    });
  });

  it('não sobrescreve no repositório as opções de acesso configuradas no Netlify', () => {
    const netlifyConfig = readFileSync(resolve('netlify.toml'), 'utf8');

    expect(netlifyConfig).not.toMatch(/VITE_REQUIRE_AUTH\s*=/);
    expect(netlifyConfig).not.toMatch(/VITE_ALLOW_PUBLIC_SIGNUP\s*=/);
    expect(netlifyConfig).not.toMatch(/VITE_ALLOW_GUEST_MODE\s*=/);
  });

  it('possui migration final que isola cada recurso pessoal por auth.uid()', () => {
    const migration = readFileSync(resolve('supabase/migrations/003_hubora_public_accounts.sql'), 'utf8');

    expect(migration).not.toContain('private.allowed_emails');
    expect(migration).not.toContain('is_hubora_allowed_user');
    expect(migration).toContain('auth.uid() = user_id');
    expect(migration).toContain('auth.uid() = id');
  });

  it('respeita permissões explícitas sem inferir valores truthy', () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', 'true');
    vi.stubEnv('VITE_ALLOW_PUBLIC_SIGNUP', 'true');
    vi.stubEnv('VITE_ALLOW_GUEST_MODE', 'true');
    expect(accessConfiguration()).toMatchObject({ allowPublicSignup: true, allowGuestMode: true });

    vi.stubEnv('VITE_ALLOW_PUBLIC_SIGNUP', 'yes');
    vi.stubEnv('VITE_ALLOW_GUEST_MODE', '1');
    expect(accessConfiguration()).toMatchObject({ allowPublicSignup: false, allowGuestMode: false });
  });
});
