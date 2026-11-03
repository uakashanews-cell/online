/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';
import { MOCK_CATEGORIES } from '../lib/mockData';
import { Category } from '../types';

let localCategories = [...MOCK_CATEGORIES];

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    if (isDemoMode || !supabase) {
      return [...localCategories].sort((a, b) => a.sort_order - b.sort_order);
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.warn(
            "[BARVAKA] Supabase table 'categories' not found in schema cache. Using fallback categories. Run supabase/schema.sql in the Supabase SQL Editor."
          );
          return [...localCategories].sort((a, b) => a.sort_order - b.sort_order);
        }
        throw error;
      }
      return data || [];
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        return [...localCategories].sort((a, b) => a.sort_order - b.sort_order);
      }
      throw err;
    }
  },

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    if (isDemoMode || !supabase) {
      return localCategories.find((c) => c.slug === slug) || null;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          return localCategories.find((c) => c.slug === slug) || null;
        }
        return null;
      }
      return data;
    } catch {
      return localCategories.find((c) => c.slug === slug) || null;
    }
  },

  async createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    const payload = {
      name: category.name,
      slug: category.slug,
      description: category.description ?? null,
      image_url: category.image_url ?? null,
      sort_order: category.sort_order ?? 0,
      is_active: category.is_active ?? true,
    };

    if (isDemoMode || !supabase) {
      const newCat: Category = {
        ...payload,
        id: `cat-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      localCategories.push(newCat);
      return newCat;
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const payload: {
      name?: string;
      slug?: string;
      description?: string | null;
      image_url?: string | null;
      sort_order?: number;
      is_active?: boolean;
    } = {};

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;
    if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;

    if (isDemoMode || !supabase) {
      localCategories = localCategories.map((c) => (c.id === id ? { ...c, ...payload } : c));
      const updated = localCategories.find((c) => c.id === id);
      if (!updated) throw new Error('Category not found');
      return updated;
    }

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    if (isDemoMode || !supabase) {
      localCategories = localCategories.filter((c) => c.id !== id);
      return;
    }

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },
};
