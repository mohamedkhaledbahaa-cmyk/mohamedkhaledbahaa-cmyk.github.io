// ===== إعدادات الموقع — عدّلها كما تشاء =====
export const SITE = {
  title: "Watt's Tender",
  tagline: 'هندسة كهربائية · مناقصات · تقدير تكاليف',
  description: 'مقالات عملية في الهندسة الكهربائية: تحليل جداول الكميات (BOQ)، تقدير التكاليف، إعداد العروض الفنية والتجارية، ومشاريع EPC.',
  author: 'محمد خالد',
  authorBio: "مهندس كهرباء ومؤسس Watt's Tender. يكتب عن المناقصات وتقدير التكاليف وإدارة مشاريع EPC.",
  lang: 'ar',
  postsPerPage: 6,
  social: {
    x: 'https://x.com/',
    linkedin: 'https://linkedin.com/',
    github: 'https://github.com/mohamedkhaledbahaa-cmyk',
  },
};

// التصنيفات: المفتاح يظهر في الرابط، والقيمة هي الاسم المعروض
export const CATEGORIES = {
  boq: 'تحليل جداول الكميات',
  estimation: 'تقدير التكاليف',
  proposals: 'العروض الفنية والتجارية',
  epc: 'مشاريع EPC',
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
