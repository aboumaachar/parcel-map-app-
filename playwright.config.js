/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  // Run tests that live under the frontend package to ensure the same
  // @playwright/test instance is used (avoids duplicate package resolution)
  testDir: 'frontend/playwright',
  // Match spec files under the testDir
  testMatch: '**/*.spec.js',
  timeout: 120000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['json', { outputFile: 'playwright-report.json' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    baseURL: 'http://localhost:3000'
  },
};
