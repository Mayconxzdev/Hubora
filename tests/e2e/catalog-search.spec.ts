import { expect, test } from '@playwright/test';

const requiredCatalogSearches = [
  { category: 'Filmes', route: '/movies', title: 'Interestelar' },
  { category: 'Filmes', route: '/movies', title: 'O Poderoso Chefão' },
  { category: 'Séries', route: '/series', title: 'Stranger Things' },
  { category: 'Séries', route: '/series', title: 'Breaking Bad' },
  { category: 'Doramas', route: '/doramas', title: 'Pousando no Amor' },
  { category: 'Doramas', route: '/doramas', title: 'Uma Advogada Extraordinária' },
  { category: 'Animes', route: '/anime', title: 'Fullmetal Alchemist: Brotherhood' },
  { category: 'Animes', route: '/anime', title: 'Attack on Titan' },
  { category: 'Mangás', route: '/manga', title: 'One Piece' },
  { category: 'Mangás', route: '/manga', title: 'Chainsaw Man' },
  { category: 'Quadrinhos', route: '/comics', title: 'Batman: O Cavaleiro das Trevas' },
  { category: 'Quadrinhos', route: '/comics', title: 'Spider-Man: Blue' },
  { category: 'Livros', route: '/books', title: 'Dom Casmurro' },
  { category: 'Livros', route: '/books', title: 'A Metamorfose' },
  { category: 'Novels', route: '/novels', title: 'Solo Leveling' },
  { category: 'Novels', route: '/novels', title: 'Overlord' },
  { category: 'Jogos', route: '/games', title: 'Cyberpunk 2077' },
  { category: 'Jogos', route: '/games', title: 'Hades' },
] as const;

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('pesquisas obrigatórias do catálogo', () => {
  test.describe.configure({ mode: 'serial' });

  for (const scenario of requiredCatalogSearches) {
    test(`${scenario.category}: encontra ${scenario.title} pela interface`, async ({ page }) => {
      test.setTimeout(75_000);
      const ownRequestFailures: string[] = [];
      page.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin === 'http://127.0.0.1:4187' && url.pathname.startsWith('/api/') && response.status() >= 400) {
          const upstreamPath = url.pathname === '/api/tmdb' ? ` path=${url.searchParams.get('path') || ''}` : '';
          ownRequestFailures.push(`${response.status()} ${url.pathname}${upstreamPath}`);
        }
      });

      await page.goto(scenario.route);
      const search = page.getByPlaceholder(/buscar nesta (?:seção|categoria)/i);
      await expect(search).toBeVisible();
      await search.fill(scenario.title);

      const result = page.getByRole('link', {
        name: new RegExp(`^Abrir detalhes de ${escaped(scenario.title)}$`, 'i'),
      }).first();
      await expect(result).toBeVisible({ timeout: 60_000 });
      const detailsHref = await result.getAttribute('href');
      await result.click();
      await expect(page).toHaveURL(/\/details\//);
      await expect(page.getByRole('heading', { name: new RegExp(`^${escaped(scenario.title)}$`, 'i') }).first()).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('body')).not.toContainText(/erro fatal|algo deu errado/i);

      if (ownRequestFailures.length > 0) {
        expect(
          ownRequestFailures.every((failure) => failure === '429 /api/google-books'),
          `Falhas próprias observadas: ${ownRequestFailures.join(', ')}`,
        ).toBe(true);
        expect(detailsHref).toMatch(/\/details\/(?:ol-|official-(?:comic|novel)-)/);
      }
    });
  }
});
