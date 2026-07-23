import { expect, test } from '@playwright/test';

test.describe('Fontes e provedores', () => {
  test('diferencia diretório, link externo e integração verificada', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/providers');
    await page.getByLabel('Buscar provedores').fill('MangaDex');

    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'MangaDex', exact: true }) });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Link externo');
    await expect(card).toContainText('Ainda não verificado nesta sessão');

    const popupPromise = page.waitForEvent('popup');
    await card.getByRole('button', { name: /Abrir fonte/i }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
    expect(new URL(popup.url()).hostname).toMatch(/(^|\.)mangadex\.org$/);
    await popup.close();

    await page.getByLabel('Buscar provedores').fill('');
    await page.getByRole('button', { name: /Jogos/i }).click();
    await expect(page.getByRole('button', { name: /Jogos/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Steam', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'MangaDex', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Verificar integrações ativas', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Última verificação de provedores' })).toContainText('Verificação concluída', { timeout: 30_000 });
    await expect(page.getByText(/Verificado:|Não verificado nesta instalação/).first()).toBeVisible();
  });

  test('leva uma fonte com chave para a configuração correspondente', async ({ page }) => {
    await page.goto('/providers');
    await page.getByLabel('Buscar provedores').fill('TMDB');
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'TMDB', exact: true }) });
    await card.getByRole('button', { name: /Configurar chave/i }).click();
    await expect(page).toHaveURL(/\/settings\?section=apis$/);
    await expect(page.getByRole('heading', { name: /Configurações/i }).first()).toBeVisible();
  });
});
