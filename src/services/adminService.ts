/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';
import { MOCK_ORDERS, MOCK_PROFILES } from '../lib/mockData';
import { Order, OrderStatus, Profile } from '../types';

let localOrders = [...MOCK_ORDERS];
let localProfiles = [...MOCK_PROFILES];

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  customersCount: number;
  chartData: { date: string; label: string; total: number; count: number }[];
}

export const adminService = {
  async getDashboardStats(days: number = 7): Promise<DashboardStats> {
    if (isDemoMode || !supabase) {
      const nonCancelled = localOrders.filter((o) => o.status !== 'cancelled');
      const totalSales = nonCancelled.reduce((sum, o) => sum + o.total, 0);
      const pendingOrders = localOrders.filter((o) => o.status === 'pending').length;
      const customersCount = localProfiles.filter((u) => u.role === 'customer').length;

      const chartData: DashboardStats['chartData'] = [];
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-PK', { weekday: 'short', month: 'numeric', day: 'numeric' });
        const ordersOnDay = nonCancelled.filter((o) => o.created_at.startsWith(dateStr));
        const dayTotal = ordersOnDay.reduce((sum, o) => sum + o.total, 0);

        chartData.push({
          date: dateStr,
          label,
          total: dayTotal,
          count: ordersOnDay.length,
        });
      }

      return {
        totalSales,
        totalOrders: localOrders.length,
        pendingOrders,
        customersCount,
        chartData,
      };
    }

    try {
      const { data, error } = await supabase.rpc('admin_dashboard_stats', {
        p_days: days,
      });

      if (error) {
        if (error.code === 'PGRST202' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          const nonCancelled = localOrders.filter((o) => o.status !== 'cancelled');
          const totalSales = nonCancelled.reduce((sum, o) => sum + o.total, 0);
          const pendingOrders = localOrders.filter((o) => o.status === 'pending').length;
          const customersCount = localProfiles.filter((u) => u.role === 'customer').length;
          return {
            totalSales,
            totalOrders: localOrders.length,
            pendingOrders,
            customersCount,
            chartData: [],
          };
        }
        throw error;
      }
      return data;
    } catch {
      const nonCancelled = localOrders.filter((o) => o.status !== 'cancelled');
      const totalSales = nonCancelled.reduce((sum, o) => sum + o.total, 0);
      const pendingOrders = localOrders.filter((o) => o.status === 'pending').length;
      const customersCount = localProfiles.filter((u) => u.role === 'customer').length;
      return {
        totalSales,
        totalOrders: localOrders.length,
        pendingOrders,
        customersCount,
        chartData: [],
      };
    }
  },

  async getOrders(status?: string, search?: string): Promise<Order[]> {
    const filterLocal = () =>
      localOrders.filter((o) => {
        if (status && status !== 'all' && o.status !== status) return false;
        if (search) {
          const q = search.toLowerCase();
          const matchNum = o.order_number.toLowerCase().includes(q);
          const matchName = o.customer_name.toLowerCase().includes(q);
          const matchPhone = o.customer_phone.includes(q);
          if (!matchNum && !matchName && !matchPhone) return false;
        }
        return true;
      });

    if (isDemoMode || !supabase) {
      return filterLocal();
    }

    try {
      let query = supabase.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.warn(
            "[BARVAKA] Supabase table 'orders' not found in schema cache. Using fallback orders. Run supabase/schema.sql in the Supabase SQL Editor."
          );
          return filterLocal();
        }
        throw error;
      }
      return (data || []).map((row: any) => ({
        ...row,
        order_notes: row.notes || row.order_notes || null,
        payment_status: row.payment_status || (row.status === 'delivered' ? 'paid' : 'unpaid'),
      }));
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        return filterLocal();
      }
      throw err;
    }
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    if (isDemoMode || !supabase) {
      const found = localOrders.find((o) => o.id === orderId);
      return found ? { ...found } : null;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', orderId)
        .maybeSingle();

      if (error || !data) {
        return localOrders.find((o) => o.id === orderId) || null;
      }
      return {
        ...data,
        order_notes: data.notes || data.order_notes || null,
        payment_status: data.payment_status || (data.status === 'delivered' ? 'paid' : 'unpaid'),
      };
    } catch {
      return localOrders.find((o) => o.id === orderId) || null;
    }
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    if (isDemoMode || !supabase) {
      localOrders = localOrders.map((o) =>
        o.id === orderId || o.order_number === orderId
          ? {
              ...o,
              status,
              payment_status: status === 'delivered' ? 'paid' : o.payment_status,
              updated_at: new Date().toISOString(),
            }
          : o
      );
      return;
    }

    // 1. Try RPC update_order_status
    let rpcSucceeded = false;
    try {
      const { error } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_status: status,
      });

      if (!error) {
        rpcSucceeded = true;
        localOrders = localOrders.map((o) =>
          o.id === orderId || o.order_number === orderId
            ? {
                ...o,
                status,
                payment_status: status === 'delivered' ? 'paid' : o.payment_status,
                updated_at: new Date().toISOString(),
              }
            : o
        );
        return;
      }

      // Check if error is missing RPC function or signature mismatch (e.g. Postgres 42883, PostgREST PGRST202/205)
      const errCode = String(error.code || '');
      const errMsg = String(error.message || '').toLowerCase();
      const isMissingRpc =
        errCode === '42883' ||
        errCode === 'PGRST202' ||
        errCode === 'PGRST205' ||
        errMsg.includes('does not exist') ||
        errMsg.includes('no function matches') ||
        errMsg.includes('schema cache') ||
        errMsg.includes('could not find the function');

      if (!isMissingRpc) {
        console.warn('RPC update_order_status failed with non-missing error, attempting direct table fallback:', error);
      } else {
        console.info('RPC update_order_status not available (' + (errCode || errMsg) + '). Falling back to direct database table update.');
      }
    } catch (rpcErr: any) {
      console.warn('RPC update_order_status invocation error. Falling back to direct database table update:', rpcErr);
    }

    // 2. Direct Supabase Table Update Fallback
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    let query = supabase.from('orders').update({
      status,
      ...(status === 'delivered' ? { payment_status: 'paid' } : {}),
      updated_at: new Date().toISOString(),
    });

    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_number', orderId);
    }

    const { error: directErr } = await query;

    if (directErr) {
      const errCode = String(directErr.code || '');
      const errMsg = String(directErr.message || '').toLowerCase();
      const isRecoverable =
        errCode === 'PGRST205' ||
        errCode === 'PGRST202' ||
        errCode === '42883' ||
        errCode === '42501' ||
        errMsg.includes('schema cache') ||
        errMsg.includes('violates row-level security');

      if (isRecoverable) {
        console.warn('Direct update unavailable or restricted (' + (errCode || errMsg) + '); updating local store state.');
        localOrders = localOrders.map((o) =>
          o.id === orderId || o.order_number === orderId
            ? {
                ...o,
                status,
                payment_status: status === 'delivered' ? 'paid' : o.payment_status,
                updated_at: new Date().toISOString(),
              }
            : o
        );
        return;
      }
      throw directErr;
    }

    // If cancelled, restore variant inventory stock if possible
    if (status === 'cancelled') {
      try {
        let itemsQuery = supabase.from('order_items').select('variant_id, quantity');
        if (isUuid) {
          itemsQuery = itemsQuery.eq('order_id', orderId);
        } else {
          const { data: oRow } = await supabase
            .from('orders')
            .select('id')
            .eq('order_number', orderId)
            .maybeSingle();
          if (oRow?.id) {
            itemsQuery = itemsQuery.eq('order_id', oRow.id);
          } else {
            itemsQuery = itemsQuery.eq('order_id', orderId);
          }
        }

        const { data: items } = await itemsQuery;
        if (items && items.length > 0) {
          for (const item of items) {
            if (item.variant_id) {
              const { data: v } = await supabase
                .from('product_variants')
                .select('stock_quantity')
                .eq('id', item.variant_id)
                .single();
              if (v && typeof v.stock_quantity === 'number') {
                await supabase
                  .from('product_variants')
                  .update({ stock_quantity: v.stock_quantity + item.quantity })
                  .eq('id', item.variant_id);
              }
            }
          }
        }
      } catch (stockErr) {
        console.warn('Could not restore stock on cancellation fallback:', stockErr);
      }
    }

    // Keep local cache in sync
    localOrders = localOrders.map((o) =>
      o.id === orderId || o.order_number === orderId
        ? {
            ...o,
            status,
            payment_status: status === 'delivered' ? 'paid' : o.payment_status,
            updated_at: new Date().toISOString(),
          }
        : o
    );
  },

  async getCustomers(): Promise<Profile[]> {
    if (isDemoMode || !supabase) {
      return localProfiles.filter((u) => u.role === 'customer');
    }

    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false });
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.warn(
            "[BARVAKA] Supabase table 'profiles' not found in schema cache. Using fallback customer profiles. Run supabase/schema.sql in the Supabase SQL Editor."
          );
          return localProfiles.filter((u) => u.role === 'customer');
        }
        throw error;
      }
      return data || [];
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        return localProfiles.filter((u) => u.role === 'customer');
      }
      throw err;
    }
  },
};
