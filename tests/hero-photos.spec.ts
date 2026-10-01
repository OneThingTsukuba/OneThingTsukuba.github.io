import { test, expect } from '@playwright/test';

const EXPECTED_ALTS = [
  'OneThing の LT会で、スライドを映して発表するメンバー',
  'ハッカソンに参加した OneThing のメンバー',
];

test('ヒーローに写真が2枚、概要カードの上に並ぶ', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const photos = page.locator('.hero .hero-photo');
  await expect(photos).toHaveCount(2);
  expect(await photos.evaluateAll((imgs) => imgs.map((img) => img.getAttribute('alt')))).toEqual(EXPECTED_ALTS);

  const frame = await page.locator('.hero-photos').boundingBox();
  const term = await page.locator('.hero .term').boundingBox();
  expect(frame && term).toBeTruthy();
  expect(frame!.y + frame!.height).toBeLessThanOrEqual(term!.y);
  expect(frame!.width / frame!.height).toBeCloseTo(4 / 3, 1);
});

test('写真は最初の画面で読み込まれ、WebP に変換されている', async ({ page }) => {
  await page.goto('/');
  const photos = page.locator('.hero .hero-photo');

  for (const img of await photos.all()) {
    await expect(img).toHaveAttribute('loading', 'eager');
    await expect(img).toHaveAttribute('src', /\.webp$/);
    await expect(img).toHaveAttribute('srcset', /480w.*960w/);
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  await expect(photos.nth(0)).toHaveAttribute('fetchpriority', 'high');
  await expect(photos.nth(1)).toHaveAttribute('fetchpriority', 'low');
});

test('1枚目は動かず、2枚目が約6秒後に重なって切り替わる', async ({ page }) => {
  await page.goto('/');
  const photos = page.locator('.hero .hero-photo');
  const opacityAt = (ms: number) =>
    photos.nth(1).evaluate((el, t) => {
      const animation = el.getAnimations()[0];
      animation.pause();
      animation.currentTime = t;
      return getComputedStyle(el).opacity;
    }, ms);

  expect(await photos.nth(0).evaluate((el) => el.getAnimations().length)).toBe(0);
  expect(await opacityAt(2000)).toBe('0');
  expect(await opacityAt(8000)).toBe('1');
  expect(await opacityAt(11900)).not.toBe('1');
});

test('動きを減らす設定では切り替えず、1枚目だけを見せる', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const second = page.locator('.hero .hero-photo').nth(1);
  const style = await second.evaluate((el) => {
    const s = getComputedStyle(el);
    return { animation: s.animationName, opacity: s.opacity };
  });
  expect(style).toEqual({ animation: 'none', opacity: '0' });
  expect(await page.locator('.hero .hero-photo').nth(0).evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});

for (const width of [375, 900]) {
  test(`${width}px 幅でも横スクロールが出ない`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    const frame = await page.locator('.hero-photos').boundingBox();
    expect(frame!.width).toBeGreaterThan(300);
  });
}
