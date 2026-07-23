import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

test.describe('Global Search E2E', () => {
  let searchResults: any[] = [];

  test.afterAll(() => {
    fs.mkdirSync('audit/11-search', { recursive: true });
    fs.writeFileSync('audit/11-search/search-audit.json', JSON.stringify(searchResults, null, 2));
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
    // Open search by clicking the search trigger or pressing Ctrl+K
    await page.keyboard.press('Control+K');
    await expect(page.getByRole('combobox', { name: /buscar/i })).toBeVisible();
  });

  const queries = [
    'homem aranha',
    'Spider-Man',
    'one piece',
    'harry potter',
    'asdfjklqwerty', // no result
  ];

  for (const q of queries) {
    test(`Search query: ${q}`, async ({ page }, testInfo) => {
      const input = page.getByRole('combobox', { name: /buscar/i });

      // Type incrementally
      for (let i = 0; i < q.length; i++) {
        await input.type(q[i], { delay: 50 });
      }

      // Wait for results
      await page.waitForTimeout(1000); // Wait for debounce and network

      const resultsVisible = await page.locator('[role="option"]').count();

      const screenshotName = `search-${q.replace(/\s+/g, '-')}-${testInfo.project.name}.png`;
      await page.screenshot({ path: `audit/11-search/${screenshotName}` });

      searchResults.push({
        query: q,
        resultsFound: resultsVisible,
        viewport: testInfo.project.name,
      });

      // Accessibility check on open combobox
      if (q === 'homem aranha' && testInfo.project.name === 'Desktop') {
        const a11y = await new AxeBuilder({ page }).analyze();
        fs.writeFileSync('audit/17-accessibility/search-combobox-axe.json', JSON.stringify(a11y, null, 2));
      }

      // Close search
      await page.keyboard.press('Escape');
    });
  }

  test('Keyboard navigation on search results', async ({ page }) => {
    const input = page.getByRole('combobox', { name: /buscar/i });
    await input.fill('homem aranha');
    await page.waitForTimeout(1000);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // The second item should be selected/focused
    const activeId = await input.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
  });
});
