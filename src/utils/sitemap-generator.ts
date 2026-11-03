/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SitemapOptions {
  siteUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export const STATIC_SITEMAP_PATHS = [
  '/',
  '/shop',
  '/about',
  '/contact',
  '/track-order',
  '/privacy',
  '/delivery-and-payment',
];

/**
 * Generates sitemap.xml at build time.
 * - Lists /, /shop, /about, /contact, /track-order, /privacy, /delivery-and-payment
 * - Plus /category/{slug} and /product/{slug} for active rows fetched at build time
 *   from `${VITE_SUPABASE_URL}/rest/v1/` with the anon key header
 * - Wrapped inside try/catch with an 8 second timeout
 * - NEVER fails the build (falls back to static URLs)
 * - Returns null (skips sitemap) if siteUrl is missing
 */
export async function generateSitemapXml(options: SitemapOptions): Promise<string | null> {
  const {
    siteUrl,
    supabaseUrl,
    supabaseAnonKey,
    fetchFn = (typeof fetch !== 'undefined' ? fetch : undefined),
    timeoutMs = 8000,
  } = options;

  if (!siteUrl || !siteUrl.trim()) {
    return null;
  }

  const cleanSiteUrl = siteUrl.trim().replace(/\/+$/, '');
  const urls: string[] = STATIC_SITEMAP_PATHS.map((p) =>
    p === '/' ? `${cleanSiteUrl}/` : `${cleanSiteUrl}${p}`
  );

  // Attempt to fetch active rows from Supabase REST API
  if (
    supabaseUrl &&
    supabaseAnonKey &&
    fetchFn &&
    !supabaseUrl.includes('your-project')
  ) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const cleanSupabaseUrl = supabaseUrl.trim().replace(/\/+$/, '');
      const headers: Record<string, string> = {
        apikey: supabaseAnonKey.trim(),
        Authorization: `Bearer ${supabaseAnonKey.trim()}`,
        'Content-Type': 'application/json',
      };

      const [catRes, prodRes] = await Promise.allSettled([
        fetchFn(`${cleanSupabaseUrl}/rest/v1/categories?is_active=eq.true&select=slug`, {
          headers,
          signal: controller.signal,
        }),
        fetchFn(`${cleanSupabaseUrl}/rest/v1/products?is_active=eq.true&select=slug`, {
          headers,
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timer);

      if (catRes.status === 'fulfilled' && catRes.value.ok) {
        try {
          const categories = (await catRes.value.json()) as Array<{ slug?: string }>;
          if (Array.isArray(categories)) {
            for (const cat of categories) {
              if (cat && cat.slug) {
                urls.push(`${cleanSiteUrl}/category/${cat.slug}`);
              }
            }
          }
        } catch {
          // Ignore JSON parse error, fall back to static
        }
      }

      if (prodRes.status === 'fulfilled' && prodRes.value.ok) {
        try {
          const products = (await prodRes.value.json()) as Array<{ slug?: string }>;
          if (Array.isArray(products)) {
            for (const prod of products) {
              if (prod && prod.slug) {
                urls.push(`${cleanSiteUrl}/product/${prod.slug}`);
              }
            }
          }
        } catch {
          // Ignore JSON parse error, fall back to static
        }
      }
    } catch {
      // NEVER fail the build - fall back cleanly to static URLs
    }
  }

  const urlEntries = urls
    .map(
      (loc) => `  <url>
    <loc>${loc}</loc>
    <changefreq>weekly</changefreq>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
}

/**
 * Generates robots.txt.
 * Allows all, disallows /admin, /cart, /checkout, /account, /order-success
 * and has a "Sitemap:" line only when VITE_SITE_URL is set.
 */
export function generateRobotsTxt(siteUrl?: string): string {
  const lines: string[] = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /account',
    'Disallow: /order-success',
  ];

  if (siteUrl && siteUrl.trim()) {
    const cleanSiteUrl = siteUrl.trim().replace(/\/+$/, '');
    lines.push(`Sitemap: ${cleanSiteUrl}/sitemap.xml`);
  }

  return lines.join('\n') + '\n';
}
