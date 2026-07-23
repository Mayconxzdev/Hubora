import { expect, test } from '@playwright/test';

test.describe('Conteúdo aberto', () => {
  test('pesquisa obra obrigatória em fontes reais e controla a biblioteca', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/sources');
    await page.getByLabel('Buscar conteúdo aberto').fill('A Metamorfose');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();

    const result = page.getByRole('article').filter({ has: page.getByRole('heading', { name: /Metamorfose|Metamorphosis/i }) }).first();
    await expect(result).toBeVisible({ timeout: 45_000 });
    await expect(result.getByRole('button', { name: /Biblioteca/i })).toBeVisible();
    await result.getByRole('button', { name: /Biblioteca/i }).click();
    await expect(page.getByText('Adicionado à biblioteca.', { exact: true })).toBeVisible();

    await page.goto('/library');
    const edit = page.getByRole('button', { name: /Editar .*Metamorfose|Editar .*Metamorphosis/i }).first();
    await expect(edit).toBeVisible();
    await edit.click();
    await page.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(page.getByText('Removido da biblioteca', { exact: true })).toBeVisible();
  });

  test('explica uma busca sem fontes e mantém configurações avançadas acessíveis', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/sources');
    await page.getByLabel('Buscar conteúdo aberto').fill(`obra-inexistente-${Date.now()}`);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByText('Nenhuma fonte aberta encontrada')).toBeVisible({ timeout: 45_000 });

    await page.getByText('Configurações avançadas de fontes', { exact: true }).click();
    await expect(page.getByLabel('URL do manifesto')).toBeVisible();
    await expect(page.getByText(/Torrent, magnet e arquivo \.torrent são recusados/i)).toBeVisible();
  });
});
