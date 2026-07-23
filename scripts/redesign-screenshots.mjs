// Capture redesign screenshots for all Hubora routes across viewports.
// Run from project root with: node --experimental-strip-types scripts/redesign-screenshots.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.HUBORA_URL || 'http://localhost:3000';
const OUT = path.resolve('artifacts/redesign-route-gallery');
const BEFORE_AFTER = path.resolve('artifacts/redesign-before-after');

const VIEWPORTS = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

// Routes that must be screenshotted for the redesign gallery.
const ROUTES = [
  { id: 'home', path: '/', label: 'Home' },
  { id: 'discover', path: '/discover', label: 'Descobrir' },
  { id: 'radar', path: '/radar', label: 'Radar' },
  { id: 'library', path: '/library', label: 'Biblioteca' },
  { id: 'diary', path: '/diary', label: 'Diário' },
  { id: 'guide', path: '/guide', label: 'Guia' },
  { id: 'releases', path: '/releases', label: 'Lançamentos' },
  { id: 'profile', path: '/profile', label: 'Perfil' },
  { id: 'settings', path: '/settings', label: 'Configurações' },
  { id: 'login', path: '/login', label: 'Entrar' },
  { id: 'register', path: '/register', label: 'Cadastro' },
  { id: 'forgot-password', path: '/forgot-password', label: 'Recuperação' },
  { id: 'movies', path: '/movies', label: 'Filmes' },
  { id: 'series', path: '/series', label: 'Séries' },
  { id: 'anime', path: '/anime', label: 'Animes' },
  { id: 'doramas', path: '/doramas', label: 'Doramas' },
  { id: 'manga', path: '/manga', label: 'Mangás' },
  { id: 'comics', path: '/comics', label: 'Quadrinhos' },
  { id: 'books', path: '/books', label: 'Livros' },
  { id: 'novels', path: '/novels', label: 'Novels' },
  { id: 'games', path: '/games', label: 'Jogos' },
  { id: 'goals', path: '/goals', label: 'Metas' },
  { id: 'wrapped', path: '/wrapped', label: 'Wrapped' },
  { id: 'connections', path: '/connections', label: 'Conexões' },
  { id: 'insights', path: '/insights', label: 'Insights' },
  { id: 'providers', path: '/providers', label: 'Provedores' },
  { id: 'sources', path: '/sources', label: 'Conteúdo aberto' },
  { id: 'privacy', path: '/privacy', label: 'Privacidade' },
  { id: 'terms', path: '/terms', label: 'Termos' },
  { id: 'not-found', path: '/rota-inexistente-teste', label: '404' },
];

// Allows a bounded rerun after a slow route capture without recapturing the
// complete gallery. Example: HUBORA_ROUTE_IDS=terms,not-found.
const requestedRouteIds = (process.env.HUBORA_ROUTE_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const routesToCapture = requestedRouteIds.length
  ? ROUTES.filter((route) => requestedRouteIds.includes(route.id))
  : ROUTES;

if (requestedRouteIds.length && routesToCapture.length !== requestedRouteIds.length) {
  const known = new Set(routesToCapture.map((route) => route.id));
  const unknown = requestedRouteIds.filter((id) => !known.has(id));
  throw new Error(`Unknown screenshot route id(s): ${unknown.join(', ')}`);
}

const WAIT_AFTER_NAV_MS = 1200;

async function ensureDirs() {
  for (const dir of [OUT, BEFORE_AFTER, `${OUT}/light`, `${OUT}/dark`, `${OUT}/empty-states`, `${OUT}/interaction`]) {
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  }
}

async function waitForAppShell(page) {
  // Wait for shell to be present, then for any pending lazy chunk to finish.
  try {
    await page.waitForSelector('.hub-shell, [data-app-shell="true"], main#hub-main-content', { timeout: 8000 });
  } catch {
    // noop — some auth routes don't use the chrome
  }
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(WAIT_AFTER_NAV_MS);
}

async function captureRoute(browser, route, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText ?? 'unknown'}`);
  });

  try {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await waitForAppShell(page);
    const filename = `${OUT}/dark/${route.id}--${viewport.name}.png`;
    await page.screenshot({ path: filename, fullPage: false });
    return { ok: true, file: filename, consoleErrors, failedRequests };
  } catch (error) {
    return { ok: false, error: String(error), consoleErrors, failedRequests };
  } finally {
    await context.close();
  }
}

async function captureEmptyStates(browser) {
  // Library empty: fresh storage so nothing is in the library.
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'dark',
    locale: 'pt-BR',
  });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/library`, { waitUntil: 'domcontentloaded' });
    await waitForAppShell(page);
    await page.screenshot({ path: `${OUT}/empty-states/library-empty.png`, fullPage: false });
  } finally {
    await context.close();
  }
}

async function captureInteractions(browser) {
  // Open command palette overlay screenshot
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await waitForAppShell(page);
    // Try common command palette triggers
    for (const keys of ['Control+k', 'Meta+k', 'Control+Slash', 'Meta+Slash']) {
      try {
        await page.keyboard.press(keys);
        await page.waitForTimeout(400);
        const visible = await page.locator('[role="dialog"], .command-palette, [data-cmdk-root]').first().isVisible().catch(() => false);
        if (visible) break;
      } catch { /* noop */ }
    }
    await page.screenshot({ path: `${OUT}/interaction/command-palette.png`, fullPage: false });
  } finally {
    await context.close();
  }
}

async function main() {
  await ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const route of routesToCapture) {
      for (const viewport of VIEWPORTS) {
        // Avoid double work on mobile routes that share the same shell
        const result = await captureRoute(browser, route, viewport);
        results.push({ route: route.path, viewport: viewport.name, ...result });
      }
    }
    await captureEmptyStates(browser);
    await captureInteractions(browser);
  } finally {
    await browser.close();
  }

  // Persist a report alongside the gallery
  const report = {
    base: BASE,
    generatedAt: new Date().toISOString(),
    totalCaptures: results.length,
    successful: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    consoleErrorCount: results.reduce((acc, r) => acc + (r.consoleErrors?.length ?? 0), 0),
    failedRequestCount: results.reduce((acc, r) => acc + (r.failedRequests?.length ?? 0), 0),
    routes: routesToCapture.length,
    viewports: VIEWPORTS.length,
    failures: results.filter((r) => !r.ok),
    details: results,
  };
  const reportPath = `${OUT}/_report.json`;
  await import('node:fs/promises').then((fs) => fs.writeFile(reportPath, JSON.stringify(report, null, 2)));
  console.log(`Captured ${results.length} screenshots. Report: ${reportPath}`);
  console.log(`Success: ${report.successful}, Failed: ${report.failed}, Console errors: ${report.consoleErrorCount}, Failed requests: ${report.failedRequestCount}`);
}

main().catch((error) => {
  console.error('Screenshot run failed:', error);
  process.exitCode = 1;
});
