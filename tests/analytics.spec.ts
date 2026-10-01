import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PAGES = ['/', '/blog/', '/blog/what-is-onething/', '/calender/'];

for (const url of PAGES) {
  test(`測定 ID なしのビルドには GA のタグが入らない: ${url}`, async ({ page }) => {
    await page.goto(url);
    await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
    expect(await page.content()).not.toContain('gtag');
    expect(await page.evaluate(() => typeof (window as { gtag?: unknown }).gtag)).toBe('undefined');
  });
}

test.describe('測定 ID ありのビルド', () => {
  test.describe.configure({ mode: 'serial' });

  const MEASUREMENT_ID = 'G-TEST123';
  // 既定の webServer とは別に、測定 ID 付きでビルドした成果物をサーバなしで route から返す
  const ORIGIN = 'http://ga-enabled.test';
  const outDir = path.join(process.cwd(), 'test-results', 'ga-enabled-dist');

  test.beforeAll(() => {
    execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
      env: { ...process.env, PUBLIC_GA_MEASUREMENT_ID: MEASUREMENT_ID },
      stdio: 'pipe',
    });
  });

  async function open(page: Page, pathname: string) {
    await page.context().route(/googletagmanager\.com|luma\.com|lu\.ma|connpass\.com|x\.com|github\.com/, (route) => route.abort());
    await page.route(`${ORIGIN}/**`, (route) => {
      const { pathname: requested } = new URL(route.request().url());
      const relative = requested.endsWith('/') ? `${requested}index.html` : requested;
      const file = path.join(outDir, relative);
      if (!fs.existsSync(file)) return route.fulfill({ status: 404 });
      return route.fulfill({ path: file });
    });
    // 外部リンクのクリックで遷移すると dataLayer を読めなくなるので、既定動作だけ止める
    await page.addInitScript(() => {
      document.addEventListener('click', (event) => event.preventDefault());
    });
    await page.goto(`${ORIGIN}${pathname}`);
  }

  async function joinClicks(page: Page) {
    return page.evaluate(() =>
      ((window as unknown as { dataLayer: ArrayLike<unknown>[] }).dataLayer ?? [])
        .map((entry) => Array.from(entry))
        .filter((args) => args[0] === 'event' && args[1] === 'join_click')
        .map((args) => args[2]),
    );
  }

  for (const url of PAGES) {
    test(`gtag.js が測定 ID 付きで読み込まれる: ${url}`, async ({ page }) => {
      await open(page, url);
      await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveAttribute(
        'src',
        `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`,
      );
      const config = await page.evaluate(() =>
        (window as unknown as { dataLayer: ArrayLike<unknown>[] }).dataLayer
          .map((entry) => Array.from(entry))
          .find((args) => args[0] === 'config'),
      );
      expect(config).toEqual(['config', MEASUREMENT_ID]);
    });
  }

  test('参加導線のクリックで join_click が場所とドメイン付きで送られる', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, '/');

    await page.locator('[data-link-location="hero"] a[href*="luma.com"]').click();
    await page.locator('[data-link-location="join"] a[href*="luma.com"]').click();
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = 'https://luma.com/sample-event';
      link.textContent = 'luma sample event';
      document.querySelector('[data-link-location="join-events"]')?.append(link);
    });
    await page.getByText('luma sample event').click();
    await page.locator('.site-footer-links a[href*="connpass.com"]').click();
    await page.locator('.site-footer-links a[href*="luma.com"]').click();

    expect(await joinClicks(page)).toEqual([
      { link_domain: 'luma.com', link_location: 'hero' },
      { link_domain: 'luma.com', link_location: 'join' },
      { link_domain: 'luma.com', link_location: 'join-events' },
      { link_domain: 'onething-lt.connpass.com', link_location: 'footer' },
      { link_domain: 'luma.com', link_location: 'footer' },
    ]);
  });

  test('場所の指定がない参加リンクは other、参加先以外のリンクは送らない', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, '/blog/');

    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = 'https://lu.ma/sample';
      link.textContent = 'lu.ma sample';
      document.querySelector('main')?.append(link);
    });
    await page.getByText('lu.ma sample').click();
    await page.locator('.site-footer-links a[href*="x.com"]').click();
    await page.locator('.site-footer-links a[href*="github.com"]').click();

    expect(await joinClicks(page)).toEqual([{ link_domain: 'lu.ma', link_location: 'other' }]);
  });
});
