import { getCollection, type CollectionEntry } from 'astro:content';
import { t, url, type Lang } from '../i18n';

export type Article = CollectionEntry<'articles'>;

/** المقالات المنشورة بلغة معينة مرتبة من الأحدث */
export async function getArticles(lang: Lang): Promise<Article[]> {
  const all = await getCollection('articles', ({ data }) => data.lang === lang && (import.meta.env.DEV || !data.draft));
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** الجزء الأخير من المعرّف (بدون مجلد en/) */
export function slugOf(a: Article): string {
  return a.id.split('/').pop()!;
}

export function postUrl(a: Article): string {
  return url(a.data.lang, `/posts/${slugOf(a)}/`);
}

export function formatDate(lang: Lang, d: Date): string {
  return new Intl.DateTimeFormat(t(lang).locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

export function readingTime(body = ''): number {
  const words = body.replace(/[#*_>`\-\[\]()!|]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function tagUrl(lang: Lang, tag: string): string {
  return url(lang, `/tags/${encodeURIComponent(tag)}/`);
}
