/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, HomeBanner } from '../types';

export interface NavLinkItem {
  label: string;
  path: string;
  tabKey?: string;
}

/**
 * Builds the desktop navigation links from active categories.
 * Desktop nav: Shop, then up to 4 active categories from activeCategories
 * (ordered by sort_order, linking to /category/{slug}), then About, Contact, Track order.
 * In real mode never reference seed slugs or ids.
 */
export function buildDesktopNav(categories: Category[]): NavLinkItem[] {
  const activeSorted = categories
    .filter((c) => Boolean(c.is_active))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, 4);

  const links: NavLinkItem[] = [
    { label: 'Shop', path: '/shop', tabKey: 'shop' },
  ];

  for (const cat of activeSorted) {
    links.push({
      label: cat.name,
      path: `/category/${cat.slug}`,
      tabKey: `category-${cat.slug}`,
    });
  }

  links.push(
    { label: 'About', path: '/about', tabKey: 'about' },
    { label: 'Contact', path: '/contact', tabKey: 'contact' },
    { label: 'Track order', path: '/track-order', tabKey: 'track-order' }
  );

  return links;
}

/**
 * Checks whether a HomeBanner is active and unexpired.
 */
export function isBannerActive(banner: HomeBanner | null, now: Date | number = Date.now()): boolean {
  if (!banner || !banner.is_active) {
    return false;
  }

  if (banner.ends_at) {
    const endMs = new Date(banner.ends_at).getTime();
    const currentMs = typeof now === 'number' ? now : now.getTime();
    if (!isNaN(endMs) && endMs <= currentMs) {
      return false; // Expired
    }
  }

  return true;
}

/**
 * Determines whether reviews & star ratings should be displayed.
 * There is no reviews table in Supabase. In real mode (isDemo === false),
 * hide reviews and star ratings. Keep demo behaviour (isDemo === true).
 */
export function shouldShowReviews(isDemo: boolean): boolean {
  return Boolean(isDemo);
}
