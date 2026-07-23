// Re-shoot the routes that had accessibility fixes
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.HUBORA_URL || 'http://localhost:3000';
const OUT = path.resolve('artifacts/redesign-route-gallery/dark');

const VIEWPORTS = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const ROUTES = [
  { id: 'library', path: '/library' },
  { id: 'movies', path: '/movies' },
  { id: 'series', path: '/series' },
  { id: 'anime', path: '/anime' },
  { id: 'manga', path: '/manga' },
  { id: 'games', path: '/games' },
  { id: 'profile', path: '/profile' },
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
  try {
    for (const route of ROUTES) {
      for (const viewport of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: 'dark', locale: 'pt-BR' });
        const page = await context.newPage();
        try {
          await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await waitForAppShell(page);
          await page.screenshot({ path: `${OUT}/${route.id}--${viewport.name}.png`, fullPage: false });
        } catch (error) {
          console.error(`${route.id}@${viewport.name} :: ${error}`);
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log('Re-shot done.');
}

main().catch((error) => {
  console.error('Reshoot failed:', error);
  process.exitCode = 1;
});
