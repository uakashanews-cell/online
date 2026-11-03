/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';
import { MOCK_COUPONS } from '../lib/mockData';
import { Coupon } from '../types';
import { validateCoupon as localValidate } from '../utils/ecommerce-logic';

let localCoupons = [...MOCK_COUPONS];

export interface CouponValidationResponse {
  valid: boolean;
  coupon_id?: string;
  code?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount: number;
  message?: string;
}

export const couponService = {
  async validateCoupon(code: string, subtotal: number): Promise<CouponValidationResponse> {
    const cleanCode = code.trim().toUpperCase();

    if (isDemoMode || !supabase) {
      const found = localCoupons.find((c) => c.code.toUpperCase() === cleanCode);
      if (!found) {
        return { valid: false, discount_amount: 0, message: 'Invalid coupon code.' };
      }

      const res = localValidate(found, subtotal);
      if (!res.isValid) {
        return { valid: false, discount_amount: 0, message: res.errorMessage || 'Coupon cannot be used.' };
      }

      return {
        valid: true,
        coupon_id: found.id,
        code: found.code,
        discount_type: found.discount_type,
        discount_value: found.discount_value,
        discount_amount: res.discountAmount,
      };
    }

    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: cleanCode,
        p_subtotal: subtotal,
      });

      if (error) {
        if (error.code === 'PGRST202' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          const found = localCoupons.find((c) => c.code.toUpperCase() === cleanCode);
          if (!found) return { valid: false, discount_amount: 0, message: 'Invalid coupon code.' };
          const res = localValidate(found, subtotal);
          if (!res.isValid) return { valid: false, discount_amount: 0, message: res.errorMessage || 'Coupon cannot be used.' };
          return {
            valid: true,
            coupon_id: found.id,
            code: found.code,
            discount_type: found.discount_type,
            discount_value: found.discount_value,
            discount_amount: res.discountAmount,
          };
        }
        return { valid: false, discount_amount: 0, message: error.message };
      }

      return data;
    } catch {
      const found = localCoupons.find((c) => c.code.toUpperCase() === cleanCode);
      if (!found) return { valid: false, discount_amount: 0, message: 'Invalid coupon code.' };
      const res = localValidate(found, subtotal);
      if (!res.isValid) return { valid: false, discount_amount: 0, message: res.errorMessage || 'Coupon cannot be used.' };
      return {
        valid: true,
        coupon_id: found.id,
        code: found.code,
        discount_type: found.discount_type,
        discount_value: found.discount_value,
        discount_amount: res.discountAmount,
      };
    }
  },

  async getCoupons(): Promise<Coupon[]> {
    if (isDemoMode || !supabase) {
      return [...localCoupons];
    }

    try {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.warn(
            "[BARVAKA] Supabase table 'coupons' not found in schema cache. Using fallback coupons. Run supabase/schema.sql in the Supabase SQL Editor."
          );
          return [...localCoupons];
        }
        throw error;
      }
      return data || [];
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        return [...localCoupons];
      }
      throw err;
    }
  },

  async createCoupon(coupon: Omit<Coupon, 'id' | 'used_count'>): Promise<Coupon> {
    if (isDemoMode || !supabase) {
      const newCoupon: Coupon = {
        ...coupon,
        id: `cpn-${Date.now()}`,
        used_count: 0,
      };
      localCoupons.unshift(newCoupon);
      return newCoupon;
    }

    const { data, error } = await supabase.from('coupons').insert([coupon]).select().single();
    if (error) throw error;
    return data;
  },

  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon> {
    if (isDemoMode || !supabase) {
      localCoupons = localCoupons.map((c) => (c.id === id ? { ...c, ...updates } : c));
      const updated = localCoupons.find((c) => c.id === id);
      if (!updated) throw new Error('Coupon not found');
      return updated;
    }

    const { data, error } = await supabase.from('coupons').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCoupon(id: string): Promise<void> {
    if (isDemoMode || !supabase) {
      localCoupons = localCoupons.filter((c) => c.id !== id);
      return;
    }

    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) throw error;
  },
};
