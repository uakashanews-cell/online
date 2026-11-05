/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HomeBanner } from '../types';
import { settingsService, DEFAULT_HERO_BANNER } from './settingsService';
import { isBannerActive } from '../utils/navigation';

export const bannerService = {
  /**
   * Reads public active banner.
   * Returns null if inactive or expired.
   */
  async getPublicBanner(): Promise<HomeBanner | null> {
    try {
      const banner = await settingsService.getHeroBanner();
      if (!isBannerActive(banner)) {
        return null;
      }
      return banner;
    } catch (err) {
      console.warn('Error in getPublicBanner:', err);
      return null;
    }
  },

  /**
   * Reads the home banner for admin management (includes inactive/expired banners).
   */
  async getAdminBanner(): Promise<HomeBanner> {
    return settingsService.getHeroBanner();
  },

  /**
   * Saves banner updates via settingsService upsert on key = 'home_hero_banner'.
   */
  async saveBanner(data: Partial<HomeBanner>): Promise<HomeBanner> {
    return settingsService.saveHeroBanner(data);
  },

  /**
   * Uploads banner image to 'product-images' storage bucket under 'banners/'
   */
  async uploadBannerImage(file: File): Promise<string> {
    return settingsService.uploadBannerImage(file);
  },

  /**
   * Deletes an old banner image from storage if stored in Supabase product-images
   */
  async deleteBannerImage(imageUrl: string): Promise<void> {
    return settingsService.deleteBannerImage(imageUrl);
  },
};
