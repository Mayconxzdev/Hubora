import { expect, test } from '@playwright/test';

test('abre o Hubora sem erro fatal', async ({ page }) => {
  const runtimeErrors: string[] = [];
  const reactErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /Uncaught error:|Minified React error/i.test(message.text())) {
      reactErrors.push(message.text());
    }
  });
  await page.goto('/');
  await page.waitForTimeout(1_200);
  await expect(page).toHaveTitle(/Hubora/i);
  await expect(page.locator('body')).toContainText(/Hubora/i);
  await expect(page.locator('body')).not.toContainText(/algo deu errado|erro fatal/i);
  expect(runtimeErrors).toEqual([]);
  expect(reactErrors).toEqual([]);
});

test('carrega as rotas pessoais e o manifesto da PWA', async ({ page, request }) => {
  await page.goto('/radar');
  await expect(page.locator('body')).toContainText(/Radar/i);
  await page.goto('/library');
  await expect(page.locator('body')).toContainText(/Biblioteca/i);

  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  await expect(manifest.json()).resolves.toMatchObject({ name: 'Hubora', display: 'standalone' });
});

test('mantém as áreas principais simples e navegáveis', async ({ page }) => {
  const routes: Array<[string, RegExp]> = [
    ['/', /O que combina com você agora/i],
    ['/discover', /Descobrir/i],
    ['/library', /Minha lista|Biblioteca/i],
    ['/movies', /Filmes/i],
    ['/series', /Séries/i],
    ['/anime', /Animes/i],
    ['/manga', /Mangás/i],
    ['/doramas', /Doramas/i],
    ['/books', /Livros/i],
    ['/comics', /Quadrinhos/i],
    ['/games', /Jogos/i],
    ['/radar', /Radar/i],
    ['/sources', /Grátis agora/i],
    ['/providers', /Fontes e Companion/i],
    ['/settings', /Configurações/i],
  ];

  for (const [route, text] of routes) {
    await page.goto(route);
    await expect(page.locator('body')).toContainText(text);
    await expect(page.locator('body')).not.toContainText(/erro fatal|algo deu errado/i);
  }
});

test('tema escuro é preto e tema claro é branco', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const themeButton = page.getByRole('button', { name: /ativar tema (claro|escuro)/i });

  if (await html.evaluate((element) => element.classList.contains('light'))) {
    await themeButton.click();
  }
  await expect.poll(() => page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(0, 0, 0)');

  await page.getByRole('button', { name: /ativar tema claro/i }).click();
  await expect(html).toHaveClass(/light/);
  await expect.poll(() => page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)');
});

test('home começa pelas categorias e quatro situações', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /o que combina com você agora/i })).toBeVisible();
  for (const label of ['Quero continuar', 'Tenho pouco tempo', 'Quero descobrir', 'Me surpreenda']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${label}\\b`, 'i') })).toBeVisible();
  }
  for (const label of ['Filmes', 'Séries', 'Animes', 'Mangás', 'Doramas', 'Livros', 'Quadrinhos', 'Jogos', 'Novels', 'Audiolivros']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
});

test('celular usa quatro destinos e não cria rolagem lateral', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('android'), 'Validação específica do perfil Android');
  await page.goto('/');
  const mobileNav = page.getByRole('navigation', { name: /navegação móvel/i });
  await expect(mobileNav.getByRole('link')).toHaveCount(4);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
