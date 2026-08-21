import { test, expect } from '@playwright/test';

/**
 * モバイルナビの回帰テスト。
 *
 * このファイルが守っているのは1点。「スマホからサイト内の他ページに到達できる」。
 * 過去に2回失敗している。
 *   1. 768px 以下で .site-nav を display:none にし、ナビが1つも出なかった
 *   2. その修正でボタンだけ出したが、JS が無効だと押しても何も起きなかった
 * どちらも astro check / astro build を通過する。型もビルドも壊れないので、
 * ここで押さえない限り3回目が来る。
 */

// CSS の分岐点。769px 以上でデスクトップ表示になる
const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1280, height: 800 };

const NAV_LABELS = ['トップ', '記事', 'カレンダー', 'お問い合わせ'];

test.describe('モバイル幅 (375px)', () => {
  test.use({ viewport: MOBILE });

  test('初期状態ではメニューが閉じていて、ボタンが出ている', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'メニューを開く' });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-controls', 'site-nav');

    await expect(page.locator('#site-nav')).toBeHidden();
  });

  test('ボタンを押すとナビ4項目が出て、aria が同期する', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'メニューを開く' }).click();

    const toggle = page.getByRole('button', { name: 'メニューを閉じる' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const links = page.locator('#site-nav a');
    await expect(links).toHaveCount(NAV_LABELS.length);
    await expect(links).toHaveText(NAV_LABELS);
  });

  test('Enter と Space で開閉できる', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('.nav-toggle');

    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-label', 'メニューを開く');
  });

  test('Tab で4リンクを順に通過できる', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('.nav-toggle');
    await toggle.focus();
    await page.keyboard.press('Enter');

    for (const label of NAV_LABELS) {
      await page.keyboard.press('Tab');
      await expect(page.locator('#site-nav a:focus')).toHaveText(label);
    }
  });

  test('Escape で閉じ、フォーカスがボタンに戻る', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('.nav-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });

  test('記事一覧に遷移できる', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-toggle').click();
    await page.locator('#site-nav a', { hasText: '記事' }).click();

    await expect(page).toHaveURL(/\/blog\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('記事一覧');
  });

  test('カレンダーに遷移できる', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-toggle').click();
    await page.locator('#site-nav a', { hasText: 'カレンダー' }).click();

    await expect(page).toHaveURL(/\/calender\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('活動カレンダー');
  });

  test('ページ内アンカーを押すとメニューが閉じる', async ({ page }) => {
    // 遷移が起きないので、閉じる処理が無いとメニューが本文を覆ったまま残る
    await page.goto('/');
    await page.locator('.nav-toggle').click();
    await page.locator('#site-nav a', { hasText: 'お問い合わせ' }).click();

    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#contact')).toBeInViewport();
  });

  test('記事ページからでもナビが使える', async ({ page }) => {
    await page.goto('/blog/what-is-onething/');
    await page.locator('.nav-toggle').click();
    await expect(page.locator('#site-nav a')).toHaveCount(NAV_LABELS.length);
  });
});

test.describe('JS 無効', () => {
  test.use({ viewport: MOBILE, javaScriptEnabled: false });

  test('ボタンは出さず、ナビをそのまま表示して4リンクに到達できる', async ({ page }) => {
    // 押しても何も起きないボタンだけが残る状態を防ぐ。
    // CSS は data-nav-enhanced が立つまでナビを表示し続ける契約になっている
    await page.goto('/');

    await expect(page.locator('.site-header')).not.toHaveAttribute('data-nav-enhanced', 'true');
    await expect(page.locator('.nav-toggle')).toBeHidden();

    const links = page.locator('#site-nav a');
    await expect(links).toHaveCount(NAV_LABELS.length);
    await expect(links.first()).toBeVisible();
  });

  test('JS 無しでも記事一覧に遷移できる', async ({ page }) => {
    await page.goto('/');
    await page.locator('#site-nav a', { hasText: '記事' }).click();
    await expect(page).toHaveURL(/\/blog\/$/);
  });
});

test.describe('デスクトップ幅 (1280px)', () => {
  test.use({ viewport: DESKTOP });

  test('ボタンは出さず、ナビを横に並べる', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-toggle')).toBeHidden();
    await expect(page.locator('#site-nav')).toBeVisible();
    await expect(page.locator('#site-nav a')).toHaveCount(NAV_LABELS.length);
  });
});

test.describe('幅の境界', () => {
  test.use({ viewport: MOBILE });

  test('開いたままデスクトップ幅にすると閉じる', async ({ page }) => {
    // 開いた状態で横向きにするとボタンが消え、閉じる手段が無くなる
    await page.goto('/');
    const toggle = page.locator('.nav-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.setViewportSize(DESKTOP);

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-label', 'メニューを開く');
  });

  test('768px ではボタンが出て、769px では出ない', async ({ page }) => {
    await page.goto('/');

    await page.setViewportSize({ width: 768, height: 812 });
    await expect(page.locator('.nav-toggle')).toBeVisible();

    await page.setViewportSize({ width: 769, height: 812 });
    await expect(page.locator('.nav-toggle')).toBeHidden();
  });
});
