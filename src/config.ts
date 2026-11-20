// ===== إعدادات الموقع — عدّلها كما تشاء =====
export const SITE = {
  title: 'مِداد',
  tagline: 'مقالات في التقنية والفكر والحياة',
  description: 'مدونة عربية تنشر مقالات معمّقة في التقنية وريادة الأعمال والثقافة وتطوير الذات.',
  author: 'محمد خالد',
  lang: 'ar',
  postsPerPage: 6,
  social: {
    x: 'https://x.com/',
    linkedin: 'https://linkedin.com/',
    github: 'https://github.com/',
  },
};

// التصنيفات: المفتاح يظهر في الرابط، والقيمة هي الاسم المعروض
export const CATEGORIES = {
  tech: 'تقنية',
  business: 'ريادة أعمال',
  culture: 'ثقافة',
  growth: 'تطوير الذات',
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
