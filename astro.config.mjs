import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fireman333.github.io',
  base: '/KlaudeHealthEducation',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [react(), sitemap()],
});
