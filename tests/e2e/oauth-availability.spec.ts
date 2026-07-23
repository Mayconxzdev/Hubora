import { expect, test } from '@playwright/test';

test('Google OAuth inicia em HTTPS ou informa indisponibilidade honestamente', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continuar com Google', exact: true }).click();

  await expect.poll(async () => {
    const url = new URL(page.url());
    const errorVisible = await page.getByText(/Google não está habilitado|Google OAuth não habilitado/i).isVisible().catch(() => false);
    return url.origin !== 'http://127.0.0.1:4187' || errorVisible;
  }, { timeout: 30_000 }).toBe(true);

  const current = new URL(page.url());
  if (current.origin !== 'http://127.0.0.1:4187') {
    expect(current.protocol).toBe('https:');
    expect(current.hostname).toMatch(/(^|\.)google\.com$|\.supabase\.co$/i);
    console.info(`[oauth-outcome] external-host=${current.hostname}`);
    return;
  }

  await expect(page.getByText(/Google não está habilitado|Google OAuth não habilitado/i)).toBeVisible();
  console.info('[oauth-outcome] unavailable-with-explicit-message');
});
