/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { CartItem, Product, ProductVariant, Coupon } from '../types';
import { productService } from '../services/productService';
import { couponService, CouponValidationResponse } from '../services/couponService';
import { getVariantPrice, formatPKR } from '../utils/ecommerce-logic';

export interface RawCartItem {
  variant_id: string;
  product_id: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  rawCart: RawCartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  appliedCoupon: CouponValidationResponse | null;
  isLoading: boolean;
  addToCart: (product: Product, variant: ProductVariant, quantity: number) => { success: boolean; message?: string };
  updateQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message?: string }>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'barvaka_cart';
const COUPON_STORAGE_KEY = 'barvaka_applied_coupon';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawCart, setRawCart] = useState<RawCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(() => {
    try {
      const saved = localStorage.getItem(COUPON_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [displayItems, setDisplayItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync rawCart to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawCart));
  }, [rawCart]);

  // Sync appliedCoupon to localStorage
  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    }
  }, [appliedCoupon]);

  // Hydrate display data for cart items from service layer
  useEffect(() => {
    let isMounted = true;
    async function hydrateCart() {
      if (rawCart.length === 0) {
        setDisplayItems([]);
        return;
      }

      setIsLoading(true);
      try {
        const hydrated: CartItem[] = [];

        for (const item of rawCart) {
          const product = await productService.getProductById(item.product_id);
          if (!product) continue;

          const variant = product.variants.find((v) => v.id === item.variant_id);
          if (!variant) continue;

          const unitPrice = getVariantPrice(product.base_price, variant.price);
          const parts: string[] = [];
          if (variant.size) parts.push(`Size: ${variant.size}`);
          if (variant.color) parts.push(`Color: ${variant.color}`);
          const variantLabel = parts.length > 0 ? parts.join(' · ') : 'Standard';

          hydrated.push({
            id: `${item.product_id}-${item.variant_id}`,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name: product.name,
            variant_label: variantLabel,
            unit_price: unitPrice,
            image_url: product.images[0] || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500',
            quantity: item.quantity,
            max_stock: variant.stock_quantity,
            slug: product.slug,
          });
        }

        if (isMounted) {
          setDisplayItems(hydrated);
        }
      } catch (err) {
        console.error('Error hydrating cart:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    hydrateCart();
    return () => {
      isMounted = false;
    };
  }, [rawCart]);

  // Calculations
  const itemCount = useMemo(() => {
    return displayItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [displayItems]);

  const subtotal = useMemo(() => {
    return displayItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  }, [displayItems]);

  const discount = useMemo(() => {
    if (!appliedCoupon || !appliedCoupon.valid) return 0;
    return appliedCoupon.discount_amount || 0;
  }, [appliedCoupon]);

  const deliveryFee = 0; // Always Free Delivery for BARVAKA in Pakistan

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount + deliveryFee);
  }, [subtotal, discount, deliveryFee]);

  const addToCart = useCallback(
    (product: Product, variant: ProductVariant, quantity: number) => {
      if (!variant.is_active || !product.is_active) {
        return { success: false, message: 'Item is currently inactive' };
      }
      if (variant.stock_quantity <= 0) {
        return { success: false, message: 'Out of stock' };
      }

      const existingIndex = rawCart.findIndex((i) => i.variant_id === variant.id);
      const currentQty = existingIndex >= 0 ? rawCart[existingIndex].quantity : 0;
      const targetQty = currentQty + quantity;

      if (targetQty > variant.stock_quantity) {
        const available = variant.stock_quantity - currentQty;
        return {
          success: false,
          message: available > 0
            ? `Only ${available} more available in stock`
            : `All ${variant.stock_quantity} available units are already in your cart`,
        };
      }

      setRawCart((prev) => {
        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex].quantity = targetQty;
          return copy;
        } else {
          return [...prev, { product_id: product.id, variant_id: variant.id, quantity }];
        }
      });

      return { success: true };
    },
    [rawCart]
  );

  const updateQuantity = useCallback(
    (variantId: string, quantity: number) => {
      if (quantity <= 0) {
        setRawCart((prev) => prev.filter((i) => i.variant_id !== variantId));
        return;
      }

      const item = displayItems.find((i) => i.variant_id === variantId);
      if (item && quantity > item.max_stock) {
        return;
      }

      setRawCart((prev) =>
        prev.map((i) => (i.variant_id === variantId ? { ...i, quantity } : i))
      );
    },
    [displayItems]
  );

  const removeFromCart = useCallback((variantId: string) => {
    setRawCart((prev) => prev.filter((i) => i.variant_id !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setRawCart([]);
    setAppliedCoupon(null);
  }, []);

  const applyCoupon = useCallback(
    async (code: string) => {
      if (!code.trim()) return { success: false, message: 'Enter a coupon code' };
      try {
        const result = await couponService.validateCoupon(code, subtotal);
        if (result.valid) {
          setAppliedCoupon(result);
          return { success: true, message: `Coupon applied: Rs. ${result.discount_amount} off` };
        } else {
          return { success: false, message: result.message || 'Invalid coupon' };
        }
      } catch (err: any) {
        return { success: false, message: err?.message || 'Could not validate coupon' };
      }
    },
    [subtotal]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  return (
    <CartContext.Provider
      value={{
        items: displayItems,
        rawCart,
        itemCount,
        subtotal,
        discount,
        deliveryFee,
        total,
        appliedCoupon,
        isLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
