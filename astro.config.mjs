// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // غيّر هذا إلى رابط موقعك الحقيقي بعد النشر
  site: 'https://mohamedkhaledbahaa-cmyk.github.io',
  integrations: [sitemap()],
  // put the CSS inside each page: no separate stylesheet request that can fail or be stale
  // (in-app browsers like LinkedIn's keep old HTML pointing at deleted CSS files)
  build: { inlineStylesheets: 'always' },
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
});
