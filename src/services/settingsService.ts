/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';
import { HomeBanner } from '../types';
import { compressImage, validateImageFile } from './storageService';

export const DEFAULT_HERO_BANNER: HomeBanner = {
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

let localBanner: HomeBanner = { ...DEFAULT_HERO_BANNER };

export interface StoreSettings {
  store_name?: string;
  tagline?: string;
  whatsapp_number?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  announcement?: {
    enabled: boolean;
    text: string;
    link?: string;
  };
}

let localStoreSettings: StoreSettings = {};

export const settingsService = {
  /**
   * Reads the hero banner from Supabase site_settings (key = 'home_hero_banner').
   * In Demo Mode, returns in-memory values.
   * In Real Mode, falls back safely to default without crashing if row is empty or table is missing.
   */
  async getHeroBanner(): Promise<HomeBanner> {
    if (isDemoMode || !supabase) {
      return { ...localBanner };
    }

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'home_hero_banner')
        .maybeSingle();

      if (error) {
        console.warn('Could not read site_settings.home_hero_banner from Supabase:', error.message);
        // Fallback: check legacy home_banner table if it exists
        try {
          const { data: legacy } = await supabase
            .from('home_banner')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

          if (legacy) {
            const headline = (legacy.headline || '').replace(/BARVAKA/gi, 'Arooj') || 'Welcome to Arooj';
            const mapped: HomeBanner = {
              id: 1,
              is_active: Boolean(legacy.is_active),
              label: legacy.label || '',
              headline,
              subtext: legacy.subtext || '',
              button_text: legacy.button_text || 'Shop now',
              button_link: legacy.button_link || '/shop',
              image_url: legacy.image_url || null,
              ends_at: legacy.ends_at || null,
              updated_at: legacy.updated_at || new Date().toISOString(),
            };
            localBanner = { ...mapped };
            return mapped;
          }
        } catch {
          // Ignore fallback error
        }
        return { ...localBanner };
      }

      if (data && data.value && typeof data.value === 'object') {
        const val = data.value as any;
        const headline = typeof val.headline === 'string'
          ? val.headline.replace(/BARVAKA/gi, 'Arooj')
          : 'Welcome to Arooj';

        const banner: HomeBanner = {
          id: 1,
          is_active: val.is_active !== undefined ? Boolean(val.is_active) : true,
          label: val.label || '',
          headline: headline || 'Welcome to Arooj',
          subtext: val.subtext || '',
          button_text: val.button_text || 'Shop now',
          button_link: val.button_link || '/shop',
          image_url: val.image_url || null,
          ends_at: val.ends_at || null,
          updated_at: val.updated_at || new Date().toISOString(),
        };
        localBanner = { ...banner };
        return banner;
      }

      return { ...localBanner };
    } catch (err) {
      console.warn('Error reading hero banner from Supabase:', err);
      return { ...localBanner };
    }
  },

  /**
   * Persists hero banner to Supabase site_settings using upsert on key = 'home_hero_banner'.
   * In Demo Mode, stores in memory.
   */
  async saveHeroBanner(bannerData: Partial<HomeBanner>): Promise<HomeBanner> {
    const payload: HomeBanner = {
      id: 1,
      is_active: bannerData.is_active !== undefined ? Boolean(bannerData.is_active) : true,
      label: (bannerData.label || '').slice(0, 30),
      headline: (bannerData.headline || 'Welcome to Arooj').replace(/BARVAKA/gi, 'Arooj').slice(0, 80),
      subtext: (bannerData.subtext || '').slice(0, 200),
      button_text: (bannerData.button_text || 'Shop now').slice(0, 24),
      button_link:
        bannerData.button_link && bannerData.button_link.startsWith('/')
          ? bannerData.button_link
          : '/shop',
      image_url: bannerData.image_url ?? null,
      ends_at: bannerData.ends_at ? new Date(bannerData.ends_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (isDemoMode || !supabase) {
      localBanner = { ...payload };
      return { ...localBanner };
    }

    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          key: 'home_hero_banner',
          value: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      throw error;
    }

    localBanner = { ...payload };

    // Also sync to legacy home_banner table if present in user database
    try {
      await supabase.from('home_banner').upsert(payload, { onConflict: 'id' });
    } catch {
      // Ignore if home_banner table is not present
    }

    return { ...payload };
  },

  /**
   * Generic get setting by key from public.site_settings
   */
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    if (isDemoMode || !supabase) {
      return defaultValue;
    }

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error || !data) {
        return defaultValue;
      }
      return data.value as T;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Generic save setting by key into public.site_settings
   */
  async saveSetting<T>(key: string, value: T): Promise<T> {
    if (isDemoMode || !supabase) {
      return value;
    }

    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) throw error;
    return value;
  },

  /**
   * Uploads banner image to 'product-images' storage bucket under 'banners/'
   */
  async uploadBannerImage(file: File): Promise<string> {
    const compressed = await compressImage(file);
    const check = validateImageFile(compressed);
    if (!check.valid) throw new Error(check.error);

    if (isDemoMode || !supabase) {
      return URL.createObjectURL(compressed);
    }

    const safeName = compressed.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `banners/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, compressed, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Deletes an old banner image from storage if stored in Supabase product-images
   */
  async deleteBannerImage(imageUrl: string): Promise<void> {
    if (isDemoMode || !supabase || !imageUrl) return;

    try {
      const url = new URL(imageUrl);
      const parts = url.pathname.split('product-images/');
      if (parts.length > 1) {
        const filePath = parts[1];
        if (filePath.startsWith('banners/')) {
          await supabase.storage.from('product-images').remove([filePath]);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  },
};
