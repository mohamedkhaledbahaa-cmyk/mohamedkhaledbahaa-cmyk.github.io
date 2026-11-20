import { getCollection, type CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'articles'>;

/** كل المقالات المنشورة (بدون المسودات) مرتبة من الأحدث */
export async function getArticles(): Promise<Article[]> {
  const all = await getCollection('articles', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

/** وقت القراءة بالدقائق (≈ 200 كلمة في الدقيقة للعربية) */
export function readingTime(body = ''): number {
  const words = body.replace(/[#*_>`\-\[\]()!]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function readingLabel(min: number): string {
  if (min === 1) return 'دقيقة قراءة';
  if (min === 2) return 'دقيقتان قراءة';
  if (min <= 10) return `${toArabicDigits(min)} دقائق قراءة`;
  return `${toArabicDigits(min)} دقيقة قراءة`;
}

export function toArabicDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

export function tagUrl(tag: string): string {
  return `/tags/${encodeURIComponent(tag)}/`;
}
