import { defineConfig, devices } from '@playwright/test';
import { config as loadEnvironment } from 'dotenv';

loadEnvironment({ path: '.env.test.local', quiet: true });

const externalChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Real-provider scenarios intentionally run one at a time. Parallel projects
  // can exceed TMDB/Jikan quotas and produce failures a real user would not see.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4187',
    trace: 'on-first-retry',
    launchOptions: {
      executablePath: externalChromium || undefined,
      args: externalChromium
        ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        : undefined,
    },
  },
  webServer: {
    command: 'npm run serve:e2e',
    url: 'http://127.0.0.1:4187',
    // CI sempre cria uma instância limpa. Em auditoria local, um servidor já
    // iniciado pode ser reutilizado para evitar recompilar o bundle a cada
    // recorte de evidência.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'tablet-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'android-chromium', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
});
