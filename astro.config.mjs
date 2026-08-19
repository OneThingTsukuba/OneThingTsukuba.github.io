import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 公開URLの起点。canonical / OGP / sitemap の絶対URLがすべてここから解決される。
  // ドメイン移管時に書き換えるのはこの1行だけ。src/lib/site.ts は import.meta.env.SITE 経由でここを参照する。
  site: 'https://onethingtsukuba.github.io',
  integrations: [sitemap()],
});
