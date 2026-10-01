import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { parseLocation } from '../src/lib/calendar';

const SITE = fs.readFileSync(path.join(process.cwd(), 'astro.config.mjs'), 'utf8').match(/site:\s*'([^']+)'/)?.[1];
const ORGANIZATION_ID = new URL('/#organization', SITE).toString();
const OG_IMAGE_URL = new URL('/ogp.png', SITE).toString();

const REAL_LOCATION =
  '株式会社ゲームシスト, 日本、〒305-0005 茨城県つくば市天久保３丁目１４−１１ ヴィレッジ コスモ 101';

type EventNode = {
  name: string;
  endDate: string;
  description?: string;
  image?: string[];
  performer?: { '@type': string; '@id': string; name: string };
  offers?: { '@type': string; price: number; priceCurrency: string; availability: string; url: string };
  location: {
    name: string;
    address: { addressCountry: string; postalCode?: string; streetAddress?: string };
  };
};

async function readEvents(page: Page): Promise<EventNode[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((text) => JSON.parse(text)).filter((block) => block['@type'] === 'Event');
}

test('LOCATION を会場名と住所に分ける', () => {
  expect(parseLocation(REAL_LOCATION)).toEqual({
    name: '株式会社ゲームシスト',
    address: {
      postalCode: '305-0005',
      addressRegion: '茨城県',
      addressLocality: 'つくば市',
      streetAddress: '天久保3丁目14-11 ヴィレッジ コスモ 101',
    },
  });
});

test('形式に合わない LOCATION はそのまま name に残し、住所は付けない', () => {
  expect(parseLocation('筑波大学 3C棟, オンライン')).toEqual({ name: '筑波大学 3C棟, オンライン', address: null });
  expect(parseLocation('')).toEqual({ name: '', address: null });
});

test('トップの Event の JSON-LD は必要な項目を全件持ち、終わったイベントを含まない', async ({ page }) => {
  const builtAt = fs.statSync(path.join(process.cwd(), 'dist/index.html')).mtime.getTime();
  await page.goto('/');

  // イベントはビルド時にカレンダーから取るので0件のこともある。あれば全件を検証する
  for (const event of await readEvents(page)) {
    expect(event.description, event.name).toBeTruthy();
    expect(event.image, event.name).toEqual([OG_IMAGE_URL]);
    expect(event.performer, event.name).toMatchObject({ '@type': 'Organization', '@id': ORGANIZATION_ID });
    expect(event.performer?.name, event.name).toBeTruthy();
    expect(event.offers, event.name).toMatchObject({
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
    });
    expect(event.offers?.url, event.name).toMatch(/^https:\/\//);
    // 締め切りの基準はカレンダー取得時刻で、dist の書き込みより数秒早い。その差だけ余裕を持たせる
    expect(new Date(event.endDate).getTime(), event.name).toBeGreaterThanOrEqual(builtAt - 5 * 60 * 1000);

    if (event.location.address.postalCode) {
      expect(event.location.name, event.name).not.toMatch(/[〒,]/);
      expect(event.location.address.streetAddress, event.name).toBeTruthy();
    }
  }
});
