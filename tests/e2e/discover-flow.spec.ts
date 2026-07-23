import { expect, test } from '@playwright/test';

test.describe('Descobrir como usuário real', () => {
  test('busca um título, filtra a categoria e abre o card retornado', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/discover');
    await page.getByLabel('Busca em Descobrir').fill('Interestelar');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();

    const result = page.getByRole('link', { name: 'Abrir detalhes de Interestelar', exact: true }).first();
    await expect(result).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Filmes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Filmes', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await result.click();
    await expect(page.getByRole('heading', { name: 'Interestelar', exact: true })).toBeVisible({ timeout: 30_000 });
  });

  test('busca por pistas e explica a correspondência', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/discover');
    await page.getByRole('tab', { name: /Lembro de uma cena/i }).click();
    await page.getByLabel('O que você lembra?').fill('Interestelar');
    await page.getByLabel('Ano aproximado (opcional)').fill('2014');
    await page.getByRole('button', { name: 'Buscar candidatos', exact: true }).click();

    await expect(page.getByRole('link', { name: 'Abrir detalhes de Interestelar', exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Possível correspondência:/i).first()).toBeVisible();
  });

  test('busca por clima mostra filtros explicados e resultados reais', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/discover');
    await page.getByRole('tab', { name: /Quero uma sugestão/i }).click();
    await page.getByLabel('Clima, tempo e restrições').fill('Interestelar, ficção científica e aventura espacial');
    await page.getByRole('button', { name: 'Encontrar obras', exact: true }).click();

    await expect(page.getByText(/sem envio do texto para modelos/i)).toBeVisible();
    await expect(page.getByText(/Compatibilidade \d+%/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('expõe falha de catálogo quando a conexão cai e permite tentar novamente', async ({ page, context }) => {
    test.setTimeout(60_000);
    await page.goto('/discover');
    await page.getByLabel('Busca em Descobrir').fill(`consulta-offline-${Date.now()}`);
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Não foi possível consultar os catálogos', { timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
    await context.setOffline(false);
  });

  test('decisões da Home usam dados do feed e não prometem reprodução direta', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    const shortMode = page.getByRole('button', { name: /Tenho pouco tempo/i });
    await shortMode.click();
    await expect(shortMode).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Por que esta escolha')).toBeVisible();
    await expect(page.getByRole('button', { name: /Ver detalhes|Abrir para continuar/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Começar agora', exact: true })).toHaveCount(0);
  });
});
