/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'customer' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  color_hex?: string;
  price: number | null; // null means uses product base_price
  compare_at_price?: number | null;
  stock_quantity: number;
  sku: string | null;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  compare_at_price?: number | null;
  image_url?: string;
  is_featured: boolean;
  is_active: boolean;
  images: string[];
  created_at: string;
  updated_at?: string;
  variants: ProductVariant[];
}

export interface CartItem {
  id: string; // unique item line id e.g. `${product_id}-${variant_id}`
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string; // e.g. "Size: L · Color: Jet Black" or "Standard"
  unit_price: number;
  image_url: string;
  quantity: number;
  max_stock: number;
  slug: string;
}

export type DiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number; // e.g. 10 for 10% or 500 for Rs. 500
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  sku?: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  image_url: string;
}

export interface Order {
  id: string;
  order_number: string; // e.g. "BRV-261029-A7K2"
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  shipping_address: string;
  city: string;
  province: string | null;
  postal_code: string | null;
  notes?: string | null;
  order_notes: string | null;
  payment_method: 'cod';
  payment_status: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  coupon_id?: string | null;
  coupon_code: string | null;
  delivery_fee: number; // always 0 in v1
  total: number;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  added_at: string;
}

export interface CheckoutFormData {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  province?: string;
  postalCode?: string;
  orderNotes?: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
  verified_purchase: boolean;
}

export interface HomeBanner {
  id: number;
  is_active: boolean;
  label: string;
  headline: string;
  subtext: string;
  button_text: string;
  button_link: string;
  image_url: string | null;
  ends_at: string | null;
  updated_at?: string;
}


