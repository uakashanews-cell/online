/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Product,
  Category,
  Coupon,
  Order,
  CartItem,
  Profile,
  ProductVariant,
  OrderStatus,
  CheckoutFormData,
  UserRole,
  ProductReview,
} from '../types';
import {
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_COUPONS,
  SEED_PROFILES,
  SEED_ORDERS,
  SEED_REVIEWS,
} from '../data/seedData';
import {
  generateOrderNumber,
  calculateCartTotals,
  getVariantPrice,
  validateCoupon,
  canTransitionOrderStatus,
  hasUserOrderedProduct,
  validateReviewInput,
  getDuplicateSkuErrorMessage,
} from '../utils/ecommerce-logic';
import { supabase, isDemoMode } from '../lib/supabaseClient';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { couponService } from '../services/couponService';
import { orderService } from '../services/orderService';
import { adminService } from '../services/adminService';
import { ADMIN_EMAIL } from '../config/site';
import { useAuth } from './AuthContext';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface StoreContextType {
  // Catalog
  products: Product[];
  categories: Category[];
  activeCategories: Category[];
  activeProducts: Product[];
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<Product | undefined>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product | undefined>;
  deleteProduct: (id: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, variant: ProductVariant, quantity: number) => { success: boolean; message?: string };
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => { success: boolean; message?: string };
  clearCart: () => void;
  cartTotals: ReturnType<typeof calculateCartTotals>;

  // Coupons
  coupons: Coupon[];
  appliedCoupon: Coupon | null;
  applyCouponCode: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  addCoupon: (coupon: Omit<Coupon, 'id' | 'used_count'>) => void;
  updateCoupon: (id: string, updates: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;

  // Orders
  orders: Order[];
  placeOrder: (formData: CheckoutFormData) => Promise<{ success: boolean; order?: Order; error?: string }> | { success: boolean; order?: Order; error?: string };
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<{ success: boolean; error?: string }>;
  findOrderByTracking: (orderNumber: string, phone: string) => Order | null;
  fetchOrderByTracking: (orderNumber: string, phone: string) => Promise<Order | null>;
  refreshAdminData: (isSilent?: boolean) => Promise<void>;
  isAdminDataLoading: boolean;

  // Wishlist
  wishlist: string[]; // product IDs
  toggleWishlist: (productId: string) => { added: boolean; requiresAuth?: boolean };
  isInWishlist: (productId: string) => boolean;

  // Auth & Roles
  currentUser: Profile | null;
  allUsers: Profile[];
  loginAs: (role: 'guest' | 'customer') => void;
  loginWithEmail: (email: string, password?: string) => boolean;
  registerCustomer: (profileData: { email: string; fullName: string; phone: string }) => boolean;
  logout: () => void;
  updateCurrentUserProfile: (updates: Partial<Profile>) => void;

  // Reviews
  reviews: ProductReview[];
  addReview: (data: { productId: string; rating: number; comment: string }) => {
    success: boolean;
    message: string;
    review?: ProductReview;
  };
  deleteReview: (reviewId: string) => void;
  hasOrderedProduct: (productId: string) => boolean;
  getUserReviewForProduct: (productId: string) => ProductReview | undefined;

  // UI & Notifications
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  dismissToast: (id: string) => void;
  isAdvisorOpen: boolean;
  setIsAdvisorOpen: (open: boolean) => void;
  isWishlistLoginModalOpen: boolean;
  openWishlistLoginModal: () => void;
  closeWishlistLoginModal: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'brv_products_v1',
  CATEGORIES: 'brv_categories_v1',
  COUPONS: 'brv_coupons_v1',
  ORDERS: 'brv_orders_v1',
  CART: 'brv_cart_v1',
  WISHLIST: 'brv_wishlist_v1',
  USERS: 'brv_users_v1',
  CURRENT_USER: 'brv_current_user_v1',
  APPLIED_COUPON: 'brv_applied_coupon_v1',
  REVIEWS: 'brv_reviews_v1',
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State initialization: In Real Mode, start empty and fetch directly from Supabase.
  // In Demo Mode (no Supabase keys), initialize from localStorage or deterministic seed data.
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = isDemoMode ? localStorage.getItem(STORAGE_KEYS.PRODUCTS) : null;
      return saved ? JSON.parse(saved) : SEED_PRODUCTS;
    } catch {
      return SEED_PRODUCTS;
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = isDemoMode ? localStorage.getItem(STORAGE_KEYS.CATEGORIES) : null;
      return saved ? JSON.parse(saved) : SEED_CATEGORIES;
    } catch {
      return SEED_CATEGORIES;
    }
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = isDemoMode ? localStorage.getItem(STORAGE_KEYS.COUPONS) : null;
      return saved ? JSON.parse(saved) : SEED_COUPONS;
    } catch {
      return SEED_COUPONS;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = isDemoMode ? localStorage.getItem(STORAGE_KEYS.ORDERS) : null;
      return saved ? JSON.parse(saved) : SEED_ORDERS;
    } catch {
      return SEED_ORDERS;
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WISHLIST);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [allUsers, setAllUsers] = useState<Profile[]>(() => {
    try {
      const saved = isDemoMode ? localStorage.getItem(STORAGE_KEYS.USERS) : null;
      return saved ? JSON.parse(saved) : SEED_PROFILES;
    } catch {
      return SEED_PROFILES;
    }
  });

  const { profile: authProfile, isAdmin } = useAuth();

  const [demoUser, setDemoUser] = useState<Profile | null>(() => {
    // In real mode (Supabase configured), do not read currentUser from localStorage at all
    if (!isDemoMode && supabase) return null;
    const isDev = typeof (globalThis as any).__BARVAKA_DEV__ !== 'undefined'
      ? Boolean((globalThis as any).__BARVAKA_DEV__)
      : Boolean((import.meta as any).env?.DEV);
    // In a production build with no Supabase, do not auto-login anyone
    if (!isDev) return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        // On app load, ignore any stored currentUser that has role 'admin'
        if (parsed?.role === 'admin' || parsed?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Effective currentUser: In real mode, use AuthContext profile; in demo mode, use demoUser
  const currentUser: Profile | null = isDemoMode ? demoUser : (authProfile || demoUser);
  const effectiveRole: UserRole = isAdmin ? 'admin' : (authProfile?.role || demoUser?.role || 'customer');

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APPLIED_COUPON);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [reviews, setReviews] = useState<ProductReview[]>(() => {
    if (!isDemoMode && supabase) return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
      return saved ? JSON.parse(saved) : SEED_REVIEWS;
    } catch {
      return SEED_REVIEWS;
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isWishlistLoginModalOpen, setIsWishlistLoginModalOpen] = useState(false);
  const [isAdminDataLoading, setIsAdminDataLoading] = useState(false);

  // Toast system
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openWishlistLoginModal = useCallback(() => {
    setIsWishlistLoginModalOpen(true);
  }, []);

  const closeWishlistLoginModal = useCallback(() => {
    setIsWishlistLoginModalOpen(false);
  }, []);

  // Exported refreshAdminData function
  const refreshAdminData = useCallback(
    async (isSilent = false) => {
      if (isDemoMode || !supabase) return;
      try {
        if (!isSilent) setIsAdminDataLoading(true);

        if (isAdmin) {
          const [cats, prods, cpns, ords, users] = await Promise.all([
            categoryService.getCategories(),
            productService.getAllProductsAdmin(),
            couponService.getCoupons(),
            adminService.getOrders(),
            adminService.getCustomers(),
          ]);
          if (cats) setCategories(cats);
          if (prods) setProducts(prods);
          if (cpns) setCoupons(cpns);
          if (ords) setOrders(ords);
          if (users && users.length > 0) setAllUsers(users);
        } else {
          const [cats, prods] = await Promise.all([
            categoryService.getCategories(),
            productService.getProducts(),
          ]);
          if (cats) setCategories(cats);
          if (prods) setProducts(prods);
        }

        if (!isSilent) {
          showToast('Data refreshed successfully', 'success');
        }
      } catch (err: any) {
        const isSchemaMissing = err?.code === 'PGRST205' || err?.message?.includes('schema cache');
        if (isSchemaMissing) {
          console.warn(
            "[BARVAKA] Supabase database tables not yet found in schema cache. Using fallback data. Run supabase/schema.sql in the Supabase SQL Editor."
          );
          if (!isSilent) {
            showToast('Database tables not yet created in Supabase. Please run supabase/schema.sql in Supabase SQL Editor.', 'warning');
          }
        } else {
          console.error('Failed to refresh data from Supabase:', err);
          if (!isSilent) {
            showToast(err?.message || 'Failed to refresh data from database', 'error');
          }
        }
      } finally {
        if (!isSilent) setIsAdminDataLoading(false);
      }
    },
    [isAdmin, showToast]
  );

  // Fetch real data on mount in Real Mode
  useEffect(() => {
    if (isDemoMode || !supabase) return;
    refreshAdminData(true);
  }, [refreshAdminData]);

  // When admin logs in (isAdmin becomes true), refetch admin data
  useEffect(() => {
    if (!isDemoMode && supabase && isAdmin) {
      refreshAdminData(true);
    }
  }, [isAdmin, refreshAdminData]);

  // When admin logs out, clear admin orders and coupons to avoid data leakage
  useEffect(() => {
    if (!isDemoMode && !isAdmin) {
      setOrders([]);
      setCoupons([]);
    }
  }, [isAdmin]);

  // Sync to localStorage only in Demo Mode for catalog data
  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    }
  }, [categories]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
    }
  }, [coupons]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    }
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    if (demoUser) {
      if (demoUser.role === 'admin' || demoUser.email?.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      } else {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [demoUser]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem(STORAGE_KEYS.APPLIED_COUPON, JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem(STORAGE_KEYS.APPLIED_COUPON);
    }
  }, [appliedCoupon]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  }, [reviews]);



  // Filtered lists
  const activeCategories = useMemo(() => {
    return categories
      .filter((c) => c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [categories]);

  const activeProducts = useMemo(() => {
    return products.filter((p) => p.is_active);
  }, [products]);

  // Cart calculations
  const cartTotals = useMemo(() => {
    return calculateCartTotals(cart, appliedCoupon);
  }, [cart, appliedCoupon]);

  // Add to cart with variant and stock validation
  const addToCart = useCallback(
    (product: Product, variant: ProductVariant, quantity: number) => {
      if (!variant.is_active || !product.is_active) {
        showToast('This item is currently unavailable', 'error');
        return { success: false, message: 'Item is unavailable' };
      }

      if (variant.stock_quantity <= 0) {
        showToast('Selected variant is out of stock', 'error');
        return { success: false, message: 'Out of stock' };
      }

      const cartItemId = `${product.id}-${variant.id}`;
      const existing = cart.find((item) => item.id === cartItemId);
      const currentQty = existing ? existing.quantity : 0;
      const targetQty = currentQty + quantity;

      if (targetQty > variant.stock_quantity) {
        const availableToAdd = variant.stock_quantity - currentQty;
        const msg = availableToAdd > 0
          ? `Only ${availableToAdd} more can be added (Stock: ${variant.stock_quantity})`
          : `You already have all ${variant.stock_quantity} available items in your cart`;
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const unitPrice = getVariantPrice(product.base_price, variant.price);
      const variantParts: string[] = [];
      if (variant.size) variantParts.push(`Size: ${variant.size}`);
      if (variant.color) variantParts.push(`Color: ${variant.color}`);
      const variantLabel = variantParts.length > 0 ? variantParts.join(' · ') : 'Standard';

      setCart((prev) => {
        if (existing) {
          return prev.map((item) =>
            item.id === cartItemId ? { ...item, quantity: targetQty, max_stock: variant.stock_quantity } : item
          );
        } else {
          const newItem: CartItem = {
            id: cartItemId,
            product_id: product.id,
            variant_id: variant.id,
            product_name: product.name,
            variant_label: variantLabel,
            unit_price: unitPrice,
            image_url: product.images[0] || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500',
            quantity,
            max_stock: variant.stock_quantity,
            slug: product.slug,
          };
          return [...prev, newItem];
        }
      });

      showToast(`Added to cart: ${product.name} (${variantLabel})`, 'success');
      return { success: true };
    },
    [cart, showToast]
  );

  const removeFromCart = useCallback(
    (cartItemId: string) => {
      setCart((prev) => prev.filter((item) => item.id !== cartItemId));
      showToast('Item removed from cart', 'info');
    },
    [showToast]
  );

  const updateCartQuantity = useCallback(
    (cartItemId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(cartItemId);
        return { success: true };
      }

      const item = cart.find((i) => i.id === cartItemId);
      if (!item) return { success: false, message: 'Item not found in cart' };

      // Find current stock from live product catalog
      const product = products.find((p) => p.id === item.product_id);
      const variant = product?.variants.find((v) => v.id === item.variant_id);
      const liveStock = variant ? variant.stock_quantity : item.max_stock;

      if (quantity > liveStock) {
        showToast(`Cannot exceed available stock of ${liveStock}`, 'error');
        return { success: false, message: `Only ${liveStock} units available` };
      }

      setCart((prev) =>
        prev.map((i) => (i.id === cartItemId ? { ...i, quantity, max_stock: liveStock } : i))
      );
      return { success: true };
    },
    [cart, products, removeFromCart, showToast]
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Coupon handling
  const applyCouponCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim().toUpperCase();
      const found = coupons.find((c) => c.code.toUpperCase() === code);
      if (!found) {
        return { success: false, message: 'Invalid coupon code. Please check and try again.' };
      }

      const subtotal = cart.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
      const result = validateCoupon(found, subtotal);
      if (!result.isValid) {
        return { success: false, message: result.errorMessage || 'Coupon cannot be applied' };
      }

      setAppliedCoupon(found);
      showToast(`Coupon "${found.code}" applied! You saved Rs. ${result.discountAmount}`, 'success');
      return { success: true, message: `Coupon applied: Rs. ${result.discountAmount} off` };
    },
    [coupons, cart, showToast]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    showToast('Coupon removed', 'info');
  }, [showToast]);

  // Wishlist handling
  const toggleWishlist = useCallback(
    (productId: string) => {
      if (!currentUser) {
        openWishlistLoginModal();
        return { added: false, requiresAuth: true };
      }

      const exists = wishlist.includes(productId);
      if (exists) {
        setWishlist((prev) => prev.filter((id) => id !== productId));
        showToast('Removed from wishlist', 'info');
        return { added: false };
      } else {
        setWishlist((prev) => [...prev, productId]);
        showToast('Saved to your wishlist', 'success');
        return { added: true };
      }
    },
    [currentUser, wishlist, showToast, openWishlistLoginModal]
  );

  const isInWishlist = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist]
  );

  // Order Placement - STRICT SERVER-LIKE VALIDATION
  const placeOrder = useCallback(
    async (formData: CheckoutFormData) => {
      if (cart.length === 0) {
        return { success: false, error: 'Your cart is empty' };
      }

      // Verify stock & re-calculate verified unit prices from current product database
      const orderItems: Order['items'] = [];
      let verifiedSubtotal = 0;

      for (const cartItem of cart) {
        const product = products.find((p) => p.id === cartItem.product_id);
        if (!product || !product.is_active) {
          return { success: false, error: `Product "${cartItem.product_name}" is no longer available.` };
        }

        const variant = product.variants.find((v) => v.id === cartItem.variant_id);
        if (!variant || !variant.is_active) {
          return { success: false, error: `Selected variant for "${cartItem.product_name}" is no longer active.` };
        }

        if (cartItem.quantity > variant.stock_quantity) {
          return {
            success: false,
            error: `Insufficient stock for "${cartItem.product_name}". Only ${variant.stock_quantity} left in stock.`,
          };
        }

        const verifiedUnitPrice = getVariantPrice(product.base_price, variant.price);
        const lineTotal = verifiedUnitPrice * cartItem.quantity;
        verifiedSubtotal += lineTotal;

        orderItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          order_id: '',
          product_id: product.id,
          variant_id: variant.id,
          product_name: product.name,
          variant_label: cartItem.variant_label,
          unit_price: verifiedUnitPrice,
          quantity: cartItem.quantity,
          line_total: lineTotal,
          image_url: cartItem.image_url,
        });
      }

      // Validate & calculate coupon discount
      let discountAmount = 0;
      let couponCode: string | null = null;
      if (appliedCoupon) {
        const couponValidation = validateCoupon(appliedCoupon, verifiedSubtotal);
        if (couponValidation.isValid) {
          discountAmount = couponValidation.discountAmount;
          couponCode = appliedCoupon.code;
        }
      }

      const deliveryFee = 0; // Always Free Delivery for BARVAKA in Pakistan
      const finalTotal = Math.max(0, verifiedSubtotal - discountAmount + deliveryFee);
      const orderNumber = generateOrderNumber();
      const orderId = `ord-${Date.now()}`;
      const populatedItems = orderItems.map((item) => ({ ...item, order_id: orderId }));

      const newOrder: Order = {
        id: orderId,
        order_number: orderNumber,
        user_id: currentUser ? currentUser.id : null,
        customer_name: formData.fullName.trim(),
        customer_phone: formData.phone.trim(),
        customer_email: formData.email ? formData.email.trim() : (currentUser ? currentUser.email : null),
        shipping_address: formData.address.trim(),
        city: formData.city.trim(),
        province: formData.province || 'Pakistan',
        postal_code: formData.postalCode || null,
        order_notes: formData.orderNotes ? formData.orderNotes.trim() : null,
        payment_method: 'cod',
        payment_status: 'unpaid',
        status: 'pending',
        subtotal: verifiedSubtotal,
        discount_amount: discountAmount,
        coupon_code: couponCode,
        delivery_fee: deliveryFee,
        total: finalTotal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: populatedItems,
      };

      // Real Supabase Mode: Execute atomic place_order RPC
      if (!isDemoMode && supabase) {
        try {
          const rpcRes = await orderService.placeOrder({
            customer_name: formData.fullName.trim(),
            customer_phone: formData.phone.trim(),
            customer_email: formData.email ? formData.email.trim() : (currentUser ? currentUser.email : null),
            shipping_address: formData.address.trim(),
            city: formData.city.trim(),
            province: formData.province || 'Pakistan',
            postal_code: formData.postalCode || null,
            notes: formData.orderNotes ? formData.orderNotes.trim() : null,
            coupon_code: appliedCoupon ? appliedCoupon.code : null,
            items: cart.map((c) => ({
              variant_id: c.variant_id,
              product_id: c.product_id,
              quantity: c.quantity,
            })),
            user_id: currentUser ? currentUser.id : null,
          });

          // Fetch full created order with generated items
          const fullOrder = await orderService.getOrderByNumber(rpcRes.order_number);
          const finalOrder: Order = fullOrder || {
            ...newOrder,
            id: rpcRes.order_id,
            order_number: rpcRes.order_number,
            total: rpcRes.total,
          };

          setOrders((prev) => [finalOrder, ...prev]);
          setCart([]);
          setAppliedCoupon(null);

          // Refresh live products from server to reflect new stock levels
          productService.getAllProductsAdmin().then((fresh) => {
            if (fresh) setProducts(fresh);
          }).catch(() => {});

          showToast(`Order placed successfully! Order ID: ${finalOrder.order_number}`, 'success');
          return { success: true, order: finalOrder };
        } catch (err: any) {
          showToast(err?.message || 'Failed to place order in database', 'error');
          return { success: false, error: err?.message || 'Failed to place order' };
        }
      }

      // Demo Mode: Local simulation
      // 1. Deduct variant stock
      setProducts((prev) =>
        prev.map((product) => {
          const itemsForProduct = cart.filter((item) => item.product_id === product.id);
          if (itemsForProduct.length === 0) return product;

          const updatedVariants = product.variants.map((v) => {
            const matchedCartItem = itemsForProduct.find((item) => item.variant_id === v.id);
            if (matchedCartItem) {
              const newStock = Math.max(0, v.stock_quantity - matchedCartItem.quantity);
              return { ...v, stock_quantity: newStock };
            }
            return v;
          });

          return { ...product, variants: updatedVariants };
        })
      );

      // 2. Increment coupon used count if used
      if (couponCode) {
        setCoupons((prev) =>
          prev.map((c) => (c.code === couponCode ? { ...c, used_count: c.used_count + 1 } : c))
        );
      }

      // 3. Save order to list
      setOrders((prev) => [newOrder, ...prev]);

      // 4. Clear cart and applied coupon
      setCart([]);
      setAppliedCoupon(null);

      showToast(`Order placed successfully! Order ID: ${newOrder.order_number}`, 'success');
      return { success: true, order: newOrder };
    },
    [cart, products, appliedCoupon, currentUser, showToast]
  );

  // Update order status with stock rollback if cancelled (server-first in Real Mode)
  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus): Promise<{ success: boolean; error?: string }> => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        showToast('Order not found', 'error');
        return { success: false, error: 'Order not found' };
      }

      const role: UserRole = isAdmin ? 'admin' : effectiveRole;
      const check = canTransitionOrderStatus(order.status, newStatus, role);
      if (!check.allowed) {
        const errorMsg = check.reason || 'Status transition not allowed';
        showToast(errorMsg, 'error');
        return { success: false, error: errorMsg };
      }

      // Real Supabase Mode: Execute RPC update_order_status FIRST
      if (!isDemoMode && supabase) {
        try {
          await adminService.updateOrderStatus(orderId, newStatus);
          // Refetch fresh order
          const fresh = await adminService.getOrderById(orderId);
          if (fresh) {
            setOrders((prev) => prev.map((o) => (o.id === orderId ? fresh : o)));
          } else {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === orderId
                  ? {
                      ...o,
                      status: newStatus,
                      payment_status: newStatus === 'delivered' ? 'paid' : o.payment_status,
                      updated_at: new Date().toISOString(),
                    }
                  : o
              )
            );
          }

          // In case status is cancelled, refresh product stock levels from server
          if (newStatus === 'cancelled') {
            productService.getAllProductsAdmin().then((prods) => {
              if (prods) setProducts(prods);
            }).catch(() => {});
          }

          showToast(`Order ${order.order_number} status updated to ${newStatus.toUpperCase()}`, 'success');
          return { success: true };
        } catch (err: any) {
          console.error('Failed to update order status in Supabase:', err);
          const errorMsg = err?.message || 'Failed to update order status in database';
          showToast(errorMsg, 'error');
          return { success: false, error: errorMsg };
        }
      }

      // Demo Mode: Local state update
      if (newStatus === 'cancelled' && order.status !== 'cancelled') {
        setProducts((prevProducts) =>
          prevProducts.map((product) => {
            const itemsForProduct = order.items.filter((item) => item.product_id === product.id);
            if (itemsForProduct.length === 0) return product;

            const updatedVariants = product.variants.map((v) => {
              const matchedOrderItem = itemsForProduct.find((item) => item.variant_id === v.id);
              if (matchedOrderItem) {
                return { ...v, stock_quantity: v.stock_quantity + matchedOrderItem.quantity };
              }
              return v;
            });

            return { ...product, variants: updatedVariants };
          })
        );

        if (order.coupon_code) {
          setCoupons((prev) =>
            prev.map((c) =>
              c.code === order.coupon_code ? { ...c, used_count: Math.max(0, c.used_count - 1) } : c
            )
          );
        }
      }

      const newPaymentStatus = newStatus === 'delivered' ? 'paid' : order.payment_status;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, payment_status: newPaymentStatus, updated_at: new Date().toISOString() }
            : o
        )
      );

      showToast(`Order ${order.order_number} status updated to ${newStatus.toUpperCase()}`, 'success');
      return { success: true };
    },
    [orders, isAdmin, effectiveRole, showToast]
  );

  // Track order by Order Number + Phone (in-memory lookup)
  const findOrderByTracking = useCallback(
    (orderNumber: string, phone: string): Order | null => {
      const cleanNum = orderNumber.trim().toUpperCase();
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

      return (
        orders.find((o) => {
          const matchNum = o.order_number.toUpperCase() === cleanNum;
          const orderCleanPhone = o.customer_phone.replace(/[\s\-\(\)]/g, '');
          const matchPhone =
            orderCleanPhone === cleanPhone ||
            orderCleanPhone.endsWith(cleanPhone) ||
            cleanPhone.endsWith(orderCleanPhone);
          return matchNum && matchPhone;
        }) || null
      );
    },
    [orders]
  );

  // Async track order by Order Number + Phone (queries Supabase RPC get_guest_order if not found locally)
  const fetchOrderByTracking = useCallback(
    async (orderNumber: string, phone: string): Promise<Order | null> => {
      const local = findOrderByTracking(orderNumber, phone);
      if (local) return local;

      if (!isDemoMode && supabase) {
        try {
          const remote = await orderService.getGuestOrder(orderNumber, phone);
          if (remote) {
            setOrders((prev) => {
              if (prev.some((o) => o.id === remote.id)) return prev;
              return [remote, ...prev];
            });
            return remote;
          }
        } catch (err) {
          console.warn('Error fetching guest order from Supabase RPC:', err);
        }
      }

      return null;
    },
    [findOrderByTracking]
  );

  // Admin Catalog actions
  const addProduct = useCallback(
    async (newProdData: Omit<Product, 'id' | 'created_at'>) => {
      try {
        const created = await productService.createProduct(newProdData);
        setProducts((prev) => [created, ...prev]);
        showToast(`Product "${created.name}" created`, 'success');
        return created;
      } catch (err: any) {
        const duplicateMsg = getDuplicateSkuErrorMessage(err);
        const finalMsg = duplicateMsg || err?.message || 'Failed to create product in database';
        showToast(finalMsg, 'error');
        throw new Error(finalMsg);
      }
    },
    [showToast]
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>) => {
      try {
        const updated = await productService.updateProduct(id, updates);
        setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
        showToast('Product updated successfully', 'success');
        return updated;
      } catch (err: any) {
        const duplicateMsg = getDuplicateSkuErrorMessage(err);
        const finalMsg = duplicateMsg || err?.message || 'Failed to update product';
        showToast(finalMsg, 'error');
        throw new Error(finalMsg);
      }
    },
    [showToast]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      if (!isDemoMode && supabase) {
        try {
          await productService.deleteProduct(id);
          setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: false } : p)));
          showToast('Product deleted/deactivated', 'success');
          return { success: true, message: 'Product deleted' };
        } catch (err: any) {
          showToast(err?.message || 'Failed to delete product', 'error');
          return { success: false, message: err?.message || 'Failed to delete' };
        }
      }

      const hasOrders = orders.some((o) => o.items.some((i) => i.product_id === id));
      if (hasOrders) {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: false } : p)));
        showToast('Product has orders and was deactivated instead', 'info');
        return { success: true, message: 'Product has orders and was deactivated instead' };
      } else {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showToast('Product permanently deleted', 'success');
        return { success: true, message: 'Product deleted' };
      }
    },
    [orders, showToast]
  );

  const addCategory = useCallback(
    async (catData: Omit<Category, 'id' | 'created_at'>) => {
      if (!isDemoMode && supabase) {
        try {
          const created = await categoryService.createCategory(catData);
          setCategories((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
          showToast(`Category "${created.name}" added`, 'success');
          return created;
        } catch (err: any) {
          showToast(err?.message || 'Failed to create category', 'error');
          throw err;
        }
      }
      const newCat: Category = {
        ...catData,
        id: `cat-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      setCategories((prev) => [...prev, newCat]);
      showToast(`Category "${newCat.name}" added`, 'success');
    },
    [showToast]
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Category>) => {
      if (!isDemoMode && supabase) {
        try {
          const updated = await categoryService.updateCategory(id, updates);
          setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.sort_order - b.sort_order));
          showToast('Category updated', 'success');
          return updated;
        } catch (err: any) {
          showToast(err?.message || 'Failed to update category', 'error');
          throw err;
        }
      }
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      showToast('Category updated', 'success');
    },
    [showToast]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const hasProducts = products.some((p) => p.category_id === id);
      if (hasProducts) {
        showToast('Cannot delete category: Category has products. Please reassign or delete them first.', 'error');
        return;
      }
      if (!isDemoMode && supabase) {
        try {
          await categoryService.deleteCategory(id);
          setCategories((prev) => prev.filter((c) => c.id !== id));
          showToast('Category deleted', 'info');
          return;
        } catch (err: any) {
          showToast(err?.message || 'Failed to delete category', 'error');
          return;
        }
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast('Category deleted', 'info');
    },
    [products, showToast]
  );

  // Admin Coupon actions
  const addCoupon = useCallback(
    async (couponData: Omit<Coupon, 'id' | 'used_count'>) => {
      const cleanCode = couponData.code.trim().toUpperCase();
      const duplicate = coupons.some((c) => c.code.toUpperCase() === cleanCode);
      if (duplicate) {
        showToast(`Coupon code "${cleanCode}" already exists. Please choose a unique code.`, 'error');
        return;
      }

      if (!isDemoMode && supabase) {
        try {
          const created = await couponService.createCoupon({ ...couponData, code: cleanCode });
          setCoupons((prev) => [created, ...prev]);
          showToast(`Coupon "${created.code}" created`, 'success');
          return created;
        } catch (err: any) {
          showToast(err?.message || 'Failed to create coupon', 'error');
          throw err;
        }
      }

      const newCoupon: Coupon = {
        ...couponData,
        id: `cpn-${Date.now()}`,
        code: cleanCode,
        used_count: 0,
      };
      setCoupons((prev) => [...prev, newCoupon]);
      showToast(`Coupon "${newCoupon.code}" created`, 'success');
    },
    [coupons, showToast]
  );

  const updateCoupon = useCallback(
    async (id: string, updates: Partial<Coupon>) => {
      if (updates.code) {
        const cleanCode = updates.code.trim().toUpperCase();
        const duplicate = coupons.some((c) => c.id !== id && c.code.toUpperCase() === cleanCode);
        if (duplicate) {
          showToast(`Coupon code "${cleanCode}" already exists. Please choose a unique code.`, 'error');
          return;
        }
      }

      if (!isDemoMode && supabase) {
        try {
          const updated = await couponService.updateCoupon(id, updates);
          setCoupons((prev) => prev.map((c) => (c.id === id ? updated : c)));
          showToast('Coupon updated', 'success');
          return updated;
        } catch (err: any) {
          showToast(err?.message || 'Failed to update coupon', 'error');
          throw err;
        }
      }

      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates, code: updates.code ? updates.code.toUpperCase() : c.code } : c))
      );
      showToast('Coupon updated', 'success');
    },
    [coupons, showToast]
  );

  const deleteCoupon = useCallback(
    async (id: string) => {
      if (!isDemoMode && supabase) {
        try {
          await couponService.deleteCoupon(id);
          setCoupons((prev) => prev.filter((c) => c.id !== id));
          showToast('Coupon deleted', 'info');
          return;
        } catch (err: any) {
          showToast(err?.message || 'Failed to delete coupon', 'error');
          return;
        }
      }
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      showToast('Coupon deleted', 'info');
    },
    [showToast]
  );

  // Authentication & Role Switcher
  const loginAs = useCallback(
    (role: 'guest' | 'customer') => {
      const isDev = typeof (globalThis as any).__BARVAKA_DEV__ !== 'undefined'
        ? Boolean((globalThis as any).__BARVAKA_DEV__)
        : Boolean((import.meta as any).env?.DEV);
      if (!isDev) {
        showToast('Store is not connected to its database yet.', 'error');
        return;
      }
      if (role === 'guest') {
        setDemoUser(null);
        showToast('Browsing as Guest', 'info');
        return;
      }
      if (role === 'customer') {
        const custUser = allUsers.find((u) => u.role === 'customer') || SEED_PROFILES[1];
        setDemoUser(custUser);
        showToast(`Logged in as Customer (${custUser.full_name})`, 'success');
      }
    },
    [allUsers, showToast]
  );

  const loginWithEmail = useCallback(
    (email: string, password?: string) => {
      const isDev = typeof (globalThis as any).__BARVAKA_DEV__ !== 'undefined'
        ? Boolean((globalThis as any).__BARVAKA_DEV__)
        : Boolean((import.meta as any).env?.DEV);
      if (!isDev) {
        showToast('Store is not connected to its database yet.', 'error');
        return false;
      }
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
        showToast('Admin must sign in via Admin Portal', 'error');
        return false;
      }
      const found = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
      if (found) {
        if (found.role === 'admin') {
          showToast('Admin must sign in via Admin Portal', 'error');
          return false;
        }
        setDemoUser(found);
        showToast(`Welcome back, ${found.full_name}!`, 'success');
        return true;
      }
      showToast('Account not found with this email', 'error');
      return false;
    },
    [allUsers, showToast]
  );

  const registerCustomer = useCallback(
    (data: { email: string; fullName: string; phone: string }) => {
      const exists = allUsers.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());
      if (exists) {
        showToast('An account with this email already exists', 'error');
        return false;
      }

      const newProfile: Profile = {
        id: `user-${Date.now()}`,
        email: data.email.trim(),
        full_name: data.fullName.trim(),
        phone: data.phone.trim(),
        role: 'customer',
        created_at: new Date().toISOString(),
      };

      setAllUsers((prev) => [...prev, newProfile]);
      setDemoUser(newProfile);
      showToast(`Account created! Welcome to BARVAKA, ${newProfile.full_name}`, 'success');
      return true;
    },
    [allUsers, showToast]
  );

  const logout = useCallback(() => {
    setDemoUser(null);
    showToast('You have been logged out', 'info');
  }, [showToast]);

  const updateCurrentUserProfile = useCallback(
    (updates: Partial<Profile>) => {
      if (!currentUser) return;
      const updated = { ...currentUser, ...updates };
      setDemoUser(updated);
      setAllUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
      showToast('Profile updated', 'success');
    },
    [currentUser, showToast]
  );

  // Review actions
  const hasOrderedProduct = useCallback(
    (productId: string) => {
      return hasUserOrderedProduct(orders, currentUser, productId);
    },
    [orders, currentUser]
  );

  const getUserReviewForProduct = useCallback(
    (productId: string) => {
      if (!currentUser) return undefined;
      const userEmail = currentUser.email?.toLowerCase();
      return reviews.find(
        (r) =>
          r.product_id === productId &&
          (r.user_id === currentUser.id || (userEmail && r.user_email?.toLowerCase() === userEmail))
      );
    },
    [reviews, currentUser]
  );

  const addReview = useCallback(
    (data: { productId: string; rating: number; comment: string }) => {
      if (!currentUser) {
        showToast('Please sign in to submit a review', 'error');
        return { success: false, message: 'Please sign in to submit a review' };
      }

      const ordered = hasUserOrderedProduct(orders, currentUser, data.productId);
      if (!ordered) {
        showToast('Only customers who have previously ordered this product can submit a verified review', 'error');
        return {
          success: false,
          message: 'Only customers who have previously ordered this product can submit a verified review',
        };
      }

      const validation = validateReviewInput(data.rating, data.comment);
      if (!validation.isValid) {
        const msg = validation.error || 'Invalid review input';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const userEmail = currentUser.email?.toLowerCase();
      const existingIndex = reviews.findIndex(
        (r) =>
          r.product_id === data.productId &&
          (r.user_id === currentUser.id || (userEmail && r.user_email?.toLowerCase() === userEmail))
      );

      let resultingReview: ProductReview;

      if (existingIndex >= 0) {
        // Update existing review
        resultingReview = {
          ...reviews[existingIndex],
          rating: data.rating,
          comment: data.comment.trim(),
          user_name: currentUser.full_name || reviews[existingIndex].user_name,
          verified_purchase: true,
          created_at: new Date().toISOString(),
        };
        setReviews((prev) => prev.map((r, i) => (i === existingIndex ? resultingReview : r)));
        showToast('Your review has been updated successfully!', 'success');
      } else {
        // Create new review
        resultingReview = {
          id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          product_id: data.productId,
          user_id: currentUser.id,
          user_name: currentUser.full_name || 'Verified Customer',
          user_email: currentUser.email,
          rating: data.rating,
          comment: data.comment.trim(),
          created_at: new Date().toISOString(),
          verified_purchase: true,
        };
        setReviews((prev) => [resultingReview, ...prev]);
        showToast('Thank you! Your verified review has been published.', 'success');
      }

      return { success: true, message: 'Review saved', review: resultingReview };
    },
    [currentUser, orders, reviews, showToast]
  );

  const deleteReview = useCallback(
    (reviewId: string) => {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast('Review removed', 'info');
    },
    [showToast]
  );

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        activeCategories,
        activeProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotals,
        coupons,
        appliedCoupon,
        applyCouponCode,
        removeCoupon,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        orders,
        placeOrder,
        updateOrderStatus,
        findOrderByTracking,
        fetchOrderByTracking,
        wishlist,
        toggleWishlist,
        isInWishlist,
        currentUser,
        allUsers,
        loginAs,
        loginWithEmail,
        registerCustomer,
        logout,
        updateCurrentUserProfile,
        reviews,
        addReview,
        deleteReview,
        hasOrderedProduct,
        getUserReviewForProduct,
        toasts,
        showToast,
        dismissToast,
        isAdvisorOpen,
        setIsAdvisorOpen,
        isWishlistLoginModalOpen,
        openWishlistLoginModal,
        closeWishlistLoginModal,
        refreshAdminData,
        isAdminDataLoading,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
