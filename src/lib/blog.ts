import { getCollection } from 'astro:content';

export async function getSortedPosts() {
  return (await getCollection('blog')).sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

// ビルド環境は UTC なので、日本時間に固定しないと日時付きの pubDate が前日にずれる
const dotDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const longDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export const formatPostDate = (date: Date) => dotDateFormatter.format(date).replaceAll('/', '.');

export const formatPostDateLong = (date: Date) => longDateFormatter.format(date);
