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
  await expect(page).toHaveTitle(/Hubora/i);
  await expect(page.getByRole('heading', { name: /o que combina com você agora/i })).toBeVisible();
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

test('rota desconhecida oferece recuperação explícita', async ({ page }) => {
  await page.goto('/esta-rota-nao-existe');
  await expect(page.getByRole('heading', { name: /página não encontrada/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /voltar para o início/i })).toHaveAttribute('href', '/');
});

test('expõe metadados do build para provar a versão implantada', async ({ request }) => {
  const response = await request.get('/build-meta.json');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('application/json');
  await expect(response.json()).resolves.toMatchObject({
    name: 'hubora',
    version: '1.0.0',
  });
  const metadata = await response.json();
  expect(metadata.commit).toMatch(/^[0-9a-f]{7,40}$/i);
  expect(Number.isNaN(Date.parse(metadata.builtAt))).toBe(false);
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
    ['/novels', /Novels/i],
    ['/comics', /Quadrinhos/i],
    ['/games', /Jogos/i],
    ['/radar', /Radar/i],
    ['/sources', /Grátis agora/i],
    ['/providers', /Fontes e provedores/i],
    ['/settings', /Configurações/i],
    ['/diary', /Diário Universal/i],
    ['/guide', /Guia de Franquias|Guia/i],
    ['/releases', /Lançamentos/i],
    ['/profile', /Entre na sua conta|Minha conta/i],
    ['/login', /Entrar no Hubora/i],
    ['/register', /Crie seu Hubora/i],
    ['/forgot-password', /Recupere seu acesso/i],
    ['/privacy', /Seus dados continuam seus/i],
    ['/terms', /O que o Hubora faz/i],
    ['/wrapped', /Hubora Wrapped/i],
    ['/goals', /Metas e hábitos/i],
    ['/connections', /Grafo de conexões/i],
    ['/vault', /Cofre Adulto/i],
    ['/reader', /Leitor para Google Books|Leitura/i],
    ['/player', /Player para URLs HTTPS|Reprodução/i],
    ['/insights', /Insights/i],
  ];

  for (const [route, text] of routes) {
    await page.goto(route);
    await expect(page.locator('body')).toContainText(text);
    await expect(page.locator('body')).not.toContainText(/erro fatal|algo deu errado/i);
  }
});

test('recursos ainda não implementados não fingem existir', async ({ page }) => {
  for (const route of ['/personal-media', '/community', '/duo']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: /página não encontrada/i })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
  }
});

test('não expõe Companion, debrid ou mídia local como produto', async ({ page }) => {
  await page.goto('/providers');
  await expect(page.getByRole('heading', { name: /fontes e provedores/i })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Companion|Real-Debrid|TorBox|Baixar para Windows/i);

  await page.goto('/settings');
  await expect(page.locator('body')).not.toContainText(/Companion|Real-Debrid|TorBox|WebTorrent/i);

  await page.goto('/personal-media');
  await expect(page.getByRole('heading', { name: /página não encontrada/i })).toBeVisible();
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
  for (const label of ['Filmes', 'Séries', 'Animes', 'Mangás', 'Doramas', 'Livros', 'Quadrinhos', 'Jogos', 'Novels']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
});

test('layout adaptativo não cria rolagem lateral', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /o que combina com você agora/i })).toBeVisible();
  if (testInfo.project.name.includes('android')) {
    const mobileNav = page.getByRole('navigation', { name: /navegação móvel/i });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link')).toHaveCount(4);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('paleta, Escape, busca responsiva e histórico funcionam por teclado', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.keyboard.press('Control+K');
  const palette = page.getByRole('dialog', { name: 'Ir para' });
  await expect(palette).toBeVisible();
  const paletteSearch = palette.getByPlaceholder('Digite uma área ou ação...');
  await expect(paletteSearch).toBeFocused();
  await paletteSearch.fill('novels');
  await expect(palette.getByRole('button', { name: 'Novels', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(palette).toHaveCount(0);

  await page.keyboard.press('Control+K');
  await palette.getByPlaceholder('Digite uma área ou ação...').fill('novels');
  await palette.getByRole('button', { name: 'Novels', exact: true }).click();
  await expect(page).toHaveURL(/\/novels$/);

  if (testInfo.project.name.includes('android')) {
    await page.getByRole('navigation', { name: 'Navegação móvel' }).getByRole('link', { name: 'Buscar' }).click();
    await expect(page).toHaveURL(/\/discover\?focus=search$/);
    const responsiveSearch = page.getByPlaceholder('Busque um título ou descreva o que procura...');
    await responsiveSearch.fill('Interestelar');
    await responsiveSearch.press('Enter');
    await expect(page.getByRole('link', { name: 'Abrir detalhes de Interestelar', exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/discover\?focus=search$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/novels$/);
    await page.goForward();
    await page.goForward();
    await expect(page).toHaveURL(/\/discover/);
  } else {
    const globalSearch = page.getByRole('textbox', { name: 'Buscar em todo o Hubora' });
    await globalSearch.fill('Interestelar');
    await globalSearch.press('Enter');
    await expect(page).toHaveURL(/\/discover\?q=Interestelar$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/novels$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/discover/);
  }
});

test('menu de categorias contém exatamente as nove categorias oficiais', async ({ page }, testInfo) => {
  await page.goto('/');

  if (testInfo.project.name.includes('android')) {
    const categoryGrid = page.getByRole('navigation', { name: 'Escolher categoria' });
    await expect(categoryGrid).toBeVisible();
    const categoryNames = ['Filmes', 'Séries', 'Animes', 'Mangás', 'Doramas', 'Livros', 'Quadrinhos', 'Jogos', 'Novels'];
    await expect(categoryGrid.getByRole('button')).toHaveCount(9);
    for (const name of categoryNames) await expect(categoryGrid.getByRole('button', { name, exact: true })).toHaveCount(1);
    await categoryGrid.getByRole('button', { name: 'Novels', exact: true }).click();
    await expect(page).toHaveURL(/\/novels$/);
    return;
  }

  await page.getByRole('button', { name: 'Categorias', exact: true }).click();
  const menu = page.locator('.hub-category-menu');
  await expect(menu).toBeVisible();
  const categoryPaths = ['/movies', '/series', '/anime', '/manga', '/doramas', '/books', '/novels', '/comics', '/games'];
  for (const path of categoryPaths) await expect(menu.locator(`a[href="${path}"]`)).toHaveCount(1);
  await expect(menu.locator('a').filter({ hasNotText: /Fontes e provedores|Ler e assistir grátis/ })).toHaveCount(9);
});

test('campos de autenticação reservam espaço para os ícones', async ({ page }) => {
  for (const route of ['/login', '/register', '/forgot-password']) {
    await page.goto(route);
    const decoratedFields = page.locator('input[class*="hub-field-with-leading-icon"]');
    await expect(decoratedFields.first()).toBeVisible();

    for (const field of await decoratedFields.all()) {
      const paddingLeft = await field.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingLeft));
      expect(paddingLeft, `Espaço do ícone em ${route}`).toBeGreaterThanOrEqual(44);
    }
  }
});

test('visitante controla e protege os próprios dados locais', async ({ page }) => {
  await page.goto('/settings');

  for (const name of [
    'Exportar JSON',
    'Importar JSON',
    'Importar CSV',
    'Criar snapshot local',
    'Limpar cache',
    'Apagar dados locais',
    'Entrar para sincronizar',
  ]) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
});
