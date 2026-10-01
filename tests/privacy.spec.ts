import { test, expect } from '@playwright/test';

const FOOTER_PAGES = ['/', '/blog/', '/blog/what-is-onething/', '/calender/', '/privacy/'];

test('/privacy/ が200で返り、h1 はプライバシーポリシーの1つだけ', async ({ page }) => {
  const response = await page.goto('/privacy/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('プライバシーポリシー');
  await expect(page).toHaveTitle('プライバシーポリシー｜OneThing 筑波大学エンジニアコミュニティ');
});

test('/privacy/ に Google のポリシーとオプトアウト アドオンへのリンクがある', async ({ page }) => {
  await page.goto('/privacy/');
  const main = page.locator('main');
  await expect(main.locator('a[href="https://policies.google.com/technologies/partner-sites?hl=ja"]')).toHaveCount(1);
  await expect(main.locator('a[href="https://tools.google.com/dlpage/gaoptout?hl=ja"]')).toHaveCount(1);
});

for (const url of FOOTER_PAGES) {
  test(`フッターからプライバシーポリシーに行ける: ${url}`, async ({ page }) => {
    await page.goto(url);
    await expect(page.locator('.site-footer a[href="/privacy/"]')).toHaveText('プライバシーポリシー');
  });
}

test('sitemap に /privacy/ が入っている', async ({ request }) => {
  const index = await request.get('/sitemap-index.xml');
  expect(index.ok()).toBe(true);
  const sitemapUrls = [...(await index.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => new URL(loc).pathname);
  const bodies = await Promise.all(sitemapUrls.map(async (pathname) => (await request.get(pathname)).text()));
  expect(bodies.join('\n')).toContain('<loc>https://onethingtsukuba.github.io/privacy/</loc>');
});
