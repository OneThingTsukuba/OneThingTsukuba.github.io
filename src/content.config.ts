// 記事の Content Collections 定義。
// 記事は src/content/blog/*.md に置く。ファイル名がそのままURLになる
// (例: onething-tokucho.md → /blog/onething-tokucho)
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    // 検索結果とSNSカードに出る説明文。120文字前後に収める
    description: z.string(),
    pubDate: z.coerce.date(),
    // 内容を実際に更新したときだけ入れる。
    // 日付だけ変えるのは検索側に評価されないので、中身を直したときのみ
    updatedDate: z.coerce.date().optional(),
    // 紹介=OneThingの説明 / 開催報告=イベントの記録 / 解説=技術やノウハウ
    category: z.enum(['紹介', '開催報告', '解説']),
  }),
});

export const collections = { blog };
