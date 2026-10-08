import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'C:/Users/abhin/.gemini/antigravity-ide/brain/c293dbb7-713a-478b-85e1-e5b4742fbdaa/playwright-report' }]],
  preserveOutput: 'always',
  outputDir: 'C:/Users/abhin/.gemini/antigravity-ide/brain/c293dbb7-713a-478b-85e1-e5b4742fbdaa/test-results',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on', // Records video for every test
    permissions: ['geolocation'],
    geolocation: { latitude: 9.9312, longitude: 76.2673 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
