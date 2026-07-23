import { expect, test } from '@playwright/test';

test('adiciona, edita, persiste offline, registra no diário e remove uma obra', async ({ page, context }) => {
  test.setTimeout(90_000);
  const title = 'Interestelar';

  await page.goto('/movies');
  const categorySearch = page.getByPlaceholder(/buscar nesta (?:seção|categoria)/i);
  await categorySearch.fill(title);
  await page.getByRole('link', { name: `Abrir detalhes de ${title}` }).first().click();
  await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Adicionar à Biblioteca' }).click();
  await expect(page.getByRole('button', { name: 'Adicionado à Biblioteca' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Adicionado à Biblioteca' })).toBeVisible();

  await page.goto('/library');
  await expect(page.getByRole('link', { name: `Abrir detalhes de ${title}` })).toBeVisible();
  await page.getByRole('button', { name: `Editar ${title} na biblioteca` }).click();
  await page.getByRole('button', { name: 'Em andamento', exact: true }).click();
  await page.getByRole('button', { name: 'Nota 8' }).click();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Biblioteca atualizada')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Em andamento', { exact: true }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker?.controller)), { timeout: 20_000 }).toBe(true);
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: `Abrir detalhes de ${title}` })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
  await page.getByRole('button', { name: `Avançar progresso de ${title}` }).click();
  await expect(page.getByText('Filme marcado como assistido')).toBeVisible();

  await page.goto('/diary');
  await expect(page.getByRole('link', { name: title, exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Concluiu a obra|Avaliou com 8 estrelas|Alterou o status/i).first()).toBeVisible();

  await page.goto('/library');
  await page.getByRole('button', { name: `Editar ${title} na biblioteca` }).click();
  await page.getByRole('button', { name: 'Remover', exact: true }).click();
  await expect(page.getByText('Removido da biblioteca')).toBeVisible();
  await expect(page.getByRole('link', { name: `Abrir detalhes de ${title}` })).toHaveCount(0);
});
