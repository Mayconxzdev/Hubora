import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __huboraPerformance?: { cls: number; lcp: number; longTasks: number; shifts: unknown[] };
  }
}

test('home atende aos limites de laboratório e responde sem travar', async ({ page }) => {
  await page.addInitScript(() => {
    window.__huboraPerformance = { cls: 0, lcp: 0, longTasks: 0, shifts: [] };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__huboraPerformance!.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number; sources?: Array<{ node?: Node; previousRect?: DOMRectReadOnly; currentRect?: DOMRectReadOnly }> }>) {
        if (!entry.hadRecentInput) {
          window.__huboraPerformance!.cls += entry.value || 0;
          window.__huboraPerformance!.shifts.push({
            value: entry.value || 0,
            sources: entry.sources?.map((source) => ({
              node: source.node instanceof Element ? `${source.node.tagName.toLowerCase()}#${source.node.id}.${source.node.className}` : String(source.node),
              previous: source.previousRect?.toJSON(),
              current: source.currentRect?.toJSON(),
            })),
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      window.__huboraPerformance!.longTasks += list.getEntries().filter((entry) => entry.duration > 200).length;
    }).observe({ type: 'longtask', buffered: true });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /o que combina com você agora/i })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__huboraPerformance?.lcp || 0), { timeout: 10_000 }).toBeGreaterThan(0);

  const shortMode = page.getByRole('button', { name: /^Tenho pouco tempo\b/i });
  await page.evaluate(() => { window.__huboraPerformance!.longTasks = 0; });
  const interactionDuration = await shortMode.evaluate(async (button: HTMLButtonElement) => {
    const started = performance.now();
    button.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return performance.now() - started;
  });
  await expect(shortMode).toHaveAttribute('aria-pressed', 'true');

  const metrics = await page.evaluate(() => window.__huboraPerformance!);
  expect(metrics.lcp, `LCP local: ${metrics.lcp.toFixed(1)} ms`).toBeLessThanOrEqual(2_500);
  expect(metrics.cls, `CLS local: ${metrics.cls.toFixed(4)} ${JSON.stringify(metrics.shifts)}`).toBeLessThanOrEqual(0.1);
  expect(metrics.longTasks, 'Tarefas superiores a 200 ms').toBe(0);
  expect(interactionDuration, `Interação: ${interactionDuration.toFixed(1)} ms`).toBeLessThan(500);
});
