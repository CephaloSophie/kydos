import { defineConfig, devices } from '@playwright/test';

/*
 * Configuration Playwright — tests E2E de l'application WEB Kýdos Belote.
 * Playwright lance lui-même le serveur de prévisualisation Vite (build + preview),
 * attend qu'il réponde, puis exécute les scénarios dans un navigateur réel.
 * Le TÉLÉCHARGEMENT du navigateur nécessite un accès réseau au CDN Playwright,
 * indisponible dans le bac à sable de dev (KB-112) : ces tests tournent en CI.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'e2e/report', open: 'never' }], ['list']]
    : [['html', { outputFolder: 'e2e/report', open: 'never' }], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
