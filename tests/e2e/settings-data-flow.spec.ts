import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('exporta, valida, restaura, importa CSV, cria snapshot e reseta dados do visitante', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/login');
  await page.getByRole('button', { name: /Entrar como Visitante/i }).click();

  await page.goto('/movies');
  await page.getByRole('searchbox', { name: 'Pesquisar nesta categoria' }).fill('Interestelar');
  await page.getByRole('button', { name: 'Adicionar Interestelar à biblioteca' }).first().click();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.goto('/settings');
  await expect(page.getByText('1 item(ns) salvos neste navegador.')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const exported = JSON.parse(await readFile(downloadPath!, 'utf8')) as { format?: string; library?: Array<{ title?: string }> };
  expect(exported.format).toBe('hubora-backup');
  expect(exported.library?.some((entry) => entry.title === 'Interestelar')).toBe(true);

  await page.getByRole('button', { name: 'Importar JSON' }).click();
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({ name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('{"invalid":true}') });
  await expect(page.getByText('Arquivo inválido ou incompatível')).toBeVisible();

  await page.getByRole('button', { name: 'Criar snapshot local' }).click();
  await expect(page.getByText('Snapshot local criado.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restaurar' }).first()).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Apagar dados locais' }).click();
  await expect(page.getByText('0 item(ns) salvos neste navegador.')).toBeVisible();
  await expect(page.getByText('Nenhum snapshot local criado')).toBeVisible();

  await page.locator('input[type="file"][accept*="json"]').setInputFiles(downloadPath!);
  await expect(page.getByText('Backup validado e restaurado com sucesso!')).toBeVisible();
  await expect(page.getByText('1 item(ns) salvos neste navegador.')).toBeVisible();

  await page.locator('input[type="file"][accept*="csv"]').setInputFiles({
    name: 'biblioteca.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Title,Year\nHades,2020\n'),
  });
  await expect(page.getByText(/Importação concluída! 1 mídias adicionadas/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('2 item(ns) salvos neste navegador.')).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem('hubora_franchise_probe', '1');
    localStorage.setItem('hubora_trivia_probe', '1');
  });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Limpar cache' }).click();
  await expect(page.getByText('Cache dos catálogos de mídia limpo.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => [localStorage.getItem('hubora_franchise_probe'), localStorage.getItem('hubora_trivia_probe')])).toEqual([null, null]);
  await expect(page.getByText('2 item(ns) salvos neste navegador.')).toBeVisible();

  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await expect(page.getByRole('button', { name: 'Usar tema escuro' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Entrar para sincronizar/i })).toHaveAttribute('href', '/login');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Apagar dados locais' }).click();
  await expect(page.getByText('0 item(ns) salvos neste navegador.')).toBeVisible();
});
