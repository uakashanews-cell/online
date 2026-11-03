/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';
import { MOCK_ORDERS, MOCK_PRODUCTS } from '../lib/mockData';
import { Order, OrderItem } from '../types';
import { generateOrderNumber, getVariantPrice } from '../utils/ecommerce-logic';

let localOrders = [...MOCK_ORDERS];

export interface PlaceOrderInput {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  shipping_address: string;
  city: string;
  province?: string | null;
  postal_code?: string | null;
  notes?: string | null;
  coupon_code?: string | null;
  items: { variant_id: string; product_id: string; quantity: number }[];
  user_id?: string | null;
}

export const orderService = {
  async placeOrder(input: PlaceOrderInput): Promise<{ order_id: string; order_number: string; total: number }> {
    if (isDemoMode || !supabase) {
      const orderNumber = generateOrderNumber();
      const orderId = `ord-${Date.now()}`;
      let subtotal = 0;
      const orderItems: OrderItem[] = [];

      for (const it of input.items) {
        const prod = MOCK_PRODUCTS.find((p) => p.id === it.product_id);
        const variant = prod?.variants.find((v) => v.id === it.variant_id);
        const unitPrice = prod ? getVariantPrice(prod.base_price, variant?.price) : 2000;
        const lineTotal = unitPrice * it.quantity;
        subtotal += lineTotal;

        orderItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          order_id: orderId,
          product_id: it.product_id,
          variant_id: it.variant_id,
          product_name: prod ? prod.name : 'Product Item',
          variant_label: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() || 'Standard' : 'Standard',
          unit_price: unitPrice,
          quantity: it.quantity,
          line_total: lineTotal,
          image_url: prod?.images[0] || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500',
        });
      }

      let discount = 0;
      if (input.coupon_code) {
        if (input.coupon_code.toUpperCase().includes('10')) {
          discount = Math.round(subtotal * 0.1);
        } else if (input.coupon_code.toUpperCase().includes('500')) {
          discount = 500;
        } else if (input.coupon_code.toUpperCase().includes('15')) {
          discount = Math.round(subtotal * 0.15);
        }
      }

      const total = Math.max(0, subtotal - discount);

      const createdOrder: Order = {
        id: orderId,
        order_number: orderNumber,
        user_id: input.user_id || null,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        customer_email: input.customer_email || null,
        shipping_address: input.shipping_address,
        city: input.city,
        province: input.province || 'Pakistan',
        postal_code: input.postal_code || null,
        order_notes: input.notes || null,
        payment_method: 'cod',
        payment_status: 'unpaid',
        status: 'pending',
        subtotal,
        discount_amount: discount,
        coupon_code: input.coupon_code || null,
        delivery_fee: 0,
        total,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: orderItems,
      };

      localOrders.unshift(createdOrder);

      return {
        order_id: orderId,
        order_number: orderNumber,
        total,
      };
    }

    // Call Supabase RPC function place_order as documented in TRD Section 8
    const { data, error } = await supabase.rpc('place_order', {
      p_customer_name: input.customer_name,
      p_customer_phone: input.customer_phone,
      p_customer_email: input.customer_email || null,
      p_shipping_address: input.shipping_address,
      p_city: input.city,
      p_province: input.province || null,
      p_postal_code: input.postal_code || null,
      p_notes: input.notes || null,
      p_coupon_code: input.coupon_code || null,
      p_items: input.items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
    });

    if (error) throw error;
    return data;
  },

  async getGuestOrder(orderNumber: string, phone: string): Promise<Order | null> {
    const cleanNum = orderNumber.trim().toUpperCase();
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    if (isDemoMode || !supabase) {
      const match = localOrders.find((o) => {
        const orderPhone = o.customer_phone.replace(/[\s\-\(\)]/g, '');
        return o.order_number.toUpperCase() === cleanNum && (orderPhone === cleanPhone || orderPhone.endsWith(cleanPhone) || cleanPhone.endsWith(orderPhone));
      });
      return match || null;
    }

    const { data, error } = await supabase.rpc('get_guest_order', {
      p_order_number: cleanNum,
      p_phone: cleanPhone,
    });

    if (error) return null;
    return data;
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    if (isDemoMode || !supabase) {
      return localOrders.filter((o) => o.user_id === userId);
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          return localOrders.filter((o) => o.user_id === userId);
        }
        throw error;
      }
      return data || [];
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        return localOrders.filter((o) => o.user_id === userId);
      }
      throw err;
    }
  },

  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    if (isDemoMode || !supabase) {
      return localOrders.find((o) => o.order_number.toUpperCase() === orderNumber.toUpperCase()) || null;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('order_number', orderNumber.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          return localOrders.find((o) => o.order_number.toUpperCase() === orderNumber.toUpperCase()) || null;
        }
        return null;
      }
      return data;
    } catch {
      return localOrders.find((o) => o.order_number.toUpperCase() === orderNumber.toUpperCase()) || null;
    }
  },
};
