import { expect, test } from '@playwright/test';

test('gerencia Hades do backlog à conclusão e restaura o baseline', async ({ page }) => {
  test.setTimeout(90_000);
  const title = 'Hades';

  await page.goto('/games');
  await page.getByPlaceholder(/buscar nesta (?:seção|categoria)/i).fill(title);
  await page.getByRole('link', { name: `Abrir detalhes de ${title}`, exact: true }).first().click();
  await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Gerenciar Jogo' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: title })).toBeVisible();
  await dialog.getByRole('button', { name: 'Wishlist / Backlog' }).click();
  await dialog.getByRole('checkbox', { name: /Possuído na conta/i }).check();
  await dialog.getByRole('checkbox', { name: /Instalado no PC\/Console/i }).check();
  await dialog.getByRole('spinbutton').nth(0).fill('12');
  await dialog.getByRole('spinbutton').nth(1).fill('40');
  await dialog.getByRole('button', { name: 'Jogando', exact: true }).click();

  for (const store of ['Steam', 'Epic Games', 'GOG']) {
    const link = dialog.getByRole('link', { name: store, exact: true });
    await expect(link).toHaveAttribute('href', /^https:\/\//);
  }
  await dialog.getByRole('button', { name: 'Salvar Alterações' }).click();
  await expect(page.getByText(`${title} adicionado aos seus jogos!`)).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Gerenciar Jogo' }).click();
  await expect(dialog.getByRole('checkbox', { name: /Possuído na conta/i })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: /Instalado no PC\/Console/i })).toBeChecked();
  await expect(dialog.getByRole('spinbutton').nth(0)).toHaveValue('12');
  await expect(dialog.getByRole('spinbutton').nth(1)).toHaveValue('40');
  await dialog.getByRole('button', { name: 'Concluído', exact: true }).click();
  await dialog.getByRole('spinbutton').nth(1).fill('100');
  await dialog.getByRole('button', { name: 'Salvar Alterações' }).click();
  await expect(page.getByText(`Dados do jogo ${title} atualizados!`)).toBeVisible();

  await page.goto('/library');
  await expect(page.getByText('Concluído', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: `Editar ${title} na biblioteca` }).click();
  await page.getByRole('button', { name: 'Remover', exact: true }).click();
  await expect(page.getByText('Removido da biblioteca')).toBeVisible();
  await expect(page.getByRole('link', { name: `Abrir detalhes de ${title}` })).toHaveCount(0);
});
