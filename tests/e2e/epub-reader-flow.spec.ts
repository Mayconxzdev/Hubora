import { expect, test } from '@playwright/test';

const gutenbergEpub = 'https://www.gutenberg.org/cache/epub/5200/pg5200-images-3.epub';

test('lê EPUB público, avança três seções e restaura posição e preferências', async ({ page }) => {
  test.setTimeout(90_000);
  const params = new URLSearchParams({
    kind: 'epub',
    url: gutenbergEpub,
    official: 'https://www.gutenberg.org/ebooks/5200',
    title: 'A Metamorfose — Project Gutenberg',
  });

  await page.goto(`/reader?${params.toString()}`);
  await expect(page.getByRole('heading', { name: 'A Metamorfose — Project Gutenberg' })).toBeVisible();
  const chapters = page.getByRole('combobox', { name: 'Escolher capítulo' });
  await expect(chapters).toBeVisible({ timeout: 30_000 });
  expect(await chapters.locator('option').count()).toBeGreaterThan(3);
  await expect(page.locator('iframe[title*="Metamorphosis"]')).toBeVisible();

  await page.getByRole('button', { name: /Próximo/i }).click();
  await page.getByRole('button', { name: /Próximo/i }).click();
  await page.getByRole('button', { name: /Próximo/i }).click();
  await expect(chapters).toHaveValue('3');
  await page.getByRole('button', { name: 'Aumentar fonte' }).click();
  await page.getByRole('button', { name: 'Escuro', exact: true }).click();
  await expect(page.getByText('19px', { exact: true })).toBeVisible();

  await page.reload();
  await expect(chapters).toBeVisible({ timeout: 30_000 });
  await expect(chapters).toHaveValue('3');
  await expect(page.getByText('19px', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Claro', exact: true })).toBeVisible();
});
