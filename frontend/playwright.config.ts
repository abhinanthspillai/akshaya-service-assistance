import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  preserveOutput: 'always',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'off', // Disabled because Windows Security blocks ffmpeg.exe (spawn UNKNOWN)
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
