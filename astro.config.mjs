// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The public address comes from the deploy workflow (GitHub Pages).
// Locally it falls back to a placeholder, which only affects canonical links and RSS.
export default defineConfig({
  site: process.env.SITE_URL || 'https://azh.blog',
  trailingSlash: 'ignore',
  // English at the root, Russian under /ru/. Interface strings: src/i18n/ui.ts.
  i18n: {
    locales: ['en', 'ru'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    // Code blocks in notes: a light, warm theme that fits the paper background.
    shikiConfig: { themes: { light: 'rose-pine-dawn', dark: 'rose-pine-moon' }, wrap: false },
  },
  integrations: [
    sitemap({
      // /cv/ is intentionally hidden from navigation, keep it out of the sitemap too.
      filter: (page) => !page.endsWith('/cv/'),
      i18n: { defaultLocale: 'en', locales: { en: 'en', ru: 'ru' } },
    }),
  ],
});
