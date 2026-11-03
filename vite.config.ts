import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { generateRobotsTxt, generateSitemapXml } from './src/utils/sitemap-generator.ts';

const rootDir =
  typeof import.meta.dirname !== 'undefined'
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

function seoBuildPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'vite-plugin-barvaka-seo',
    async generateBundle() {
      const siteUrl = env.VITE_SITE_URL || process.env.VITE_SITE_URL;
      const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      const robots = generateRobotsTxt(siteUrl);
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robots,
      });

      const sitemap = await generateSitemapXml({
        siteUrl,
        supabaseUrl,
        supabaseAnonKey,
      });

      if (sitemap) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: sitemap,
        });
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const siteUrl = env.VITE_SITE_URL || process.env.VITE_SITE_URL;
        if (req.url === '/robots.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(generateRobotsTxt(siteUrl));
          return;
        }
        if (req.url === '/sitemap.xml') {
          const sitemap = await generateSitemapXml({
            siteUrl,
            supabaseUrl: env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
            supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
          });
          if (sitemap) {
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.end(sitemap);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (!env.VITE_SITE_URL && !process.env.VITE_SITE_URL) {
    process.env.VITE_SITE_URL = 'https://barvaka.pk';
    env.VITE_SITE_URL = 'https://barvaka.pk';
  }

  return {
    plugins: [react(), tailwindcss(), seoBuildPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
