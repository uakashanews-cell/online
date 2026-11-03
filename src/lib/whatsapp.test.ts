/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePkPhone,
  buildWhatsAppUrl,
  toAbsoluteUrl,
  formatProductMessage,
  formatCartMessage,
  formatOrderMessage,
  formatCustomerUpdateMessage,
} from './whatsapp';
import { WHATSAPP_NUMBER } from '../config/site';

test('normalizePkPhone converts Pakistani phone formats to 923XXXXXXXXX', () => {
  assert.equal(WHATSAPP_NUMBER, '923027651284');

  // Standard 03XXXXXXXXX (11 digits)
  assert.equal(normalizePkPhone('03027651284'), '923027651284');
  assert.equal(normalizePkPhone('03001234567'), '923001234567');

  // With dashes and spaces
  assert.equal(normalizePkPhone('0302-7651284'), '923027651284');
  assert.equal(normalizePkPhone('0300 123 4567'), '923001234567');

  // With +92
  assert.equal(normalizePkPhone('+923027651284'), '923027651284');
  assert.equal(normalizePkPhone('+92 300 1234567'), '923001234567');

  // Already 923...
  assert.equal(normalizePkPhone('923027651284'), '923027651284');

  // Empty string falls back to WHATSAPP_NUMBER
  assert.equal(normalizePkPhone(''), '923027651284');
});

test('buildWhatsAppUrl constructs valid wa.me URLs', () => {
  const url = buildWhatsAppUrl('Hello BARVAKA, test message');
  assert.equal(
    url,
    'https://wa.me/923027651284?text=Hello%20BARVAKA%2C%20test%20message'
  );

  const customUrl = buildWhatsAppUrl('Status update', '03001234567');
  assert.equal(
    customUrl,
    'https://wa.me/923001234567?text=Status%20update'
  );
});

test('toAbsoluteUrl turns relative paths into full https URLs', () => {
  const origin = 'https://barvaka.pk';
  assert.equal(toAbsoluteUrl('https://example.com/img.jpg', origin), 'https://example.com/img.jpg');
  assert.equal(toAbsoluteUrl('/images/products/kurta.jpg', origin), 'https://barvaka.pk/images/products/kurta.jpg');
  assert.equal(toAbsoluteUrl('images/products/kurta.jpg', origin), 'https://barvaka.pk/images/products/kurta.jpg');
});

test('formatProductMessage matches exact required WhatsApp order specification', () => {
  const message = formatProductMessage({
    product: {
      name: 'Royal Embroidered Cotton Kurta',
      slug: 'royal-embroidered-cotton-kurta',
      images: ['https://images.unsplash.com/photo-kurta.jpg'],
      base_price: 3499,
    },
    variant: {
      size: 'Medium',
      color: 'Emerald Green',
      price: 3499,
    },
    quantity: 2,
    origin: 'https://barvaka.pk',
  });

  assert.ok(message.includes('Hello BARVAKA, I want to order this product:'));
  assert.ok(message.includes('*Royal Embroidered Cotton Kurta*'));
  assert.ok(message.includes('Variant: Medium / Emerald Green'));
  assert.ok(message.includes('Quantity: 2'));
  assert.ok(message.includes('Price: Rs. 3,499 each'));
  assert.ok(message.includes('Total: Rs. 6,998 (Free Delivery, Cash on Delivery)'));
  assert.ok(message.includes('Product image: https://images.unsplash.com/photo-kurta.jpg'));
  assert.ok(message.includes('Product link: https://barvaka.pk/product/royal-embroidered-cotton-kurta'));
});

test('formatCartMessage formats cart items and preview thumbnail URL', () => {
  const message = formatCartMessage({
    items: [
      {
        product_name: 'Pure Dehn Al Oudh Attar',
        variant_label: '6ml Crystal Bottle',
        quantity: 1,
        unit_price: 4999,
        image_url: 'https://images.unsplash.com/photo-attar.jpg',
      },
    ],
    subtotal: 4999,
    discount: 500,
    total: 4499,
    couponCode: 'WELCOME10',
    origin: 'https://barvaka.pk',
  });

  assert.ok(message.includes('Preview: https://images.unsplash.com/photo-attar.jpg'));
  assert.ok(message.includes('*Pure Dehn Al Oudh Attar*'));
  assert.ok(message.includes('Subtotal: Rs. 4,999'));
  assert.ok(message.includes('Discount (WELCOME10): -Rs. 500'));
  assert.ok(message.includes('Delivery: Free'));
  assert.ok(message.includes('Total: Rs. 4,499'));
  assert.ok(message.includes('Payment: Cash on Delivery'));
});

test('formatOrderMessage creates complete order notification with items and tracking link', () => {
  const message = formatOrderMessage({
    order: {
      id: 'ord-123',
      order_number: 'BRV-261029-A7K2',
      user_id: null,
      customer_name: 'Hassan Ali',
      customer_phone: '03001234567',
      customer_email: 'hassan@example.com',
      shipping_address: 'House 12, Street 4, F-8/2',
      city: 'Islamabad',
      province: 'Punjab',
      postal_code: '44000',
      order_notes: null,
      coupon_code: null,
      status: 'pending',
      payment_method: 'cod',
      payment_status: 'unpaid',
      subtotal: 5500,
      discount_amount: 0,
      delivery_fee: 0,
      total: 5500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          order_id: 'ord-123',
          product_id: 'prod-1',
          variant_id: 'var-1',
          product_name: 'Handcrafted Peshawari Chappal',
          variant_label: 'Size 42 · Oxblood Leather',
          unit_price: 5500,
          quantity: 1,
          line_total: 5500,
          image_url: 'https://images.unsplash.com/photo-shoes.jpg',
        },
      ],
    },
    origin: 'https://barvaka.pk',
  });

  assert.ok(message.includes('*Order #BRV-261029-A7K2*'));
  assert.ok(message.includes('Customer: Hassan Ali'));
  assert.ok(message.includes('Phone: 03001234567'));
  assert.ok(message.includes('Address: House 12, Street 4, F-8/2, Islamabad, Punjab'));
  assert.ok(message.includes('*Handcrafted Peshawari Chappal*'));
  assert.ok(message.includes('Image: https://images.unsplash.com/photo-shoes.jpg'));
  assert.ok(message.includes('Total: Rs. 5,500'));
  assert.ok(message.includes('Payment: Cash on Delivery'));
  assert.ok(message.includes('Tracking link: https://barvaka.pk/track-order?orderNumber=BRV-261029-A7K2&phone=03001234567'));
});

test('formatCustomerUpdateMessage formats admin customer contact message', () => {
  const message = formatCustomerUpdateMessage({
    order_number: 'BRV-261029-A7K2',
    status: 'shipped',
    total: 5500,
    customer_name: 'Hassan Ali',
  });

  assert.ok(message.includes('Assalam-o-Alaikum Hassan Ali'));
  assert.ok(message.includes('Order *#BRV-261029-A7K2*'));
  assert.ok(message.includes('Dispatched & On the Way with Courier'));
  assert.ok(message.includes('Rs. 5,500'));
});
