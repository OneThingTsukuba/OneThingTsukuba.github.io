import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { rehypeWrapTables } from './src/lib/rehype-wrap-tables.mjs';

export default defineConfig({
  // 公開URLの起点。canonical / OGP / sitemap の絶対URLがすべてここから解決される。
  // ドメイン移管時に書き換えるのはこの1行だけ。src/lib/site.ts は import.meta.env.SITE 経由でここを参照する。
  site: 'https://onethingtsukuba.github.io',
  integrations: [sitemap()],
  markdown: {
    // 記事中の表を横スクロールできる入れ物で包む。
    // table に display: block を当てる方式はスクリーンリーダーが表として読まなくなるため採らない
    rehypePlugins: [rehypeWrapTables],
  },
});
