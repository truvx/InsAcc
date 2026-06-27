import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: 'qa-*.spec.ts',
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20000,
    navigationTimeout: 20000,
    baseURL: 'http://localhost:5174',
  },
  webServer: {
    command: 'npx vite --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 30000,
  },
  workers: 1,
  timeout: 120000,
  retries: 0,
})
