/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { productService } from '../services/productService';
import { getProductStockStatus } from './ecommerce-logic';
import { Product } from '../types';

describe('Stock Workflow & Inventory Tests', () => {
  it('1. Creating two products in a row both save their variants (no SKU collision)', async () => {
    // Both products created without explicit SKUs (or simple products) should not collide on null/empty SKUs
    const prod1Input: Omit<Product, 'id' | 'created_at'> = {
      name: 'Arooj Signature Linen Kurta',
      slug: `arooj-signature-kurta-${Date.now()}-1`,
      category_id: 'cat-stitched-apparel',
      description: 'Handwoven breathable pure linen kurta.',
      base_price: 4500,
      compare_at_price: 5500,
      image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
      images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800'],
      is_featured: false,
      is_active: true,
      variants: [
        {
          id: `var-test-1`,
          product_id: '',
          size: null,
          color: null,
          price: null,
          stock_quantity: 15,
          sku: null,
          is_active: true,
        },
      ],
    };

    const prod2Input: Omit<Product, 'id' | 'created_at'> = {
      name: 'Arooj Royal Leather Bifold',
      slug: `arooj-royal-bifold-${Date.now()}-2`,
      category_id: 'cat-leather-goods',
      description: 'Handcrafted full-grain cowhide wallet.',
      base_price: 3200,
      compare_at_price: null,
      image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800',
      images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?w=800'],
      is_featured: false,
      is_active: true,
      variants: [
        {
          id: `var-test-2`,
          product_id: '',
          size: null,
          color: null,
          price: null,
          stock_quantity: 20,
          sku: null,
          is_active: true,
        },
      ],
    };

    const created1 = await productService.createProduct(prod1Input);
    const created2 = await productService.createProduct(prod2Input);

    assert.ok(created1.id, 'First product should have an id');
    assert.ok(created2.id, 'Second product should have an id');
    assert.notEqual(created1.id, created2.id, 'IDs must be distinct');
    assert.equal(created1.variants.length, 1, 'First product should have 1 variant');
    assert.equal(created2.variants.length, 1, 'Second product should have 1 variant');
    assert.equal(created1.variants[0].sku, null, 'First product variant sku is null (no collision)');
    assert.equal(created2.variants[0].sku, null, 'Second product variant sku is null (no collision)');
    assert.equal(created1.variants[0].stock_quantity, 15);
    assert.equal(created2.variants[0].stock_quantity, 20);
  });

  it('2. Stock typed in simple mode is saved as exactly one variant with that quantity (size=null, color=null, sku=null)', async () => {
    const simpleInput: Omit<Product, 'id' | 'created_at'> = {
      name: 'Arooj Artisan Oud Attar 12ml',
      slug: `arooj-artisan-oud-${Date.now()}`,
      category_id: 'cat-fragrances-attar',
      description: 'Concentrated pure perfume oil without alcohol.',
      base_price: 3800,
      compare_at_price: 4500,
      image_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800',
      images: ['https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800'],
      is_featured: true,
      is_active: true,
      variants: [
        {
          id: `var-simple-${Date.now()}`,
          product_id: '',
          size: null,
          color: null,
          sku: null,
          price: null,
          stock_quantity: 42,
          is_active: true,
        },
      ],
    };

    const result = await productService.createProduct(simpleInput);

    assert.equal(result.variants.length, 1, 'Must have exactly one variant');
    const v = result.variants[0];
    assert.equal(v.size, null, 'Variant size must be null');
    assert.equal(v.color, null, 'Variant color must be null');
    assert.equal(v.sku, null, 'Variant sku must be null');
    assert.equal(v.stock_quantity, 42, 'Variant stock quantity must match quantity typed');
    assert.equal(v.is_active, true, 'Variant must be active');
  });

  it('3. Failed variants insert rolls back the new product cleanly', async () => {
    // In our test, if a variant has an invalid negative price override, it throws immediately before persisting
    const invalidInput: Omit<Product, 'id' | 'created_at'> = {
      name: 'Invalid Product With Bad Variant',
      slug: `invalid-prod-${Date.now()}`,
      category_id: 'cat-stitched-apparel',
      description: 'Should fail validation',
      base_price: 2500,
      compare_at_price: null,
      image_url: '',
      images: [],
      is_featured: false,
      is_active: true,
      variants: [
        {
          id: `bad-var`,
          product_id: '',
          size: 'M',
          color: 'Blue',
          price: -500, // Invalid negative price override
          stock_quantity: 10,
          sku: 'ARJ-BAD-1',
          is_active: true,
        },
      ],
    };

    await assert.rejects(
      async () => {
        await productService.createProduct(invalidInput);
      },
      /cannot be negative/i,
      'Should reject product creation if variant price override is negative'
    );
  });

  it('4. Storefront shows Out of stock only at 0 (and when 0 variants)', () => {
    // 0 variants -> "Out of stock"
    const zeroVariantsResult = getProductStockStatus([]);
    assert.equal(zeroVariantsResult.status, 'out-of-stock');
    assert.equal(zeroVariantsResult.label, 'Out of stock');
    assert.equal(zeroVariantsResult.totalStock, 0);

    // null / undefined variants -> "Out of stock"
    const nullVariantsResult = getProductStockStatus(null);
    assert.equal(nullVariantsResult.status, 'out-of-stock');
    assert.equal(nullVariantsResult.label, 'Out of stock');

    // Total stock = 0 -> "Out of stock"
    const outOfStockResult = getProductStockStatus([
      { stock_quantity: 0, is_active: true },
      { stock_quantity: 0, is_active: true },
    ]);
    assert.equal(outOfStockResult.status, 'out-of-stock');
    assert.equal(outOfStockResult.label, 'Out of stock');
    assert.equal(outOfStockResult.totalStock, 0);

    // Total stock 1 to 5 -> "Only {N} left"
    const lowStock1 = getProductStockStatus([{ stock_quantity: 1, is_active: true }]);
    assert.equal(lowStock1.status, 'low-stock');
    assert.equal(lowStock1.label, 'Only 1 left');
    assert.equal(lowStock1.totalStock, 1);

    const lowStock3 = getProductStockStatus([
      { stock_quantity: 2, is_active: true },
      { stock_quantity: 1, is_active: true },
    ]);
    assert.equal(lowStock3.status, 'low-stock');
    assert.equal(lowStock3.label, 'Only 3 left');
    assert.equal(lowStock3.totalStock, 3);

    const lowStock5 = getProductStockStatus([{ stock_quantity: 5, is_active: true }]);
    assert.equal(lowStock5.status, 'low-stock');
    assert.equal(lowStock5.label, 'Only 5 left');
    assert.equal(lowStock5.totalStock, 5);

    // Total stock > 5 -> "In stock"
    const inStock6 = getProductStockStatus([{ stock_quantity: 6, is_active: true }]);
    assert.equal(inStock6.status, 'in-stock');
    assert.equal(inStock6.label, 'In stock');
    assert.equal(inStock6.totalStock, 6);

    const inStock50 = getProductStockStatus([
      { stock_quantity: 25, is_active: true },
      { stock_quantity: 25, is_active: true },
    ]);
    assert.equal(inStock50.status, 'in-stock');
    assert.equal(inStock50.label, 'In stock');
    assert.equal(inStock50.totalStock, 50);
  });
});
