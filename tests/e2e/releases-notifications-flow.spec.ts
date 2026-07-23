import { expect, test } from '@playwright/test';

test.describe('Lançamentos e notificações', () => {
  test('pede permissão real e explica o limite dos avisos do navegador', async ({ page, context }) => {
    await context.grantPermissions(['notifications'], { origin: 'http://127.0.0.1:4187' });
    await page.goto('/releases');
    await page.getByRole('button', { name: /Ativar avisos do navegador|Avisos do navegador ativos/i }).click();
    await expect(page.getByRole('status', { name: 'Permissão de notificações' })).toContainText('enquanto o Hubora estiver aberto');
  });

  test('filtra lançamentos e persiste o acompanhamento de uma obra', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/releases');
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Todos', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('Ordenação').selectOption('popularity');

    const addButton = page.getByRole('button', { name: /^Adicionar .+ à biblioteca$/ }).first();
    await expect(addButton).toBeVisible({ timeout: 45_000 });
    const addLabel = await addButton.getAttribute('aria-label');
    expect(addLabel).toBeTruthy();
    const title = addLabel!.replace(/^Adicionar /, '').replace(/ à biblioteca$/, '');
    await addButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /Acompanhar esta obra/i }).click();
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(page.getByText('Adicionado à biblioteca', { exact: true })).toBeVisible();

    const editButton = page.getByRole('button', { name: `Editar ${title} na biblioteca`, exact: true }).first();
    await editButton.click();
    await expect(page.getByRole('button', { name: /Acompanhando atualizações/i })).toBeVisible();
    await page.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(page.getByText('Removido da biblioteca', { exact: true })).toBeVisible();

    await page.getByLabel('Buscar lançamentos').fill(`sem-resultado-${Date.now()}`);
    await expect(page.getByText(/Nenhum lançamento|Nenhuma estreia|Nenhum resultado/i)).toBeVisible();
  });

  test('abre o sino e apresenta o estado vazio de atualizações', async ({ page }) => {
    await page.goto('/releases');
    await page.getByRole('button', { name: /^Notificações/ }).click();
    await expect(page.getByRole('heading', { name: 'Atualizações', exact: true })).toBeVisible();
    await expect(page.getByText(/Nenhuma atualização|Somente obras que você escolheu acompanhar/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Fechar notificações' }).click();
  });
});
