/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';
import { MOCK_PRODUCTS } from '../lib/mockData';
import { Product, ProductVariant } from '../types';
import {
  normalizeVariantSku,
  validateVariantPriceOverride,
  getDuplicateSkuErrorMessage,
} from '../utils/ecommerce-logic';

let localProducts = [...MOCK_PRODUCTS];

export interface GetProductsParams {
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'featured';
  limit?: number;
}

function mapProductRow(row: any): Product {
  const imgList: string[] =
    row.product_images && Array.isArray(row.product_images) && row.product_images.length > 0
      ? row.product_images
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((i: any) => i.image_url)
      : row.image_url
      ? [row.image_url]
      : [];

  return {
    id: row.id,
    category_id: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    base_price: Number(row.base_price),
    compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
    image_url: row.image_url || imgList[0] || '',
    images: imgList,
    is_featured: Boolean(row.is_featured),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    variants: (row.variants || row.product_variants || []).map((v: any) => ({
      id: v.id,
      product_id: v.product_id,
      size: v.size,
      color: v.color,
      color_hex: v.color_hex,
      price: v.price !== null && v.price !== undefined ? Number(v.price) : null,
      stock_quantity: Number(v.stock_quantity ?? 0),
      sku: normalizeVariantSku(v.sku),
      is_active: Boolean(v.is_active ?? true),
    })),
  };
}

function filterLocalProducts(params: GetProductsParams = {}): Product[] {
  let result = [...localProducts].filter((p) => p.is_active);

  if (params.categorySlug && params.categorySlug !== 'all') {
    result = result.filter((p) => p.category_id.includes(params.categorySlug!) || p.slug.includes(params.categorySlug!));
  }

  if (params.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }

  if (params.minPrice !== undefined) {
    result = result.filter((p) => p.base_price >= params.minPrice!);
  }

  if (params.maxPrice !== undefined) {
    result = result.filter((p) => p.base_price <= params.maxPrice!);
  }

  if (params.inStockOnly) {
    result = result.filter((p) =>
      p.variants.some((v) => v.is_active && v.stock_quantity > 0)
    );
  }

  if (params.sortBy === 'price-asc') {
    result.sort((a, b) => a.base_price - b.base_price);
  } else if (params.sortBy === 'price-desc') {
    result.sort((a, b) => b.base_price - a.base_price);
  } else if (params.sortBy === 'featured') {
    result.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
  } else {
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  if (params.limit) {
    result = result.slice(0, params.limit);
  }

  return result;
}

export const productService = {
  async getProducts(params: GetProductsParams = {}): Promise<Product[]> {
    if (isDemoMode || !supabase) {
      return filterLocalProducts(params);
    }

    try {
      let query = supabase
        .from('products')
        .select('*, variants:product_variants(*), product_images(image_url, sort_order)')
        .eq('is_active', true);

      if (params.search) {
        query = query.ilike('name', `%${params.search}%`);
      }

      if (params.minPrice !== undefined) {
        query = query.gte('base_price', params.minPrice);
      }

      if (params.maxPrice !== undefined) {
        query = query.lte('base_price', params.maxPrice);
      }

      if (params.sortBy === 'price-asc') {
        query = query.order('base_price', { ascending: true });
      } else if (params.sortBy === 'price-desc') {
        query = query.order('base_price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.warn(
            "[BARVAKA] Supabase table 'products' not found in schema cache. Using fallback products. Run supabase/schema.sql in the Supabase SQL Editor."
          );
          return filterLocalProducts(params);
        }
        throw error;
      }
      return (data || []).map(mapProductRow);
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        return filterLocalProducts(params);
      }
      throw err;
    }
  },

  async getAllProductsAdmin(): Promise<Product[]> {
    if (isDemoMode || !supabase) {
      return [...localProducts];
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, variants:product_variants(*), product_images(image_url, sort_order)')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.warn(
            "[BARVAKA] Supabase table 'products' not found in schema cache. Using fallback products. Run supabase/schema.sql in the Supabase SQL Editor."
          );
          return [...localProducts];
        }
        throw error;
      }
      return (data || []).map(mapProductRow);
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        return [...localProducts];
      }
      throw err;
    }
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    if (isDemoMode || !supabase) {
      return localProducts.find((p) => p.slug === slug) || null;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, variants:product_variants(*), product_images(image_url, sort_order)')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          return localProducts.find((p) => p.slug === slug) || null;
        }
        return null;
      }
      return mapProductRow(data);
    } catch {
      return localProducts.find((p) => p.slug === slug) || null;
    }
  },

  async getProductById(id: string): Promise<Product | null> {
    if (isDemoMode || !supabase) {
      return localProducts.find((p) => p.id === id) || null;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, variants:product_variants(*), product_images(image_url, sort_order)')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          return localProducts.find((p) => p.id === id) || null;
        }
        return null;
      }
      return mapProductRow(data);
    } catch {
      return localProducts.find((p) => p.id === id) || null;
    }
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const formattedVariants = (product.variants || []).map((v, idx) => {
      const priceValidation = validateVariantPriceOverride(v.price);
      if (!priceValidation.isValid) {
        throw new Error(priceValidation.error || 'Price override cannot be negative.');
      }
      return {
        ...v,
        id: v.id || `var-${Date.now()}-${idx}`,
        product_id: '',
        sku: normalizeVariantSku(v.sku),
        price: priceValidation.normalizedPrice,
        stock_quantity: v.stock_quantity ?? 0,
        is_active: v.is_active ?? true,
      };
    });

    if (isDemoMode || !supabase) {
      // Validate non-null unique SKUs in demo mode
      const nonNullSkus = formattedVariants.map((v) => v.sku).filter(Boolean) as string[];
      const skuSet = new Set<string>();
      for (const s of nonNullSkus) {
        const upper = s.toUpperCase();
        if (skuSet.has(upper)) {
          throw new Error('This SKU is already used by another product. Please change it.');
        }
        skuSet.add(upper);
      }
      for (const p of localProducts) {
        for (const v of p.variants || []) {
          if (v.sku && skuSet.has(v.sku.toUpperCase())) {
            throw new Error('This SKU is already used by another product. Please change it.');
          }
        }
      }

      const newProd: Product = {
        ...product,
        variants: formattedVariants,
        id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        created_at: new Date().toISOString(),
      };
      localProducts.unshift(newProd);
      return newProd;
    }

    const { variants, images, ...prodFields } = product;
    const mainImage = (images && images.length > 0) ? images[0] : (prodFields.image_url || null);

    const { data: createdProduct, error } = await supabase
      .from('products')
      .insert([{
        category_id: prodFields.category_id || null,
        name: prodFields.name,
        slug: prodFields.slug,
        description: prodFields.description || '',
        base_price: prodFields.base_price,
        compare_at_price: prodFields.compare_at_price || null,
        image_url: mainImage,
        is_featured: Boolean(prodFields.is_featured),
        is_active: prodFields.is_active ?? true,
      }])
      .select()
      .single();

    if (error) {
      const duplicateMsg = getDuplicateSkuErrorMessage(error);
      if (duplicateMsg) throw new Error(duplicateMsg);
      throw error;
    }

    if (images && images.length > 0) {
      const imageRows = images.map((url, idx) => ({
        product_id: createdProduct.id,
        image_url: url,
        sort_order: idx,
      }));
      const { error: imgError } = await supabase.from('product_images').insert(imageRows);
      if (imgError) {
        await supabase.from('product_images').delete().eq('product_id', createdProduct.id);
        await supabase.from('products').delete().eq('id', createdProduct.id);
        throw imgError;
      }
    }

    if (formattedVariants && formattedVariants.length > 0) {
      const variantsWithProductId = formattedVariants.map((v) => ({
        product_id: createdProduct.id,
        sku: v.sku || null, // null if empty
        size: v.size || null,
        color: v.color || null,
        color_hex: v.color_hex || null,
        price: v.price !== null && v.price !== undefined ? v.price : null,
        stock_quantity: v.stock_quantity ?? 0,
        is_active: v.is_active ?? true,
      }));
      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantsWithProductId);
      if (variantError) {
        // Roll back the newly created product and images so we do not leave an orphaned product with 0 variants
        await supabase.from('product_images').delete().eq('product_id', createdProduct.id);
        await supabase.from('products').delete().eq('id', createdProduct.id);
        const duplicateMsg = getDuplicateSkuErrorMessage(variantError);
        if (duplicateMsg) throw new Error(duplicateMsg);
        throw variantError;
      }
    }

    const result = await this.getProductById(createdProduct.id);
    if (!result) throw new Error('Failed to load created product');
    return result;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const formattedVariants = updates.variants
      ? updates.variants.map((v, idx) => {
          const priceValidation = validateVariantPriceOverride(v.price);
          if (!priceValidation.isValid) {
            throw new Error(priceValidation.error || 'Price override cannot be negative.');
          }
          return {
            ...v,
            id: v.id || `var-${Date.now()}-${idx}`,
            product_id: id,
            sku: normalizeVariantSku(v.sku),
            price: priceValidation.normalizedPrice,
            stock_quantity: v.stock_quantity ?? 0,
            is_active: v.is_active ?? true,
          };
        })
      : undefined;

    if (isDemoMode || !supabase) {
      if (formattedVariants) {
        const nonNullSkus = formattedVariants.map((v) => v.sku).filter(Boolean) as string[];
        const skuSet = new Set<string>();
        for (const s of nonNullSkus) {
          const upper = s.toUpperCase();
          if (skuSet.has(upper)) {
            throw new Error('This SKU is already used by another product. Please change it.');
          }
          skuSet.add(upper);
        }
        for (const p of localProducts) {
          if (p.id === id) continue;
          for (const v of p.variants || []) {
            if (v.sku && skuSet.has(v.sku.toUpperCase())) {
              throw new Error('This SKU is already used by another product. Please change it.');
            }
          }
        }
      }

      const mergedUpdates = {
        ...updates,
        ...(formattedVariants ? { variants: formattedVariants } : {}),
      };
      localProducts = localProducts.map((p) => (p.id === id ? { ...p, ...mergedUpdates } : p));
      const updated = localProducts.find((p) => p.id === id);
      if (!updated) throw new Error('Product not found');
      return updated;
    }

    const { variants, images, ...prodUpdates } = updates;
    if (images !== undefined) {
      (prodUpdates as any).image_url = images.length > 0 ? images[0] : null;
    }

    if (Object.keys(prodUpdates).length > 0) {
      const { error } = await supabase.from('products').update(prodUpdates).eq('id', id);
      if (error) {
        const duplicateMsg = getDuplicateSkuErrorMessage(error);
        if (duplicateMsg) throw new Error(duplicateMsg);
        throw error;
      }
    }

    if (images !== undefined) {
      const { error: delImgErr } = await supabase.from('product_images').delete().eq('product_id', id);
      if (delImgErr) throw delImgErr;
      if (images.length > 0) {
        const imageRows = images.map((url, idx) => ({
          product_id: id,
          image_url: url,
          sort_order: idx,
        }));
        const { error: insImgErr } = await supabase.from('product_images').insert(imageRows);
        if (insImgErr) throw insImgErr;
      }
    }

    if (formattedVariants !== undefined) {
      // Fetch existing variants to safely restore if variant insertion fails
      const { data: existingVariants, error: fetchVarErr } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', id);
      if (fetchVarErr) throw fetchVarErr;

      const { error: deleteError } = await supabase.from('product_variants').delete().eq('product_id', id);
      if (deleteError) throw deleteError;

      if (formattedVariants.length > 0) {
        const variantsWithProductId = formattedVariants.map((v) => ({
          product_id: id,
          sku: v.sku || null, // null if empty
          size: v.size || null,
          color: v.color || null,
          color_hex: v.color_hex || null,
          price: v.price !== null && v.price !== undefined ? v.price : null,
          stock_quantity: v.stock_quantity ?? 0,
          is_active: v.is_active ?? true,
        }));

        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantsWithProductId);

        if (variantError) {
          // Restore existing variants so product does NOT end up with 0 variants / OUT OF STOCK!
          if (existingVariants && existingVariants.length > 0) {
            await supabase.from('product_variants').insert(existingVariants);
          }
          const duplicateMsg = getDuplicateSkuErrorMessage(variantError);
          if (duplicateMsg) throw new Error(duplicateMsg);
          throw variantError;
        }
      }
    }

    const result = await this.getProductById(id);
    if (!result) throw new Error('Failed to load updated product');
    return result;
  },

  async deleteProduct(id: string): Promise<void> {
    if (isDemoMode || !supabase) {
      localProducts = localProducts.map((p) => (p.id === id ? { ...p, is_active: false } : p));
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },
};
