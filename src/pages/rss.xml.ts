import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../config';
import { t } from '../i18n';
import { getArticles, postUrl } from '../lib/utils';
export async function GET(context: APIContext) {
  return rss({
    title: SITE.title, description: t('ar').description, site: context.site!,
    customData: '<language>ar</language>',
    items: (await getArticles('ar')).map((a) => ({ title: a.data.title, description: a.data.description, pubDate: a.data.date, link: postUrl(a), categories: a.data.tags })),
  });
}
