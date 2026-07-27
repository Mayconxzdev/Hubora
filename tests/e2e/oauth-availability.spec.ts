import { expect, test } from '@playwright/test';

test('Google OAuth inicia em HTTPS ou informa indisponibilidade honestamente', async ({ page }) => {
  const baseOrigin = new URL(test.info().project.use.baseURL as string).origin;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continuar com Google', exact: true }).click();

  await expect.poll(async () => {
    const url = new URL(page.url());
    const errorVisible = await page.getByRole('alert').isVisible().catch(() => false);
    return url.origin !== baseOrigin || errorVisible;
  }, { timeout: 30_000 }).toBe(true);

  const current = new URL(page.url());
  if (current.origin !== baseOrigin) {
    expect(current.protocol).toBe('https:');
    expect(current.hostname).toMatch(/(^|\.)google\.com$|\.supabase\.co$/i);
    console.info(`[oauth-outcome] external-host=${current.hostname}`);
    return;
  }

  await expect(page.getByRole('alert')).toContainText(/Google não está habilitado/i);
  console.info('[oauth-outcome] unavailable-with-explicit-message');
});
