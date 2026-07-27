import { expect, test } from '@playwright/test';

const visualRoutes = [
  ['home', '/'],
  ['discover', '/discover'],
  ['radar', '/radar'],
  ['library', '/library'],
  ['diary', '/diary'],
  ['guide', '/guide'],
  ['releases', '/releases'],
  ['profile', '/profile'],
  ['settings', '/settings'],
  ['movies', '/movies'],
  ['series', '/series'],
  ['doramas', '/doramas'],
  ['anime', '/anime'],
  ['manga', '/manga'],
  ['comics', '/comics'],
  ['books', '/books'],
  ['novels', '/novels'],
  ['games', '/games'],
  ['wrapped', '/wrapped'],
  ['goals', '/goals'],
  ['connections', '/connections'],
  ['vault-redacted', '/vault'],
  ['sources', '/sources'],
  ['providers', '/providers'],
  ['reader-empty', '/reader'],
  ['player-empty', '/player'],
  ['insights', '/insights'],
  ['login', '/login'],
  ['register', '/register'],
  ['forgot-password', '/forgot-password'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  ['not-found', '/esta-rota-nao-existe'],
] as const;

const expectedCiProviderFailures = new Set([
  // Provider unavailability is exercised by dedicated fallback tests. This
  // visual audit still fails for application errors, overflow and uncaught
  // exceptions; it does not falsely equate an honest upstream 5xx with a
  // broken layout after the fallback has rendered.
  '503 /api/tmdb',
  '429 /api/google-books',
  '503 /api/google-books',
]);

test.describe('evidência visual das rotas principais', () => {
  test.describe.configure({ mode: 'serial' });

  for (const [name, route] of visualRoutes) {
    test(`${name}: carrega toda a página sem corte`, async ({ page }, testInfo) => {
      test.setTimeout(60_000);
      const ownFailures: string[] = [];
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin === 'http://127.0.0.1:4187' && url.pathname.startsWith('/api/') && response.status() >= 400) {
          ownFailures.push(`${response.status()} ${url.pathname}`);
        }
      });

      await page.goto(route);
      await expect(page.locator('body')).not.toContainText(/erro fatal|algo deu errado/i);
      await expect(page, `Título do documento ausente em ${route}`).toHaveTitle(/Hubora/);

      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.waitForFunction(() => [...document.images].every((image) => image.complete), undefined, {
        timeout: 30_000,
      });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `Rolagem horizontal em ${route}`).toBeLessThanOrEqual(1);
      expect(pageErrors, `Exceções em ${route}`).toEqual([]);
      const unexpectedOwnFailures = ownFailures.filter((failure) => !expectedCiProviderFailures.has(failure));
      expect(unexpectedOwnFailures, `Falhas próprias inesperadas em ${route}`).toEqual([]);

      await page.screenshot({ path: testInfo.outputPath(`${name}-full-page.png`), fullPage: true });
    });
  }
});
