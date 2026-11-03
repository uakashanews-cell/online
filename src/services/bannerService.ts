/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';
import { HomeBanner } from '../types';

let localBanner: HomeBanner = {
  id: 1,
  is_active: true,
  label: 'Curated Essentials',
  headline: 'Little things that make a house feel like home',
  subtext: 'Thoughtfully curated attire, leather accessories, and home accents delivered across Pakistan.',
  button_text: 'Explore the shop',
  button_link: '/shop',
  image_url: null,
  ends_at: null,
  updated_at: new Date().toISOString(),
};

export const bannerService = {
  /**
   * Reads public active banner (id = 1).
   * Returns null if inactive or expired.
   */
  async getPublicBanner(): Promise<HomeBanner | null> {
    if (isDemoMode || !supabase) {
      if (!localBanner.is_active) return null;
      if (localBanner.ends_at && new Date(localBanner.ends_at).getTime() <= Date.now()) {
        return null;
      }
      return { ...localBanner };
    }

    try {
      const { data, error } = await supabase
        .from('home_banner')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch public home_banner from Supabase:', error.message);
        return null;
      }

      if (!data) return null;

      const banner: HomeBanner = {
        id: data.id,
        is_active: Boolean(data.is_active),
        label: data.label || '',
        headline: data.headline || '',
        subtext: data.subtext || '',
        button_text: data.button_text || 'Explore',
        button_link: data.button_link || '/shop',
        image_url: data.image_url || null,
        ends_at: data.ends_at || null,
        updated_at: data.updated_at,
      };

      if (!banner.is_active) return null;
      if (banner.ends_at && new Date(banner.ends_at).getTime() <= Date.now()) {
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
    if (isDemoMode || !supabase) {
      return { ...localBanner };
    }

    try {
      const { data, error } = await supabase
        .from('home_banner')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('Error reading admin home_banner:', error.message);
        return { ...localBanner };
      }

      if (!data) {
        // Return default structure if row not initialized
        return { ...localBanner };
      }

      return {
        id: data.id,
        is_active: Boolean(data.is_active),
        label: data.label || '',
        headline: data.headline || '',
        subtext: data.subtext || '',
        button_text: data.button_text || 'Explore',
        button_link: data.button_link || '/shop',
        image_url: data.image_url || null,
        ends_at: data.ends_at || null,
        updated_at: data.updated_at,
      };
    } catch (err) {
      console.warn('Fallback admin banner on error:', err);
      return { ...localBanner };
    }
  },

  /**
   * Saves banner updates. Strictly sends only the allowed columns.
   */
  async saveBanner(data: Partial<HomeBanner>): Promise<HomeBanner> {
    const payload: {
      is_active: boolean;
      label: string;
      headline: string;
      subtext: string;
      button_text: string;
      button_link: string;
      image_url: string | null;
      ends_at: string | null;
      updated_at: string;
    } = {
      is_active: data.is_active ?? true,
      label: (data.label || '').slice(0, 30),
      headline: (data.headline || '').slice(0, 80),
      subtext: (data.subtext || '').slice(0, 200),
      button_text: (data.button_text || 'Explore').slice(0, 24),
      button_link: (data.button_link && data.button_link.startsWith('/') ? data.button_link : '/shop'),
      image_url: data.image_url ?? null,
      ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (isDemoMode || !supabase) {
      localBanner = {
        ...localBanner,
        ...payload,
      };
      return { ...localBanner };
    }

    // Upsert row with id = 1
    const { data: updated, error } = await supabase
      .from('home_banner')
      .upsert({ id: 1, ...payload }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    return {
      id: updated.id,
      is_active: Boolean(updated.is_active),
      label: updated.label || '',
      headline: updated.headline || '',
      subtext: updated.subtext || '',
      button_text: updated.button_text || 'Explore',
      button_link: updated.button_link || '/shop',
      image_url: updated.image_url || null,
      ends_at: updated.ends_at || null,
      updated_at: updated.updated_at,
    };
  },

  /**
   * Uploads banner image to 'product-images' storage bucket under 'banners/'
   */
  async uploadBannerImage(file: File): Promise<string> {
    if (isDemoMode || !supabase) {
      return URL.createObjectURL(file);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `banners/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
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
      // Ignore URL parsing errors for local or external URLs
    }
  },
};
