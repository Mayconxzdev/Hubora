import { describe, expect, it } from 'vitest';
import { isUserAllowed, verifyUserAllowed } from '@/services/accessPolicy';

const user = { uid: 'u1', email: 'maycon@example.com' };

describe('política de acesso público', () => {
  it('permite qualquer conta autenticada, sem allowlist no bundle', async () => {
    expect(isUserAllowed(user)).toBe(true);
    expect(await verifyUserAllowed({ uid: 'u2', email: 'outra@example.com' })).toBe(true);
  });

  it('recusa somente uma sessão sem identificador autenticado', async () => {
    expect(isUserAllowed({ uid: 'u2' })).toBe(true);
    expect(await verifyUserAllowed(null)).toBe(false);
  });
});
