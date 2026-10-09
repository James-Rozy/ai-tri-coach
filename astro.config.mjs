// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  // Placeholder until the site has a real name and domain.
  site: 'https://example.com',
  // React components render to static HTML by default and only ship JS with a client:* directive.
  integrations: [react()],
});
