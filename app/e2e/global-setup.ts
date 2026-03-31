import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '.auth/user.json');

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to the app — Okta will redirect us to its login page
  await page.goto('http://localhost:5173');

  // Wait for Okta's hosted login page
  await page.waitForURL(/\/login\/|okta\.com/);

  // Wait for the username field to be visible before interacting
  await page.waitForSelector('input[name="identifier"]', { state: 'visible', timeout: 15000 });
  await page.screenshot({ path: './e2e/debug-login.png' });

  await page.fill('input[name="identifier"]', process.env.TEST_USERNAME!);
  await page.click('input[type="submit"]');

  // Okta's newer widget shows password on a second screen after username
  await page.waitForSelector('input[name="credentials.passcode"]', { state: 'visible', timeout: 10000 });
  await page.fill('input[name="credentials.passcode"]', process.env.TEST_PASSWORD!);
  await page.click('input[type="submit"]');

  // Wait until we're back on the app after the OAuth callback
  await page.waitForURL('http://localhost:5173/**', { timeout: 15000 });

  // Save auth state (cookies + localStorage) for reuse in tests
  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}
