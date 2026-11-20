# مِداد — مدونة عربية احترافية

موقع مقالات عربي سريع وأنيق مبني بـ [Astro](https://astro.build). يدعم الاتجاه من اليمين لليسار (RTL) بالكامل.

## المزايا
- تصميم احترافي متجاوب مع الجوال + وضع ليلي
- صفحة رئيسية بمقال مميز وأحدث المقالات
- صفحة لكل مقال: فهرس محتويات، شريط تقدّم القراءة، وقت القراءة، أزرار مشاركة، مقالات ذات صلة
- تصنيفات، وسوم، ترقيم صفحات
- بحث فوري يفهم العربية (يتجاهل التشكيل ويوحّد الهمزات)
- SEO جاهز: Open Graph، خريطة الموقع، RSS
- لوحة تحكم لكتابة المقالات من المتصفح (اختياري)

## التشغيل محليًا
```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # يُخرج الموقع الجاهز في dist/
```

## نشر مقال جديد (الطريقة البسيطة)
أنشئ ملفًا جديدًا في `src/content/articles/` مثل `my-article.md`:

```markdown
---
title: "عنوان المقال"
description: "وصف قصير يظهر في البطاقات ونتائج البحث"
date: 2026-11-20
category: tech            # tech | business | culture | growth
tags: ["وسم 1", "وسم 2"]
cover: /images/my-cover.jpg   # اختياري — ضع الصورة في public/images
featured: false           # true ليظهر كمقال مميز في الرئيسية
draft: false              # true لإخفائه
---

اكتب المقال هنا بصيغة Markdown…

## عنوان فرعي
```

اسم الملف يصبح رابط المقال: `/posts/my-article/`.

## التخصيص
- **اسم الموقع والوصف والكاتب وروابط التواصل:** `src/config.ts`
- **التصنيفات:** `src/config.ts` و`src/content.config.ts` (وأيضًا `public/admin/config.yml`)
- **الألوان والخطوط:** أعلى ملف `src/styles/global.css`
- **رابط الموقع النهائي:** `site` في `astro.config.mjs`

## النشر على الإنترنت (مجانًا)
1. ارفع المشروع إلى مستودع على GitHub.
2. اربطه بـ **Netlify** أو **Vercel** أو **Cloudflare Pages**.
3. أمر البناء: `npm run build` — مجلد النشر: `dist`.

كل مقال جديد تضيفه إلى المستودع يُنشر تلقائيًا خلال دقيقة.

## لوحة التحكم (الكتابة من المتصفح)
موجودة على `/admin` وتستخدم Decap CMS:
1. عدّل `repo` في `public/admin/config.yml` إلى `اسمك/اسم-المستودع`.
2. على Netlify: فعّل GitHub OAuth من إعدادات الموقع (Access control → OAuth).
3. افتح `https://موقعك/admin` وسجّل الدخول بحساب GitHub، واكتب وانشر.

للتجربة محليًا: شغّل `npx decap-server` مع `npm run dev` ثم افتح `http://localhost:4321/admin`.
