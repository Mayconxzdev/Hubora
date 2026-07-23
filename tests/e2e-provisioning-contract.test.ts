import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('provisionamento E2E seguro', () => {
  it('cria uma conta isolada sem endpoint administrativo de allowlist e nunca registra a senha', () => {
    const script = readFileSync('scripts/provision-e2e-user.mts', 'utf8');
    const createPosition = script.indexOf('auth.admin.createUser');

    expect(createPosition).toBeGreaterThan(0);
    expect(script).not.toContain('admin_set_hubora_allowed_email');
    expect(script).not.toContain('allowed_emails');
    expect(script).not.toMatch(/console\.(?:log|info).*password/i);
    expect(script).toMatch(/\.env\.test\.local/);
  });
});
