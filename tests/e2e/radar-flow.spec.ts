import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test.describe('Radar 360°', () => {
  test('resolve um link oficial, explica a confiança e adiciona o resultado', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/radar');
    await page.getByRole('button', { name: /Colar link/i }).click();
    await page.getByLabel('Link para identificar').fill('https://www.themoviedb.org/movie/157336-interstellar');
    await page.getByRole('button', { name: 'Resolver link', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Interestelar', exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('99%', { exact: true })).toBeVisible();
    await expect(page.getByText(/identificador oficial da obra/i)).toBeVisible();
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect(page.getByText('Adicionado à biblioteca', { exact: true })).toBeVisible();

    await page.goto('/library');
    await page.getByRole('button', { name: 'Editar Interestelar na biblioteca' }).click();
    await page.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(page.getByText('Removido da biblioteca')).toBeVisible();
  });

  test('mostra estado sem resultado para um link inválido', async ({ page }) => {
    await page.goto('/radar');
    await page.getByRole('button', { name: /Colar link/i }).click();
    await page.getByLabel('Link para identificar').fill('isto não é uma URL');
    await page.getByRole('button', { name: 'Resolver link', exact: true }).click();

    await expect(page.getByText(/Nenhum candidato seguro foi encontrado/i)).toBeVisible();
  });

  test('seletores de imagem e vídeo funcionam por teclado', async ({ page }) => {
    await page.goto('/radar');
    const imagePicker = page.getByRole('button', { name: 'Escolher print ou imagem' });
    await imagePicker.focus();
    await expect(imagePicker).toBeFocused();

    await page.getByRole('button', { name: /Vídeo curto/i }).click();
    const videoPicker = page.getByRole('button', { name: 'Escolher vídeo curto' });
    await videoPicker.focus();
    await expect(videoPicker).toBeFocused();
  });

  test('executa OCR local em uma imagem segura e explica o candidato', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/radar');
    const pngDataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1400;
      canvas.height = 500;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D indisponível');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#000000';
      context.font = '700 170px Arial, sans-serif';
      context.textBaseline = 'middle';
      context.fillText('INTERESTELAR', 70, 250);
      return canvas.toDataURL('image/png');
    });
    const safeImage = Buffer.from(pngDataUrl.split(',')[1], 'base64');
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: 'interestelar-seguro.png',
      mimeType: 'image/png',
      buffer: safeImage,
    });
    await expect(page.getByRole('img', { name: 'Prévia do print' })).toBeVisible();
    await page.getByRole('button', { name: 'Identificar obra', exact: true }).click();

    const extractedTextSummary = page.getByText('Texto encontrado na imagem');
    await expect(extractedTextSummary).toBeVisible({ timeout: 90_000 });
    await extractedTextSummary.click();
    await expect(page.locator('details').getByText('INTERESTELAR', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interestelar', exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Texto encontrado no print coincide/i).first()).toBeVisible();
  });

  test('extrai três quadros de um vídeo local sem consentimento externo', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/radar');
    await page.getByRole('button', { name: /Vídeo curto/i }).click();
    const remoteConsent = page.getByRole('checkbox', { name: /Consultar anime no quadro central/i });
    await expect(remoteConsent).not.toBeChecked();

    await page.locator('input[type="file"][accept="video/*"]').setInputFiles(resolve('.playwright/assets/player-test.webm'));
    const preview = page.locator('video[controls]');
    await expect(preview).toBeVisible();
    await page.getByRole('button', { name: 'Analisar vídeo', exact: true }).click();

    await expect(page.getByRole('status', { name: 'Resumo da análise' })).toContainText('3 quadros analisados no aparelho', { timeout: 150_000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
