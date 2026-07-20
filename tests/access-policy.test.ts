import { afterEach, describe, expect, it, vi } from 'vitest';
import { configuredAllowedEmails, isUserAllowed } from '@/services/accessPolicy';

const user = { uid: 'u1', email: 'maycon@example.com' };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('política de acesso privado', () => {
  it('permite somente e-mails presentes na allowlist quando configurada', () => {
    vi.stubEnv('VITE_ALLOWED_EMAILS', ' MAYCON@example.com, amigo@example.com ');
    expect(configuredAllowedEmails()).toEqual(['maycon@example.com', 'amigo@example.com']);
    expect(isUserAllowed(user)).toBe(true);
    expect(isUserAllowed({ uid: 'u2', email: 'outra@example.com' })).toBe(false);
  });

  it('permite qualquer conta autenticada quando a allowlist estiver vazia', () => {
    vi.stubEnv('VITE_ALLOWED_EMAILS', '');
    expect(isUserAllowed(user)).toBe(true);
    expect(isUserAllowed({ uid: 'u2' })).toBe(false);
  });
});
