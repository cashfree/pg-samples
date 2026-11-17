import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', launchOptions: process.platform==='darwin'?{channel:'chrome'}:{} },
  projects: [
    {name:'desktop',use:{...devices['Desktop Chrome']}},
    {name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}
  ],
  webServer: { command: 'node server.js', url:'http://127.0.0.1:3100/health', reuseExistingServer:false, env:{HOST:'127.0.0.1',PORT:'3100',APP_MODE:'demo',PUBLIC_BASE_URL:'http://127.0.0.1:3100',CASHFREE_ENV:'sandbox',DATA_DIR:process.env.E2E_DATA_DIR || '/tmp/subscription-lab-browser-tests',MERCHANT_PASSWORD:''} }
});
