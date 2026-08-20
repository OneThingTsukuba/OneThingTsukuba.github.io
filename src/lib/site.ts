/**
 * サイト全体で使う定数。
 *
 * 公開URLの正は astro.config.mjs の `site` 一箇所だけ。
 * Astro がその値を import.meta.env.SITE として配ってくれるので、ここでは持ち直さない。
 * ドメインを移すときに書き換えるのは astro.config.mjs の1行で済む。
 * （fallback はテスト実行など Astro のビルド外から読まれた場合のためだけのもの）
 */
export const SITE_URL = import.meta.env.SITE ?? 'https://onethingtsukuba.github.io';

export const SITE_NAME = 'OneThing';
export const SITE_NAME_FULL = 'OneThing -筑波大学エンジニアコミュニティ-';

/** 検索結果とSNSカードに出る既定の説明文。120文字前後に収める。 */
export const SITE_DESCRIPTION =
  '筑波大学のエンジニアコミュニティ OneThing の公式サイト。週1のもくもく会、LT会、Claude Code や git の勉強会を開いています。初心者歓迎、参加費無料。';

/** OGP画像。1200x630。X / Slack でリンクを貼ったときに出る。 */
export const OG_IMAGE_PATH = '/ogp.png';

/** 外部リンク。JSON-LD の sameAs と問い合わせ導線で共用する。 */
export const SOCIAL_LINKS = {
  x: 'https://x.com/OneThingTsukuba',
  luma: 'https://luma.com/user/OneThingTsukuba',
  connpass: 'https://onething-lt.connpass.com',
} as const;

/** ヘッダーのナビ。スマホではハンバーガーの中身になるので、行き先は4つに絞る。
    トップの各セクション (#purpose, #faq など) はここに入れない。
    入れると9項目になり、メニューを開いた時点でどれを押せばいいか分からなくなる。
    お問い合わせだけは `/#contact` にして、どのページからでも飛べるようにしている。 */
export const NAV_ITEMS = [
  { href: '/', label: 'トップ' },
  { href: '/blog/', label: '記事' },
  { href: '/calender/', label: 'カレンダー' },
  { href: '/#contact', label: 'お問い合わせ' },
] as const;

/** 絶対URLを作る。canonical と OGP は相対パス不可なので必ずこれを通す。 */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
