# Watt's Tender — مقالات الهندسة الكهربائية والمناقصات

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
category: boq             # boq | estimation | proposals | epc
tags: ["وسم 1", "وسم 2"]
cover: /images/my-cover.jpg   # اختياري — ضع الصورة في public/images
featured: false           # true ليظهر كمقال مميز في الرئيسية
draft: false              # true لإخفائه
---

اكتب المقال هنا بصيغة Markdown…

## عنوان فرعي
```

اسم الملف يصبح رابط المقال: `/posts/my-article/`.

**مقال بالإنجليزي:** ضع الملف في `src/content/articles/en/` وأضف `lang: en` — يظهر على `/en/posts/...`.
نصوص الواجهة بالعربي والإنجليزي موجودة في `src/i18n.ts`.

## التخصيص
- **اسم الموقع والوصف والكاتب وروابط التواصل:** `src/config.ts`
- **التصنيفات:** `src/config.ts` و`src/content.config.ts` (وأيضًا `public/admin/config.yml`)
- **الألوان والخطوط:** أعلى ملف `src/styles/global.css`
- **رابط الموقع النهائي:** `site` في `astro.config.mjs`

## النشر على الإنترنت
الموقع منشور تلقائيًا على GitHub Pages: https://mohamedkhaledbahaa-cmyk.github.io
أي تعديل يترفع على فرع `main` بيتنشر لوحده خلال دقيقتين (`.github/workflows/deploy.yml`).

## لوحة التحكم (الكتابة من المتصفح)
على `/admin` (Sveltia CMS):
1. اعمل توكن من https://github.com/settings/personal-access-tokens/new
   - Repository access: Only select repositories ← `mohamedkhaledbahaa-cmyk.github.io`
   - Permissions ← Contents: **Read and write**
2. افتح https://mohamedkhaledbahaa-cmyk.github.io/admin واختار **Sign In with Token** والصق التوكن.

## تسعير اللوحات (`/pricing`)
الأداة نسخة من شيت `LV_Panel_Pricing_Database` وبتدي نفس أرقامه بالظبط (السعر، المدى، الأبعاد، العرض الفني).
- الحسابات: `src/lib/pricing.ts` — الصفحة: `src/views/Pricing.astro`
- البيانات: `public/pricing/data.json` (بدون أسماء مشاريع أو موردين)

**تحديث الأسعار بعد ما تعدّل الشيت:** افتح الشيت في Excel واحفظه، وبعدين:
```bash
pip install openpyxl
python3 tools/export_pricing.py "LV_Panel_Pricing_Database_v5.9.xlsx"
```
وارفع الملف `public/pricing/data.json` الجديد.

## تسعير الكابلات (`/cables`)
نسخة من شيت `Cable_Pricing_DB_LME` (أساس التسعير "متوسط مورد معين"): السعر = متوسط كل أسعار المورد المختار لنفس الكابل، ولو مالوش سعر بيتاخد متوسط كل الموردين. العرض الفني من كتالوج السويدي.
- الحسابات: `src/lib/cables.ts` — الصفحة: `src/views/Cables.astro`
- البيانات: `public/cables/data.json` (نوع الكابل + المقاس + الجهد + الماركة + السعر النهارده بس — بدون عروض أو مشاريع)

**تحديث الأسعار:** حدّث أسعار النهارده في الشيت (LME + الدولار) واحفظه، وبعدين:
```bash
python3 tools/export_cables.py "Cable_Pricing_DB_LME_2.xlsm"
```

## تسعير الكشافات (`/lighting`)
نسخة من شيت `Luminaire_Pricing_Tool`: السعر = وسيط (أو أقل/متوسط/أعلى) أسعار العروض المطابقة في النوع والطوارئ والبراند والديمر والوات (± السماحية) واللومن والكلفن والـ IP، ولو مفيش مطابق بيتقدّر من وسيط سعر الوات. عروض الدولار بتتحسب على سعر الدولار اليومي.
- الحسابات: `src/lib/luminaires.ts` — الصفحة: `src/views/Luminaires.astro`
- البيانات: `public/luminaires/data.json` (بدون موردين أو مشاريع أو أرقام عروض)

**تحديث البيانات:**
```bash
python3 tools/export_luminaires.py "Luminaire_Pricing_Tool.xlsx"
```
