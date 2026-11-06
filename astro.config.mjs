// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://splitdecisionscoach.com',
  // React components render to static HTML by default and only ship JS with a client:* directive.
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/kit') })],
  // The guide used to be called the starter kit; keep old links working.
  redirects: {
    '/kit': '/guide/',
  },
});
