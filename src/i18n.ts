export type Lang = 'ar' | 'en';
export const LANGS: Lang[] = ['ar', 'en'];

export const CATEGORY_KEYS = ['tendering', 'boq', 'estimation', 'proposals', 'epc'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

const dict = {
  ar: {
    dir: 'rtl',
    locale: 'ar-EG',
    tagline: 'هندسة كهربائية · مناقصات · تقدير تكاليف',
    description: 'مقالات عملية في الهندسة الكهربائية: تحليل جداول الكميات (BOQ)، تقدير التكاليف، إعداد العروض الفنية والتجارية، ومشاريع EPC.',
    author: 'محمد خالد',
    authorBio: "مهندس كهرباء ومؤسس Watt's Tender. يكتب عن المناقصات وتقدير التكاليف وإدارة مشاريع EPC.",
    categories: { tendering: 'إدارة المناقصات', boq: 'تحليل جداول الكميات', estimation: 'تقدير التكاليف', proposals: 'العروض الفنية والتجارية', epc: 'مشاريع EPC' },
    nav: { home: 'الرئيسية', articles: 'المقالات', pricing: 'تسعير اللوحات', cables: 'تسعير الكابلات', lights: 'تسعير الكشافات', tags: 'الوسوم', about: 'عن الموقع' },
    navShort: { pricing: 'اللوحات', cables: 'الكابلات', lights: 'الكشافات' },
    search: 'بحث', toggleTheme: 'تبديل الوضع الليلي', menu: 'القائمة', skip: 'تخطَّ إلى المحتوى', switchLang: 'English', switchLangLabel: 'Switch to English',
    heroTitle: 'كل ما يخص <span>المناقصات الكهربائية</span><br />من الكميات إلى العرض النهائي',
    latest: 'أحدث المقالات', allArticles: 'كل المقالات', allArrow: 'كل المقالات ←', noMore: 'لا توجد مقالات أخرى بعد.',
    readArticle: 'اقرأ المقال', all: 'الكل', publishedCount: (n: string) => `${n} مقالًا منشورًا`, page: (n: string) => `صفحة ${n}`,
    inCategory: (n: string) => `${n} مقال في هذا التصنيف`, categoryEmpty: 'لا توجد مقالات في هذا التصنيف بعد.', categoryDesc: (c: string) => `مقالات في تصنيف ${c}`,
    tagsTitle: 'الوسوم', tagsSub: 'تصفّح المقالات حسب الموضوع', tagTitle: (t: string) => `وسم: ${t}`, articlesCount: (n: string) => `${n} مقال`, allTags: 'كل الوسوم',
    prev: '→ السابق', next: 'التالي ←', pagination: 'ترقيم الصفحات',
    inThisArticle: 'في هذا المقال', updatedOn: (d: string) => `حُدِّث في ${d}`, share: 'شارك المقال:', copyLink: 'نسخ الرابط', copied: 'تم النسخ',
    prevPost: '→ المقال السابق', nextPost: 'المقال التالي ←', otherPosts: 'مقالات أخرى', related: 'مقالات ذات صلة', seriesLabel: 'سلسلة', partOf: (n: string, t: string) => `الجزء ${n} من ${t}`, toc: 'محتويات المقال',
    searchTitle: 'ابحث في المقالات', searchSub: 'اكتب كلمة أو عبارة للبحث في العناوين والمحتوى والوسوم', searchPh: 'مثلًا: جدول الكميات…', noResults: 'لا توجد نتائج مطابقة. جرّب كلمات أخرى.',
    nlTitle: 'لا تفوّت أي مقال جديد', nlSub: 'اشترك في النشرة البريدية وتصلك أحدث المقالات مرة في الأسبوع.', nlPh: 'بريدك الإلكتروني', nlBtn: 'اشترك', nlThanks: 'شكرًا لاشتراكك! ✦', email: 'البريد الإلكتروني',
    rights: 'جميع الحقوق محفوظة.', notFound: 'عذرًا، الصفحة التي تبحث عنها غير موجودة أو نُقلت.', backHome: 'العودة للرئيسية',
    reading: (m: number) => (m === 1 ? 'دقيقة قراءة' : m === 2 ? 'دقيقتان قراءة' : m <= 10 ? `${toAr(m)} دقائق قراءة` : `${toAr(m)} دقيقة قراءة`),
  },
  en: {
    dir: 'ltr',
    locale: 'en-US',
    tagline: 'Electrical Engineering · Tenders · Cost Estimation',
    description: 'Practical articles on electrical engineering tenders: BOQ analysis, cost estimation, technical & commercial proposals, and EPC projects.',
    author: 'Mohamed Khaled',
    authorBio: "Electrical engineer and founder of Watt's Tender. Writes about tendering, cost estimation and EPC project delivery.",
    categories: { tendering: 'Tender Management', boq: 'BOQ Analysis', estimation: 'Cost Estimation', proposals: 'Technical & Commercial Proposals', epc: 'EPC Projects' },
    nav: { home: 'Home', articles: 'Articles', pricing: 'Panel Pricing', cables: 'Cable Pricing', lights: 'Luminaire Pricing', tags: 'Tags', about: 'About' },
    navShort: { pricing: 'Panels', cables: 'Cables', lights: 'Lighting' },
    search: 'Search', toggleTheme: 'Toggle dark mode', menu: 'Menu', skip: 'Skip to content', switchLang: 'العربية', switchLangLabel: 'التبديل إلى العربية',
    heroTitle: 'Everything about <span>electrical tenders</span><br />from quantities to the final bid',
    latest: 'Latest articles', allArticles: 'All articles', allArrow: 'All articles →', noMore: 'No other articles yet.',
    readArticle: 'Read article', all: 'All', publishedCount: (n: string) => `${n} published articles`, page: (n: string) => `Page ${n}`,
    inCategory: (n: string) => `${n} articles in this category`, categoryEmpty: 'No articles in this category yet.', categoryDesc: (c: string) => `Articles about ${c}`,
    tagsTitle: 'Tags', tagsSub: 'Browse articles by topic', tagTitle: (t: string) => `Tag: ${t}`, articlesCount: (n: string) => `${n} articles`, allTags: 'All tags',
    prev: '← Previous', next: 'Next →', pagination: 'Pagination',
    inThisArticle: 'In this article', updatedOn: (d: string) => `Updated ${d}`, share: 'Share:', copyLink: 'Copy link', copied: 'Copied',
    prevPost: '← Previous article', nextPost: 'Next article →', otherPosts: 'More articles', related: 'Related articles', seriesLabel: 'Series', partOf: (n: string, t: string) => `Part ${n} of ${t}`, toc: 'Table of contents',
    searchTitle: 'Search articles', searchSub: 'Search titles, content and tags', searchPh: 'e.g. bill of quantities…', noResults: 'No matching results. Try other words.',
    nlTitle: 'Never miss a new article', nlSub: 'Subscribe and get the latest articles once a week.', nlPh: 'Your email', nlBtn: 'Subscribe', nlThanks: 'Thanks for subscribing! ✦', email: 'Email',
    rights: 'All rights reserved.', notFound: "Sorry, the page you're looking for doesn't exist or was moved.", backHome: 'Back to home',
    reading: (m: number) => `${m} min read`,
  },
} as const;

export function t(lang: Lang) {
  return dict[lang];
}

export function toAr(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

/** رقم معروض حسب اللغة */
export function num(lang: Lang, n: number | string): string {
  return lang === 'ar' ? toAr(n) : String(n);
}

/** رابط داخلي حسب اللغة: url('en', '/blog/') => '/en/blog/' */
export function url(lang: Lang, path = '/'): string {
  return lang === 'ar' ? path : `/en${path}`;
}

/** نفس الصفحة باللغة الأخرى */
export function altPath(pathname: string): string {
  return pathname.startsWith('/en/') || pathname === '/en' ? pathname.replace(/^\/en/, '') || '/' : `/en${pathname}`;
}
