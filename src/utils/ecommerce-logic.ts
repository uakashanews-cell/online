/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CartItem, Coupon, OrderStatus, ProductVariant, UserRole, CheckoutFormData, Order, ProductReview } from '../types';


/**
 * Generates unique order number in format: BRV-YYMMDD-XXXX
 * e.g. BRV-261029-K8N2
 */
export function generateOrderNumber(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit easily confused chars (I, O, 0, 1)
  let randomSuffix = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    randomSuffix += chars[randomIndex];
  }

  return `BRV-${yy}${mm}${dd}-${randomSuffix}`;
}

/**
 * Formats a numeric amount in PKR standard currency: Rs. 1,500
 */
export function formatPKR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rs. 0';
  }
  const rounded = Math.round(amount);
  return `Rs. ${rounded.toLocaleString('en-PK')}`;
}

/**
 * Variant price = product_variants.price if not null, otherwise products.base_price
 */
export function getVariantPrice(basePrice: number, variantPrice?: number | null): number {
  if (variantPrice !== null && variantPrice !== undefined && variantPrice > 0) {
    return variantPrice;
  }
  return basePrice;
}

export interface CouponValidationResult {
  isValid: boolean;
  errorMessage?: string;
  discountAmount: number;
}

/**
 * Validates coupon rules:
 * - is_active === true
 * - starts_at <= now <= expires_at
 * - used_count < max_uses (when max_uses is set)
 * - subtotal >= min_order_amount
 * - percentage discount calculated on subtotal
 * - fixed discount cannot exceed subtotal
 */
export function validateCoupon(
  coupon: Coupon | null | undefined,
  subtotal: number,
  currentDate: Date = new Date()
): CouponValidationResult {
  if (!coupon) {
    return { isValid: false, errorMessage: 'No coupon provided', discountAmount: 0 };
  }

  if (!coupon.is_active) {
    return { isValid: false, errorMessage: 'This coupon is no longer active', discountAmount: 0 };
  }

  const nowTime = currentDate.getTime();
  const startTime = new Date(coupon.starts_at).getTime();
  const expiryTime = new Date(coupon.expires_at).getTime();

  if (nowTime < startTime) {
    return { isValid: false, errorMessage: 'Coupon has not started yet', discountAmount: 0 };
  }

  if (nowTime > expiryTime) {
    return { isValid: false, errorMessage: 'This coupon has expired', discountAmount: 0 };
  }

  if (coupon.max_uses !== null && coupon.max_uses !== undefined && coupon.used_count >= coupon.max_uses) {
    return { isValid: false, errorMessage: 'Coupon usage limit has been reached', discountAmount: 0 };
  }

  if (subtotal < coupon.min_order_amount) {
    return {
      isValid: false,
      errorMessage: `Minimum order of ${formatPKR(coupon.min_order_amount)} required for this coupon`,
      discountAmount: 0,
    };
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round((subtotal * coupon.discount_value) / 100);
  } else {
    // Fixed amount discount cannot exceed subtotal
    discount = Math.min(coupon.discount_value, subtotal);
  }

  return {
    isValid: true,
    discountAmount: Math.max(0, discount),
  };
}

/**
 * Calculates cart totals: subtotal, discount, delivery fee (always 0), and final total
 */
export function calculateCartTotals(items: CartItem[], coupon?: Coupon | null, now: Date = new Date()) {
  const subtotal = items.reduce((acc, item) => {
    return acc + item.unit_price * item.quantity;
  }, 0);

  let discount = 0;
  let couponError: string | undefined;

  if (coupon) {
    const couponResult = validateCoupon(coupon, subtotal, now);
    if (couponResult.isValid) {
      discount = couponResult.discountAmount;
    } else {
      couponError = couponResult.errorMessage;
    }
  }

  const deliveryFee = 0; // Always Free Delivery for BARVAKA in v1
  const total = Math.max(0, subtotal - discount + deliveryFee);

  return {
    subtotal,
    discount,
    deliveryFee,
    total,
    couponError,
    itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
  };
}

/**
 * Validates stock quantity against requested quantity
 */
export function checkVariantStock(
  variant: Pick<ProductVariant, 'stock_quantity' | 'is_active'>,
  requestedQty: number
): { isAvailable: boolean; message?: string } {
  if (!variant.is_active) {
    return { isAvailable: false, message: 'This variant is currently inactive' };
  }
  if (variant.stock_quantity <= 0) {
    return { isAvailable: false, message: 'Out of stock' };
  }
  if (requestedQty > variant.stock_quantity) {
    return {
      isAvailable: false,
      message: `Only ${variant.stock_quantity} available in stock`,
    };
  }
  return { isAvailable: true };
}

/**
 * Validates Pakistan phone numbers (e.g. 03001234567, 0300-1234567, +923001234567)
 */
export function validatePhonePK(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Matches 03XXXXXXXXX (11 digits) or +923XXXXXXXXX (13 chars) or 923XXXXXXXXX (12 digits)
  const pkPhoneRegex = /^((\+92)|(92)|0)?3\d{9}$/;
  return pkPhoneRegex.test(cleaned);
}

/**
 * Validates checkout form data before placing an order
 */
export function validateCheckoutForm(form: Partial<CheckoutFormData>): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!form.fullName || form.fullName.trim().length < 3) {
    errors.fullName = 'Full Name is required (minimum 3 characters)';
  }

  if (!form.phone || !validatePhonePK(form.phone)) {
    errors.phone = 'Valid Pakistan mobile number is required (e.g. 0300-1234567)';
  }

  if (form.email && form.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
  }

  if (!form.address || form.address.trim().length < 6) {
    errors.address = 'Detailed delivery address is required (house/shop, street, area)';
  }

  if (!form.city || form.city.trim().length < 2) {
    errors.city = 'Please specify your city';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Order status transition logic:
 * Admin can move freely between pending, confirmed, shipped, and delivered in any direction.
 * Admin can cancel any active order (which restores inventory stock via RPC).
 * Cancelled orders are final and locked (cannot be reopened).
 * Customers cannot change order status directly.
 */
export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  role: UserRole
): { allowed: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { allowed: false, reason: 'Order already has this status' };
  }

  if (role !== 'admin') {
    return { allowed: false, reason: 'Customers cannot change order status directly. Please contact support via WhatsApp.' };
  }

  // Cancelled orders are final and locked
  if (currentStatus === 'cancelled') {
    return { allowed: false, reason: 'Cancelled orders are final and cannot be modified' };
  }

  // Admin can cancel any non-cancelled order
  if (targetStatus === 'cancelled') {
    return { allowed: true };
  }

  // Active statuses: admin can transition freely between them (any direction)
  const activeStatuses: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];
  if (activeStatuses.includes(currentStatus) && activeStatuses.includes(targetStatus)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Invalid transition from ${currentStatus} to ${targetStatus}`,
  };
}

/**
 * Checks if an authenticated user has previously ordered a specific product.
 * Returns true if there is at least one non-cancelled order containing the product.
 */
export function hasUserOrderedProduct(
  orders: Order[],
  user: { id: string; email?: string } | null | undefined,
  productId: string
): boolean {
  if (!user || !user.id || !productId) {
    return false;
  }

  const userEmail = user.email ? user.email.trim().toLowerCase() : '';

  return orders.some((order) => {
    // Only count active or fulfilled orders (skip cancelled orders)
    if (order.status === 'cancelled') {
      return false;
    }

    const matchesUser =
      order.user_id === user.id ||
      (userEmail && order.customer_email && order.customer_email.trim().toLowerCase() === userEmail);

    if (!matchesUser) {
      return false;
    }

    return order.items && order.items.some((item) => item.product_id === productId);
  });
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>;
  ratingPercentages: Record<1 | 2 | 3 | 4 | 5, number>;
}

/**
 * Calculates rating statistics (average rating, count breakdown, percentage distribution)
 */
export function calculateReviewSummary(reviews: ProductReview[]): ReviewSummary {
  const counts: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (!reviews || reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingCounts: counts,
      ratingPercentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  let totalScore = 0;
  reviews.forEach((r) => {
    const score = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[score] = (counts[score] || 0) + 1;
    totalScore += r.rating;
  });

  const totalReviews = reviews.length;
  const averageRating = Number((totalScore / totalReviews).toFixed(1));

  const percentages: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: Math.round((counts[1] / totalReviews) * 100),
    2: Math.round((counts[2] / totalReviews) * 100),
    3: Math.round((counts[3] / totalReviews) * 100),
    4: Math.round((counts[4] / totalReviews) * 100),
    5: Math.round((counts[5] / totalReviews) * 100),
  };

  return {
    averageRating,
    totalReviews,
    ratingCounts: counts,
    ratingPercentages: percentages,
  };
}

/**
 * Validates review input:
 * - rating must be an integer 1-5
 * - comment must be non-empty and at least 5 characters
 */
export function validateReviewInput(
  rating: number,
  comment: string
): { isValid: boolean; error?: string } {
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return { isValid: false, error: 'Please select a star rating between 1 and 5 stars' };
  }

  const trimmedComment = (comment || '').trim();
  if (trimmedComment.length < 5) {
    return { isValid: false, error: 'Please write a review of at least 5 characters sharing your experience' };
  }

  if (trimmedComment.length > 1000) {
    return { isValid: false, error: 'Review text cannot exceed 1,000 characters' };
  }

  return { isValid: true };
}

/**
 * Auto-generates a unique SKU for a variant:
 * e.g. First 3 alphanumeric letters of product slug/name uppercased + "-" + 4-character random suffix
 * Example: "CAM-7F3K"
 * Never uses a static default like "BRV-SKU-01".
 */
export function generateVariantSku(slugOrName?: string): string {
  const lettersOnly = (slugOrName || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const prefix = lettersOnly.length >= 3 
    ? lettersOnly.slice(0, 3) 
    : (lettersOnly + 'BRV').slice(0, 3);

  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return `${prefix}-${suffix}`;
}

/**
 * Normalizes a variant SKU:
 * If empty or whitespace-only, returns null so database stores NULL instead of empty string.
 */
export function normalizeVariantSku(sku?: string | null): string | null {
  if (!sku || typeof sku !== 'string') return null;
  const trimmed = sku.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates and normalizes Price Override:
 * - Empty, null, or undefined -> returns null (not 0, not empty string)
 * - Negative value -> invalid with inline validation message: "Price override cannot be negative."
 * - Valid non-negative number -> returns normalized positive/zero number
 */
export function validateVariantPriceOverride(
  price: number | string | null | undefined
): { isValid: boolean; error?: string; normalizedPrice: number | null } {
  if (price === null || price === undefined) {
    return { isValid: true, normalizedPrice: null };
  }
  if (typeof price === 'string') {
    const trimmed = price.trim();
    if (trimmed === '') {
      return { isValid: true, normalizedPrice: null };
    }
    const num = Number(trimmed);
    if (isNaN(num)) {
      return { isValid: true, normalizedPrice: null };
    }
    if (num < 0) {
      return { isValid: false, error: 'Price override cannot be negative.', normalizedPrice: null };
    }
    return { isValid: true, normalizedPrice: num };
  }
  if (typeof price === 'number') {
    if (isNaN(price)) {
      return { isValid: true, normalizedPrice: null };
    }
    if (price < 0) {
      return { isValid: false, error: 'Price override cannot be negative.', normalizedPrice: null };
    }
    return { isValid: true, normalizedPrice: price };
  }
  return { isValid: true, normalizedPrice: null };
}

/**
 * Checks if an error is a duplicate SKU unique constraint violation:
 * Returns the required message: "This SKU is already used by another product. Please change it."
 */
export function getDuplicateSkuErrorMessage(error: any): string | null {
  if (!error) return null;
  const code = error.code || '';
  const msg = error.message || String(error);
  if (
    code === '23505' ||
    /product_variants_sku_key|duplicate key.*sku|unique constraint.*sku|sku.*already exists/i.test(msg)
  ) {
    return 'This SKU is already used by another product. Please change it.';
  }
  return null;
}

