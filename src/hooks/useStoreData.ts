/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, GetProductsParams } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { orderService, PlaceOrderInput } from '../services/orderService';
import { couponService } from '../services/couponService';
import { adminService } from '../services/adminService';
import { wishlistService } from '../services/wishlistService';
import { OrderStatus } from '../types';

export function useProducts(params: GetProductsParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productService.getProducts(params),
  });
}

export function useProduct(slug?: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => (slug ? productService.getProductBySlug(slug) : null),
    enabled: Boolean(slug),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });
}

export function useCategory(slug?: string) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => (slug ? categoryService.getCategoryBySlug(slug) : null),
    enabled: Boolean(slug),
  });
}

export function useDashboardStats(days: number = 7) {
  return useQuery({
    queryKey: ['admin-stats', days],
    queryFn: () => adminService.getDashboardStats(days),
  });
}

export function useAdminOrders(status?: string, search?: string) {
  return useQuery({
    queryKey: ['admin-orders', status, search],
    queryFn: () => adminService.getOrders(status, search),
  });
}

export function useUserOrders(userId?: string) {
  return useQuery({
    queryKey: ['user-orders', userId],
    queryFn: () => (userId ? orderService.getUserOrders(userId) : []),
    enabled: Boolean(userId),
  });
}

export function useOrderByNumber(orderNumber?: string) {
  return useQuery({
    queryKey: ['order-by-number', orderNumber],
    queryFn: () => (orderNumber ? orderService.getOrderByNumber(orderNumber) : null),
    enabled: Boolean(orderNumber),
  });
}

export function useAdminCustomers() {
  return useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => adminService.getCustomers(),
  });
}

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: () => couponService.getCoupons(),
  });
}

export function useWishlist(userId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wishlist', userId],
    queryFn: () => (userId ? wishlistService.getWishlist(userId) : []),
    enabled: Boolean(userId),
  });

  const addMutation = useMutation({
    mutationFn: (productId: string) => wishlistService.addToWishlist(userId!, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', userId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => wishlistService.removeFromWishlist(userId!, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', userId] });
    },
  });

  return {
    wishlist: query.data || [],
    isLoading: query.isLoading,
    addToWishlist: addMutation.mutateAsync,
    removeFromWishlist: removeMutation.mutateAsync,
  };
}
