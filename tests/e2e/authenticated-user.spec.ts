import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const email = process.env.HUBORA_E2E_EMAIL?.trim();
const password = process.env.HUBORA_E2E_PASSWORD;
const storageStatePath = resolve(process.env.HUBORA_E2E_STORAGE_STATE || '.playwright/hubora-e2e.json');
const credentialsAvailable = Boolean(email && password);

async function loginThroughInterface(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('voce@email.com').fill(email!);
  await page.getByPlaceholder('Sua senha').fill(password!);
  await page.getByRole('button', { name: 'Entrar com e-mail' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  await expect(page.getByText(email!, { exact: true })).toBeVisible();
}

test.describe('sessão autenticada real', () => {
  test.skip(!credentialsAvailable, 'BLOCKED_AUTH: execute npm run provision:e2e após aplicar a migration 004.');

  test('rejeita credenciais inválidas sem revelar detalhes da conta', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('voce@email.com').fill(email!);
    await page.getByPlaceholder('Sua senha').fill(`${password!}-incorreta`);
    await page.getByRole('button', { name: 'Entrar com e-mail' }).click();
    await expect(page.getByText('E-mail ou senha inválidos, ou conta não cadastrada.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('persiste a sessão após reload e reabertura do contexto, depois encerra no logout', async ({ page, browser }) => {
    test.setTimeout(90_000);
    await loginThroughInterface(page);

    await page.reload();
    await expect(page.getByText(email!, { exact: true })).toBeVisible();
    await page.goto('/library');
    await expect(page).toHaveURL(/\/library$/);

    mkdirSync(dirname(storageStatePath), { recursive: true });
    await page.context().storageState({ path: storageStatePath });

    const restoredContext = await browser.newContext({
      baseURL: 'http://127.0.0.1:4187',
      storageState: storageStatePath,
    });
    try {
      const restoredPage = await restoredContext.newPage();
      await restoredPage.goto('/profile');
      await expect(restoredPage.getByText(email!, { exact: true })).toBeVisible();
    } finally {
      await restoredContext.close();
    }

    await page.getByRole('button', { name: 'Abrir menu pessoal' }).click();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await page.goto('/profile');
    await expect(page.getByText('Entre na sua conta para acessar a sincronização pessoal.')).toBeVisible();
  });

  test('faz novo login num contexto limpo', async ({ browser }) => {
    const cleanContext = await browser.newContext({ baseURL: 'http://127.0.0.1:4187' });
    try {
      await loginThroughInterface(await cleanContext.newPage());
    } finally {
      await cleanContext.close();
    }
  });
});
