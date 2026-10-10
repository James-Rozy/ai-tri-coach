// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://splitdecisionscoach.com',
  // React components render to static HTML by default and only ship JS with a client:* directive.
  integrations: [react()],
});
