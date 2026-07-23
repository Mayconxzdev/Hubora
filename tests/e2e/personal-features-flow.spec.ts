import { expect, test } from '@playwright/test';

test.describe('recursos pessoais do visitante', () => {
  test.describe.configure({ mode: 'serial' });

  test('Conexões explica o estado sem biblioteca', async ({ page }) => {
    await page.goto('/connections');
    await expect(page.getByRole('heading', { name: 'Grafo de conexões' })).toBeVisible();
    await expect(page.getByText('Adicione obras à biblioteca para visualizar conexões entre títulos, gêneros e criadores.')).toBeVisible();
  });

  test('Metas valida limites, persiste e permite excluir', async ({ page }) => {
    await page.goto('/goals');
    const title = page.getByLabel('Nome da meta');
    const target = page.getByLabel('Quantidade desejada');
    const create = page.getByRole('button', { name: 'Criar meta', exact: true });

    await title.fill('');
    await target.fill('0');
    await expect(create).toBeDisabled();

    await title.fill('Meta E2E temporária');
    await target.fill('3');
    await expect(create).toBeEnabled();
    await create.click();
    await expect(page.getByRole('heading', { name: 'Meta E2E temporária' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Meta E2E temporária' })).toBeVisible();
    await page.getByRole('button', { name: 'Excluir meta Meta E2E temporária' }).click();
    await expect(page.getByRole('heading', { name: 'Meta E2E temporária' })).toHaveCount(0);
  });

  test('Wrapped gera e baixa uma imagem compartilhável sem dados do Cofre', async ({ page }) => {
    await page.goto('/wrapped');
    await expect(page.getByRole('img', { name: /Retrospectiva Hubora/i })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^hubora-wrapped-\d{4}\.svg$/);
  });

  test('Guia marca, persiste e restaura um item da franquia', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/guide');
    await page.getByRole('button', { name: 'Star Wars', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Star Wars', exact: true })).toBeVisible({ timeout: 30_000 });

    const markSeen = page.getByRole('button', { name: /marcar como visto/i }).first();
    await markSeen.click();
    await expect(page.getByText(/1 de \d+ \(\d+%\)/)).toBeVisible();

    await page.reload();
    const markUnseen = page.getByRole('button', { name: /marcar como não visto/i }).first();
    await expect(markUnseen).toBeVisible({ timeout: 30_000 });
    await markUnseen.click();
    await expect(page.getByText(/0 de \d+ \(0%\)/)).toBeVisible();
  });
});
