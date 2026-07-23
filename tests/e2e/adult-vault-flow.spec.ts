import { expect, test, type Browser, type Page } from '@playwright/test';

const email = process.env.HUBORA_E2E_EMAIL?.trim();
const password = process.env.HUBORA_E2E_PASSWORD;
const credentialsAvailable = Boolean(email && password);
const pin = '2580';

test.use({ screenshot: 'off', trace: 'off', video: 'off' });

async function loginThroughInterface(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('voce@email.com').fill(email!);
  await page.getByPlaceholder('Sua senha').fill(password!);
  await page.getByRole('button', { name: 'Entrar com e-mail' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

async function enableVault(page: Page, configurePin: boolean) {
  await page.goto('/settings');
  await page.getByLabel('Ano de nascimento').fill(String(new Date().getFullYear() - 25));
  await page.getByRole('checkbox', { name: /Confirmo que tenho 18 anos/i }).check();
  await page.getByRole('button', { name: /Cofre Adulto Área privada/i }).click();
  await expect(page.getByRole('button', { name: /Cofre Adulto Área privada/i })).toHaveAttribute('aria-pressed', 'true');
  if (configurePin) {
    await page.getByLabel('PIN local').fill(pin);
    await page.getByRole('button', { name: 'Salvar PIN' }).click();
    await expect(page.getByRole('button', { name: 'Trocar PIN' })).toBeVisible();
  }
}

async function fetchProviderMarkedAdultTitle(): Promise<string> {
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: 'query { Page(page: 1, perPage: 1) { media(type: ANIME, isAdult: true, sort: POPULARITY_DESC) { isAdult title { romaji english } } } }',
    }),
  });
  if (!response.ok) throw new Error(`BLOCKED_EXTERNAL: AniList respondeu ${response.status}.`);
  const payload = await response.json() as { data?: { Page?: { media?: Array<{ isAdult: boolean; title: { romaji?: string; english?: string } }> } } };
  const candidate = payload.data?.Page?.media?.[0];
  const title = candidate?.title.romaji || candidate?.title.english;
  if (!candidate?.isAdult || !title) throw new Error('BLOCKED_EXTERNAL: AniList não retornou uma obra marcada como adulta.');
  return title;
}

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function observeProviderAdultTitles(page: Page): Set<string> {
  const titles = new Set<string>();
  page.on('response', (response) => {
    const url = response.url();
    if (!url.includes('api.jikan.moe/v4/anime') && !url.includes('graphql.anilist.co')) return;
    void response.json().then((payload: {
      data?: Array<{ title?: string; rating?: string; explicit_genres?: unknown[] }>
        | { Page?: { media?: Array<{ isAdult?: boolean; title?: { english?: string; romaji?: string; native?: string } }> } };
    }) => {
      if (Array.isArray(payload.data)) {
        for (const item of payload.data) {
          if (item.title && (item.rating?.toLowerCase().includes('rx') || item.explicit_genres?.length)) titles.add(item.title);
        }
        return;
      }
      for (const item of payload.data?.Page?.media || []) {
        if (!item.isAdult) continue;
        const title = item.title?.english || item.title?.romaji || item.title?.native;
        if (title) titles.add(title);
      }
    }).catch(() => undefined);
  });
  return titles;
}

async function proveDeviceIsolation(browser: Browser) {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4187' });
  try {
    const page = await context.newPage();
    await loginThroughInterface(page);
    await enableVault(page, false);
    await page.goto('/vault');
    await expect(page.getByRole('heading', { name: 'Proteja seu Cofre' })).toBeVisible();
    await expect(page.getByText('O PIN fica somente neste aparelho')).toBeVisible();
    await page.goto('/settings');
    await page.getByRole('button', { name: /Desativado Nenhum conteúdo adulto/i }).click();
  } finally {
    await context.close();
  }
}

test.describe('Cofre Adulto real e sem evidência gráfica explícita', () => {
  test.skip(!credentialsAvailable, 'BLOCKED_AUTH: execute npm run provision:e2e.');

  test('protege, isola, bloqueia e limpa um item marcado pelo provedor', async ({ page, browser }) => {
    test.setTimeout(240_000);
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'image') await route.abort();
      else await route.continue();
    });

    const adultTitle = await fetchProviderMarkedAdultTitle();
    await loginThroughInterface(page);
    await enableVault(page, true);

    await page.goto('/vault');
    await page.getByLabel('PIN do Cofre').fill(pin);
    await page.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(page.getByRole('heading', { name: 'Cofre Adulto' })).toBeVisible();
    await expect(page.getByText('Nenhum item adulto foi adicionado')).toBeVisible();

    await page.goto('/settings');
    const safeSearch = page.getByRole('switch', { name: 'Proteção de busca para conteúdo explícito' });
    await expect(safeSearch).toBeEnabled();
    await safeSearch.click();
    await expect(safeSearch).toHaveAttribute('aria-checked', 'false');

    const providerAdultTitles = observeProviderAdultTitles(page);
    await page.goto('/anime');
    await page.getByRole('searchbox', { name: 'Pesquisar nesta categoria' }).fill(adultTitle);
    let providerVerifiedTitle = '';
    await expect.poll(async () => {
      for (const title of providerAdultTitles) {
        const candidate = page.getByRole('button', { name: new RegExp(`^Adicionar ${escaped(title)} à biblioteca$`, 'i') });
        if (await candidate.count()) {
          providerVerifiedTitle = title;
          return true;
        }
      }
      return false;
    }, { timeout: 30_000, message: 'Nenhum card marcado como adulto pelo provedor chegou ao catálogo.' }).toBe(true);
    const addButton = page.getByRole('button', { name: new RegExp(`^Adicionar ${escaped(providerVerifiedTitle)} à biblioteca$`, 'i') }).first();
    await addButton.click();
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.goto('/vault');
    await expect(page.getByLabel('Item privado oculto')).toHaveCount(1);
    await expect(page.locator('section[aria-label="Itens privados do Cofre"] img')).toHaveCount(0);
    await page.getByRole('button', { name: 'Revelar capas' }).click();
    await expect(page.getByRole('button', { name: /^Editar .+ na biblioteca$/ })).toHaveCount(1);
    await page.getByRole('button', { name: 'Ocultar capas' }).click();
    await expect(page.getByLabel('Item privado oculto')).toHaveCount(1);

    await proveDeviceIsolation(browser);

    await page.getByRole('button', { name: 'Bloquear' }).click();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.getByLabel('PIN do Cofre').fill('0000');
      await page.getByRole('button', { name: 'Desbloquear' }).click();
    }
    await expect(page.getByText(/Bloqueio temporário: aguarde/)).toBeVisible();
    await page.reload();
    await page.getByLabel('PIN do Cofre').fill(pin);
    await expect(page.getByRole('button', { name: 'Desbloquear' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Desbloquear' })).toBeEnabled({ timeout: 12_000 });
    await page.getByRole('button', { name: 'Desbloquear' }).click();

    await page.getByRole('button', { name: 'Revelar capas' }).click();
    await page.getByRole('button', { name: /^Editar .+ na biblioteca$/ }).click();
    await page.getByRole('button', { name: 'Remover' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('Nenhum item adulto foi adicionado')).toBeVisible();

    await page.goto('/settings');
    await expect(safeSearch).toHaveAttribute('aria-checked', 'false');
    await safeSearch.click();
    await page.getByRole('button', { name: 'Remover PIN' }).click();
    await page.getByRole('button', { name: /Desativado Nenhum conteúdo adulto/i }).click();
  });
});
