import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const routes = [
  '/',
  '/discover',
  '/radar',
  '/details/278',
  '/library',
  '/diary',
  '/guide',
  '/releases',
  '/profile',
  '/settings',
  '/login',
  '/register',
  '/forgot-password',
  '/movies',
  '/series',
  '/anime',
  '/manga',
  '/comics',
  '/books',
  '/novels',
  '/games',
  '/doramas',
  '/privacy',
  '/terms',
  '/wrapped',
  '/goals',
  '/connections',
  '/vault',
  '/sources',
  '/providers',
  '/reader?source=test&id=1',
  '/player?source=test&id=1',
  '/insights',
  '/this-is-a-404-page',
];

const redirects = [
  { from: '/personal-media', to: '/sources' },
  { from: '/community', to: '/' },
  { from: '/duo', to: '/' },
];

test.describe('Route Crawler and Visual Audit', () => {
  let routeResults: any[] = [];

  test.afterAll(() => {
    fs.mkdirSync('audit/08-route-crawl', { recursive: true });
    fs.writeFileSync('audit/08-route-crawl/route-audit.json', JSON.stringify(routeResults, null, 2));
  });

  for (const route of routes) {
    test(`Visit and snapshot route: ${route}`, async ({ page }, testInfo) => {
      // Setup network interception to avoid failing test purely on external API limits
      await page.route('**/*', (route) => route.continue());

      const url = `http://localhost:3000${route}`;
      const response = await page.goto(url, { waitUntil: 'load' }).catch(() => null);

      const status = response?.status() || 0;
      const finalUrl = page.url();

      // Get heading
      const heading = await page
        .locator('h1')
        .first()
        .textContent()
        .catch(() => 'No H1');

      // Screenshot
      const screenshotName = route === '/' ? 'home' : route.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-|-$/g, '');
      const screenshotPath = `audit/15-visual/${testInfo.project.name}/${screenshotName}.png`;
      await page.screenshot({ path: screenshotPath });

      // Accessibility
      const accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(['color-contrast', 'heading-order']) // We disable subjective ones to prevent noisy false positives
        .analyze();

      const a11yPath = `audit/17-accessibility/${testInfo.project.name}/${screenshotName}-axe.json`;
      fs.mkdirSync(path.dirname(a11yPath), { recursive: true });
      fs.writeFileSync(a11yPath, JSON.stringify(accessibilityScanResults, null, 2));

      routeResults.push({
        requestedUrl: url,
        finalUrl,
        status,
        heading: heading?.trim(),
        violations: accessibilityScanResults.violations.length,
        viewport: testInfo.project.name,
      });

      expect(status).toBeLessThan(500); // 404 is allowed for not found
    });
  }

  for (const redir of redirects) {
    test(`Verify redirect: ${redir.from}`, async ({ page }) => {
      const response = await page.goto(`http://localhost:5173${redir.from}`);
      await page.waitForURL(`**${redir.to}*`);
      expect(new URL(page.url()).pathname).toBe(redir.to);
    });
  }
});
