import { expect, test } from '@playwright/test';

test('detalhe de filme usa somente a coleção TMDB confirmada ao explorar formatos', async ({ page }) => {
  // Fixture de identidade já confirmada pelo TMDB. A consulta externa do
  // provedor é homologada separadamente; aqui a prova é que a interface não
  // perde nem inventa a relação ao consumir a identidade armazenada.
  await page.addInitScript(() => {
    localStorage.setItem('hubora:detail:tmdb-movie-969681', JSON.stringify({
      id: 'tmdb-movie-969681',
      title: 'Homem-Aranha: Um Novo Dia',
      originalTitle: 'Spider-Man: Brand New Day',
      mediaType: 'movie',
      source: 'tmdb',
      sourceId: 969681,
      collection: { provider: 'tmdb', providerId: '556', name: 'Coleção Homem-Aranha' },
    }));
  });
  await page.goto('/details/tmdb-movie-969681');
  await expect(page.getByRole('heading', { name: 'Homem-Aranha: Um Novo Dia', exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Sua atividade', exact: true }).click();
  const crossMedia = page.getByRole('link', { name: /explorar outros formatos/i });
  await expect(crossMedia).toBeVisible();
  const href = await crossMedia.getAttribute('href');
  expect(href).toBeTruthy();
  const collectionUrl = new URL(href!, 'http://hubora.local');
  const collectionQuery = collectionUrl.searchParams.get('q');
  expect(collectionUrl.searchParams.get('context')).toBe('tmdb-collection');
  expect(collectionUrl.searchParams.get('collection')).toBeTruthy();
  expect(collectionQuery).toBeTruthy();
  expect(collectionQuery!.trim().length).toBeGreaterThanOrEqual(2);

  await crossMedia.click();
  await expect(page.getByText(/contexto de coleção.*confirmado pelo TMDB/i)).toBeVisible();
  await expect(page.getByLabel('Busca em Descobrir')).toHaveValue(collectionQuery!);
  await expect(page.getByRole('heading', { name: new RegExp(`Resultados para “${collectionQuery!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') })).toBeVisible();
});
