import { CATEGORIES } from '../config';
import { getArticles } from '../lib/utils';

export async function GET() {
  const articles = await getArticles();
  const data = articles.map((a) => ({
    url: `/posts/${a.id}/`,
    title: a.data.title,
    description: a.data.description,
    category: CATEGORIES[a.data.category],
    tags: a.data.tags,
    body: (a.body ?? '').replace(/[#*_>`\[\]()!-]/g, ' ').replace(/\s+/g, ' ').slice(0, 5000),
  }));
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
