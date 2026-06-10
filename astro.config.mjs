import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://med-study-rpg.com',
  base: '/klaudehealthedu',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [react(), sitemap()],
});
