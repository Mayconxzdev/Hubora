import { expect, test } from '@playwright/test';

test('a navegação compacta preserva hierarquia, acesso às áreas e não corta a interface', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  const rail = page.locator('.hub-navigation-rail');
  await expect(rail).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrar para sincronizar' })).toBeVisible();
  await expect(page.getByText('Usuário Hubora')).toHaveCount(0);
  await expect(page.getByText('Minha Central')).toHaveCount(0);
  await expect(rail.locator('a[title="Filmes"] svg')).toBeVisible();
  await expect(rail.locator('a[title="Jogos"] svg')).toBeVisible();

  const compactBox = await rail.boundingBox();
  expect(compactBox?.width).toBeGreaterThanOrEqual(80);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.waitForTimeout(250);
  await rail.screenshot({ path: testInfo.outputPath('sidebar-compact.png') });

  await page.getByRole('button', { name: 'Expandir menu' }).click();
  await expect(rail.getByText('BIBLIOTECA', { exact: true })).toBeVisible();
  await expect(rail.getByText('Seu espaço', { exact: true })).toBeVisible();
  await rail.screenshot({ path: testInfo.outputPath('sidebar-expanded.png') });

  await page.getByRole('button', { name: 'Recolher menu' }).click();
  await page.getByRole('button', { name: 'Mostrar mais áreas' }).click();
  await expect(page.getByRole('menu', { name: 'Mais áreas do Hubora' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Doramas/i })).toBeVisible();
  await rail.screenshot({ path: testInfo.outputPath('sidebar-more.png') });

  expect(pageErrors).toEqual([]);
});
