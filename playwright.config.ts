import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 60_000,
  testDir: 'tests-e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    port: 5173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'chromium-mobile',
      use: { 
        ...devices['Pixel 5'],
      },
      testMatch: '**/controls/touch-controls.spec.ts',
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: '**/cross-platform/browser-compatibility.spec.ts',
    },
  ],
  // Test categories for organized runs
  expect: {
    // Visual regression tolerance
    threshold: 0.2,
    toHaveScreenshot: {
      threshold: 0.2,
      animation: 'disabled',
    },
  },
});
