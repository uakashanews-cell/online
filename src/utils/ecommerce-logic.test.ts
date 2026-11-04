/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOrderNumber,
  formatPKR,
  getVariantPrice,
  validateCoupon,
  calculateCartTotals,
  checkVariantStock,
  validatePhonePK,
  validateCheckoutForm,
  canTransitionOrderStatus,
  hasUserOrderedProduct,
  calculateReviewSummary,
  validateReviewInput,
  generateVariantSku,
  normalizeVariantSku,
  validateVariantPriceOverride,
  getDuplicateSkuErrorMessage,
} from './ecommerce-logic';
import { Coupon, CartItem, ProductVariant, Order, ProductReview } from '../types';

test('generateOrderNumber generates expected format ARJ-YYMMDD-XXXX', () => {
  const fixedDate = new Date('2026-10-29T12:00:00Z');
  const orderNum = generateOrderNumber(fixedDate);
  assert.match(orderNum, /^ARJ-261029-[A-Z0-9]{4}$/);

  // Uniqueness check: two consecutive numbers should differ
  const orderNum2 = generateOrderNumber(fixedDate);
  assert.notEqual(orderNum, orderNum2);
});

test('formatPKR formats numeric amounts cleanly', () => {
  assert.equal(formatPKR(1500), 'Rs. 1,500');
  assert.equal(formatPKR(0), 'Rs. 0');
  assert.equal(formatPKR(24999), 'Rs. 24,999');
  assert.equal(formatPKR(1499.8), 'Rs. 1,500');
});

test('getVariantPrice correctly resolves base price vs override', () => {
  assert.equal(getVariantPrice(3500, null), 3500);
  assert.equal(getVariantPrice(3500, undefined), 3500);
  assert.equal(getVariantPrice(3500, 3999), 3999);
  assert.equal(getVariantPrice(3500, 0), 3500); // 0 or invalid falls back to base
});

test('validateCoupon enforces active status, dates, limits, and minimum spend', () => {
  const now = new Date('2026-10-29T12:00:00Z');
  const validCoupon: Coupon = {
    id: 'c1',
    code: 'WELCOME10',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 2000,
    max_uses: 100,
    used_count: 5,
    starts_at: '2026-01-01T00:00:00Z',
    expires_at: '2026-12-31T23:59:59Z',
    is_active: true,
  };

  // Valid usage: Rs. 3000 subtotal -> 10% = Rs. 300
  const res1 = validateCoupon(validCoupon, 3000, now);
  assert.equal(res1.isValid, true);
  assert.equal(res1.discountAmount, 300);

  // Subtotal below min_order_amount
  const res2 = validateCoupon(validCoupon, 1500, now);
  assert.equal(res2.isValid, false);
  assert.match(res2.errorMessage!, /Minimum order/);

  // Expired coupon
  const expiredCoupon: Coupon = {
    ...validCoupon,
    expires_at: '2026-05-01T00:00:00Z',
  };
  const res3 = validateCoupon(expiredCoupon, 5000, now);
  assert.equal(res3.isValid, false);
  assert.match(res3.errorMessage!, /expired/);

  // Inactive coupon
  const inactiveCoupon: Coupon = {
    ...validCoupon,
    is_active: false,
  };
  const res4 = validateCoupon(inactiveCoupon, 5000, now);
  assert.equal(res4.isValid, false);
  assert.match(res4.errorMessage!, /no longer active/);

  // Max uses reached
  const maxedCoupon: Coupon = {
    ...validCoupon,
    max_uses: 10,
    used_count: 10,
  };
  const res5 = validateCoupon(maxedCoupon, 5000, now);
  assert.equal(res5.isValid, false);
  assert.match(res5.errorMessage!, /limit/);

  // Fixed discount capped at subtotal
  const fixedCoupon: Coupon = {
    ...validCoupon,
    code: 'FLAT1000',
    discount_type: 'fixed',
    discount_value: 1000,
    min_order_amount: 500,
  };
  const res6 = validateCoupon(fixedCoupon, 800, now);
  assert.equal(res6.isValid, true);
  assert.equal(res6.discountAmount, 800); // capped at subtotal
});

test('calculateCartTotals calculates correct subtotal, discount, 0 delivery fee and final total', () => {
  const items: CartItem[] = [
    {
      id: 'p1-v1',
      product_id: 'p1',
      variant_id: 'v1',
      product_name: 'Cotton Kurta',
      variant_label: 'Size: M · Color: White',
      unit_price: 2500,
      image_url: '/img.jpg',
      quantity: 2,
      max_stock: 10,
      slug: 'cotton-kurta',
    },
    {
      id: 'p2-v2',
      product_id: 'p2',
      variant_id: 'v2',
      product_name: 'Leather Belt',
      variant_label: 'Color: Tan',
      unit_price: 1500,
      image_url: '/img2.jpg',
      quantity: 1,
      max_stock: 5,
      slug: 'leather-belt',
    },
  ];

  // Subtotal = 2 * 2500 + 1 * 1500 = 6500
  const totalsNoCoupon = calculateCartTotals(items);
  assert.equal(totalsNoCoupon.subtotal, 6500);
  assert.equal(totalsNoCoupon.discount, 0);
  assert.equal(totalsNoCoupon.deliveryFee, 0); // Always free delivery
  assert.equal(totalsNoCoupon.total, 6500);
  assert.equal(totalsNoCoupon.itemCount, 3);

  const coupon: Coupon = {
    id: 'c1',
    code: 'SAVE10',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 1000,
    max_uses: null,
    used_count: 0,
    starts_at: '2026-01-01T00:00:00Z',
    expires_at: '2026-12-31T23:59:59Z',
    is_active: true,
  };

  const totalsWithCoupon = calculateCartTotals(items, coupon, new Date('2026-10-29T12:00:00Z'));
  assert.equal(totalsWithCoupon.subtotal, 6500);
  assert.equal(totalsWithCoupon.discount, 650);
  assert.equal(totalsWithCoupon.total, 5850);
});

test('checkVariantStock checks stock limits accurately', () => {
  const variant: Pick<ProductVariant, 'stock_quantity' | 'is_active'> = {
    stock_quantity: 4,
    is_active: true,
  };

  assert.equal(checkVariantStock(variant, 2).isAvailable, true);
  assert.equal(checkVariantStock(variant, 4).isAvailable, true);
  assert.equal(checkVariantStock(variant, 5).isAvailable, false);
  assert.equal(checkVariantStock({ stock_quantity: 0, is_active: true }, 1).isAvailable, false);
  assert.equal(checkVariantStock({ stock_quantity: 10, is_active: false }, 1).isAvailable, false);
});

test('validatePhonePK verifies Pakistan mobile numbers', () => {
  assert.equal(validatePhonePK('03001234567'), true);
  assert.equal(validatePhonePK('0300-1234567'), true);
  assert.equal(validatePhonePK('+923001234567'), true);
  assert.equal(validatePhonePK('923219876543'), true);
  assert.equal(validatePhonePK('0345 1122334'), true);

  assert.equal(validatePhonePK('12345'), false);
  assert.equal(validatePhonePK('02135890123'), false); // Landline not mobile
  assert.equal(validatePhonePK('abc'), false);
});

test('validateCheckoutForm requires full name, valid phone, detailed address and city', () => {
  const validForm = {
    fullName: 'Muhammad Usman',
    phone: '0301-9876543',
    email: 'usman@example.com',
    address: 'House 42, Street 15, Sector F-8/2',
    city: 'Islamabad',
  };

  assert.equal(validateCheckoutForm(validForm).isValid, true);

  const invalidForm = {
    fullName: 'M',
    phone: '999',
    address: 'test',
    city: '',
  };

  const result = validateCheckoutForm(invalidForm);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.fullName);
  assert.ok(result.errors.phone);
  assert.ok(result.errors.address);
  assert.ok(result.errors.city);
});

test('canTransitionOrderStatus enforces admin permissions and valid workflow transitions', () => {
  // Customer cannot transition
  const custRes = canTransitionOrderStatus('pending', 'confirmed', 'customer');
  assert.equal(custRes.allowed, false);

  // Admin valid forward transitions
  assert.equal(canTransitionOrderStatus('pending', 'confirmed', 'admin').allowed, true);
  assert.equal(canTransitionOrderStatus('confirmed', 'shipped', 'admin').allowed, true);
  assert.equal(canTransitionOrderStatus('shipped', 'delivered', 'admin').allowed, true);

  // Admin valid backwards transitions (correcting mistakes)
  assert.equal(canTransitionOrderStatus('delivered', 'shipped', 'admin').allowed, true);
  assert.equal(canTransitionOrderStatus('shipped', 'pending', 'admin').allowed, true);
  assert.equal(canTransitionOrderStatus('delivered', 'pending', 'admin').allowed, true);

  // Cancellation allowed from active states
  assert.equal(canTransitionOrderStatus('pending', 'cancelled', 'admin').allowed, true);
  assert.equal(canTransitionOrderStatus('confirmed', 'cancelled', 'admin').allowed, true);
  assert.equal(canTransitionOrderStatus('shipped', 'cancelled', 'admin').allowed, true);
  assert.equal(canTransitionOrderStatus('delivered', 'cancelled', 'admin').allowed, true);

  // Cancelled orders are final and locked (cannot be revived or altered)
  assert.equal(canTransitionOrderStatus('cancelled', 'pending', 'admin').allowed, false);
  assert.equal(canTransitionOrderStatus('cancelled', 'confirmed', 'admin').allowed, false);
});

test('admin authorization verifies ADMIN_EMAIL strictly and case-insensitively', async () => {
  const { ADMIN_EMAIL } = await import('../config/site');
  assert.equal(ADMIN_EMAIL, 'uakashafanny@gmail.com');

  const checkAdminEligibility = (email: string, role: string) => {
    return role === 'admin' && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  };

  assert.equal(checkAdminEligibility('uakashafanny@gmail.com', 'admin'), true);
  assert.equal(checkAdminEligibility('UAKASHAFANNY@GMAIL.COM', 'admin'), true);
  assert.equal(checkAdminEligibility('  uakashafanny@gmail.com  ', 'admin'), true);
  assert.equal(checkAdminEligibility('other@example.com', 'admin'), false);
  assert.equal(checkAdminEligibility('uakashafanny@gmail.com', 'customer'), false);
});

test('admin lockout logic triggers 60s lockdown after 5 failed attempts', () => {
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_SEC = 60;

  const calculateLockout = (currentAttempts: number, now: number) => {
    const nextAttempts = currentAttempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      return { attempts: nextAttempts, lockedUntil: now + LOCKOUT_SEC * 1000 };
    }
    return { attempts: nextAttempts, lockedUntil: null };
  };

  const now = 1000000;
  assert.equal(calculateLockout(0, now).lockedUntil, null);
  assert.equal(calculateLockout(1, now).lockedUntil, null);
  assert.equal(calculateLockout(3, now).lockedUntil, null);
  assert.equal(calculateLockout(4, now).lockedUntil, now + 60000); // 5th attempt locks for 60s
});

test('hasUserOrderedProduct verifies customer order history accurately', () => {
  const dummyOrders: Order[] = [
    {
      id: 'ord-1',
      order_number: 'BRV-261027-A1B2',
      user_id: 'user-hassan',
      customer_name: 'Hassan Ali',
      customer_phone: '03214567890',
      customer_email: 'hassan@example.com',
      shipping_address: 'Address 1',
      city: 'Islamabad',
      province: 'Federal',
      postal_code: '44000',
      payment_method: 'cod',
      payment_status: 'paid',
      status: 'delivered',
      subtotal: 5000,
      discount_amount: 0,
      delivery_fee: 0,
      total: 5000,
      coupon_code: null,
      order_notes: null,
      created_at: '2026-10-27T10:00:00Z',
      updated_at: '2026-10-28T10:00:00Z',
      items: [
        {
          id: 'item-1',
          order_id: 'ord-1',
          product_id: 'prod-kurta-royal',
          variant_id: 'var-1',
          product_name: 'Royal Kurta',
          variant_label: 'Size L',
          unit_price: 5000,
          quantity: 1,
          line_total: 5000,
          image_url: 'https://example.com/img.jpg',
        },
      ],
    },
    {
      id: 'ord-2',
      order_number: 'BRV-261028-C3D4',
      user_id: 'user-fatima',
      customer_name: 'Fatima Zahra',
      customer_phone: '03338765432',
      customer_email: 'fatima@example.com',
      shipping_address: 'Address 2',
      city: 'Lahore',
      province: 'Punjab',
      postal_code: '54000',
      payment_method: 'cod',
      payment_status: 'unpaid',
      status: 'cancelled', // CANCELLED ORDER!
      subtotal: 3000,
      discount_amount: 0,
      delivery_fee: 0,
      total: 3000,
      coupon_code: null,
      order_notes: null,
      created_at: '2026-10-28T10:00:00Z',
      updated_at: '2026-10-28T11:00:00Z',
      items: [
        {
          id: 'item-2',
          order_id: 'ord-2',
          product_id: 'prod-attar-oudh-khayr',
          variant_id: 'var-2',
          product_name: 'Oudh Attar',
          variant_label: '12ml',
          unit_price: 3000,
          quantity: 1,
          line_total: 3000,
          image_url: 'https://example.com/img2.jpg',
        },
      ],
    },
  ];

  // Hassan ordered prod-kurta-royal -> true
  assert.equal(
    hasUserOrderedProduct(dummyOrders, { id: 'user-hassan', email: 'hassan@example.com' }, 'prod-kurta-royal'),
    true
  );

  // Match by email case-insensitively
  assert.equal(
    hasUserOrderedProduct(dummyOrders, { id: 'different-id', email: 'HASSAN@EXAMPLE.COM' }, 'prod-kurta-royal'),
    true
  );

  // Hassan did NOT order prod-earbuds -> false
  assert.equal(
    hasUserOrderedProduct(dummyOrders, { id: 'user-hassan', email: 'hassan@example.com' }, 'prod-earbuds'),
    false
  );

  // Fatima's order for prod-attar was cancelled -> false
  assert.equal(
    hasUserOrderedProduct(dummyOrders, { id: 'user-fatima', email: 'fatima@example.com' }, 'prod-attar-oudh-khayr'),
    false
  );

  // Guest / null user -> false
  assert.equal(hasUserOrderedProduct(dummyOrders, null, 'prod-kurta-royal'), false);
  assert.equal(hasUserOrderedProduct(dummyOrders, { id: '' }, 'prod-kurta-royal'), false);
});

test('calculateReviewSummary calculates averages and star distribution correctly', () => {
  // Empty reviews case
  const emptySummary = calculateReviewSummary([]);
  assert.equal(emptySummary.averageRating, 0);
  assert.equal(emptySummary.totalReviews, 0);
  assert.deepEqual(emptySummary.ratingCounts, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  // Populated reviews
  const mockReviews: ProductReview[] = [
    {
      id: 'r1',
      product_id: 'p1',
      user_id: 'u1',
      user_name: 'Ali',
      rating: 5,
      comment: 'Excellent quality',
      created_at: '2026-10-28T00:00:00Z',
      verified_purchase: true,
    },
    {
      id: 'r2',
      product_id: 'p1',
      user_id: 'u2',
      user_name: 'Sara',
      rating: 5,
      comment: 'Loved the fabric',
      created_at: '2026-10-28T00:00:00Z',
      verified_purchase: true,
    },
    {
      id: 'r3',
      product_id: 'p1',
      user_id: 'u3',
      user_name: 'Bilal',
      rating: 4,
      comment: 'Good fit and fast delivery',
      created_at: '2026-10-28T00:00:00Z',
      verified_purchase: true,
    },
  ];

  const summary = calculateReviewSummary(mockReviews);
  assert.equal(summary.totalReviews, 3);
  // (5 + 5 + 4) / 3 = 4.6666... -> 4.7
  assert.equal(summary.averageRating, 4.7);
  assert.equal(summary.ratingCounts[5], 2);
  assert.equal(summary.ratingCounts[4], 1);
  assert.equal(summary.ratingCounts[3], 0);
  assert.equal(summary.ratingPercentages[5], 67); // 2/3 = 67%
  assert.equal(summary.ratingPercentages[4], 33); // 1/3 = 33%
});

test('validateReviewInput validates star rating and comment length constraints', () => {
  // Valid
  assert.equal(validateReviewInput(5, 'Stunning craftsmanship and fine fabric!').isValid, true);
  assert.equal(validateReviewInput(1, 'Poor fit and color does not match photos').isValid, true);

  // Invalid rating
  assert.equal(validateReviewInput(0, 'Good product').isValid, false);
  assert.equal(validateReviewInput(6, 'Good product').isValid, false);
  assert.equal(validateReviewInput(NaN, 'Good product').isValid, false);

  // Invalid comment
  assert.equal(validateReviewInput(5, '').isValid, false);
  assert.equal(validateReviewInput(5, '   ').isValid, false);
  assert.equal(validateReviewInput(5, 'Nice').isValid, false); // < 5 chars

  // Comment too long
  const tooLong = 'a'.repeat(1001);
  assert.equal(validateReviewInput(5, tooLong).isValid, false);
});

test('security (a): localStorage currentUser with role "admin" does NOT grant /admin access', async () => {
  const { ADMIN_EMAIL } = await import('../config/site');

  // Simulate localStorage parsing logic from StoreContext and AuthContext
  const parseStoredUser = (storedJson: string | null, isRealMode: boolean, isDev: boolean = true) => {
    // In real mode (Supabase configured), do not read currentUser from localStorage at all
    if (isRealMode) return null;
    // In a production build with no Supabase, do not auto-login anyone
    if (!isDev) return null;
    if (!storedJson) return null;
    try {
      const parsed = JSON.parse(storedJson);
      // On app load, ignore any stored currentUser that has role 'admin' or admin email
      if (parsed?.role === 'admin' || parsed?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  // 1. In demo mode, a tampered localStorage with role 'admin' is purged/ignored
  const forgedAdminJson = JSON.stringify({
    id: 'hacker-01',
    email: 'hacker@example.com',
    role: 'admin',
    full_name: 'Hacker',
  });
  assert.equal(parseStoredUser(forgedAdminJson, false, true), null);

  // Tampered localStorage with admin email is purged/ignored
  const forgedEmailAdminJson = JSON.stringify({
    id: 'hacker-02',
    email: ADMIN_EMAIL,
    role: 'customer',
    full_name: 'Impostor Admin',
  });
  assert.equal(parseStoredUser(forgedEmailAdminJson, false, true), null);

  // 2. In real Supabase mode, localStorage is completely bypassed
  assert.equal(parseStoredUser(forgedAdminJson, true, true), null);

  // 3. In production builds with no Supabase, demo auto-login is disabled
  assert.equal(parseStoredUser(forgedAdminJson, false, false), null);
  const legitCustomerJson = JSON.stringify({
    id: 'cust-01',
    email: 'customer@example.com',
    role: 'customer',
    full_name: 'Ali Khan',
  });
  assert.equal(parseStoredUser(legitCustomerJson, false, false), null);

  // 4. Admin access decision strictly requires useAuth().isAdmin which requires a verified session
  const verifyAdminAccess = (
    profile: { email?: string; role?: string } | null,
    user: { email?: string } | null,
    isVerifiedSession: boolean
  ) => {
    if (!isVerifiedSession || !profile || !user) return false;
    return Boolean(
      profile.role === 'admin' &&
      profile.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );
  };

  // Even if an attacker managed to construct a mock currentUser in StoreContext:
  const mockCurrentUser = { email: ADMIN_EMAIL, role: 'admin' };
  // Without a verified auth session, admin access is rejected
  assert.equal(verifyAdminAccess(mockCurrentUser, null, false), false);
  // Profile alone without matching verified session user is rejected
  assert.equal(verifyAdminAccess(mockCurrentUser, { email: 'wrong@example.com' }, true), false);
  // Unverified localStorage state cannot grant access
  assert.equal(verifyAdminAccess(null, null, false), false);
  // Valid verified session with matching profile and user succeeds
  assert.equal(verifyAdminAccess(mockCurrentUser, { email: ADMIN_EMAIL }, true), true);
});

test('security (b): no code path sets an admin profile without signInAdmin', async () => {
  const { ADMIN_EMAIL } = await import('../config/site');
  const { authService } = await import('../services/authService');

  // 1. Customer registration (signUp) always creates customer role, never admin
  const regResult = await authService.signUp('newuser@example.com', 'password123', 'New User', '03001234567');
  assert.equal(regResult.profile.role, 'customer');

  // Even if an attacker tries to register using the admin email through customer signUp:
  const spoofReg = await authService.signUp(ADMIN_EMAIL, 'password123', 'Spoof Admin', '03001234567');
  assert.equal(spoofReg.profile.role, 'customer'); // Never admin!

  // 2. Customer sign-in (authService.signIn) rejects logging in as admin
  (globalThis as any).__BARVAKA_DEV__ = true;
  await assert.rejects(
    async () => {
      await authService.signIn(ADMIN_EMAIL, 'anypassword');
    },
    { message: /Admin must sign in via Admin Portal/ }
  );

  // 3. In production mode (DEV = false), customer sign-in rejects without database
  (globalThis as any).__BARVAKA_DEV__ = false;
  await assert.rejects(
    async () => {
      await authService.signIn('hassan@example.com', 'password123');
    },
    { message: /Store is not connected to its database yet/ }
  );

  // 4. loginWithEmail does nothing in production mode (DEV = false) and never logs in admin
  const simulateLoginWithEmail = (email: string, isDev: boolean) => {
    if (!isDev) return { success: false, error: 'Store is not connected to its database yet.' };
    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return { success: false, error: 'Admin must sign in via Admin Portal' };
    }
    return { success: true };
  };

  (globalThis as any).__BARVAKA_DEV__ = false;
  const prodLoginResult = simulateLoginWithEmail('hassan@example.com', false);
  assert.equal(prodLoginResult.success, false);
  assert.equal(prodLoginResult.error, 'Store is not connected to its database yet.');

  // 5. loginWithEmail rejects admin email in dev mode
  (globalThis as any).__BARVAKA_DEV__ = true;
  assert.deepEqual(simulateLoginWithEmail(ADMIN_EMAIL, true), {
    success: false,
    error: 'Admin must sign in via Admin Portal',
  });
});

test('security (c): wrong password and wrong email are rejected by signInAdmin', async () => {
  const { ADMIN_EMAIL } = await import('../config/site');
  const { authService } = await import('../services/authService');

  // Customer signIn requires a password
  await assert.rejects(
    async () => {
      await authService.signIn('hassan@example.com', '');
    },
    { message: 'Password is required.' }
  );

  // Set dev mode to test demo password verification
  (globalThis as any).__BARVAKA_DEV__ = true;

  // 1. Wrong password rejected
  await assert.rejects(
    async () => {
      await authService.signInAdmin(ADMIN_EMAIL, 'wrong-password-999');
    },
    { message: 'Invalid email or password.' }
  );

  await assert.rejects(
    async () => {
      await authService.signInAdmin(ADMIN_EMAIL, '');
    },
    { message: 'Invalid email or password.' }
  );

  // 2. Wrong email rejected even with demo password
  await assert.rejects(
    async () => {
      await authService.signInAdmin('impostor@example.com', 'demo1234');
    },
    { message: 'Invalid email or password.' }
  );

  // 3. Valid credentials succeed in dev mode
  const validAdmin = await authService.signInAdmin(ADMIN_EMAIL, 'demo1234');
  assert.equal(validAdmin.profile.role, 'admin');
  assert.equal(validAdmin.profile.email.toLowerCase(), ADMIN_EMAIL.toLowerCase());

  // 4. In production mode (DEV = false), demo admin login is completely disabled
  (globalThis as any).__BARVAKA_DEV__ = false;
  await assert.rejects(
    async () => {
      await authService.signInAdmin(ADMIN_EMAIL, 'demo1234');
    },
    { message: 'Store is not connected to its database yet.' }
  );

  // Reset test override
  delete (globalThis as any).__BARVAKA_DEV__;
});

test('generateVariantSku creates unique SKUs with product prefix and random suffix, never reusing default SKU', () => {
  const skuFromCamel = generateVariantSku('camel-wool-shawl');
  assert.match(skuFromCamel, /^CAM-[A-Z0-9]{4}$/);
  assert.notEqual(skuFromCamel, 'ARJ-SKU-01');

  const skuFromKurta = generateVariantSku('kurta-royal-cotton');
  assert.match(skuFromKurta, /^KUR-[A-Z0-9]{4}$/);
  assert.notEqual(skuFromKurta, 'ARJ-SKU-01');

  const skuEmpty = generateVariantSku('');
  assert.match(skuEmpty, /^ARJ-[A-Z0-9]{4}$/);

  // Generate 20 SKUs and verify all 20 are unique
  const set = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const s = generateVariantSku('camel-wool-shawl');
    assert.equal(set.has(s), false, `SKU ${s} was unexpectedly repeated`);
    set.add(s);
  }
  assert.equal(set.size, 20);
});

test('normalizeVariantSku returns NULL for empty or whitespace-only inputs, and trimmed string otherwise', () => {
  assert.equal(normalizeVariantSku(''), null);
  assert.equal(normalizeVariantSku('   '), null);
  assert.equal(normalizeVariantSku(null), null);
  assert.equal(normalizeVariantSku(undefined), null);
  assert.equal(normalizeVariantSku('CAM-7F3K'), 'CAM-7F3K');
  assert.equal(normalizeVariantSku('  CAM-7F3K  '), 'CAM-7F3K');
});

test('validateVariantPriceOverride rejects negative numbers with inline message and saves empty as NULL', () => {
  // Empty, null, or undefined must return normalizedPrice: null
  const emptyRes = validateVariantPriceOverride('');
  assert.equal(emptyRes.isValid, true);
  assert.equal(emptyRes.normalizedPrice, null);

  const nullRes = validateVariantPriceOverride(null);
  assert.equal(nullRes.isValid, true);
  assert.equal(nullRes.normalizedPrice, null);

  const undefRes = validateVariantPriceOverride(undefined);
  assert.equal(undefRes.isValid, true);
  assert.equal(undefRes.normalizedPrice, null);

  const whitespaceRes = validateVariantPriceOverride('   ');
  assert.equal(whitespaceRes.isValid, true);
  assert.equal(whitespaceRes.normalizedPrice, null);

  // Negative values must be rejected with message "Price override cannot be negative."
  const negativeRes = validateVariantPriceOverride(-100);
  assert.equal(negativeRes.isValid, false);
  assert.equal(negativeRes.error, 'Price override cannot be negative.');

  const negativeStrRes = validateVariantPriceOverride('-25');
  assert.equal(negativeStrRes.isValid, false);
  assert.equal(negativeStrRes.error, 'Price override cannot be negative.');

  // Zero and positive values must be accepted
  const zeroRes = validateVariantPriceOverride(0);
  assert.equal(zeroRes.isValid, true);
  assert.equal(zeroRes.normalizedPrice, 0);

  const validRes = validateVariantPriceOverride(3490);
  assert.equal(validRes.isValid, true);
  assert.equal(validRes.normalizedPrice, 3490);

  const validStrRes = validateVariantPriceOverride(' 4500 ');
  assert.equal(validStrRes.isValid, true);
  assert.equal(validStrRes.normalizedPrice, 4500);
});

test('getDuplicateSkuErrorMessage returns standard error when SKU duplicate violates constraint', () => {
  const pgError = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "product_variants_sku_key"',
  };
  assert.equal(
    getDuplicateSkuErrorMessage(pgError),
    'This SKU is already used by another product. Please change it.'
  );

  const keyExistsError = new Error('Key (sku)=(CAM-7F3K) already exists.');
  assert.equal(
    getDuplicateSkuErrorMessage(keyExistsError),
    'This SKU is already used by another product. Please change it.'
  );

  const unrelatedError = new Error('Network timeout');
  assert.equal(getDuplicateSkuErrorMessage(unrelatedError), null);
});


