// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // غيّر هذا إلى رابط موقعك الحقيقي بعد النشر
  site: 'https://example.com',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
});
