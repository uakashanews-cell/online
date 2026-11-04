/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDesktopNav, isBannerActive, shouldShowReviews } from './navigation';
import { generateSitemapXml, generateRobotsTxt, STATIC_SITEMAP_PATHS } from './sitemap-generator';
import { Category, HomeBanner } from '../types';

describe('1. Reviews Visibility & Real Mode Behavior', () => {
  it('hides reviews and ratings in real mode', () => {
    assert.equal(shouldShowReviews(false), false, 'Reviews should be hidden when isDemo is false (real mode)');
  });

  it('keeps reviews behavior active in demo mode', () => {
    assert.equal(shouldShowReviews(true), true, 'Reviews should be visible when isDemo is true (demo mode)');
  });
});

describe('2. Dynamic Navigation Built from Categories', () => {
  const sampleCategories: Category[] = [
    {
      id: 'cat-3',
      name: 'Leather Wallets',
      slug: 'leather-wallets',
      sort_order: 30,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cat-inactive',
      name: 'Hidden Winter Stock',
      slug: 'winter-stock',
      sort_order: 5,
      is_active: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cat-1',
      name: 'Stitched Apparel',
      slug: 'stitched-apparel',
      sort_order: 10,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cat-4',
      name: 'Footwear & Chappals',
      slug: 'footwear-chappals',
      sort_order: 40,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cat-2',
      name: 'Artisanal Attars',
      slug: 'artisanal-attars',
      sort_order: 20,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cat-5-extra',
      name: 'Extra Accessories',
      slug: 'extra-accessories',
      sort_order: 50,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  it('constructs desktop nav starting with Shop, up to 4 active sorted categories, and ending with About, Contact, Track order', () => {
    const nav = buildDesktopNav(sampleCategories);

    assert.equal(nav[0].label, 'Shop');
    assert.equal(nav[0].path, '/shop');

    // Should only have up to 4 active categories, ordered by sort_order
    assert.equal(nav[1].label, 'Stitched Apparel');
    assert.equal(nav[1].path, '/category/stitched-apparel');

    assert.equal(nav[2].label, 'Artisanal Attars');
    assert.equal(nav[2].path, '/category/artisanal-attars');

    assert.equal(nav[3].label, 'Leather Wallets');
    assert.equal(nav[3].path, '/category/leather-wallets');

    assert.equal(nav[4].label, 'Footwear & Chappals');
    assert.equal(nav[4].path, '/category/footwear-chappals');

    // Extra 5th category (sort_order 50) must not be included in the top 4
    const extraPresent = nav.some((item) => item.label === 'Extra Accessories');
    assert.equal(extraPresent, false, 'Should limit category links to at most 4');

    // Inactive category must be excluded
    const inactivePresent = nav.some((item) => item.label === 'Hidden Winter Stock');
    assert.equal(inactivePresent, false, 'Should exclude inactive categories');

    // Trail ends with About, Contact, Track order
    assert.equal(nav[5].label, 'About');
    assert.equal(nav[5].path, '/about');

    assert.equal(nav[6].label, 'Contact');
    assert.equal(nav[6].path, '/contact');

    assert.equal(nav[7].label, 'Track order');
    assert.equal(nav[7].path, '/track-order');
  });

  it('never references hardcoded seed slugs or Gifts', () => {
    const customCats: Category[] = [
      {
        id: 'cust-1',
        name: 'Custom Fabric',
        slug: 'custom-fabric',
        sort_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];

    const nav = buildDesktopNav(customCats);
    const hasGifts = nav.some((i) => i.label === 'Gifts' || i.path.includes('category-fragrances-attar'));
    assert.equal(hasGifts, false, 'Must not reference hardcoded Gifts or seed slugs');
  });
});

describe('3. Banner Expiry Logic', () => {
  const baseBanner: HomeBanner = {
    id: 1,
    is_active: true,
    label: 'New',
    headline: 'Welcome to Arooj',
    subtext: 'Free delivery on all orders. Pay on arrival.',
    button_text: 'Shop now',
    button_link: '/shop',
    image_url: null,
    ends_at: null,
    updated_at: new Date().toISOString(),
  };

  const nowMs = new Date('2026-11-03T12:00:00Z').getTime();

  it('returns true when banner is active and ends_at is null', () => {
    assert.equal(isBannerActive(baseBanner, nowMs), true);
  });

  it('returns false when banner is inactive regardless of dates', () => {
    assert.equal(isBannerActive({ ...baseBanner, is_active: false }, nowMs), false);
  });

  it('returns false when banner is null', () => {
    assert.equal(isBannerActive(null, nowMs), false);
  });

  it('returns true when ends_at is in the future', () => {
    const futureBanner: HomeBanner = {
      ...baseBanner,
      ends_at: new Date(nowMs + 60 * 60 * 1000).toISOString(), // 1 hour in future
    };
    assert.equal(isBannerActive(futureBanner, nowMs), true);
  });

  it('returns false when ends_at has passed (expired)', () => {
    const expiredBanner: HomeBanner = {
      ...baseBanner,
      ends_at: new Date(nowMs - 60 * 1000).toISOString(), // 1 minute in past
    };
    assert.equal(isBannerActive(expiredBanner, nowMs), false);
  });

  it('returns false when ends_at is exactly now', () => {
    const edgeBanner: HomeBanner = {
      ...baseBanner,
      ends_at: new Date(nowMs).toISOString(),
    };
    assert.equal(isBannerActive(edgeBanner, nowMs), false);
  });
});

describe('4. Sitemap Builder & robots.txt', () => {
  const siteUrl = 'https://barvaka.pk';

  it('skips sitemap if VITE_SITE_URL is missing', async () => {
    const result = await generateSitemapXml({ siteUrl: '' });
    assert.equal(result, null);

    const resultUndefined = await generateSitemapXml({ siteUrl: undefined });
    assert.equal(resultUndefined, null);
  });

  it('falls back to static URLs when REST fetch fails or throws an error without breaking the build', async () => {
    // Simulated failing fetch
    const failingFetch = (async () => {
      throw new Error('Network timeout or Supabase connection unreachable');
    }) as unknown as typeof fetch;

    const sitemap = await generateSitemapXml({
      siteUrl,
      supabaseUrl: 'https://real-test-project.supabase.co',
      supabaseAnonKey: 'test-anon-key',
      fetchFn: failingFetch,
      timeoutMs: 100,
    });

    assert.ok(sitemap !== null, 'Sitemap should still be generated with static URLs');
    assert.ok(sitemap.includes('<urlset'), 'Should be valid XML urlset');

    // Check all required static URLs are included
    for (const p of STATIC_SITEMAP_PATHS) {
      const expectedUrl = p === '/' ? `${siteUrl}/` : `${siteUrl}${p}`;
      assert.ok(sitemap.includes(expectedUrl), `Sitemap should include ${expectedUrl}`);
    }
  });

  it('includes active category and product URLs when REST fetch succeeds', async () => {
    const successfulFetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/categories')) {
        return {
          ok: true,
          json: async () => [{ slug: 'stitched-apparel' }, { slug: 'attars' }],
        };
      }
      if (urlStr.includes('/products')) {
        return {
          ok: true,
          json: async () => [{ slug: 'classic-kurta' }, { slug: 'royal-oud' }],
        };
      }
      return { ok: false, json: async () => [] };
    }) as unknown as typeof fetch;

    const sitemap = await generateSitemapXml({
      siteUrl,
      supabaseUrl: 'https://mock.supabase.co',
      supabaseAnonKey: 'anon-key',
      fetchFn: successfulFetch,
    });

    assert.ok(sitemap !== null);
    assert.ok(sitemap.includes(`${siteUrl}/category/stitched-apparel`));
    assert.ok(sitemap.includes(`${siteUrl}/category/attars`));
    assert.ok(sitemap.includes(`${siteUrl}/product/classic-kurta`));
    assert.ok(sitemap.includes(`${siteUrl}/product/royal-oud`));
  });

  it('generates robots.txt with disallows and sitemap only when siteUrl is provided', () => {
    const robotsWithUrl = generateRobotsTxt('https://barvaka.pk');
    assert.ok(robotsWithUrl.includes('User-agent: *'));
    assert.ok(robotsWithUrl.includes('Allow: /'));
    assert.ok(robotsWithUrl.includes('Disallow: /admin'));
    assert.ok(robotsWithUrl.includes('Disallow: /cart'));
    assert.ok(robotsWithUrl.includes('Disallow: /checkout'));
    assert.ok(robotsWithUrl.includes('Disallow: /account'));
    assert.ok(robotsWithUrl.includes('Disallow: /order-success'));
    assert.ok(robotsWithUrl.includes('Sitemap: https://barvaka.pk/sitemap.xml'));

    const robotsWithoutUrl = generateRobotsTxt('');
    assert.ok(!robotsWithoutUrl.includes('Sitemap:'));
  });
});
