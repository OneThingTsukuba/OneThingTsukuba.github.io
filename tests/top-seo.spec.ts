import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// site.ts は import.meta.env.SITE を読むので Node から直接 import できない。ソースから値を取り出す
const siteSource = fs.readFileSync(path.join(process.cwd(), 'src/lib/site.ts'), 'utf8');

const SITE_DESCRIPTION = siteSource.match(/SITE_DESCRIPTION\s*=\s*'([^']+)'/)?.[1];
const socialBlock = siteSource.match(/SOCIAL_LINKS\s*=\s*\{([\s\S]*?)\}/)?.[1] ?? '';
const SOCIAL_LINKS = Object.fromEntries(
  [...socialBlock.matchAll(/(\w+):\s*'([^']+)'/g)].map(([, key, value]) => [key, value]),
);

const TOP_TITLE = 'OneThing｜筑波大学・つくばのエンジニアサークル・コミュニティ';
const PAGES = ['/', '/blog/', '/blog/what-is-onething/', '/calender/'];

type Post = { slug: string; title: string; pubDate: string };

function readPosts(): Post[] {
  const dir = path.join(process.cwd(), 'src/content/blog');
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const frontmatter = fs.readFileSync(path.join(dir, file), 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      const field = (name: string) =>
        frontmatter
          .match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]
          .trim()
          .replace(/^(['"])(.*)\1$/, '$2') ?? '';
      return { slug: file.replace(/\.md$/, ''), title: field('title'), pubDate: new Date(field('pubDate')).toISOString() };
    })
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));
}

async function readJsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((text) => JSON.parse(text));
}

test('ソースから期待値を読み取れている', () => {
  expect(SITE_DESCRIPTION).toBeTruthy();
  expect(Object.keys(SOCIAL_LINKS)).toEqual(['x', 'luma', 'connpass', 'github']);
});

test('FAQPage の JSON-LD と画面の FAQ が同じ文言・同じ順で4問', async ({ page }) => {
  await page.goto('/');
  const faq = (await readJsonLd(page)).find((block) => block['@type'] === 'FAQPage') as {
    mainEntity: { name: string; acceptedAnswer: { text: string } }[];
  };
  expect(faq).toBeTruthy();

  const questions = await page.locator('.faq-list dt').allTextContents();
  const answers = await page.locator('.faq-list dd').allTextContents();

  expect(faq.mainEntity).toHaveLength(4);
  expect(questions).toHaveLength(4);
  expect(answers).toHaveLength(4);
  faq.mainEntity.forEach((entry, i) => {
    expect(entry.name).toBe(questions[i].trim());
    expect(entry.acceptedAnswer.text).toBe(answers[i].trim());
  });
});

for (const url of PAGES) {
  test(`h1 は1つだけ: ${url}`, async ({ page }) => {
    await page.goto(url);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

test('トップの h1 にコミュニティ名が入っている', async ({ page }) => {
  await page.goto('/');
  const h1 = await page.locator('h1').textContent();
  expect(h1).toContain('筑波大学のエンジニアコミュニティ');
  expect(h1).toContain('OneThing');
});

test('最新の記事は pubDate の新しい順に最大3件で、リンク先の h1 と一致する', async ({ page }) => {
  const expected = readPosts().slice(0, 3);
  expect(expected.length).toBeGreaterThan(0);

  await page.goto('/');
  const postLinks = page.locator('#latest-posts a.link-row[href^="/blog/"]:not([href="/blog/"])');
  await expect(postLinks).toHaveCount(expected.length);

  for (const [i, post] of expected.entries()) {
    const link = postLinks.nth(i);
    await expect(link).toHaveAttribute('href', `/blog/${post.slug}/`);
    await expect(link.locator('strong')).toHaveText(post.title);
    await expect(link.locator('time')).toHaveAttribute('datetime', post.pubDate);

    const response = await page.request.get(`/blog/${post.slug}/`);
    expect(response.status()).toBe(200);
  }

  for (const post of expected) {
    await page.goto(`/blog/${post.slug}/`);
    await expect(page.locator('h1')).toHaveText(post.title);
  }
});

test('Organization の JSON-LD', async ({ page }) => {
  await page.goto('/');
  const org = (await readJsonLd(page)).find((block) => block['@type'] === 'Organization');
  expect(org).toBeTruthy();
  expect(org?.alternateName).toEqual(['OneThing', 'OneThing Tsukuba']);
  expect(org?.sameAs).toEqual(Object.values(SOCIAL_LINKS));
  expect(org?.description).toBe(SITE_DESCRIPTION);
});

test('トップの title / description / OGP', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(TOP_TITLE);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', SITE_DESCRIPTION!);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', TOP_TITLE);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', SITE_DESCRIPTION!);
});

test('フッターの外部リンク', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('.site-footer-links a').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')),
  );
  expect(hrefs).toEqual([SOCIAL_LINKS.x, SOCIAL_LINKS.luma, SOCIAL_LINKS.connpass, SOCIAL_LINKS.github]);
});

const SITE = fs.readFileSync(path.join(process.cwd(), 'astro.config.mjs'), 'utf8').match(/site:\s*'([^']+)'/)?.[1];
const ORGANIZATION_ID = new URL('/#organization', SITE).toString();

test('Organization は固定の @id を持ち、WebSite の publisher と Event の organizer が同じ @id を指す', async ({ page }) => {
  await page.goto('/');
  const blocks = await readJsonLd(page);
  const orgs = blocks.filter((block) => block['@type'] === 'Organization');
  expect(orgs).toHaveLength(1);
  expect(orgs[0]['@id']).toBe(ORGANIZATION_ID);

  const website = blocks.find((block) => block['@type'] === 'WebSite') as { publisher: { '@id': string } } | undefined;
  expect(website?.publisher['@id']).toBe(ORGANIZATION_ID);

  // イベントはビルド時にカレンダーから取るので0件のこともある。あれば全件を検証する
  const events = blocks.filter((block) => block['@type'] === 'Event') as { organizer: { '@id': string } }[];
  for (const event of events) {
    expect(event.organizer['@id']).toBe(ORGANIZATION_ID);
  }
});

test('BlogPosting の publisher は Organization と同じ @id を指す', async ({ page }) => {
  const posts = readPosts();
  expect(posts.length).toBeGreaterThan(0);
  for (const post of posts) {
    await page.goto(`/blog/${post.slug}/`);
    const article = (await readJsonLd(page)).find((block) => block['@type'] === 'BlogPosting') as
      | { publisher: { '@id': string } }
      | undefined;
    expect(article?.publisher['@id']).toBe(ORGANIZATION_ID);
  }
});

const FOUNDER_ID = new URL('/#founder', SITE).toString();
const FOUNDER = { name: '細井崚吾', url: 'https://ryg35.com', sameAs: ['https://x.com/ryg_35'] };

test('Organization の founder は代表の Person で、固定の @id と url / sameAs を持つ', async ({ page }) => {
  await page.goto('/');
  const org = (await readJsonLd(page)).find((block) => block['@type'] === 'Organization') as
    | { founder: Record<string, unknown> }
    | undefined;
  expect(org?.founder).toEqual({ '@type': 'Person', '@id': FOUNDER_ID, ...FOUNDER });
});

test('代表が書いた記事の author は founder と同じ @id を指し、署名の名前が個人サイトへのリンクになる', async ({ page }) => {
  await page.goto('/blog/what-is-onething/');
  const article = (await readJsonLd(page)).find((block) => block['@type'] === 'BlogPosting') as
    | { author: Record<string, unknown> }
    | undefined;
  expect(article?.author).toMatchObject({ '@type': 'Person', '@id': FOUNDER_ID, ...FOUNDER, jobTitle: 'OneThing 代表' });

  const link = page.locator('.post-byline a');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', FOUNDER.url);
  await expect(link).toHaveAttribute('rel', 'author');
  await expect(link).toHaveText(FOUNDER.name);
});

test('検索エンジンの所有権確認タグが全ページにある', async ({ page }) => {
  for (const pagePath of PAGES) {
    await page.goto(pagePath);
    const bing = await page.locator('meta[name="msvalidate.01"]').evaluateAll((metas) =>
      metas.map((meta) => meta.getAttribute('content')),
    );
    expect(bing).toEqual(['E0545B0A95948509DE15CD54BE511DF0', '7D981B47B7180EEBA805FF40E8421C7C']);
    await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute(
      'content',
      'GK9IpwWMj_L69LR9hhJU6OlizI9rS6RjJx1PAQpqzv0',
    );
  }
});
