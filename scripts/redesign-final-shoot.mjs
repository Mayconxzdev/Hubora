// Final shoot of the key post-fix routes
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.HUBORA_URL || 'http://localhost:3000';
const OUT = path.resolve('artifacts/redesign-route-gallery/dark');

const ROUTES = [
  { id: 'home', path: '/' },
  { id: 'library', path: '/library' },
  { id: 'profile', path: '/profile' },
  { id: 'movies', path: '/movies' },
  { id: 'series', path: '/series' },
  { id: 'anime', path: '/anime' },
  { id: 'manga', path: '/manga' },
  { id: 'games', path: '/games' },
  { id: 'discover', path: '/discover' },
  { id: 'settings', path: '/settings' },
  { id: 'wrapped', path: '/wrapped' },
  { id: 'goals', path: '/goals' },
  { id: 'connections', path: '/connections' },
  { id: 'providers', path: '/providers' },
  { id: 'sources', path: '/sources' },
  { id: 'releases', path: '/releases' },
  { id: 'diary', path: '/diary' },
  { id: 'guide', path: '/guide' },
  { id: 'books', path: '/books' },
  { id: 'novels', path: '/novels' },
  { id: 'doramas', path: '/doramas' },
  { id: 'comics', path: '/comics' },
];

async function ensureDirs() {
  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });
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
    for (const route of ROUTES) {
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark', locale: 'pt-BR' });
      const page = await context.newPage();
      try {
        await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await waitForAppShell(page);
        await page.screenshot({ path: `${OUT}/${route.id}--desktop-1920x1080.png`, fullPage: false });
      } catch (error) {
        errors.push(`${route.id} :: ${String(error).substring(0, 200)}`);
      } finally {
        await context.close();
      }
    }
    // Mobile shot of the key fixes
    for (const id of ['home', 'library', 'profile', 'movies', 'discover']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', locale: 'pt-BR' });
      const page = await context.newPage();
      try {
        const path = ROUTES.find((r) => r.id === id).path;
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
        await waitForAppShell(page);
        await page.screenshot({ path: `${OUT}/${id}--mobile-390x844.png`, fullPage: false });
      } catch (error) {
        errors.push(`${id}@mobile :: ${String(error).substring(0, 200)}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  if (errors.length) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(`${OUT}/_errors.json`, JSON.stringify(errors, null, 2));
  }
  console.log(`Final shoot done. Errors: ${errors.length}.`);
}

main().catch((error) => {
  console.error('Final shoot failed:', error);
  process.exitCode = 1;
});
