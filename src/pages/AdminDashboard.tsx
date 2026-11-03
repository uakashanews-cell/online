/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Product, Category, Coupon, Order, ProductVariant, OrderStatus } from '../types';
import {
  formatPKR,
  generateVariantSku,
  normalizeVariantSku,
  validateVariantPriceOverride,
  getDuplicateSkuErrorMessage,
} from '../utils/ecommerce-logic';
import { WhatsAppIcon } from '../components/common/WhatsAppIcon';
import { normalizePkPhone, formatCustomerUpdateMessage } from '../lib/whatsapp';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Tag,
  Users,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Truck,
  Edit2,
  Trash2,
  Printer,
  Eye,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Star,
  Image as ImageIcon,
  ShieldAlert,
  ChevronDown,
  X,
  Database,
  HardDrive,
  RefreshCw,
  Upload,
  Download,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { isDemoMode, supabase } from '../lib/supabaseClient';
import { storageService, validateImageFile } from '../services/storageService';
import { AdminCharts } from '../components/admin/AdminCharts';
import { AdminBannerEditor } from '../components/admin/AdminBannerEditor';
import { getUnifiedCustomers, calculateAdminKpis } from '../utils/admin-analytics';
import { formatKarachiDateTime, isOrderRecent } from '../utils/date-utils';

export type AdminTab = 'dashboard' | 'products' | 'categories' | 'orders' | 'coupons' | 'customers' | 'banner';

interface AdminDashboardProps {
  onNavigateHome?: () => void;
  initialTab?: AdminTab;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateHome, initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams<{ id: string }>();

  const getTabFromPath = (): AdminTab => {
    if (initialTab) return initialTab;
    const p = location.pathname;
    if (p.includes('/admin/products')) return 'products';
    if (p.includes('/admin/categories')) return 'categories';
    if (p.includes('/admin/orders')) return 'orders';
    if (p.includes('/admin/coupons')) return 'coupons';
    if (p.includes('/admin/banner')) return 'banner';
    if (p.includes('/admin/customers')) return 'customers';
    return 'dashboard';
  };

  const {
    products,
    categories,
    orders,
    coupons,
    allUsers,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    updateOrderStatus,
    showToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>(getTabFromPath());

  // Deep linking and tab sync
  useEffect(() => {
    const tab = getTabFromPath();
    setActiveTab(tab);

    // Deep link: /admin/products/new
    if (location.pathname === '/admin/products/new') {
      setEditingProduct(null);
      setIsProductModalOpen(true);
    }
    // Deep link: /admin/products/:id/edit
    else if (location.pathname.startsWith('/admin/products/') && location.pathname.endsWith('/edit')) {
      const parts = location.pathname.split('/');
      const prodId = routeId || parts[3];
      if (prodId) {
        const prod = products.find((p) => p.id === prodId || p.slug === prodId);
        if (prod) {
          setEditingProduct(prod);
          setIsProductModalOpen(true);
        }
      }
    }
    // Deep link: /admin/orders/:id
    else if (location.pathname.startsWith('/admin/orders/') && routeId) {
      const ord = orders.find((o) => o.id === routeId || o.order_number === routeId);
      if (ord) {
        setSelectedOrderForDetail(ord);
      }
    }
  }, [location.pathname, initialTab, routeId, products, orders]);

  const handleTabChange = (newTab: AdminTab) => {
    setActiveTab(newTab);
    const targetRoute = newTab === 'dashboard' ? '/admin' : `/admin/${newTab}`;
    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    if (location.pathname !== '/admin/products') {
      navigate('/admin/products');
    }
  };

  const handleCloseOrderDetail = () => {
    setSelectedOrderForDetail(null);
    if (location.pathname !== '/admin/orders') {
      navigate('/admin/orders');
    }
  };

  const handleHome = () => {
    if (onNavigateHome) onNavigateHome();
    else navigate('/');
  };

  // Filters & searches
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [chartDays, setChartDays] = useState<7 | 30>(7);

  // Per-row / modal async action loaders
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isCancellingLoading, setIsCancellingLoading] = useState(false);
  const [isDetailUpdating, setIsDetailUpdating] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState<Order | null>(null);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus>('pending');

  // Supabase & Cloud Storage Connection State
  const [connectionStatus, setConnectionStatus] = useState<{
    mode: 'real' | 'demo';
    dbOk: boolean;
    storageOk: boolean;
    dbMessage: string;
    storageMessage: string;
  }>({
    mode: isDemoMode ? 'demo' : 'real',
    dbOk: !isDemoMode,
    storageOk: !isDemoMode,
    dbMessage: isDemoMode
      ? 'Demo mode active. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect real database.'
      : 'Checking database connection...',
    storageMessage: isDemoMode
      ? 'Demo mode active. Images are not persisted to cloud storage.'
      : 'Checking storage bucket...',
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const res = await storageService.testConnection();
      setConnectionStatus(res);
      if (res.mode === 'real') {
        if (res.dbOk && res.storageOk) {
          showToast('Supabase database and storage bucket are operational!', 'success');
        } else {
          showToast('Connection test completed with warnings.', 'warning');
        }
      } else {
        showToast('Demo mode active. Provide Supabase environment variables to connect.', 'info');
      }
    } catch (err: any) {
      showToast(err?.message || 'Connection test failed', 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    if (!isDemoMode && supabase) {
      handleTestConnection();
    }
  }, []);

  // 1. Dashboard Metrics Calculations
  const adminKpis = useMemo(() => calculateAdminKpis(orders, allUsers), [orders, allUsers]);
  const nonCancelledOrders = useMemo(() => orders.filter((o) => o.status !== 'cancelled'), [orders]);
  const totalSales = adminKpis.totalSales;
  const pendingOrdersCount = adminKpis.pendingOrders;
  const customersCount = adminKpis.totalCustomersCount;

  // Unified Customers List (Registered + Guest customers derived from orders)
  const unifiedCustomers = useMemo(() => getUnifiedCustomers(allUsers, orders), [allUsers, orders]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return unifiedCustomers;
    const q = customerSearch.toLowerCase().trim();
    return unifiedCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.phone.includes(q)
    );
  }, [unifiedCustomers, customerSearch]);

  // Low Stock Variants List (stock <= 5)
  const lowStockVariants = useMemo(() => {
    const list: { product: Product; variant: ProductVariant }[] = [];
    products.forEach((p) => {
      p.variants.forEach((v) => {
        if (v.is_active && v.stock_quantity <= 5) {
          list.push({ product: p, variant: v });
        }
      });
    });
    return list;
  }, [products]);

  // Order Status Counts for filter chips
  const orderStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status]++;
    });
    return counts;
  }, [orders]);

  // 2. Filtered Orders (Search, Status Filter, and Date Range Filter)
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase().trim();
        const matchNum = o.order_number.toLowerCase().includes(q);
        const matchName = o.customer_name.toLowerCase().includes(q);
        const matchPhone = o.customer_phone.includes(q);
        if (!matchNum && !matchName && !matchPhone) return false;
      }
      if (orderDateFrom) {
        const orderDate = o.created_at.split('T')[0];
        if (orderDate < orderDateFrom) return false;
      }
      if (orderDateTo) {
        const orderDate = o.created_at.split('T')[0];
        if (orderDate > orderDateTo) return false;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearch, orderDateFrom, orderDateTo]);

  // CSV Export for Orders
  const handleExportOrdersCSV = () => {
    if (filteredOrders.length === 0) {
      showToast('No orders to export for current filters', 'info');
      return;
    }
    const headers = [
      'Order Number',
      'Date & Time (PKT)',
      'Customer Name',
      'Phone',
      'Email',
      'City',
      'Address',
      'Items Count',
      'Subtotal (PKR)',
      'Discount (PKR)',
      'Total (PKR)',
      'Status',
      'Payment Status',
      'Notes',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.order_number}"`,
      `"${formatKarachiDateTime(o.created_at)}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${o.customer_phone}"`,
      `"${o.customer_email || ''}"`,
      `"${(o.city || '').replace(/"/g, '""')}"`,
      `"${(o.shipping_address || '').replace(/"/g, '""')}"`,
      o.items?.length || 0,
      o.subtotal,
      o.discount_amount,
      o.total,
      o.status,
      o.payment_status || (o.status === 'delivered' ? 'paid' : 'unpaid'),
      `"${(o.order_notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BARVAKA_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredOrders.length} orders to CSV`, 'success');
  };

  // 3. Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, productSearch]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FBF5EC] p-5 sm:p-6 rounded-[24px] border border-[#E3D5C4] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#6B5B50] uppercase font-bold tracking-wider mb-1">
            <span>Store Admin</span>
            <span>·</span>
            <span className="text-[#B4502F]">{activeTab}</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#3B2A20]">
            {activeTab === 'dashboard' && 'Dashboard & Performance Metrics'}
            {activeTab === 'orders' && 'Orders & Delivery Dispatch'}
            {activeTab === 'products' && 'Products & Inventory Management'}
            {activeTab === 'categories' && 'Store Catalog Categories'}
            {activeTab === 'coupons' && 'Discount Vouchers & Coupons'}
            {activeTab === 'customers' && 'Registered Customers Directory'}
          </h1>
          <p className="text-xs text-[#6B5B50] mt-0.5">
            {activeTab === 'dashboard' && 'Real-time revenue, COD order analytics, and low stock warnings.'}
            {activeTab === 'orders' && 'Track incoming COD orders, change dispatch statuses, and print packing slips.'}
            {activeTab === 'products' && 'Manage prices, inventory quantities, and size/color variants.'}
            {activeTab === 'categories' && 'Manage catalog display categories and visual banners.'}
            {activeTab === 'coupons' && 'Create and control percentage or fixed PKR discount vouchers.'}
            {activeTab === 'customers' && 'Review customer contact details and order histories.'}
          </p>
        </div>

        {/* Quick Action Button for current tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'products' && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
                navigate('/admin/products/new');
              }}
              className="px-4 py-2 bg-[#B4502F] hover:bg-[#964225] text-white font-bold text-xs rounded-full shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          )}
          {activeTab === 'categories' && (
            <button
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="px-4 py-2 bg-[#B4502F] hover:bg-[#964225] text-white font-bold text-xs rounded-full shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          )}
          {activeTab === 'coupons' && (
            <button
              onClick={() => {
                setEditingCoupon(null);
                setIsCouponModalOpen(true);
              }}
              className="px-4 py-2 bg-[#B4502F] hover:bg-[#964225] text-white font-bold text-xs rounded-full shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Create Coupon
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E3D5C4]">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer min-h-[44px] ${
              activeTab === 'dashboard'
                ? 'bg-[#B4502F] text-white shadow-xs'
                : 'bg-[#FBF5EC] text-[#3B2A20] hover:bg-white border border-[#E3D5C4]'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Dashboard & Sales
          </button>

          <button
            onClick={() => handleTabChange('orders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer min-h-[44px] ${
              activeTab === 'orders'
                ? 'bg-[#B4502F] text-white shadow-xs'
                : 'bg-[#FBF5EC] text-[#3B2A20] hover:bg-white border border-[#E3D5C4]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Orders ({orders.length})
            {pendingOrdersCount > 0 && (
              <span className="bg-[#B4502F] text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold ml-1">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer min-h-[44px] ${
              activeTab === 'products'
                ? 'bg-[#B4502F] text-white shadow-xs'
                : 'bg-[#FBF5EC] text-[#3B2A20] hover:bg-white border border-[#E3D5C4]'
            }`}
          >
            <Package className="w-4 h-4" /> Products & Variants ({products.length})
          </button>

          <button
            onClick={() => handleTabChange('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer min-h-[44px] ${
              activeTab === 'categories'
                ? 'bg-[#B4502F] text-white shadow-xs'
                : 'bg-[#FBF5EC] text-[#3B2A20] hover:bg-white border border-[#E3D5C4]'
            }`}
          >
            <Layers className="w-4 h-4" /> Categories ({categories.length})
          </button>

          <button
            onClick={() => handleTabChange('coupons')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer min-h-[44px] ${
              activeTab === 'coupons'
                ? 'bg-[#B4502F] text-white shadow-xs'
                : 'bg-[#FBF5EC] text-[#3B2A20] hover:bg-white border border-[#E3D5C4]'
            }`}
          >
            <Tag className="w-4 h-4" /> Coupons ({coupons.length})
          </button>

          <button
            onClick={() => handleTabChange('banner')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer min-h-[44px] ${
              activeTab === 'banner'
                ? 'bg-[#B4502F] text-white shadow-xs'
                : 'bg-[#FBF5EC] text-[#3B2A20] hover:bg-white border border-[#E3D5C4]'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Home banner
          </button>

          <button
            onClick={() => handleTabChange('customers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer min-h-[44px] ${
              activeTab === 'customers'
                ? 'bg-[#B4502F] text-white shadow-xs'
                : 'bg-[#FBF5EC] text-[#3B2A20] hover:bg-white border border-[#E3D5C4]'
            }`}
          >
            <Users className="w-4 h-4" /> Customers ({customersCount})
          </button>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* CONNECTION STATUS CARD */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      connectionStatus.mode === 'real'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-base font-bold text-zinc-950">
                        Supabase Connection &amp; Cloud Storage
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          connectionStatus.mode === 'real'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {connectionStatus.mode === 'real' ? 'REAL MODE' : 'DEMO MODE'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Live PostgreSQL database and Supabase Storage bucket connectivity status
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                  {isTestingConnection ? 'Testing...' : 'Run Test'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Database Reachability */}
                <div
                  className={`p-4 rounded-2xl border ${
                    connectionStatus.dbOk
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : connectionStatus.mode === 'real'
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-zinc-600" /> PostgreSQL Database
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        connectionStatus.dbOk
                          ? 'text-emerald-800'
                          : connectionStatus.mode === 'real'
                          ? 'text-rose-700'
                          : 'text-zinc-500'
                      }`}
                    >
                      {connectionStatus.dbOk ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {connectionStatus.dbOk
                        ? 'Reachable'
                        : connectionStatus.mode === 'real'
                        ? 'Unreachable'
                        : 'Demo Mode (Offline)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    {connectionStatus.dbMessage}
                  </p>
                </div>

                {/* Storage Bucket Reachability */}
                <div
                  className={`p-4 rounded-2xl border ${
                    connectionStatus.storageOk
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : connectionStatus.mode === 'real'
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-zinc-600" /> Storage Bucket ('product-images')
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        connectionStatus.storageOk
                          ? 'text-emerald-800'
                          : connectionStatus.mode === 'real'
                          ? 'text-rose-700'
                          : 'text-zinc-500'
                      }`}
                    >
                      {connectionStatus.storageOk ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {connectionStatus.storageOk
                        ? 'Reachable'
                        : connectionStatus.mode === 'real'
                        ? 'Unreachable'
                        : 'Demo Mode (Local)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    {connectionStatus.storageMessage}
                  </p>
                </div>
              </div>

              {/* Troubleshooting Hints */}
              {(!connectionStatus.dbOk || !connectionStatus.storageOk) && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block">Setup &amp; Troubleshooting Guide</span>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {connectionStatus.mode === 'demo'
                        ? 'To connect your live database and cloud image storage: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables and execute supabase/schema.sql in the Supabase SQL Editor.'
                        : !connectionStatus.storageOk
                        ? 'Bucket product-images missing — run supabase/schema.sql in the Supabase SQL Editor to provision the public bucket and admin policies.'
                        : 'Database table access issue — verify your anon key permissions and ensure supabase/schema.sql was run in the Supabase SQL Editor.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* EMPTY CATALOG ONBOARDING BANNER */}
            {products.length === 0 && categories.length === 0 && (
              <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-[#0A2A21] text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-emerald-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                      Fresh Database Connected
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-white">
                      Add your first category, then your first product.
                    </h3>
                    <p className="text-xs text-emerald-100/80 leading-relaxed">
                      Your Supabase database is connected and ready. Build your catalog now by creating your first department (e.g. Stitched Apparel or Artisanal Attars), then uploading your first product with images.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setIsCategoryModalOpen(true);
                      }}
                      className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add First Category
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setIsProductModalOpen(true);
                        navigate('/admin/products/new');
                      }}
                      className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl border border-emerald-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add First Product
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Total Sales (Excl. Cancelled)
                </span>
                <p className="font-serif text-2xl font-extrabold text-zinc-950">
                  {formatPKR(totalSales)}
                </p>
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> 100% Cash on Delivery
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Total Orders
                </span>
                <p className="font-serif text-2xl font-extrabold text-zinc-950">
                  {orders.length}
                </p>
                <span className="text-[11px] text-zinc-400">
                  {nonCancelledOrders.length} active · {orders.length - nonCancelledOrders.length} cancelled
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOrderStatusFilter('pending');
                  handleTabChange('orders');
                }}
                className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2 text-left hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Pending Orders
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-amber-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="font-serif text-2xl font-extrabold text-amber-700">
                  {pendingOrdersCount}
                </p>
                <span className="text-[11px] text-amber-700 font-medium">
                  Click to review &amp; dispatch
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('customers')}
                className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2 text-left hover:border-emerald-700/40 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Total Customers
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-700 transition-colors" />
                </div>
                <p className="font-serif text-2xl font-extrabold text-zinc-950">
                  {customersCount}
                </p>
                <span className="text-[11px] text-zinc-400">
                  {adminKpis.registeredCustomersCount} registered · {Math.max(0, customersCount - adminKpis.registeredCustomersCount)} guests
                </span>
              </button>
            </div>

            {/* High-Fidelity Recharts Analytics Section */}
            <AdminCharts orders={orders} />

            {/* Low Stock Alerts */}
            {lowStockVariants.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-700">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                      <h3 className="font-serif text-base font-bold text-zinc-950">
                        Low-Stock Variant Alerts ({lowStockVariants.length})
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Items with 5 or fewer units remaining in warehouse
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTabChange('products')}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                  >
                    View All Products <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lowStockVariants.map(({ product, variant }) => (
                    <div
                      key={variant.id}
                      onClick={() => {
                        setEditingProduct(product);
                        setIsProductModalOpen(true);
                      }}
                      className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between text-xs hover:border-rose-400 cursor-pointer transition-colors"
                    >
                      <div className="pr-2">
                        <p className="font-bold text-zinc-900 truncate max-w-[180px]">
                          {product.name}
                        </p>
                        <p className="text-zinc-500 text-[11px]">
                          {variant.size ? `Size: ${variant.size} · ` : ''}
                          {variant.color ? `Color: ${variant.color}` : 'Standard'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-extrabold text-xs shrink-0">
                        {variant.stock_quantity} Left
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders Overview */}
            <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-serif text-base font-bold text-zinc-950">
                  Recent Orders
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
                >
                  View All Orders →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 rounded-l-xl">Order #</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">City</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="hover:bg-zinc-50/70">
                        <td className="p-3 font-mono font-bold text-zinc-900">
                          {order.order_number}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-zinc-900">{order.customer_name}</p>
                          <p className="text-zinc-400 text-[11px]">{order.customer_phone}</p>
                        </td>
                        <td className="p-3 text-zinc-600">{order.city}</td>
                        <td className="p-3 font-bold text-zinc-950">{formatPKR(order.total)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              order.status === 'delivered'
                                ? 'bg-[#2E7D4F]/15 text-[#2E7D4F] border border-[#2E7D4F]/30'
                                : order.status === 'shipped'
                                ? 'bg-[#0F3B2E]/15 text-[#0F3B2E] border border-[#0F3B2E]/30'
                                : order.status === 'confirmed'
                                ? 'bg-[#2F6F8F]/15 text-[#2F6F8F] border border-[#2F6F8F]/30'
                                : order.status === 'cancelled'
                                ? 'bg-[#B3372F]/15 text-[#B3372F] border border-[#B3372F]/30'
                                : 'bg-[#C98A12]/15 text-[#C98A12] border border-[#C98A12]/30'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => setSelectedOrderForDetail(order)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-zinc-950">
                  Manage Customer Orders
                </h2>
                <p className="text-xs text-zinc-500">
                  Update order statuses, restore stock on cancellation, and print delivery slips.
                </p>
              </div>

              {/* Status Filter Buttons with live counts */}
              <div className="flex flex-wrap gap-1.5 bg-zinc-100 p-1.5 rounded-xl text-xs font-semibold">
                {[
                  { key: 'all', label: 'All', count: orderStatusCounts.all },
                  { key: 'pending', label: 'Pending', count: orderStatusCounts.pending },
                  { key: 'confirmed', label: 'Confirmed', count: orderStatusCounts.confirmed },
                  { key: 'shipped', label: 'Shipped', count: orderStatusCounts.shipped },
                  { key: 'delivered', label: 'Delivered', count: orderStatusCounts.delivered },
                  { key: 'cancelled', label: 'Cancelled', count: orderStatusCounts.cancelled },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setOrderStatusFilter(key)}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                      orderStatusFilter === key
                        ? 'bg-white text-zinc-900 shadow-xs font-bold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        orderStatusFilter === key
                          ? 'bg-[#0F3B2E] text-white'
                          : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Controls Bar: Search, Date Range Filter, and CSV Export */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Text Search */}
                <div className="relative min-w-[240px] flex-1 max-w-sm">
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search order #, customer or phone..."
                    className="w-full text-xs pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3B2E]"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  {orderSearch && (
                    <button
                      onClick={() => setOrderSearch('')}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Date Range: From / To */}
                <div className="flex items-center gap-2 text-xs text-zinc-600 bg-zinc-50 p-1.5 rounded-xl border border-zinc-200">
                  <Calendar className="w-4 h-4 text-zinc-500 ml-1 shrink-0" />
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-zinc-400">From:</span>
                    <input
                      type="date"
                      value={orderDateFrom}
                      onChange={(e) => setOrderDateFrom(e.target.value)}
                      className="text-xs bg-white border border-zinc-200 rounded px-1.5 py-1 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-zinc-400">To:</span>
                    <input
                      type="date"
                      value={orderDateTo}
                      onChange={(e) => setOrderDateTo(e.target.value)}
                      className="text-xs bg-white border border-zinc-200 rounded px-1.5 py-1 focus:outline-none"
                    />
                  </div>
                  {(orderDateFrom || orderDateTo) && (
                    <button
                      onClick={() => {
                        setOrderDateFrom('');
                        setOrderDateTo('');
                      }}
                      className="text-[11px] text-rose-600 hover:underline px-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* CSV Export Button */}
              <button
                type="button"
                onClick={handleExportOrdersCSV}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#F8F4EA] border border-[#0F3B2E]/25 text-[#0F3B2E] text-xs font-semibold rounded-xl hover:bg-[#efe8d8] transition-colors cursor-pointer shadow-2xs self-start lg:self-auto"
              >
                <Download className="w-3.5 h-3.5 text-[#B8963E]" />
                <span>Export CSV ({filteredOrders.length})</span>
              </button>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Order # &amp; Date</th>
                    <th className="p-3">Customer Details</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Total (COD)</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3">Change Status</th>
                    <th className="p-3 rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-500">
                        No customer orders match your active search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const isRecent = isOrderRecent(order.created_at);
                      const isRowUpdating = updatingOrderId === order.id;

                      return (
                        <tr key={order.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-zinc-900">{order.order_number}</span>
                              {isRecent && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-[#0F3B2E] border border-emerald-300 animate-pulse">
                                  NEW
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              {formatKarachiDateTime(order.created_at)}
                            </p>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-zinc-900">{order.customer_name}</p>
                            <p className="text-zinc-500">{order.customer_phone}</p>
                            <p className="text-zinc-400 text-[11px] truncate max-w-[200px]">
                              {order.city}, {order.shipping_address}
                            </p>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-zinc-800">
                              {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-serif font-bold text-zinc-950 text-sm">
                              {formatPKR(order.total)}
                            </div>
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                                order.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-zinc-100 text-zinc-600'
                              }`}
                            >
                              {order.status === 'delivered' ? 'Paid' : 'COD Unpaid'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                order.status === 'delivered'
                                  ? 'bg-[#2E7D4F]/15 text-[#2E7D4F] border border-[#2E7D4F]/30'
                                  : order.status === 'shipped'
                                  ? 'bg-[#0F3B2E]/15 text-[#0F3B2E] border border-[#0F3B2E]/30'
                                  : order.status === 'confirmed'
                                  ? 'bg-[#2F6F8F]/15 text-[#2F6F8F] border border-[#2F6F8F]/30'
                                  : order.status === 'cancelled'
                                  ? 'bg-[#B3372F]/15 text-[#B3372F] border border-[#B3372F]/30'
                                  : 'bg-[#C98A12]/15 text-[#C98A12] border border-[#C98A12]/30'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="p-3">
                            {order.status === 'cancelled' ? (
                              <span className="text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded-sm border border-rose-200">
                                Cancelled (Final)
                              </span>
                            ) : (
                              <div className="relative inline-flex items-center">
                                <select
                                  value={order.status}
                                  disabled={isRowUpdating}
                                  onChange={async (e) => {
                                    const nextStatus = e.target.value as OrderStatus;
                                    if (nextStatus === order.status) return;
                                    if (nextStatus === 'cancelled') {
                                      setIsCancellingOrder(order);
                                      return;
                                    }
                                    setUpdatingOrderId(order.id);
                                    try {
                                      await updateOrderStatus(order.id, nextStatus);
                                    } finally {
                                      setUpdatingOrderId(null);
                                    }
                                  }}
                                  className="text-xs bg-white border border-[#0F3B2E]/25 rounded-lg px-2.5 py-1.5 font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0F3B2E] disabled:opacity-50 cursor-pointer shadow-2xs"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancel Order</option>
                                </select>
                                {isRowUpdating && (
                                  <RefreshCw className="w-3.5 h-3.5 text-[#0F3B2E] animate-spin ml-1.5" />
                                )}
                              </div>
                            )}
                          </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrderForDetail(order)}
                            className="p-1.5 text-zinc-600 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 transition-colors"
                            title="View order snapshot"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={`https://wa.me/${normalizePkPhone(order.customer_phone)}?text=${encodeURIComponent(
                              formatCustomerUpdateMessage({
                                order_number: order.order_number,
                                status: order.status,
                                total: order.total,
                                customer_name: order.customer_name,
                              })
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#25D366] hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Message Customer on WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTS & VARIANTS */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-zinc-950">
                  Products & Variant Stock
                </h2>
                <p className="text-xs text-zinc-500">
                  Manage inventory quantities, size/color options and prices.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="px-4 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" /> Add New Product
              </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name..."
                className="w-full text-xs pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            </div>

            {/* Products List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Image & Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Total Stock</th>
                    <th className="p-3">Featured</th>
                    <th className="p-3">Active</th>
                    <th className="p-3 rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProducts.map((p) => {
                    const cat = categories.find((c) => c.id === p.category_id);
                    const totalStock = p.variants.reduce((sum, v) => sum + v.stock_quantity, 0);

                    return (
                      <tr key={p.id} className="hover:bg-zinc-50/70">
                        <td className="p-3 flex items-center gap-3">
                          <img
                            src={p.images[0]}
                            alt=""
                            className="w-12 h-12 object-cover rounded-xl border border-zinc-200"
                          />
                          <div>
                            <p className="font-bold text-zinc-900">{p.name}</p>
                            <p className="text-zinc-400 text-[11px] font-mono">{p.slug}</p>
                          </div>
                        </td>
                        <td className="p-3 text-zinc-600">{cat?.name || 'Uncategorized'}</td>
                        <td className="p-3 font-bold text-zinc-950">{formatPKR(p.base_price)}</td>
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-zinc-900">
                              {totalStock} in stock
                            </span>
                            <p className="text-[11px] text-zinc-400">{p.variants.length} variant(s)</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => updateProduct(p.id, { is_featured: !p.is_featured })}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.is_featured
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-zinc-100 text-zinc-400'
                            }`}
                          >
                            {p.is_featured ? '★ Featured' : 'Normal'}
                          </button>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => updateProduct(p.id, { is_active: !p.is_active })}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.is_active
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-zinc-200 text-zinc-600'
                            }`}
                          >
                            {p.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsProductModalOpen(true);
                                navigate(`/admin/products/${p.id}/edit`);
                              }}
                              className="p-1.5 text-zinc-600 hover:text-zinc-950 rounded-lg hover:bg-zinc-100"
                              title="Edit product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50"
                              title="Delete/Deactivate product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-zinc-950">Categories</h2>
                <p className="text-xs text-zinc-500">Manage catalog sections and order of display.</p>
              </div>

              <button
                onClick={() => {
                  setEditingCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Image & Name</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3">Sort Order</th>
                    <th className="p-3">Products</th>
                    <th className="p-3">Active</th>
                    <th className="p-3 rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {categories.map((c) => {
                    const prodCount = products.filter((p) => p.category_id === c.id).length;
                    return (
                      <tr key={c.id} className="hover:bg-zinc-50/70">
                        <td className="p-3 flex items-center gap-3">
                          <img
                            src={c.image_url || ''}
                            alt=""
                            className="w-12 h-12 object-cover rounded-xl border border-zinc-200"
                          />
                          <div>
                            <p className="font-bold text-zinc-900">{c.name}</p>
                            <p className="text-zinc-500 text-[11px] line-clamp-1">{c.description}</p>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-zinc-500">{c.slug}</td>
                        <td className="p-3 font-bold text-zinc-800">{c.sort_order}</td>
                        <td className="p-3 text-zinc-600">{prodCount} items</td>
                        <td className="p-3">
                          <button
                            onClick={() => updateCategory(c.id, { is_active: !c.is_active })}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              c.is_active
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-zinc-200 text-zinc-600'
                            }`}
                          >
                            {c.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingCategory(c);
                                setIsCategoryModalOpen(true);
                              }}
                              className="p-1.5 text-zinc-600 hover:text-zinc-950 rounded-lg hover:bg-zinc-100"
                              title="Edit Category"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCategory(c.id)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50"
                              title="Delete Category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-zinc-950">Discount Coupons</h2>
                <p className="text-xs text-zinc-500">Create promotional voucher codes with minimum spend and caps.</p>
              </div>

              <button
                onClick={() => {
                  setEditingCoupon(null);
                  setIsCouponModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Coupon
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Code</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Min Order</th>
                    <th className="p-3">Usage</th>
                    <th className="p-3">Validity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50/70">
                      <td className="p-3 font-mono font-bold text-emerald-950 text-sm">
                        {c.code}
                      </td>
                      <td className="p-3 font-semibold text-zinc-900">
                        {c.discount_type === 'percentage'
                          ? `${c.discount_value}% Off`
                          : formatPKR(c.discount_value)}
                      </td>
                      <td className="p-3 text-zinc-600">{formatPKR(c.min_order_amount)}</td>
                      <td className="p-3 text-zinc-600">
                        {c.used_count} {c.max_uses ? `/ ${c.max_uses} max` : 'uses'}
                      </td>
                      <td className="p-3 text-zinc-400">
                        Expires {new Date(c.expires_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => updateCoupon(c.id, { is_active: !c.is_active })}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {c.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCoupon(c);
                              setIsCouponModalOpen(true);
                            }}
                            className="p-1 text-zinc-500 hover:text-zinc-900"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCoupon(c.id)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-zinc-950">Customer Directory</h2>
                <p className="text-xs text-zinc-500">
                  Comprehensive directory of registered accounts and verified guest order customers.
                </p>
              </div>

              {/* Customer Search Bar */}
              <div className="relative min-w-[240px] max-w-sm">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer name, phone, email..."
                  className="w-full text-xs pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3B2E]"
                />
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                {customerSearch && (
                  <button
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Customer Name</th>
                    <th className="p-3">Account Type</th>
                    <th className="p-3">Phone &amp; Email</th>
                    <th className="p-3">Order History</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3 rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        No customers match your active search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const userOrders = orders.filter((o) => {
                        const cleanCustPhone = cust.phone.replace(/[^0-9]/g, '').slice(-10);
                        const cleanOrdPhone = o.customer_phone.replace(/[^0-9]/g, '').slice(-10);
                        return (
                          (cleanCustPhone && cleanCustPhone === cleanOrdPhone) ||
                          (cust.email && o.customer_email && cust.email.toLowerCase() === o.customer_email.toLowerCase())
                        );
                      });

                      return (
                        <tr
                          key={cust.id}
                          className="hover:bg-zinc-50/70 transition-colors"
                        >
                          <td className="p-3">
                            <p className="font-bold text-zinc-900">{cust.name}</p>
                            <p className="text-zinc-400 text-[11px]">{cust.email || 'No email provided'}</p>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                cust.role === 'customer'
                                  ? 'bg-emerald-100 text-[#0F3B2E] border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {cust.role === 'customer' ? 'Registered' : 'Guest'}
                            </span>
                          </td>
                          <td className="p-3 text-zinc-700">
                            <p className="font-medium">{cust.phone}</p>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-zinc-900">{cust.ordersCount} orders</span>
                            <span className="text-emerald-800 text-[11px] block font-semibold">
                              Lifetime: {formatPKR(cust.totalSpent)}
                            </span>
                          </td>
                          <td className="p-3 text-zinc-400 text-[11px]">
                            {cust.lastOrderDate
                              ? formatKarachiDateTime(cust.lastOrderDate)
                              : formatKarachiDateTime(cust.createdAt)}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setSelectedCustomer({
                                  id: cust.id,
                                  full_name: cust.name,
                                  email: cust.email,
                                  phone: cust.phone,
                                  role: cust.role,
                                  created_at: cust.createdAt,
                                });
                              }}
                              className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View ({userOrders.length})
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: HOME BANNER */}
        {activeTab === 'banner' && (
          <AdminBannerEditor
            categories={categories}
            products={products}
            showToast={showToast}
          />
        )}
      </div>

      {/* MODAL: ORDER DETAIL / INVOICE VIEW */}
      {selectedOrderForDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Order Details
                </span>
                <h3 className="font-mono text-xl font-extrabold text-zinc-950">
                  {selectedOrderForDetail.order_number}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Packing Slip
                </button>
                <button
                  onClick={handleCloseOrderDetail}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer & Address */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 p-4 rounded-2xl">
              <div>
                <strong className="block text-zinc-900">Customer</strong>
                <p className="text-zinc-700">{selectedOrderForDetail.customer_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-zinc-500 font-mono">{selectedOrderForDetail.customer_phone}</p>
                  <a
                    href={`https://wa.me/${normalizePkPhone(selectedOrderForDetail.customer_phone)}?text=${encodeURIComponent(
                      formatCustomerUpdateMessage({
                        order_number: selectedOrderForDetail.order_number,
                        status: selectedOrderForDetail.status,
                        total: selectedOrderForDetail.total,
                        customer_name: selectedOrderForDetail.customer_name,
                      })
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#0F3B2E] text-[10px] font-bold transition-colors"
                    title="Message Customer on WhatsApp"
                  >
                    <WhatsAppIcon className="w-3 h-3 text-[#25D366]" /> WhatsApp
                  </a>
                </div>
                {selectedOrderForDetail.customer_email && (
                  <p className="text-zinc-400 mt-0.5">{selectedOrderForDetail.customer_email}</p>
                )}
              </div>
              <div>
                <strong className="block text-zinc-900">Delivery Destination</strong>
                <p className="text-zinc-700">{selectedOrderForDetail.shipping_address}</p>
                <p className="text-zinc-500">{selectedOrderForDetail.city}, {selectedOrderForDetail.province}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Line Items
              </h4>
              <div className="divide-y border-y">
                {selectedOrderForDetail.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img src={item.image_url} alt="" className="w-10 h-10 object-cover rounded-md" />
                      <div>
                        <p className="font-semibold text-zinc-900">{item.product_name}</p>
                        <p className="text-zinc-500">{item.variant_label}</p>
                      </div>
                    </div>
                    <span className="font-bold text-zinc-950">
                      {item.quantity} × {formatPKR(item.unit_price)} = {formatPKR(item.line_total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="text-xs space-y-1.5 pt-2 border-t text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPKR(selectedOrderForDetail.subtotal)}</span>
              </div>
              {selectedOrderForDetail.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount ({selectedOrderForDetail.coupon_code})</span>
                  <span>- {formatPKR(selectedOrderForDetail.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-bold text-emerald-800 uppercase">FREE</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-serif text-lg font-bold text-zinc-950">
                <span>Cash on Delivery Amount</span>
                <span>{formatPKR(selectedOrderForDetail.total)}</span>
              </div>
            </div>

            {/* Status changer & print bar */}
            <div className="p-4 bg-emerald-50 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-emerald-950">Status:</span>
                <select
                  value={pendingStatus}
                  onChange={(e) => setPendingStatus(e.target.value as OrderStatus)}
                  className="bg-white border border-emerald-300 rounded-lg px-3 py-1.5 font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled (Restore Stock)</option>
                </select>
                <button
                  type="button"
                  disabled={isDetailUpdating}
                  onClick={async () => {
                    if (pendingStatus === 'cancelled') {
                      setIsCancellingOrder(selectedOrderForDetail);
                    } else {
                      setIsDetailUpdating(true);
                      try {
                        const res = await updateOrderStatus(selectedOrderForDetail.id, pendingStatus);
                        if (res.success) {
                          setSelectedOrderForDetail((prev) => (prev ? { ...prev, status: pendingStatus } : null));
                        }
                      } finally {
                        setIsDetailUpdating(false);
                      }
                    }
                  }}
                  className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isDetailUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isDetailUpdating ? 'Saving...' : 'Save Status'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://wa.me/${normalizePkPhone(selectedOrderForDetail.customer_phone)}?text=${encodeURIComponent(
                    formatCustomerUpdateMessage({
                      order_number: selectedOrderForDetail.order_number,
                      status: selectedOrderForDetail.status,
                      total: selectedOrderForDetail.total,
                      customer_name: selectedOrderForDetail.customer_name,
                    })
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                  <span>Message Customer on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Browser Print
                </button>
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Packing Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL ORDER CONFIRMATION */}
      {isCancellingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-serif text-lg font-bold text-zinc-950">Confirm Order Cancellation</h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to cancel order <strong className="font-mono text-zinc-900">#{isCancellingOrder.order_number}</strong>? Cancelling will automatically restore product inventory stocks for all line items and adjust coupon usage.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 text-xs">
              <button
                type="button"
                onClick={() => setIsCancellingOrder(null)}
                className="px-4 py-2 border border-zinc-200 rounded-xl font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancellingLoading}
                onClick={async () => {
                  setIsCancellingLoading(true);
                  try {
                    const res = await updateOrderStatus(isCancellingOrder.id, 'cancelled');
                    if (res.success) {
                      if (selectedOrderForDetail?.id === isCancellingOrder.id) {
                        setSelectedOrderForDetail((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
                        setPendingStatus('cancelled');
                      }
                      setIsCancellingOrder(null);
                    }
                  } finally {
                    setIsCancellingLoading(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isCancellingLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isCancellingLoading ? 'Cancelling...' : 'Confirm Cancellation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCT DELETE CONFIRMATION */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="font-serif text-lg font-bold text-zinc-950">Delete Product</h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-zinc-900">"{productToDelete.name}"</strong>? If this product has existing customer orders, it will be deactivated instead to safeguard historical purchase records.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 text-xs">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 border border-zinc-200 rounded-xl font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs"
              >
                Delete / Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: CUSTOMER ORDERS HISTORY */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-zinc-200 flex flex-col p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Customer Profile</span>
                <h3 className="font-serif text-xl font-bold text-zinc-950">{selectedCustomer.full_name}</h3>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Email</span>
                  <span className="text-zinc-800 font-medium">{selectedCustomer.email}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Phone</span>
                  <span className="text-zinc-800 font-medium">{selectedCustomer.phone}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">City</span>
                  <span className="text-zinc-800 font-medium">{selectedCustomer.city || 'Pakistan'}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Customer Since</span>
                  <span className="text-zinc-800 font-medium">{new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Orders summary */}
            {(() => {
              const custOrders = orders.filter((o) => o.user_id === selectedCustomer.id);
              const lifetimeSpend = custOrders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);

              return (
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500">
                      Order History ({custOrders.length})
                    </h4>
                    <span className="text-xs font-bold text-emerald-800">
                      Lifetime Spend: {formatPKR(lifetimeSpend)}
                    </span>
                  </div>

                  {custOrders.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                      <ShoppingBag className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500 font-medium">No orders placed by this customer yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {custOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 bg-zinc-50 hover:bg-zinc-100/80 transition-colors rounded-2xl border border-zinc-200/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-zinc-950 text-xs">#{ord.order_number}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                ord.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : ord.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-900'
                                  : ord.status === 'shipped'
                                  ? 'bg-sky-100 text-sky-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 flex justify-between items-center">
                            <span>{new Date(ord.created_at).toLocaleDateString()} · {ord.items.length} items</span>
                            <span className="font-bold text-zinc-900 text-xs">{formatPKR(ord.total)}</span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedCustomer(null);
                              setSelectedOrderForDetail(ord);
                            }}
                            className="w-full mt-1 py-1.5 text-center bg-white border border-zinc-300 hover:border-zinc-400 text-zinc-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Order Details
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE PACKING SLIP & INVOICE */}
      {isInvoiceModalOpen && selectedOrderForDetail && (
        <InvoiceModal
          order={selectedOrderForDetail}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}

      {/* MODAL: PRODUCT CREATE / EDIT */}
      {isProductModalOpen && (
        <ProductFormModal
          isOpen={isProductModalOpen}
          initialProduct={editingProduct}
          categories={categories}
          onClose={handleCloseProductModal}
          onSave={async (prodData) => {
            if (editingProduct) {
              await updateProduct(editingProduct.id, prodData);
            } else {
              await addProduct(prodData);
            }
          }}
        />
      )}

      {/* MODAL: CATEGORY CREATE / EDIT */}
      {isCategoryModalOpen && (
        <CategoryFormModal
          isOpen={isCategoryModalOpen}
          initialCategory={editingCategory}
          onClose={() => setIsCategoryModalOpen(false)}
          onSave={(catData) => {
            if (editingCategory) {
              updateCategory(editingCategory.id, catData);
            } else {
              addCategory(catData);
            }
            setIsCategoryModalOpen(false);
          }}
        />
      )}

      {/* MODAL: COUPON CREATE / EDIT */}
      {isCouponModalOpen && (
        <CouponFormModal
          isOpen={isCouponModalOpen}
          initialCoupon={editingCoupon}
          onClose={() => setIsCouponModalOpen(false)}
          onSave={(cpnData) => {
            if (editingCoupon) {
              updateCoupon(editingCoupon.id, cpnData);
            } else {
              addCoupon(cpnData);
            }
            setIsCouponModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

// Subcomponent: Product Form Modal
interface ProductFormModalProps {
  isOpen: boolean;
  initialProduct: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: any) => Promise<void> | void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  initialProduct,
  categories,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialProduct?.name || '');
  const [slug, setSlug] = useState(initialProduct?.slug || '');
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id || (categories[0]?.id || ''));
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [basePrice, setBasePrice] = useState(initialProduct?.base_price || 3000);
  const [compareAtPrice, setCompareAtPrice] = useState(initialProduct?.compare_at_price || 4000);
  
  // Images list with multi-upload, reorder, delete, and first = main
  const [images, setImages] = useState<string[]>(() => {
    if (initialProduct?.images && initialProduct.images.length > 0) {
      return initialProduct.images;
    }
    return ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800'];
  });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isFeatured, setIsFeatured] = useState(initialProduct?.is_featured || false);
  const [isActive, setIsActive] = useState(initialProduct?.is_active ?? true);

  // Error and saving state for modal
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Variants state (size, color, SKU, price override, stock, active)
  const [variants, setVariants] = useState<ProductVariant[]>(() => {
    if (initialProduct && initialProduct.variants.length > 0) {
      return initialProduct.variants;
    }
    return [
      {
        id: `var-${Date.now()}-1`,
        product_id: '',
        size: 'Standard',
        color: 'Classic',
        price: null,
        stock_quantity: 20,
        sku: generateVariantSku(initialProduct?.slug || slug || name || 'BRV'),
        is_active: true,
      },
    ];
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    if (images.length >= 4) {
      setUploadError('You can add up to 4 images.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const check = validateImageFile(file);
    if (!check.valid) {
      setUploadError(check.error || 'Invalid image file (Must be JPG, PNG, or WebP under 2 MB)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingImage(true);
    try {
      const prodId = initialProduct?.id || `new-${Date.now()}`;
      const publicUrl = await storageService.uploadProductImage(prodId, file);
      setImages((prev) => [...prev, publicUrl]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload image to storage');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    if (images.length >= 4) {
      setUploadError('You can add up to 4 images.');
      return;
    }
    setUploadError(null);
    setImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    if (images.length <= 1) {
      alert('Every product must have at least one image.');
      return;
    }
    const imgToRemove = images[index];
    setImages((prev) => prev.filter((_, i) => i !== index));

    // Also attempt deletion from Supabase Storage
    if (!isDemoMode && supabase && imgToRemove) {
      storageService.deleteImage(imgToRemove).catch(() => {});
    }
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleSetMainImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
  };

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${prev.length + 1}`,
        product_id: initialProduct?.id || '',
        size: 'Standard',
        color: 'Classic',
        price: null,
        stock_quantity: 15,
        sku: generateVariantSku(slug || name || 'BRV'),
        is_active: true,
      },
    ]);
  };

  const handleUpdateVariant = (index: number, updates: Partial<ProductVariant>) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...updates } : v)));
  };

  const handlePriceOverrideChange = (index: number, rawValue: string) => {
    if (rawValue.trim() === '') {
      handleUpdateVariant(index, { price: null });
      return;
    }
    const parsed = Number(rawValue);
    handleUpdateVariant(index, { price: isNaN(parsed) ? null : parsed });
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) {
      alert('Every product must have at least one variant.');
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Inline validation check: Price Override cannot be negative
    const hasNegativePrice = variants.some(
      (v) => v.price !== null && v.price !== undefined && Number(v.price) < 0
    );
    if (hasNegativePrice) {
      setFormError('Price override cannot be negative.');
      return;
    }

    // 2. Validate duplicate non-empty SKUs within this product's variants
    const nonNullSkus = variants
      .map((v) => (v.sku && typeof v.sku === 'string' ? v.sku.trim() : ''))
      .filter((s) => s.length > 0);
    const skuSet = new Set(nonNullSkus.map((s) => s.toUpperCase()));
    if (skuSet.size !== nonNullSkus.length) {
      setFormError('This SKU is already used by another product. Please change it.');
      return;
    }

    // 3. Normalize variants: empty SKU is NULL, empty price override is NULL
    const cleanedVariants = variants.map((v) => {
      const priceVal = validateVariantPriceOverride(v.price);
      return {
        ...v,
        sku: normalizeVariantSku(v.sku),
        price: priceVal.normalizedPrice,
      };
    });

    setIsSaving(true);
    try {
      await onSave({
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        category_id: categoryId,
        description,
        base_price: Number(basePrice),
        compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800'],
        is_featured: isFeatured,
        is_active: isActive,
        variants: cleanedVariants,
      });
      onClose();
    } catch (err: any) {
      const duplicateMsg = getDuplicateSkuErrorMessage(err);
      const errMsg = duplicateMsg || err?.message || 'Failed to save product. Please try again.';
      setFormError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FBF5EC] rounded-[24px] shadow-2xl border border-[#E3D5C4] max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 text-[#3B2A20]">
        <div className="flex items-center justify-between border-b border-[#E3D5C4] pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B4502F]">Product Catalog</span>
            <h3 className="font-serif text-2xl font-bold text-[#3B2A20]">
              {initialProduct ? 'Edit Product Details' : 'Create New Product'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#6B5B50] hover:text-[#3B2A20] rounded-full hover:bg-[#E3D5C4]/50 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-[#B3372F] text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#B3372F]" />
            <div className="flex-1">
              <p className="font-semibold">{formError}</p>
            </div>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-[#B3372F] hover:text-[#881337] p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">1. Basic Information</h4>
            <div>
              <label className="block font-bold text-zinc-700 mb-1">Product Title</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!initialProduct) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                }}
                placeholder="e.g. Royal Oxford Pure Cotton Shirt"
                className="w-full px-3.5 py-2 border rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl font-mono text-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Description & Material Highlights</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Crafted with premier precision, Pakistani breathable weaving..."
                className="w-full px-3.5 py-2 border rounded-xl"
              />
            </div>
          </div>

          {/* Section 2: Pricing */}
          <div className="space-y-3 pt-3 border-t">
            <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">2. Pricing (PKR)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Base Price (Rs.)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Compare-At Price (Rs. strikethrough)</label>
                <input
                  type="number"
                  value={compareAtPrice || ''}
                  onChange={(e) => setCompareAtPrice(Number(e.target.value))}
                  placeholder="Optional discount anchor"
                  className="w-full px-3.5 py-2 border rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Images (multi-upload, reorder, delete, first = main, max 4) */}
          <div className="space-y-3 pt-3 border-t border-[#E3D5C4]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#3B2A20] uppercase tracking-wider text-[11px]">
                  3. Product Images Gallery (Up to 4 images)
                </h4>
                <p className="text-[11px] text-[#6B5B50]">
                  First image is the primary store listing cover. Hover on cards in shop to preview second image.
                </p>
              </div>
              <span className={`text-[11px] font-bold ${images.length >= 4 ? 'text-[#B4502F]' : 'text-[#8A9A7B]'}`}>
                {images.length}/4 images
              </span>
            </div>

            {/* Demo mode notice */}
            {isDemoMode && (
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-[12px] text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Demo mode: images are not saved.</span>
              </div>
            )}

            {/* File Upload Button & URL fallback */}
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={isUploadingImage}
                  onClick={() => {
                    if (images.length >= 4) {
                      setUploadError('You can add up to 4 images.');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className={`px-4 py-2.5 min-h-[44px] font-bold rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 ${
                    images.length >= 4
                      ? 'bg-[#E3D5C4] text-[#6B5B50] cursor-not-allowed'
                      : 'bg-[#B4502F] hover:bg-[#964225] text-white shadow-xs'
                  }`}
                >
                  {isUploadingImage ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Uploading to Storage...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Upload Image File (Max 2MB)
                    </>
                  )}
                </button>

                <div className="flex flex-1 gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Or paste public image URL (https://...)"
                    className="flex-1 px-3.5 py-2.5 border border-[#E3D5C4] rounded-[12px] bg-white text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    disabled={images.length >= 4}
                    className={`px-4 py-2 min-h-[44px] font-bold rounded-full flex items-center gap-1.5 shrink-0 ${
                      images.length >= 4
                        ? 'bg-[#E3D5C4] text-[#6B5B50] cursor-not-allowed'
                        : 'bg-[#3B2A20] hover:bg-[#251A14] text-white cursor-pointer'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add URL
                  </button>
                </div>
              </div>

              {uploadError && (
                <p className="text-xs text-[#B3372F] font-medium flex items-center gap-1 pt-1">
                  <XCircle className="w-3.5 h-3.5" /> {uploadError}
                </p>
              )}
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative group rounded-[16px] border p-2 flex flex-col items-center bg-white ${
                    idx === 0 ? 'border-[#B4502F] ring-2 ring-[#B4502F]/20' : 'border-[#E3D5C4]'
                  }`}
                >
                  <div className="w-full h-28 relative rounded-[12px] overflow-hidden mb-2 bg-[#DDE3D3]">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {idx === 0 ? (
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-[#B4502F] text-white text-[10px] font-bold rounded-full shadow-xs flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" /> Main
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetMainImage(idx)}
                        className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-black/70 hover:bg-[#B4502F] text-white text-[10px] font-semibold rounded-full backdrop-blur-xs transition-colors cursor-pointer"
                      >
                        Set Main
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between w-full px-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveImage(idx, 'left')}
                        title="Move Left / Earlier"
                        className="p-1 text-[#6B5B50] hover:text-[#3B2A20] disabled:opacity-30 rounded-md hover:bg-[#E3D5C4]/50 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5 -rotate-90" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === images.length - 1}
                        onClick={() => handleMoveImage(idx, 'right')}
                        title="Move Right / Later"
                        className="p-1 text-[#6B5B50] hover:text-[#3B2A20] disabled:opacity-30 rounded-md hover:bg-[#E3D5C4]/50 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5 -rotate-90" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      title="Delete Image"
                      className="p-1 text-[#B3372F] hover:text-[#881337] rounded-md hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Variants Management */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-900 uppercase tracking-wider text-[11px] block">
                  4. Product Variants (Size, Color, SKU, Stock, Active)
                </span>
                <span className="text-[11px] text-zinc-400">At least one variant required for stock availability.</span>
              </div>
              <button
                type="button"
                onClick={handleAddVariant}
                className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Variant
              </button>
            </div>

            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={v.id} className="grid grid-cols-7 gap-2 items-center bg-white p-3 rounded-xl border border-zinc-200/80 shadow-2xs">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">Size</label>
                    <input
                      type="text"
                      value={v.size || ''}
                      onChange={(e) => handleUpdateVariant(i, { size: e.target.value })}
                      placeholder="Size"
                      className="w-full p-1.5 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">Color</label>
                    <input
                      type="text"
                      value={v.color || ''}
                      onChange={(e) => handleUpdateVariant(i, { color: e.target.value })}
                      placeholder="Color"
                      className="w-full p-1.5 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">SKU</label>
                    <input
                      type="text"
                      value={v.sku || ''}
                      onChange={(e) => handleUpdateVariant(i, { sku: e.target.value })}
                      placeholder="e.g. CAM-7F3K"
                      className="w-full p-1.5 border border-zinc-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">Price Override</label>
                    <input
                      type="number"
                      min={0}
                      value={v.price !== null && v.price !== undefined ? v.price : ''}
                      onChange={(e) => handlePriceOverrideChange(i, e.target.value)}
                      placeholder="Base"
                      className={`w-full p-1.5 border rounded-lg text-xs ${
                        v.price !== null && v.price !== undefined && Number(v.price) < 0
                          ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500'
                          : 'border-zinc-200'
                      }`}
                    />
                    {v.price !== null && v.price !== undefined && Number(v.price) < 0 && (
                      <span className="text-[10px] text-red-600 block mt-0.5 font-medium leading-tight">
                        Price override cannot be negative.
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-0.5">Stock Qty</label>
                    <input
                      type="number"
                      min={0}
                      value={v.stock_quantity}
                      onChange={(e) => handleUpdateVariant(i, { stock_quantity: Number(e.target.value) })}
                      className="w-full p-1.5 border rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Active</label>
                    <input
                      type="checkbox"
                      checked={v.is_active}
                      onChange={(e) => handleUpdateVariant(i, { is_active: e.target.checked })}
                      className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(i)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                      title="Remove Variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Flags */}
          <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[#E3D5C4]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded w-4 h-4 text-[#B4502F]"
              />
              <span className="font-semibold text-[#3B2A20]">Featured on Homepage</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded w-4 h-4 text-[#B4502F]"
              />
              <span className="font-semibold text-[#3B2A20]">Active in Store Catalog</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[#E3D5C4]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 min-h-[44px] border border-[#3B2A20] rounded-full font-semibold text-[#3B2A20] hover:bg-[#E3D5C4]/30 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 min-h-[44px] bg-[#B4502F] hover:bg-[#964225] disabled:opacity-50 text-white font-bold rounded-full shadow-md transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Saving Product...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Subcomponent: Category Form Modal
interface CategoryFormModalProps {
  isOpen: boolean;
  initialCategory: Category | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  initialCategory,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialCategory?.name || '');
  const [slug, setSlug] = useState(initialCategory?.slug || '');
  const [description, setDescription] = useState(initialCategory?.description || '');
  const [imageUrl, setImageUrl] = useState(initialCategory?.image_url || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800');
  const [sortOrder, setSortOrder] = useState(initialCategory?.sort_order || 1);
  const [isActive, setIsActive] = useState(initialCategory?.is_active ?? true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const catFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const check = validateImageFile(file);
    if (!check.valid) {
      setUploadError(check.error || 'Invalid file type or size');
      if (catFileInputRef.current) catFileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const catId = initialCategory?.id || `cat-${Date.now()}`;
      const publicUrl = await storageService.uploadCategoryImage(catId, file);
      setImageUrl(publicUrl);
      if (catFileInputRef.current) catFileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload category banner');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description,
      image_url: imageUrl,
      sort_order: Number(sortOrder),
      is_active: isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-md w-full p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-serif text-lg font-bold">
            {initialCategory ? 'Edit Category' : 'Add Category'}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Demo mode notice */}
        {isDemoMode && (
          <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Demo mode: images are not saved. Connect Supabase to publish images.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-bold mb-1">Category Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!initialCategory) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
              }}
              className="w-full p-2 border rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">Slug</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full p-2 border rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">Category Banner Image</label>
            <div className="space-y-2">
              <input
                type="file"
                ref={catFileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => catFileInputRef.current?.click()}
                  className="px-3 py-2 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" /> Upload File
                    </>
                  )}
                </button>
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste public image URL"
                  className="flex-1 p-2 border rounded-xl text-xs"
                />
              </div>

              {uploadError && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> {uploadError}
                </p>
              )}

              {imageUrl && (
                <div className="w-full h-24 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 relative mt-1">
                  <img src={imageUrl} alt="Category preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded-xl"
            />
          </div>

          <div className="flex gap-4 items-center">
            <div>
              <label className="block font-bold mb-1">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-20 p-2 border rounded-xl"
              />
            </div>
            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Active</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-emerald-900 text-white font-bold rounded-xl">
              Save Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Subcomponent: Coupon Form Modal
interface CouponFormModalProps {
  isOpen: boolean;
  initialCoupon: Coupon | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const CouponFormModal: React.FC<CouponFormModalProps> = ({
  initialCoupon,
  onClose,
  onSave,
}) => {
  const [code, setCode] = useState(initialCoupon?.code || '');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(initialCoupon?.discount_type || 'percentage');
  const [discountValue, setDiscountValue] = useState(initialCoupon?.discount_value || 10);
  const [minOrder, setMinOrder] = useState(initialCoupon?.min_order_amount || 2000);
  const [maxUses, setMaxUses] = useState(initialCoupon?.max_uses || 100);
  const [expiresAt, setExpiresAt] = useState(initialCoupon?.expires_at?.split('T')[0] || '2026-12-31');
  const [isActive, setIsActive] = useState(initialCoupon?.is_active ?? true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const numVal = Number(discountValue);
    if (isNaN(numVal) || numVal <= 0) {
      setValidationError('Discount value must be a positive number.');
      return;
    }

    if (discountType === 'percentage' && numVal > 100) {
      setValidationError('Percentage discount cannot exceed 100%.');
      return;
    }

    const minNum = Number(minOrder);
    if (isNaN(minNum) || minNum < 0) {
      setValidationError('Minimum order amount cannot be negative.');
      return;
    }

    if (expiresAt) {
      const expDate = new Date(`${expiresAt}T23:59:59Z`);
      if (isNaN(expDate.getTime()) || expDate < new Date()) {
        setValidationError('Expiry date must be in the future.');
        return;
      }
    }

    onSave({
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: numVal,
      min_order_amount: minNum,
      max_uses: maxUses ? Number(maxUses) : null,
      starts_at: '2026-01-01T00:00:00Z',
      expires_at: `${expiresAt}T23:59:59Z`,
      is_active: isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-md w-full p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-serif text-lg font-bold">
            {initialCoupon ? 'Edit Coupon' : 'Create Voucher Coupon'}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {validationError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-bold mb-1">Coupon Code (e.g. KHAYR20)</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full p-2 border rounded-xl font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full p-2 border rounded-xl"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed PKR (Rs.)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">
                {discountType === 'percentage' ? 'Percentage (e.g. 15)' : 'Amount (e.g. 500)'}
              </label>
              <input
                type="number"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full p-2 border rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Min Order Amount (PKR)</label>
              <input
                type="number"
                required
                value={minOrder}
                onChange={(e) => setMinOrder(Number(e.target.value))}
                className="w-full p-2 border rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Max Uses (Limit)</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full p-2 border rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">Expiry Date</label>
            <input
              type="date"
              required
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full p-2 border rounded-xl"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span>Active for Customers</span>
          </label>

          <div className="pt-3 flex justify-end gap-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-emerald-900 text-white font-bold rounded-xl">
              Save Coupon
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Subcomponent: Printable Packing Slip & COD Invoice Modal
interface InvoiceModalProps {
  order: Order;
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6">
        {/* Top Control Bar (hidden in print) */}
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900">
              Packing Slip & Invoice
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              #{order.order_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Packing Slip
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="space-y-6 text-zinc-900" id="printable-invoice">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4">
            <div>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-950">
                BARVAKA
              </h2>
              <p className="text-xs font-medium text-zinc-500 tracking-wide mt-0.5">
                Quality · Fast Delivery · Trust · Khayr
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Direct Dispatch Center · Pakistan Nationwide COD
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-wider rounded-md mb-1">
                Cash On Delivery
              </span>
              <p className="font-mono text-sm font-extrabold text-zinc-950">
                {order.order_number}
              </p>
              <p className="text-xs text-zinc-500">
                Date: {new Date(order.created_at).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
              </p>
            </div>
          </div>

          {/* Consignee Details */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Consignee / Customer
              </span>
              <p className="font-bold text-sm text-zinc-950">{order.customer_name}</p>
              <p className="font-mono font-semibold text-zinc-800 mt-0.5">{order.customer_phone}</p>
              {order.customer_email && (
                <p className="text-zinc-500">{order.customer_email}</p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Delivery Destination
              </span>
              <p className="text-zinc-800 font-medium">{order.shipping_address}</p>
              <p className="font-bold text-zinc-950 mt-0.5">
                {order.city}, {order.province} {order.postal_code || ''}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left text-xs border border-zinc-200">
            <thead className="bg-zinc-100 text-zinc-700 uppercase font-bold border-b border-zinc-200">
              <tr>
                <th className="p-2.5">Item & Variant</th>
                <th className="p-2.5">SKU</th>
                <th className="p-2.5 text-center">Qty</th>
                <th className="p-2.5 text-right">Unit Price</th>
                <th className="p-2.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {order.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/50">
                  <td className="p-2.5 font-medium">
                    <p className="font-bold text-zinc-950">{item.product_name}</p>
                    <p className="text-[11px] text-zinc-500">{item.variant_label}</p>
                  </td>
                  <td className="p-2.5 font-mono text-zinc-500 text-[11px]">{item.sku || item.variant_id.slice(-6).toUpperCase()}</td>
                  <td className="p-2.5 text-center font-bold text-zinc-900">{item.quantity}</td>
                  <td className="p-2.5 text-right text-zinc-600">{formatPKR(item.unit_price)}</td>
                  <td className="p-2.5 text-right font-bold text-zinc-950">{formatPKR(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-1.5 text-xs text-zinc-700 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatPKR(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <span>Coupon Discount ({order.coupon_code}):</span>
                  <span>- {formatPKR(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span className="font-bold text-emerald-800 uppercase">FREE (Rs. 0)</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-zinc-900 font-serif text-base font-extrabold text-zinc-950">
                <span>COD Total to Collect:</span>
                <span>{formatPKR(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Logistics Instructions & Signatures */}
          <div className="pt-4 border-t border-zinc-300 text-[11px] text-zinc-500 space-y-4">
            <p className="italic">
              * Delivery Note: Dispatch rider must collect exact COD amount in Pakistani Rupees prior to package handover.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-8">
              <div className="border-t border-zinc-400 pt-2 text-center">
                <span className="font-semibold text-zinc-800 block">Store Dispatch Officer</span>
                <span className="text-[10px] text-zinc-400">Signature & Date</span>
              </div>
              <div className="border-t border-zinc-400 pt-2 text-center">
                <span className="font-semibold text-zinc-800 block">Recipient / Consignee</span>
                <span className="text-[10px] text-zinc-400">Received in Good Order</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
