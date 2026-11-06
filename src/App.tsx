/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import { StoreLayout } from './components/layout/StoreLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute, AdminRoute } from './components/layout/RouteGuards';

import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { AccountPage } from './pages/AccountPage';
import { AuthPage } from './pages/AuthPage';
import { AboutPage, ContactPage, PrivacyPage, DeliveryAndPaymentPage } from './pages/StaticPages';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <StoreProvider>
            <BrowserRouter>
              <Routes>
                {/* Dedicated Secure Admin Login Gate */}
                <Route path="/admin/login" element={<AdminLoginPage />} />

                {/* Admin Management Routes wrapped in AdminLayout */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<AdminDashboard initialTab="dashboard" />} />
                  <Route path="products" element={<AdminDashboard initialTab="products" />} />
                  <Route path="products/new" element={<AdminDashboard initialTab="products" />} />
                  <Route path="products/:id/edit" element={<AdminDashboard initialTab="products" />} />
                  <Route path="categories" element={<AdminDashboard initialTab="categories" />} />
                  <Route path="orders" element={<AdminDashboard initialTab="orders" />} />
                  <Route path="orders/:id" element={<AdminDashboard initialTab="orders" />} />
                  <Route path="coupons" element={<AdminDashboard initialTab="coupons" />} />
                  <Route path="banner" element={<AdminDashboard initialTab="banner" />} />
                  <Route path="customers" element={<AdminDashboard initialTab="customers" />} />
                </Route>

                {/* Public & Customer Routes inside Storefront Layout */}
                <Route path="/" element={<StoreLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="shop" element={<ShopPage />} />
                  <Route path="category/:slug" element={<ShopPage />} />
                  <Route path="product/:slug" element={<ProductDetailPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="order-success/:orderNumber" element={<OrderSuccessPage />} />
                  <Route path="track-order" element={<TrackOrderPage />} />
                  <Route path="my-orders" element={<MyOrdersPage />} />

                  {/* Auth Routes */}
                  <Route path="login" element={<AuthPage initialMode="login" />} />
                  <Route path="register" element={<AuthPage initialMode="register" />} />
                  <Route path="forgot-password" element={<AuthPage initialMode="forgot" />} />

                  {/* Static Brand Pages */}
                  <Route path="about" element={<AboutPage />} />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="privacy" element={<PrivacyPage />} />
                  <Route path="delivery-and-payment" element={<DeliveryAndPaymentPage />} />

                  {/* Customer Protected Pages */}
                  <Route
                    path="account"
                    element={
                      <ProtectedRoute>
                        <AccountPage initialTab="profile" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="account/orders"
                    element={
                      <ProtectedRoute>
                        <AccountPage initialTab="orders" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="account/orders/:orderNumber"
                    element={
                      <ProtectedRoute>
                        <AccountPage initialTab="orders" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="wishlist"
                    element={
                      <ProtectedRoute>
                        <AccountPage initialTab="wishlist" />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 Catch-All */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </StoreProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
