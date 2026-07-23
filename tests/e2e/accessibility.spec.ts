import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  ['home', '/'],
  ['discover', '/discover'],
  ['library', '/library'],
  ['movies', '/movies'],
  ['anime', '/anime'],
  ['radar', '/radar'],
  ['sources', '/sources'],
  ['providers', '/providers'],
  ['settings', '/settings'],
  ['profile', '/profile'],
  ['login', '/login'],
  ['register', '/register'],
  ['reader', '/reader'],
  ['player', '/player'],
] as const;

test.use({ screenshot: 'off', trace: 'off', video: 'off' });

for (const [name, route] of routes) {
  test(`${name} não tem violações WCAG automatizáveis`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();
    await page.evaluate(async () => {
      const finiteAnimations = document.getAnimations().filter((animation) => animation.effect?.getTiming().iterations !== Infinity);
      await Promise.all(finiteAnimations.map((animation) => animation.finished.catch(() => undefined)));
    });
    await expect(page).toHaveTitle(/Hubora/);
    await expect(page.locator('head title')).toHaveCount(1);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const violations = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
      summaries: violation.nodes.slice(0, 5).map((node) => node.failureSummary),
    }));
    expect(violations).toEqual([]);
  });
}

test('atalho de conteúdo, paleta e Escape funcionam por teclado', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#hub-main-content')).toBeFocused();

  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
