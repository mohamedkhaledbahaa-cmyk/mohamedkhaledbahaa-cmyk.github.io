import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../../config';
import { t } from '../../i18n';
import { getArticles, postUrl } from '../../lib/utils';
export async function GET(context: APIContext) {
  return rss({
    title: SITE.title, description: t('en').description, site: context.site!,
    customData: '<language>en</language>',
    items: (await getArticles('en')).map((a) => ({ title: a.data.title, description: a.data.description, pubDate: a.data.date, link: postUrl(a), categories: a.data.tags })),
  });
}
