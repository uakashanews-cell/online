/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, OrderStatus, Profile } from '../types';
import { getKarachiDateKey, formatKarachiDateShort } from './date-utils';

export interface AdminKpiSummary {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  registeredCustomersCount: number;
  totalCustomersCount: number;
  averageOrderValue: number;
}

export interface DailyRevenuePoint {
  date: string;
  label: string;
  revenue: number;
  ordersCount: number;
}

export interface StatusDistributionItem {
  status: OrderStatus;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TopProductItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface CitySalesItem {
  city: string;
  ordersCount: number;
  revenue: number;
}

export interface UnifiedCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: 'customer' | 'guest';
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// Brand-coherent luxury palette: Emeralds, Gold, Bronze, Slate
const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#B8963E', // Warm Gold
  confirmed: '#2A6F5A', // Sage / Forest
  shipped: '#1C5B7A', // Deep Ocean / Teal
  delivered: '#0F3B2E', // Regal Emerald
  cancelled: '#9B2C2C', // Crimson / Burgundy
};

export function calculateAdminKpis(orders: Order[], profiles: Profile[] = []): AdminKpiSummary {
  const totalOrders = orders.length;
  let pendingOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let validOrdersCount = 0;
  let totalSales = 0;

  for (const order of orders) {
    if (order.status === 'pending') pendingOrders++;
    else if (order.status === 'delivered') deliveredOrders++;
    else if (order.status === 'cancelled') cancelledOrders++;

    if (order.status !== 'cancelled') {
      validOrdersCount++;
      totalSales += Number(order.total) || 0;
    }
  }

  const registeredCustomersCount = profiles.filter((p) => p.role === 'customer').length;

  // Track unique customers (registered + guests by phone)
  const phoneSet = new Set<string>();
  for (const p of profiles) {
    if (p.phone) {
      const clean = p.phone.replace(/[^0-9]/g, '').slice(-10);
      if (clean) phoneSet.add(clean);
    }
  }
  for (const o of orders) {
    if (o.customer_phone) {
      const clean = o.customer_phone.replace(/[^0-9]/g, '').slice(-10);
      if (clean) phoneSet.add(clean);
    }
  }

  const totalCustomersCount = Math.max(registeredCustomersCount, phoneSet.size);
  const averageOrderValue = validOrdersCount > 0 ? Math.round(totalSales / validOrdersCount) : 0;

  return {
    totalSales,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    registeredCustomersCount,
    totalCustomersCount,
    averageOrderValue,
  };
}

export function getRevenueTimeline(orders: Order[], days: 7 | 30 | 90 = 7): DailyRevenuePoint[] {
  const result: DailyRevenuePoint[] = [];
  const now = new Date();

  // Create an ordered map for past N days ending today (Asia/Karachi)
  const dateMap = new Map<string, { revenue: number; count: number; dateObj: Date }>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = getKarachiDateKey(d.toISOString());
    dateMap.set(key, { revenue: 0, count: 0, dateObj: d });
  }

  for (const order of orders) {
    const orderKey = getKarachiDateKey(order.created_at);
    const entry = dateMap.get(orderKey);
    if (entry) {
      entry.count += 1;
      if (order.status !== 'cancelled') {
        entry.revenue += Number(order.total) || 0;
      }
    }
  }

  dateMap.forEach((val, key) => {
    result.push({
      date: key,
      label: formatKarachiDateShort(val.dateObj.toISOString()),
      revenue: val.revenue,
      ordersCount: val.count,
    });
  });

  return result;
}

export function getOrderStatusBreakdown(orders: Order[]): StatusDistributionItem[] {
  const counts: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  for (const o of orders) {
    if (counts[o.status] !== undefined) {
      counts[o.status]++;
    }
  }

  const total = orders.length;

  return (Object.keys(counts) as OrderStatus[]).map((st) => ({
    status: st,
    label: STATUS_LABELS[st] || st,
    count: counts[st],
    percentage: total > 0 ? Math.round((counts[st] / total) * 100) : 0,
    color: STATUS_COLORS[st] || '#888888',
  }));
}

export function getTopSellingProducts(orders: Order[], limit = 5): TopProductItem[] {
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    if (!order.items || !Array.isArray(order.items)) continue;

    for (const item of order.items) {
      const pid = item.product_id || item.product_name || 'unknown';
      const name = item.product_name || 'Unnamed Product';
      const existing = productMap.get(pid) || { name, quantity: 0, revenue: 0 };
      existing.quantity += Number(item.quantity) || 0;
      existing.revenue += Number(item.line_total) || 0;
      productMap.set(pid, existing);
    }
  }

  const list: TopProductItem[] = [];
  productMap.forEach((v, k) => {
    list.push({
      id: k,
      name: v.name,
      quantity: v.quantity,
      revenue: v.revenue,
    });
  });

  return list.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function getSalesByCity(orders: Order[], limit = 6): CitySalesItem[] {
  const cityMap = new Map<string, { count: number; revenue: number }>();

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const rawCity = (order.city || 'Other').trim();
    const city = rawCity.charAt(0).toUpperCase() + rawCity.slice(1).toLowerCase();

    const existing = cityMap.get(city) || { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += Number(order.total) || 0;
    cityMap.set(city, existing);
  }

  const list: CitySalesItem[] = [];
  cityMap.forEach((v, k) => {
    list.push({
      city: k,
      ordersCount: v.count,
      revenue: v.revenue,
    });
  });

  return list.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function getUnifiedCustomers(profiles: Profile[] = [], orders: Order[] = []): UnifiedCustomer[] {
  const customerMap = new Map<string, UnifiedCustomer>();

  // 1. Add registered customer profiles
  for (const p of profiles) {
    if (p.role !== 'customer') continue;
    const cleanPhone = (p.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const key = cleanPhone ? `phone:${cleanPhone}` : `id:${p.id}`;

    customerMap.set(key, {
      id: p.id,
      name: p.full_name || 'Registered Customer',
      email: p.email || null,
      phone: p.phone || 'N/A',
      role: 'customer',
      ordersCount: 0,
      totalSpent: 0,
      lastOrderDate: null,
      createdAt: p.created_at || new Date().toISOString(),
    });
  }

  // 2. Link or create from orders
  for (const o of orders) {
    const cleanPhone = (o.customer_phone || '').replace(/[^0-9]/g, '').slice(-10);
    const phoneKey = cleanPhone ? `phone:${cleanPhone}` : `order:${o.id}`;

    let entry = customerMap.get(phoneKey);
    if (!entry) {
      entry = {
        id: `guest-${cleanPhone || o.id}`,
        name: o.customer_name || 'Guest Customer',
        email: o.customer_email || null,
        phone: o.customer_phone || 'N/A',
        role: 'guest',
        ordersCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
        createdAt: o.created_at,
      };
      customerMap.set(phoneKey, entry);
    }

    entry.ordersCount += 1;
    if (o.status !== 'cancelled') {
      entry.totalSpent += Number(o.total) || 0;
    }
    if (!entry.lastOrderDate || new Date(o.created_at) > new Date(entry.lastOrderDate)) {
      entry.lastOrderDate = o.created_at;
    }
    // Update name/email if currently blank
    if ((!entry.name || entry.name === 'Guest Customer') && o.customer_name) {
      entry.name = o.customer_name;
    }
    if (!entry.email && o.customer_email) {
      entry.email = o.customer_email;
    }
  }

  return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}
