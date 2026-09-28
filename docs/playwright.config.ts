import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    outputDir: './test-results/artifacts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: [['list'], ['html', { outputFolder: 'docs/test-results/report', open: 'never' }]],
    use: {
        baseURL: 'http://127.0.0.1:8524',
        trace: 'retain-on-failure'
    },
    projects: [
        { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } }
    ],
    webServer: {
        command: 'pnpm --filter docs run preview --host 127.0.0.1 --port 8524 --strictPort',
        url: 'http://127.0.0.1:8524',
        timeout: 120000,
        reuseExistingServer: !process.env.CI
    }
})
