import { expect, test } from '@playwright/test';

const openMovie = 'http://127.0.0.1:4187/__e2e__/player-test.webm';

test('reproduz filme aberto por 30 segundos e restaura a posição', async ({ page }) => {
  test.setTimeout(120_000);
  const mediaResponses: string[] = [];
  const requestFailures: string[] = [];
  const consoleErrors: string[] = [];
  page.on('response', (response) => {
    if (response.url() === openMovie) mediaResponses.push(`${response.status()} ${response.headers()['content-type'] || ''}`);
  });
  page.on('requestfailed', (request) => {
    if (request.url() === openMovie) requestFailures.push(request.failure()?.errorText || 'falha sem descrição');
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const params = new URLSearchParams({
    kind: 'video',
    url: openMovie,
    title: 'Mídia autorizada de teste do Hubora',
  });
  await page.goto(`/player?${params.toString()}`);
  await expect(page.getByRole('heading', { name: 'Mídia autorizada de teste do Hubora' })).toBeVisible({ timeout: 15_000 });
  const video = page.locator('video');
  await expect(video).toBeVisible();
  try {
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
  } catch {
    const mediaState = await video.evaluate((element: HTMLVideoElement) => ({
      currentSrc: element.currentSrc,
      errorCode: element.error?.code || 0,
      networkState: element.networkState,
      readyState: element.readyState,
    }));
    throw new Error(`Mídia não carregou: ${JSON.stringify({ mediaState, mediaResponses, requestFailures, consoleErrors })}`);
  }

  await video.evaluate((element: HTMLVideoElement) => element.play());
  const startedAt = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime), {
    timeout: 50_000,
    intervals: [1_000],
  }).toBeGreaterThan(startedAt + 30);

  await page.keyboard.press('Space');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  const pausedAt = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(pausedAt - 9);
  await page.keyboard.press('KeyM');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await page.getByRole('button', { name: '1.5x', exact: true }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.playbackRate)).toBe(1.5);
  const savedAt = await video.evaluate((element: HTMLVideoElement) => element.currentTime);

  await page.reload();
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime), { timeout: 10_000 }).toBeGreaterThan(savedAt - 2);
});
