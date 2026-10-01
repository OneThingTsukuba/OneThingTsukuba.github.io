import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { buildUpcomingRows, buildSessionNote, parseLocation, parseSessionNumber, type CalendarEvent } from '../src/lib/calendar';

const SITE = fs.readFileSync(path.join(process.cwd(), 'astro.config.mjs'), 'utf8').match(/site:\s*'([^']+)'/)?.[1];
const ORGANIZATION_ID = new URL('/#organization', SITE).toString();
const OG_IMAGE_URL = new URL('/ogp-2026-10.jpg', SITE).toString();

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

const mokumoku = (summary: string, start: string, end: string, kind: CalendarEvent['kind'] = 'mokumoku'): CalendarEvent => ({
  uid: summary,
  summary,
  description: '',
  shortDescription: '',
  location: '',
  locationShort: '株式会社ゲームシスト',
  start: new Date(start),
  end: new Date(end),
  allDay: false,
  kind,
  statusLabel: '',
  url: null,
  source: { id: 'onething', name: 'OneThing', color: '#2ee89e' },
});

test('もくもく会の回数を名前から読む', () => {
  expect(parseSessionNumber('もくもく会 #53')).toBe(53);
  expect(parseSessionNumber('もくもく会 # 53')).toBe(53);
  expect(parseSessionNumber('もくもく会 ＃53')).toBe(53);
  expect(parseSessionNumber('第53回 もくもく会')).toBe(53);
  expect(parseSessionNumber('もくもく会')).toBeNull();
});

test('次のもくもく会の行と回数の文は時刻で変わる', () => {
  const event = mokumoku('もくもく会 #53', '2026-10-01T09:30:00Z', '2026-10-01T12:00:00Z');
  const before = new Date('2026-10-01T03:00:00Z');
  const during = new Date('2026-10-01T10:00:00Z');

  const [todayRow] = buildUpcomingRows([event], before);
  expect(todayRow).toMatchObject({ date: '10/1', weekday: '木', time: '18:30-21:00', marker: '今日' });
  expect(buildSessionNote(todayRow, before)).toBe('今日の回で53回目になります。');

  const [liveRow] = buildUpcomingRows([event], during);
  expect(liveRow.marker).toBe('開催中');
  expect(buildSessionNote(liveRow, during)).toBe('2026年10月1日の回で53回目になりました。');

  const future = new Date('2026-09-28T03:00:00Z');
  const [futureRow] = buildUpcomingRows([event], future);
  expect(futureRow.marker).toBeNull();
  expect(buildSessionNote(futureRow, future)).toBe('次の2026年10月1日の回で53回目になります。');

  expect(buildUpcomingRows([], before)).toEqual([]);
  expect(buildSessionNote(undefined, before)).toBeNull();
  expect(buildSessionNote(buildUpcomingRows([mokumoku('もくもく会', event.start.toISOString(), event.end.toISOString())], before)[0], before)).toBeNull();
});

test('次の予定は種類を問わず開始順に最大4件', () => {
  const now = new Date('2026-09-28T03:00:00Z');
  const rows = buildUpcomingRows(
    [
      mokumoku('もくもく会 #55', '2026-10-15T09:30:00Z', '2026-10-15T12:00:00Z'),
      mokumoku('LT会 #6', '2026-10-03T09:00:00Z', '2026-10-03T11:00:00Z', 'lt'),
      mokumoku('もくもく会 #54', '2026-10-08T09:30:00Z', '2026-10-08T12:00:00Z'),
      mokumoku('勉強会', '2026-10-10T09:00:00Z', '2026-10-10T11:00:00Z', 'study'),
      mokumoku('もくもく会 #56', '2026-10-22T09:30:00Z', '2026-10-22T12:00:00Z'),
    ],
    now,
  );
  expect(rows.map((row) => row.event.summary)).toEqual(['LT会 #6', 'もくもく会 #54', '勉強会', 'もくもく会 #55']);
});
