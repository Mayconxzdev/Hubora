// Capture the missing routes and auxiliary screenshots for the redesign gallery.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.HUBORA_URL || 'http://localhost:3000';
const OUT = path.resolve('artifacts/redesign-route-gallery');

const VIEWPORTS = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const MISSING_ROUTES = [
  { id: 'forgot-password', path: '/forgot-password', label: 'Recuperação' },
  { id: 'privacy', path: '/privacy', label: 'Privacidade' },
  { id: 'terms', path: '/terms', label: 'Termos' },
  { id: 'not-found', path: '/rota-inexistente-teste', label: '404' },
];

async function ensureDirs() {
  for (const dir of [OUT, `${OUT}/dark`, `${OUT}/empty-states`, `${OUT}/interaction`]) {
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  }
}

async function waitForAppShell(page) {
  try {
    await page.waitForSelector('main#hub-main-content, .hub-shell, [data-app-shell="true"]', { timeout: 8000 });
  } catch {}
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => undefined);
  await page.waitForTimeout(800);
}

async function main() {
  await ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  try {
    // Capture the missing routes
    for (const route of MISSING_ROUTES) {
      for (const viewport of VIEWPORTS) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: 'dark',
          locale: 'pt-BR',
        });
        const page = await context.newPage();
        page.on('pageerror', (err) => errors.push(`${route.path}@${viewport.name} :: ${err.message}`));
        try {
          await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await waitForAppShell(page);
          await page.screenshot({ path: `${OUT}/dark/${route.id}--${viewport.name}.png`, fullPage: false });
        } catch (error) {
          errors.push(`${route.path}@${viewport.name} :: ${String(error)}`);
        } finally {
          await context.close();
        }
      }
    }

    // Empty states
    const emptyStates = [
      { path: '/library', id: 'library-empty-desktop', viewport: { width: 1920, height: 1080 } },
      { path: '/library', id: 'library-empty-mobile', viewport: { width: 390, height: 844 } },
      { path: '/diary', id: 'diary-empty-desktop', viewport: { width: 1920, height: 1080 } },
      { path: '/goals', id: 'goals-empty-desktop', viewport: { width: 1920, height: 1080 } },
    ];
    for (const state of emptyStates) {
      const context = await browser.newContext({ viewport: state.viewport, colorScheme: 'dark', locale: 'pt-BR' });
      const page = await context.newPage();
      try {
        await page.goto(`${BASE}${state.path}`, { waitUntil: 'domcontentloaded' });
        await waitForAppShell(page);
        await page.screenshot({ path: `${OUT}/empty-states/${state.id}.png`, fullPage: false });
      } catch (error) {
        errors.push(`empty ${state.id} :: ${String(error)}`);
      } finally {
        await context.close();
      }
    }

    // Interaction: command palette
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await waitForAppShell(page);
      for (const keys of ['Control+k', 'Meta+k']) {
        await page.keyboard.press(keys);
        await page.waitForTimeout(400);
        const visible = await page.locator('[role="dialog"]').first().isVisible().catch(() => false);
        if (visible) break;
      }
      await page.screenshot({ path: `${OUT}/interaction/command-palette-desktop.png`, fullPage: false });
    } catch (error) {
      errors.push(`command-palette :: ${String(error)}`);
    } finally {
      await context.close();
    }

    // Interaction: sidebar collapsed + expanded
    const contextSidebar = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
    const pageSidebar = await contextSidebar.newPage();
    try {
      await pageSidebar.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await waitForAppShell(pageSidebar);
      await pageSidebar.screenshot({ path: `${OUT}/interaction/sidebar-expanded.png`, fullPage: false });
    } catch (error) {
      errors.push(`sidebar :: ${String(error)}`);
    } finally {
      await contextSidebar.close();
    }
  } finally {
    await browser.close();
  }

  if (errors.length) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(`${OUT}/_errors.json`, JSON.stringify(errors, null, 2));
    console.log(`Captured with ${errors.length} errors. See ${OUT}/_errors.json`);
  } else {
    console.log('Captured missing + empty + interaction screenshots without errors.');
  }
}

main().catch((error) => {
  console.error('Run failed:', error);
  process.exitCode = 1;
});
