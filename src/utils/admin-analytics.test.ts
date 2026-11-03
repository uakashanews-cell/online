/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateAdminKpis,
  getRevenueTimeline,
  getOrderStatusBreakdown,
  getTopSellingProducts,
  getSalesByCity,
  getUnifiedCustomers,
} from './admin-analytics';
import { Order, Profile } from '../types';

describe('Admin Analytics Utility Tests', () => {
  const mockOrders: Order[] = [
    {
      id: 'ord-1',
      order_number: 'BRV-261031-1001',
      user_id: 'prof-1',
      customer_name: 'Fatima Zahra',
      customer_email: 'fatima@example.com',
      customer_phone: '03001234567',
      shipping_address: 'DHA Phase 5',
      city: 'Lahore',
      province: 'Punjab',
      postal_code: '54000',
      order_notes: null,
      coupon_code: null,
      subtotal: 5000,
      discount_amount: 0,
      delivery_fee: 0,
      total: 5000,
      status: 'pending',
      payment_method: 'cod',
      payment_status: 'unpaid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          order_id: 'ord-1',
          product_id: 'p-1',
          variant_id: 'v-1',
          product_name: 'Oud Al-Malik',
          variant_label: '50ml',
          image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35',
          quantity: 1,
          unit_price: 5000,
          line_total: 5000,
        },
      ],
    },
    {
      id: 'ord-2',
      order_number: 'BRV-261031-1002',
      user_id: null,
      customer_name: 'Bilal Khan',
      customer_email: 'bilal@example.com',
      customer_phone: '03219876543',
      shipping_address: 'Clifton Block 2',
      city: 'Karachi',
      province: 'Sindh',
      postal_code: '75500',
      order_notes: null,
      coupon_code: 'SAVE500',
      subtotal: 7000,
      discount_amount: 500,
      delivery_fee: 0,
      total: 6500,
      status: 'delivered',
      payment_method: 'cod',
      payment_status: 'paid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-2',
          order_id: 'ord-2',
          product_id: 'p-2',
          variant_id: 'v-2',
          product_name: 'Rose Damascena',
          variant_label: '100ml',
          image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35',
          quantity: 2,
          unit_price: 3500,
          line_total: 7000,
        },
      ],
    },
    {
      id: 'ord-3',
      order_number: 'BRV-261031-1003',
      user_id: null,
      customer_name: 'Cancelled User',
      customer_email: 'cancel@example.com',
      customer_phone: '03335555555',
      shipping_address: 'F-7/2',
      city: 'Islamabad',
      province: 'Federal',
      postal_code: '44000',
      order_notes: null,
      coupon_code: null,
      subtotal: 10000,
      discount_amount: 0,
      delivery_fee: 0,
      total: 10000,
      status: 'cancelled',
      payment_method: 'cod',
      payment_status: 'unpaid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-3',
          order_id: 'ord-3',
          product_id: 'p-1',
          variant_id: 'v-3',
          product_name: 'Oud Al-Malik',
          variant_label: '100ml',
          image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35',
          quantity: 1,
          unit_price: 10000,
          line_total: 10000,
        },
      ],
    },
  ];

  const mockProfiles: Profile[] = [
    {
      id: 'prof-1',
      email: 'fatima@example.com',
      full_name: 'Fatima Zahra',
      role: 'customer',
      phone: '+923001234567',
      created_at: new Date().toISOString(),
    },
  ];

  test('calculateAdminKpis computes non-cancelled sales and counts accurately', () => {
    const kpis = calculateAdminKpis(mockOrders, mockProfiles);
    assert.strictEqual(kpis.totalOrders, 3);
    assert.strictEqual(kpis.pendingOrders, 1);
    assert.strictEqual(kpis.deliveredOrders, 1);
    assert.strictEqual(kpis.cancelledOrders, 1);
    // Sales exclude cancelled order (5000 + 6500 = 11500)
    assert.strictEqual(kpis.totalSales, 11500);
    assert.strictEqual(kpis.averageOrderValue, Math.round(11500 / 2));
    assert.strictEqual(kpis.registeredCustomersCount, 1);
  });

  test('getRevenueTimeline generates timeline points for specified days', () => {
    const timeline = getRevenueTimeline(mockOrders, 7);
    assert.strictEqual(timeline.length, 7);
    const todayPoint = timeline[timeline.length - 1];
    assert.ok(todayPoint.revenue > 0);
    assert.strictEqual(todayPoint.ordersCount, 3);
  });

  test('getOrderStatusBreakdown returns percentage and count for all statuses', () => {
    const breakdown = getOrderStatusBreakdown(mockOrders);
    const pending = breakdown.find((b) => b.status === 'pending');
    assert.ok(pending);
    assert.strictEqual(pending?.count, 1);
    const cancelled = breakdown.find((b) => b.status === 'cancelled');
    assert.ok(cancelled);
    assert.strictEqual(cancelled?.count, 1);
  });

  test('getTopSellingProducts ignores cancelled orders and sums quantities and revenues', () => {
    const top = getTopSellingProducts(mockOrders);
    assert.strictEqual(top.length, 2);
    // Rose Damascena has 7000 line total, Oud Al-Malik has 5000 non-cancelled
    assert.strictEqual(top[0].name, 'Rose Damascena');
    assert.strictEqual(top[0].quantity, 2);
    assert.strictEqual(top[0].revenue, 7000);
  });

  test('getSalesByCity groups and sorts non-cancelled orders by city', () => {
    const cities = getSalesByCity(mockOrders);
    assert.strictEqual(cities.length, 2);
    // Karachi is 6500, Lahore is 5000; Islamabad was cancelled
    assert.strictEqual(cities[0].city, 'Karachi');
    assert.strictEqual(cities[0].revenue, 6500);
    assert.strictEqual(cities[1].city, 'Lahore');
    assert.strictEqual(cities[1].revenue, 5000);
  });

  test('getUnifiedCustomers aggregates registered profiles and guest order customers', () => {
    const unified = getUnifiedCustomers(mockProfiles, mockOrders);
    // Fatima Zahra is registered (+923001234567 matches 03001234567 last 10 digits)
    const fatima = unified.find((u) => u.name === 'Fatima Zahra');
    assert.ok(fatima);
    assert.strictEqual(fatima?.role, 'customer');
    assert.strictEqual(fatima?.ordersCount, 1);
    assert.strictEqual(fatima?.totalSpent, 5000);

    // Bilal Khan was a guest
    const bilal = unified.find((u) => u.name === 'Bilal Khan');
    assert.ok(bilal);
    assert.strictEqual(bilal?.role, 'guest');
    assert.strictEqual(bilal?.ordersCount, 1);
    assert.strictEqual(bilal?.totalSpent, 6500);
  });
});
