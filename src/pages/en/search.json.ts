import { t } from '../../i18n';
import { getArticles, postUrl } from '../../lib/utils';
export async function GET() {
  const L = t('en');
  const data = (await getArticles('en')).map((a) => ({
    url: postUrl(a), title: a.data.title, description: a.data.description,
    category: L.categories[a.data.category], tags: a.data.tags,
    body: (a.body ?? '').replace(/[#*_>`\[\]()!|-]/g, ' ').replace(/\s+/g, ' ').slice(0, 5000),
  }));
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
