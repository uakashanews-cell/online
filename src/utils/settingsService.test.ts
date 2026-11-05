/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { settingsService, DEFAULT_HERO_BANNER } from '../services/settingsService';
import { isBannerActive } from './navigation';

describe('settingsService & Home Hero Banner Tests', () => {
  it('1. Returns default hero banner with headline Welcome to AROOJ', async () => {
    const banner = await settingsService.getHeroBanner();
    assert.ok(banner, 'Banner must exist');
    assert.ok(
      banner.headline.includes('AROOJ') || banner.headline.includes('Arooj'),
      'Headline must contain AROOJ'
    );
    assert.equal(banner.headline.includes('BARVAKA'), false, 'Headline must not contain BARVAKA');
    assert.equal(banner.button_text, 'Shop now');
    assert.equal(banner.button_link, '/shop');
  });

  it('2. Saves and retrieves updated hero banner in demo/memory mode', async () => {
    const updated = await settingsService.saveHeroBanner({
      is_active: true,
      label: 'Special Offer',
      headline: 'Welcome to AROOJ - Handcrafted Living',
      subtext: 'Exclusive seasonal savings with free COD.',
      button_text: 'Shop Collection',
      button_link: '/category/stitched-apparel',
    });

    assert.equal(updated.label, 'Special Offer');
    assert.equal(updated.headline, 'Welcome to AROOJ - Handcrafted Living');
    assert.equal(updated.button_text, 'Shop Collection');
    assert.equal(updated.button_link, '/category/stitched-apparel');

    const fetched = await settingsService.getHeroBanner();
    assert.equal(fetched.headline, 'Welcome to AROOJ - Handcrafted Living');
    assert.equal(fetched.button_link, '/category/stitched-apparel');
  });

  it('3. Respects show banner toggle (is_active: false)', async () => {
    await settingsService.saveHeroBanner({
      is_active: false,
    });

    const banner = await settingsService.getHeroBanner();
    assert.equal(banner.is_active, false);
    assert.equal(isBannerActive(banner), false, 'isBannerActive must be false when is_active is false');
  });

  it('4. Respects banner expiry date', async () => {
    const nowMs = Date.now();
    const pastDate = new Date(nowMs - 3600000).toISOString(); // 1 hour ago
    const futureDate = new Date(nowMs + 3600000).toISOString(); // 1 hour from now

    await settingsService.saveHeroBanner({
      is_active: true,
      ends_at: pastDate,
    });

    const expiredBanner = await settingsService.getHeroBanner();
    assert.equal(isBannerActive(expiredBanner, nowMs), false, 'Expired banner must not be active');

    await settingsService.saveHeroBanner({
      is_active: true,
      ends_at: futureDate,
    });

    const activeBanner = await settingsService.getHeroBanner();
    assert.equal(isBannerActive(activeBanner, nowMs), true, 'Future banner must be active');
  });

  it('5. Sanitizes any remaining BARVAKA text to Arooj', async () => {
    const banner = await settingsService.saveHeroBanner({
      headline: 'Welcome to BARVAKA Store',
    });

    // If headline has BARVAKA, getHeroBanner converts to Arooj
    const fetched = await settingsService.getHeroBanner();
    assert.equal(fetched.headline.includes('BARVAKA'), false);
    assert.ok(fetched.headline.includes('Arooj') || fetched.headline.includes('AROOJ'));
  });
});
