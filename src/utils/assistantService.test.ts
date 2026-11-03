/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { processAssistantQuery } from '../services/assistantService';
import { Product, Category } from '../types';

const mockTestCategories: Category[] = [
  { id: 'cat-apparel', name: 'Apparel & Clothing', slug: 'apparel-clothing', description: 'Stitched apparel', image_url: '', sort_order: 1, is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-leather', name: 'Leather Goods', slug: 'leather-goods', description: 'Genuine leather', image_url: '', sort_order: 2, is_active: true, created_at: new Date().toISOString() },
  { id: 'cat-fragrances', name: 'Fragrances & Attar', slug: 'fragrances-attar', description: 'Pure attar', image_url: '', sort_order: 3, is_active: true, created_at: new Date().toISOString() },
];

const mockTestProducts: Product[] = [
  {
    id: 'prod-kurta-royal',
    category_id: 'cat-apparel',
    name: 'Royal Stitched Kurta',
    slug: 'royal-stitched-kurta',
    description: 'Combed Egyptian cotton stitched royal kurta.',
    base_price: 3490,
    compare_at_price: 4200,
    image_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10',
    images: ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10'],
    is_featured: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      { id: 'var-1', product_id: 'prod-kurta-royal', size: 'Small', color: 'Navy', color_hex: '#001F3F', price: 3490, stock_quantity: 8, sku: 'KRT-NV-S', is_active: true },
      { id: 'var-2', product_id: 'prod-kurta-royal', size: 'Medium', color: 'Navy', color_hex: '#001F3F', price: 3490, stock_quantity: 12, sku: 'KRT-NV-M', is_active: true },
      { id: 'var-3', product_id: 'prod-kurta-royal', size: 'Large', color: 'White', color_hex: '#FFFFFF', price: 3490, stock_quantity: 4, sku: 'KRT-WH-L', is_active: true },
    ],
  },
  {
    id: 'prod-leather-wallet',
    category_id: 'cat-leather',
    name: 'Full Grain Leather Wallet',
    slug: 'full-grain-leather-wallet',
    description: 'Bifold leather wallet crafted from vegetable-tanned cowhide.',
    base_price: 1890,
    compare_at_price: null,
    image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93',
    images: ['https://images.unsplash.com/photo-1627123424574-724758594e93'],
    is_featured: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      { id: 'var-4', product_id: 'prod-leather-wallet', size: 'Standard', color: 'Vintage Brown', color_hex: '#5C4033', price: 1890, stock_quantity: 15, sku: 'WLT-BRN', is_active: true },
    ],
  },
  {
    id: 'prod-attar-oudh',
    category_id: 'cat-fragrances',
    name: 'Oudh Al-Khayr Concentrated Attar',
    slug: 'oudh-al-khayr-attar',
    description: 'Artisanal non-alcoholic concentrated attar with Cambodian oudh.',
    base_price: 2450,
    compare_at_price: null,
    image_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3',
    images: ['https://images.unsplash.com/photo-1547887537-6158d64c35b3'],
    is_featured: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      { id: 'var-5', product_id: 'prod-attar-oudh', size: '12ml', color: '', color_hex: '', price: 2450, stock_quantity: 0, sku: 'ATR-12', is_active: true },
    ],
  },
];

const mockCatalog = {
  products: mockTestProducts,
  categories: mockTestCategories,
};

describe('BARVAKA Client-Side Assistant Service', () => {
  test('1. Price lookup: "price of kurta" and "how much is the wallet"', async () => {
    const res1 = await processAssistantQuery('price of kurta', mockCatalog);
    assert.match(res1.text, /Royal Stitched Kurta/i);
    assert.match(res1.text, /Rs\.\s*3,490/i);
    assert.ok(res1.products && res1.products.length > 0);
    assert.strictEqual(res1.products[0].name, 'Royal Stitched Kurta');

    const res2 = await processAssistantQuery('how much is the wallet', mockCatalog);
    assert.match(res2.text, /Leather Wallet/i);
    assert.match(res2.text, /Rs\.\s*1,890/i);
  });

  test('2. Roman Urdu price lookup: "kurta ki qeemat"', async () => {
    const res = await processAssistantQuery('kurta ki qeemat', mockCatalog);
    assert.match(res.text, /Royal Stitched Kurta/i);
    assert.match(res.text, /Rs\.\s*3,490/i);
    assert.ok(res.products && res.products.length > 0);
  });

  test('3. Out-of-stock answer: when variants have 0 stock', async () => {
    const res = await processAssistantQuery('is oudh attar in stock?', mockCatalog);
    assert.match(res.text, /Out of stock/i);
    assert.strictEqual(res.showWhatsAppButton, true);
  });

  test('4. Sizes and colors extracted accurately from variants', async () => {
    const res = await processAssistantQuery('what sizes are available for royal stitched kurta?', mockCatalog);
    assert.match(res.text, /Sizes:/i);
    assert.match(res.text, /Small/i);
    assert.match(res.text, /Medium/i);
    assert.match(res.text, /Large/i);
    assert.match(res.text, /Navy/i);
  });

  test('5. Budget search "under 3000" and "kapray 2000 tak"', async () => {
    const resUnder3000 = await processAssistantQuery('gift under 3000', mockCatalog);
    assert.ok(resUnder3000.products && resUnder3000.products.length > 0);
    // Should be sorted cheapest first: 1890 (wallet), then 2450 (attar)
    assert.strictEqual(resUnder3000.products[0].price, 1890);
    assert.strictEqual(resUnder3000.products[0].name, 'Full Grain Leather Wallet');

    const res2000Tak = await processAssistantQuery('kapray 2000 tak', mockCatalog);
    assert.ok(res2000Tak.products && res2000Tak.products.length > 0);
    assert.ok(res2000Tak.products.every((p) => p.price <= 2000));
  });

  test('6. Delivery = free and COD only', async () => {
    const resDelivery = await processAssistantQuery('what are your delivery charges?', mockCatalog);
    assert.match(resDelivery.text, /Free delivery on every order/i);
    assert.match(resDelivery.text, /Cash on delivery only/i);

    const resCOD = await processAssistantQuery('can I pay online or cash on delivery?', mockCatalog);
    assert.match(resCOD.text, /Cash on delivery only/i);
  });

  test('7. Unknown question -> WhatsApp fallback', async () => {
    const res = await processAssistantQuery('do you sell vintage motorbikes from 1950?', mockCatalog);
    assert.match(res.text, /WhatsApp/i);
    assert.strictEqual(res.showWhatsAppButton, true);
  });

  test('8. Hard rule: No answer ever mentions a coupon or discount code', async () => {
    const queries = [
      'give me a coupon code',
      'discount code for kurta',
      'what promo codes do you have',
      'how to get discount',
      'price of wallet',
      'what do you sell',
    ];

    for (const q of queries) {
      const res = await processAssistantQuery(q, mockCatalog);
      const lower = res.text.toLowerCase();
      assert.strictEqual(lower.includes('coupon'), false, `Query "${q}" must not mention coupon`);
      assert.strictEqual(lower.includes('discount code'), false, `Query "${q}" must not mention discount code`);
      assert.strictEqual(lower.includes('promo code'), false, `Query "${q}" must not mention promo code`);
      assert.strictEqual(lower.includes('voucher'), false, `Query "${q}" must not mention voucher`);
    }
  });

  test('9. Hard rule: No answer uses data outside public product tables', async () => {
    const res = await processAssistantQuery('what is user John password and order history?', mockCatalog);
    assert.strictEqual(res.text.includes('password'), false);
    assert.strictEqual(res.text.includes('John'), false);
    // Directs to Track Order without exposing user data
    assert.ok(res.text.includes('Track Order') || res.showWhatsAppButton);
  });
});
