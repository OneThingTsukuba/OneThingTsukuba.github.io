// 記事の Content Collections 定義。
// 記事は src/content/blog/*.md に置く。ファイル名がそのままURLになる
// (例: what-is-onething.md → /blog/what-is-onething/)
//
// パターンを *.md に限定しているのは意図的。**/*.md にするとサブディレクトリの記事の
// id が "series/foo" になり、[slug].astro の1セグメントでは経路を生成できない。
// 階層化したくなったら [...slug].astro に変えること。
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().trim().min(1),
      // 検索結果とSNSカードに出る説明文。120文字前後に収める
      description: z.string().trim().min(1),
      pubDate: z.coerce.date(),
      // 内容を実際に更新したときだけ入れる。
      // 日付だけ変えるのは検索側に評価されないので、中身を直したときのみ
      updatedDate: z.coerce.date().optional(),
      // 紹介=OneThingの説明 / 開催報告=イベントの記録 / 解説=技術やノウハウ
      category: z.enum(['紹介', '開催報告', '解説']),
      // 書いた人。記事末尾の署名と、構造化データの author に使う。
      // 空文字を弾くため trim().min(1)。z.string() だけだと空白のみを通してしまう
      author: z.string().trim().min(1),
      // 肩書き。「OneThing 代表」など。省略時は名前だけ出る
      authorRole: z.string().trim().min(1).optional(),
      // 代表画像。OGP と BlogPosting の image に使う。
      // image() を通すと Astro が寸法を解決するので、レイアウト移動が起きない
      heroImage: image().optional(),
      heroImageAlt: z.string().trim().min(1).optional(),
    }),
});

export const collections = { blog };
