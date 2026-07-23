// Run accessibility audit with axe-core across the main routes
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.HUBORA_URL || 'http://localhost:3000';
const OUT = path.resolve('artifacts/redesign-playwright');

const ROUTES = [
  { id: 'home', path: '/' },
  { id: 'discover', path: '/discover' },
  { id: 'library', path: '/library' },
  { id: 'movies', path: '/movies' },
  { id: 'series', path: '/series' },
  { id: 'anime', path: '/anime' },
  { id: 'manga', path: '/manga' },
  { id: 'books', path: '/books' },
  { id: 'games', path: '/games' },
  { id: 'login', path: '/login' },
  { id: 'settings', path: '/settings' },
  { id: 'profile', path: '/profile' },
];

async function ensureDirs() {
  for (const dir of [OUT, `${OUT}/axe`]) {
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
  const axeSrc = await readFile('node_modules/axe-core/axe.min.js', 'utf-8').catch(() => null);
  if (!axeSrc) {
    console.warn('axe-core not found, falling back to dynamic import.');
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const route of ROUTES) {
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark', locale: 'pt-BR' });
      const page = await context.newPage();
      try {
        await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
        await waitForAppShell(page);
        if (axeSrc) {
          await page.addScriptTag({ content: axeSrc });
        } else {
          await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/axe-core@4.10.0/axe.min.js' });
        }
        const audit = await page.evaluate(async () => {
          // @ts-ignore
          return await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'] },
            resultTypes: ['violations', 'incomplete'],
          });
        });
        const violations = (audit.violations ?? []).map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.length,
          target: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
        }));
        results.push({
          route: route.path,
          id: route.id,
          violationsCount: violations.length,
          incompleteCount: audit.incomplete?.length ?? 0,
          violations: violations,
        });
      } catch (error) {
        results.push({ route: route.path, id: route.id, error: String(error) });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  await writeFile(`${OUT}/axe/_summary.json`, JSON.stringify({
    generatedAt: new Date().toISOString(),
    base: BASE,
    routes: results.length,
    routesWithViolations: results.filter(r => r.violationsCount > 0).length,
    totalViolations: results.reduce((a, r) => a + (r.violationsCount ?? 0), 0),
    totalIncomplete: results.reduce((a, r) => a + (r.incompleteCount ?? 0), 0),
    details: results,
  }, null, 2));

  // Build markdown summary
  const lines = [];
  lines.push('# Hubora — auditoria de acessibilidade (axe-core)');
  lines.push('');
  lines.push(`Gerado em: ${new Date().toISOString()}`);
  lines.push(`Base: ${BASE}`);
  lines.push('');
  lines.push(`Rotas auditadas: ${results.length}`);
  lines.push(`Rotas com violações: ${results.filter(r => r.violationsCount > 0).length}`);
  lines.push(`Total de violações: ${results.reduce((a, r) => a + (r.violationsCount ?? 0), 0)}`);
  lines.push(`Total de itens incompletos: ${results.reduce((a, r) => a + (r.incompleteCount ?? 0), 0)}`);
  lines.push('');
  lines.push('| Rota | Violações | Incompletos | Críticas | Sérias | Moderadas |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of results) {
    const critical = (r.violations ?? []).filter(v => v.impact === 'critical').length;
    const serious = (r.violations ?? []).filter(v => v.impact === 'serious').length;
    const moderate = (r.violations ?? []).filter(v => v.impact === 'moderate').length;
    lines.push(`| ${r.route} | ${r.violationsCount ?? 0} | ${r.incompleteCount ?? 0} | ${critical} | ${serious} | ${moderate} |`);
  }
  lines.push('');
  lines.push('## Detalhes por rota');
  for (const r of results) {
    lines.push(`### ${r.route}`);
    if (r.error) {
      lines.push(`- Erro: ${r.error}`);
      continue;
    }
    if (!r.violations?.length) {
      lines.push('- Sem violações automáticas.');
    }
    for (const v of r.violations ?? []) {
      lines.push(`- **${v.id}** (${v.impact}): ${v.help} — ${v.nodes} ocorrência(s).`);
    }
  }
  await writeFile(`${OUT}/axe/_summary.md`, lines.join('\n'));
  console.log(`Accessibility audit: ${results.length} routes, ${results.reduce((a, r) => a + (r.violationsCount ?? 0), 0)} violations.`);
}

main().catch((error) => {
  console.error('Accessibility audit failed:', error);
  process.exitCode = 1;
});
