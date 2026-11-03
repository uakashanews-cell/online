/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';

const LOCAL_STORAGE_KEY = 'barvaka_wishlist';

function getLocalWishlist(): string[] {
  try {
    const s = localStorage.getItem(LOCAL_STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function saveLocalWishlist(list: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export const wishlistService = {
  async getWishlist(userId: string): Promise<string[]> {
    if (isDemoMode || !supabase) {
      return getLocalWishlist();
    }

    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('product_id')
        .eq('user_id', userId);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          return getLocalWishlist();
        }
        throw error;
      }
      return (data || []).map((row) => row.product_id);
    } catch {
      return getLocalWishlist();
    }
  },

  async addToWishlist(userId: string, productId: string): Promise<void> {
    if (isDemoMode || !supabase) {
      const current = getLocalWishlist();
      if (!current.includes(productId)) {
        saveLocalWishlist([...current, productId]);
      }
      return;
    }

    const { error } = await supabase.from('wishlist_items').insert([{
      user_id: userId,
      product_id: productId,
    }]);

    if (error) throw error;
  },

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    if (isDemoMode || !supabase) {
      const current = getLocalWishlist();
      saveLocalWishlist(current.filter((id) => id !== productId));
      return;
    }

    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;
  },
};
