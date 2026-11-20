import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../config';
import { getArticles } from '../lib/utils';

export async function GET(context: APIContext) {
  const articles = await getArticles();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site!,
    customData: '<language>ar</language>',
    items: articles.map((a) => ({
      title: a.data.title,
      description: a.data.description,
      pubDate: a.data.date,
      link: `/posts/${a.id}/`,
      categories: a.data.tags,
    })),
  });
}
