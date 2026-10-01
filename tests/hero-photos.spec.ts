import { test, expect, type Page } from '@playwright/test';

const EXPECTED_ALTS = [
  'OneThing の LT会で、スライドを映して発表するメンバー',
  'ハッカソンに参加した OneThing のメンバー',
];

const photos = (page: Page) => page.locator('.hero .hero-photo');

test('ヒーローに写真が2枚、同時に見えている', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/');

  await expect(photos(page)).toHaveCount(2);
  expect(await photos(page).evaluateAll((imgs) => imgs.map((img) => img.getAttribute('alt')))).toEqual(EXPECTED_ALTS);
  for (const img of await photos(page).all()) {
    await expect(img).toBeVisible();
    expect(await img.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  }
});

test('写真は最初の画面で読み込まれ、WebP に変換されている', async ({ page }) => {
  await page.goto('/');

  for (const img of await photos(page).all()) {
    await expect(img).toHaveAttribute('loading', 'eager');
    await expect(img).toHaveAttribute('src', /\.webp$/);
    await expect(img).toHaveAttribute('srcset', /480w.*960w/);
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  await expect(photos(page).nth(0)).toHaveAttribute('fetchpriority', 'high');
  await expect(photos(page).nth(1)).toHaveAttribute('fetchpriority', 'low');
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  test(`${viewport.width}x${viewport.height} では写真が先頭に来て、参加ボタンまで最初の画面に収まる`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const header = await page.locator('.site-header').boundingBox();
    const photo = await photos(page).nth(0).boundingBox();
    const cta = await page.locator('[data-link-location="hero"] .btn').boundingBox();
    expect(header && photo && cta).toBeTruthy();

    const headerBottom = header!.y + header!.height;
    expect(photo!.y).toBeGreaterThanOrEqual(headerBottom - 1);
    expect(photo!.y - headerBottom).toBeLessThanOrEqual(120);
    expect(cta!.y + cta!.height).toBeLessThanOrEqual(viewport.height);
  });
}

for (const width of [375, 900, 1400]) {
  test(`${width}px 幅でも横スクロールが出ない`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}
