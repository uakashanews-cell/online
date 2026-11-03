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
      localOrders = localOrders.map((o) => (o.id === orderId ? { ...o, status, updated_at: new Date().toISOString() } : o));
      return;
    }

    const { error } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_status: status,
    });

    if (error) throw error;
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
