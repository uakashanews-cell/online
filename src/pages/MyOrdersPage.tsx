/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { Order, OrderStatus } from '../types';
import { formatPKR } from '../utils/ecommerce-logic';
import {
  getStoredGuestOrders,
  isOrderUpdated,
  markOrderSeen,
} from '../utils/guestOrders';
import { siteConfig } from '../config/site';
import { usePageSEO } from '../hooks/usePageSEO';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { WhatsAppIcon } from '../components/common/WhatsAppIcon';
import {
  Package,
  RefreshCw,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Download,
  FileText,
  Printer,
  X,
} from 'lucide-react';

type FilterTab = 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_CONFIG: Record<
  OrderStatus | 'not_found',
  { label: string; badgeClass: string; dotClass: string }
> = {
  pending: {
    label: 'Pending',
    badgeClass: 'bg-[#C98A12]/15 text-[#C98A12] border border-[#C98A12]/30',
    dotClass: 'bg-[#C98A12]',
  },
  confirmed: {
    label: 'Confirmed',
    badgeClass: 'bg-[#2F6F8F]/15 text-[#2F6F8F] border border-[#2F6F8F]/30',
    dotClass: 'bg-[#2F6F8F]',
  },
  shipped: {
    label: 'Shipped',
    badgeClass: 'bg-[#6D4C8C]/15 text-[#6D4C8C] border border-[#6D4C8C]/30',
    dotClass: 'bg-[#6D4C8C]',
  },
  delivered: {
    label: 'Delivered',
    badgeClass: 'bg-[#2E7D4F]/15 text-[#2E7D4F] border border-[#2E7D4F]/30',
    dotClass: 'bg-[#2E7D4F]',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-[#B3372F]/15 text-[#B3372F] border border-[#B3372F]/30',
    dotClass: 'bg-[#B3372F]',
  },
  not_found: {
    label: 'Not Found',
    badgeClass: 'bg-[#71717A]/15 text-[#71717A] border border-[#71717A]/30',
    dotClass: 'bg-[#71717A]',
  },
};

export const MyOrdersPage: React.FC = () => {
  usePageSEO({
    title: 'My Orders & Live Status | Arooj',
    description: 'Track all your AROOJ orders and view live delivery updates.',
    noindex: true,
  });

  const navigate = useNavigate();
  const { currentUser, orders: memoryOrders, showToast } = useStore();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [updatedOrderNumbers, setUpdatedOrderNumbers] = useState<Record<string, boolean>>({});
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);
  const [statementModalOrders, setStatementModalOrders] = useState<Order[] | null>(null);

  const userId = currentUser?.id || user?.id;

  const fetchAllOrders = useCallback(
    async (isBackground = false) => {
      if (isBackground) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const orderMap = new Map<string, Order>();

        // 1. If signed in, fetch user's orders from Supabase / memory
        if (userId) {
          try {
            const userOrders = await orderService.getUserOrders(userId);
            if (Array.isArray(userOrders)) {
              for (const ord of userOrders) {
                if (ord?.order_number) {
                  orderMap.set(ord.order_number.toUpperCase(), ord);
                }
              }
            }
          } catch (err) {
            console.warn('Error fetching user orders:', err);
          }
        }

        // 2. Fetch guest orders stored on this device's localStorage
        const storedGuests = getStoredGuestOrders();
        for (const guest of storedGuests) {
          const upperNum = guest.order_number.toUpperCase();
          if (orderMap.has(upperNum)) continue; // Already loaded from user account

          try {
            const fetched = await orderService.getGuestOrder(guest.order_number, guest.phone);
            if (fetched && fetched.order_number) {
              orderMap.set(fetched.order_number.toUpperCase(), fetched);
            } else {
              // Check memoryOrders (demo mode fallback)
              const memoryMatch = memoryOrders.find(
                (o) => o.order_number.toUpperCase() === upperNum
              );
              if (memoryMatch) {
                orderMap.set(upperNum, memoryMatch);
              } else {
                // Placeholder entry so customer sees their saved order number instead of crashing
                const placeholder: Order = {
                  id: `guest-${upperNum}`,
                  order_number: guest.order_number,
                  user_id: null,
                  customer_name: 'Customer',
                  customer_phone: guest.phone,
                  customer_email: null,
                  shipping_address: 'Address recorded in store database',
                  city: 'Pakistan',
                  province: 'Pakistan',
                  postal_code: null,
                  order_notes: null,
                  payment_method: 'cod',
                  payment_status: 'unpaid',
                  status: 'not_found' as any,
                  subtotal: 0,
                  discount_amount: 0,
                  coupon_code: null,
                  delivery_fee: 0,
                  total: 0,
                  created_at: guest.placed_at || new Date().toISOString(),
                  updated_at: guest.placed_at || new Date().toISOString(),
                  items: [],
                };
                orderMap.set(upperNum, placeholder);
              }
            }
          } catch (err) {
            console.warn(`Could not load order ${guest.order_number}:`, err);
          }
        }

        // In Demo Mode, also merge any memory orders created during session
        if (memoryOrders && memoryOrders.length > 0) {
          for (const ord of memoryOrders) {
            if (ord.order_number && (userId ? ord.user_id === userId : true)) {
              if (!orderMap.has(ord.order_number.toUpperCase())) {
                orderMap.set(ord.order_number.toUpperCase(), ord);
              }
            }
          }
        }

        // Convert to array and sort newest first
        const sorted = Array.from(orderMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setOrders(sorted);

        // Check for updated status indicators
        const updatedMap: Record<string, boolean> = {};
        for (const ord of sorted) {
          if (ord.order_number && ord.status) {
            if (isOrderUpdated(ord.order_number, ord.status)) {
              updatedMap[ord.order_number.toUpperCase()] = true;
            }
          }
        }
        setUpdatedOrderNumbers(updatedMap);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId, memoryOrders]
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // Tab visibility change refetch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchAllOrders(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchAllOrders]);

  // 60-second polling interval
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllOrders(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchAllOrders]);

  // Toggle order card expansion
  const toggleExpand = (orderNumber: string, status: string) => {
    const upper = orderNumber.toUpperCase();
    setExpandedOrders((prev) => {
      const nextState = !prev[upper];
      if (nextState) {
        // Customer viewed the updated order, clear badge & record seen
        markOrderSeen(orderNumber, status);
        setUpdatedOrderNumbers((uPrev) => {
          const nextU = { ...uPrev };
          delete nextU[upper];
          return nextU;
        });
      }
      return { ...prev, [upper]: nextState };
    });
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (selectedFilter === 'all') return orders;
    return orders.filter((o) => o.status === selectedFilter);
  }, [orders, selectedFilter]);

  // Count by status
  const counts = useMemo(() => {
    const c = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const ord of orders) {
      if (ord.status in c) {
        c[ord.status as keyof typeof c]++;
      }
    }
    return c;
  }, [orders]);

  const formatDatePK = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString('en-PK', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  const handleExportCSV = (ordersToExport: Order[] = filteredOrders) => {
    if (!ordersToExport || ordersToExport.length === 0) {
      showToast('No orders available to export', 'error');
      return;
    }

    const headers = [
      'Order Number',
      'Date (PKT)',
      'Status',
      'Payment Status',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Shipping Address',
      'City',
      'Province',
      'Total Items',
      'Items Summary',
      'Subtotal (PKR)',
      'Discount (PKR)',
      'Delivery Fee (PKR)',
      'Total Amount (PKR)',
      'Payment Method',
      'Special Notes',
    ];

    const rows = ordersToExport.map((o) => {
      const itemsDetail = (o.items || [])
        .map(
          (it) =>
            `${it.product_name} (${it.variant_label || 'Standard'}) x${it.quantity} - Rs. ${it.line_total}`
        )
        .join('; ');

      return [
        `"${o.order_number}"`,
        `"${formatDatePK(o.created_at).replace(/"/g, '""')}"`,
        `"${(o.status || '').toUpperCase()}"`,
        `"${(o.payment_status || (o.status === 'delivered' ? 'paid' : 'unpaid')).toUpperCase()}"`,
        `"${(o.customer_name || '').replace(/"/g, '""')}"`,
        `"${(o.customer_phone || '').replace(/"/g, '""')}"`,
        `"${(o.customer_email || '').replace(/"/g, '""')}"`,
        `"${(o.shipping_address || '').replace(/"/g, '""')}"`,
        `"${(o.city || '').replace(/"/g, '""')}"`,
        `"${(o.province || 'Pakistan').replace(/"/g, '""')}"`,
        o.items?.reduce((s, it) => s + it.quantity, 0) || 0,
        `"${itemsDetail.replace(/"/g, '""')}"`,
        o.subtotal || 0,
        o.discount_amount || 0,
        o.delivery_fee || 0,
        o.total || 0,
        `"Cash on Delivery (COD)"`,
        `"${(o.order_notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Arooj_My_Orders_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${ordersToExport.length} order(s) to CSV`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const buildWhatsAppLink = (order: Order) => {
    const rawNumber = siteConfig.support.whatsappNumber || siteConfig.support.phone || '+923039160621';
    const cleanNumber = rawNumber.replace(/[^\d]/g, '');
    const message = encodeURIComponent(
      `Assalam-o-Alaikum Arooj Support, I am inquiring about my Order #${order.order_number} (${formatPKR(
        order.total
      )}). Please update me on the delivery status.`
    );
    return `https://wa.me/${cleanNumber}?text=${message}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-full bg-[#B4502F]/10 text-[#B4502F]">
              <Package className="w-5 h-5" strokeWidth={1.5} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A9A7B]">
              Customer Order Hub
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3B2A20]">
            My Orders & Live Status
          </h1>
          <p className="text-xs text-[#6B5B50] mt-1">
            Live updates and offline records for Cash on Delivery orders placed with Arooj.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {/* Export as CSV */}
          <button
            onClick={() => handleExportCSV(filteredOrders)}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full border border-[#E3D5C4] bg-white hover:bg-[#F3E9DC] text-xs font-semibold text-[#3B2A20] transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            title="Export orders as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-[#B4502F]" />
            <span>Export as CSV</span>
          </button>

          {/* Download as PDF */}
          <button
            onClick={() => setStatementModalOrders(filteredOrders)}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full border border-[#E3D5C4] bg-white hover:bg-[#F3E9DC] text-xs font-semibold text-[#3B2A20] transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            title="Download or print orders record as PDF"
          >
            <FileText className="w-3.5 h-3.5 text-[#8A9A7B]" />
            <span>Download as PDF</span>
          </button>

          {/* Refresh Status */}
          <button
            onClick={() => fetchAllOrders(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full border border-[#E3D5C4] bg-white hover:bg-[#F3E9DC] text-xs font-semibold text-[#3B2A20] transition-colors cursor-pointer min-h-[44px]"
            title="Refresh order status from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#B4502F] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>

          {/* Quick Tracker */}
          <Link
            to="/track-order"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-[#3B2A20] hover:bg-[#2b1f17] text-xs font-semibold text-[#F3E9DC] transition-colors cursor-pointer min-h-[44px]"
          >
            <Truck className="w-3.5 h-3.5 text-[#8A9A7B]" strokeWidth={1.5} />
            <span>Tracker</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(
          [
            { id: 'all', label: 'All Orders', count: counts.all },
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
            { id: 'shipped', label: 'Shipped', count: counts.shipped },
            { id: 'delivered', label: 'Delivered', count: counts.delivered },
            { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
          ] as const
        ).map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[38px] cursor-pointer ${
                isActive
                  ? 'bg-[#B4502F] text-white shadow-xs'
                  : 'bg-[#FBF5EC] text-[#3B2A20] border border-[#E3D5C4] hover:bg-[#E3D5C4]/40'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-[#E3D5C4] text-[#3B2A20]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Order List / Skeletons / Empty State */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-40 bg-[#E3D5C4] rounded-md" />
                <div className="h-6 w-20 bg-[#E3D5C4] rounded-full" />
              </div>
              <div className="h-4 w-56 bg-[#E3D5C4]/60 rounded-md" />
              <div className="flex gap-2">
                <div className="w-12 h-12 bg-[#E3D5C4] rounded-[10px]" />
                <div className="w-12 h-12 bg-[#E3D5C4] rounded-[10px]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-[#DDE3D3] text-[#3B2A20] flex items-center justify-center mx-auto shadow-inner">
            <ShoppingBag className="w-8 h-8 text-[#8A9A7B]" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-[#3B2A20]">
              {selectedFilter === 'all'
                ? 'No Orders Placed Yet'
                : `No ${selectedFilter.toUpperCase()} Orders Found`}
            </h3>
            <p className="text-xs text-[#6B5B50] max-w-md mx-auto mt-1 leading-relaxed">
              {selectedFilter === 'all'
                ? 'Orders you place on Arooj will appear here with real-time status updates from our fulfillment hub.'
                : `You currently have no orders in ${selectedFilter} status.`}
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#B4502F] hover:bg-[#a04426] text-white font-semibold text-xs shadow-xs transition-colors min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start Shopping</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = Boolean(expandedOrders[order.order_number.toUpperCase()]);
            const isUpdated = Boolean(updatedOrderNumbers[order.order_number.toUpperCase()]);
            const statusCfg =
              STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.not_found;
            const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;

            const statusOrder = ['pending', 'confirmed', 'shipped', 'delivered'];
            const stepIdx = statusOrder.indexOf(order.status);
            const isCancelled = order.status === 'cancelled';

            return (
              <div
                key={order.id || order.order_number}
                className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] shadow-xs overflow-hidden transition-all duration-200 hover:border-[#8A9A7B]/60"
              >
                {/* Header Card Summary */}
                <div
                  onClick={() => toggleExpand(order.order_number, order.status)}
                  className="p-5 sm:p-6 cursor-pointer select-none space-y-4"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(order.order_number, order.status);
                    }
                  }}
                  aria-expanded={isExpanded}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-base sm:text-lg font-bold text-[#3B2A20]">
                        {order.order_number}
                      </span>

                      {/* Updated Indicator Dot */}
                      {isUpdated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B4502F] text-white text-[10px] font-bold animate-pulse shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          Updated
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full flex items-center gap-1.5 ${statusCfg.badgeClass}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${statusCfg.dotClass}`} />
                        <span>{statusCfg.label}</span>
                      </span>

                      <div className="p-1 rounded-full text-[#6B5B50] hover:text-[#3B2A20] hover:bg-[#E3D5C4]/50">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date, Total, and Items strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6B5B50] pt-1 border-t border-[#E3D5C4]/60">
                    <div>
                      <span>Placed on: </span>
                      <strong className="text-[#3B2A20]">{formatDatePK(order.created_at)}</strong>
                      <span className="mx-2 hidden sm:inline">·</span>
                      <span className="block sm:inline mt-0.5 sm:mt-0">
                        Payment: <strong>Cash on Delivery ({order.payment_status?.toUpperCase() || 'COD'})</strong>
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[#6B5B50]">Total: </span>
                      <span className="font-serif text-lg font-bold text-[#B4502F]">
                        {formatPKR(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Row */}
                  {order.items && order.items.length > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                      <div className="flex -space-x-2 overflow-hidden py-0.5">
                        {order.items.slice(0, 4).map((it) => (
                          <div
                            key={it.id}
                            className="w-10 h-10 rounded-[10px] border-2 border-[#FBF5EC] overflow-hidden bg-[#DDE3D3] shrink-0 shadow-xs"
                          >
                            <ImageWithFallback
                              src={it.image_url}
                              alt={it.product_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-[#6B5B50] font-medium ml-1">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded Detailed Breakdown */}
                {isExpanded && (
                  <div className="border-t border-[#E3D5C4] bg-white p-5 sm:p-7 space-y-6 animate-in fade-in slide-in-from-top-1">
                    {/* Status Stepper Timeline */}
                    <div className="p-4 sm:p-5 rounded-[16px] bg-[#FBF5EC] border border-[#E3D5C4] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B5B50]">
                          Fulfillment & Delivery Progress
                        </span>
                        <span className="text-[11px] text-[#6B5B50]">
                          Live database status: <strong className="text-[#3B2A20]">{order.status}</strong>
                        </span>
                      </div>

                      {isCancelled ? (
                        <div className="p-3.5 bg-[#B3372F]/10 border border-[#B3372F]/30 rounded-[12px] text-[#B3372F] text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>
                            This order was cancelled. Reserved inventory was restored to stock.
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          {[
                            { key: 'pending', title: '1. Placed', desc: 'Received at Arooj' },
                            { key: 'confirmed', title: '2. Confirmed', desc: 'Packed & verified' },
                            { key: 'shipped', title: '3. Shipped', desc: 'In transit with rider' },
                            { key: 'delivered', title: '4. Delivered', desc: 'Collected at doorstep' },
                          ].map((step, idx) => {
                            const isDone = stepIdx >= idx;
                            const isCurrent = stepIdx === idx;

                            return (
                              <div
                                key={step.key}
                                className={`p-3 rounded-[12px] border text-xs transition-all ${
                                  isCurrent
                                    ? 'bg-[#B4502F] text-white border-[#B4502F] shadow-sm'
                                    : isDone
                                    ? 'bg-[#DDE3D3]/40 text-[#3B2A20] border-[#8A9A7B]/40'
                                    : 'bg-white text-[#6B5B50] border-[#E3D5C4]/60 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                                  {isDone ? (
                                    <CheckCircle2
                                      className={`w-3.5 h-3.5 ${
                                        isCurrent ? 'text-white' : 'text-[#2E7D4F]'
                                      }`}
                                    />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-[#6B5B50]" />
                                  )}
                                  <span>{step.title}</span>
                                </div>
                                <p
                                  className={`text-[10px] ${
                                    isCurrent ? 'text-[#F3E9DC]' : 'text-[#6B5B50]'
                                  }`}
                                >
                                  {step.desc}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Ordered Items List */}
                    <div className="space-y-3">
                      <h4 className="font-serif text-sm font-bold text-[#3B2A20]">
                        Items in this Order ({itemCount})
                      </h4>
                      <div className="divide-y divide-[#E3D5C4]/60 border border-[#E3D5C4] rounded-[16px] overflow-hidden">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((it) => (
                            <div
                              key={it.id}
                              className="p-3.5 flex items-center justify-between text-xs bg-white hover:bg-[#FBF5EC]/40"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-[10px] overflow-hidden border border-[#E3D5C4] shrink-0 bg-[#DDE3D3]">
                                  <ImageWithFallback
                                    src={it.image_url}
                                    alt={it.product_name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="font-semibold text-xs text-[#3B2A20]">
                                    {it.product_name}
                                  </p>
                                  <p className="text-[11px] text-[#6B5B50]">
                                    {it.variant_label} · Qty {it.quantity}
                                  </p>
                                </div>
                              </div>
                              <span className="font-serif font-bold text-[#B4502F] text-xs">
                                {formatPKR(it.line_total)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-xs text-[#6B5B50] text-center">
                            Order items saved in store database.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Shipping Address & Pricing Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Shipping Address */}
                      <div className="p-4 rounded-[16px] bg-[#FBF5EC] border border-[#E3D5C4] space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[#3B2A20] font-bold text-xs uppercase tracking-wider">
                          <MapPin className="w-3.5 h-3.5 text-[#B4502F]" />
                          <span>Delivery Destination</span>
                        </div>
                        <p className="text-[#3B2A20] font-medium pt-1">
                          {order.customer_name} ({order.customer_phone})
                        </p>
                        <p className="text-[#6B5B50]">{order.shipping_address}</p>
                        <p className="font-semibold text-[#3B2A20]">
                          {order.city}, {order.province} {order.postal_code || ''}
                        </p>
                      </div>

                      {/* Financial Breakdown */}
                      <div className="p-4 rounded-[16px] bg-[#FBF5EC] border border-[#E3D5C4] space-y-2">
                        <div className="flex justify-between text-[#6B5B50]">
                          <span>Subtotal</span>
                          <span className="font-medium text-[#3B2A20]">
                            {formatPKR(order.subtotal)}
                          </span>
                        </div>

                        {order.discount_amount > 0 && (
                          <div className="flex justify-between text-[#2E7D4F] font-semibold">
                            <span>Voucher Discount</span>
                            <span>- {formatPKR(order.discount_amount)}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-[#6B5B50]">
                          <span>Delivery Fee (Nationwide)</span>
                          <span className="font-bold text-[#8A9A7B] uppercase">FREE</span>
                        </div>

                        <div className="flex justify-between pt-2 border-t border-[#E3D5C4] font-bold text-[#3B2A20] text-sm">
                          <span>Total (Cash on Delivery)</span>
                          <span className="font-serif text-base text-[#B4502F]">
                            {formatPKR(order.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar: Download Invoice, Export CSV, WhatsApp & Live Tracker */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E3D5C4]/60">
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setInvoiceModalOrder(order)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-[#E3D5C4] bg-white hover:bg-[#F3E9DC] text-xs font-semibold text-[#3B2A20] transition-colors cursor-pointer min-h-[44px] shadow-xs"
                          title="View and print official invoice as PDF"
                        >
                          <FileText className="w-4 h-4 text-[#B4502F]" />
                          <span>Download Invoice (PDF)</span>
                        </button>

                        <button
                          onClick={() => handleExportCSV([order])}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-[#E3D5C4] bg-white hover:bg-[#F3E9DC] text-xs font-semibold text-[#3B2A20] transition-colors cursor-pointer min-h-[44px] shadow-xs"
                          title="Export this order as CSV spreadsheet"
                        >
                          <Download className="w-4 h-4 text-[#8A9A7B]" />
                          <span>Export CSV</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <a
                          href={buildWhatsAppLink(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold shadow-xs transition-colors min-h-[44px]"
                        >
                          <WhatsAppIcon className="w-4 h-4 text-white" />
                          <span>WhatsApp</span>
                        </a>

                        <button
                          onClick={() =>
                            navigate(
                              `/track-order?orderNumber=${encodeURIComponent(
                                order.order_number
                              )}&phone=${encodeURIComponent(order.customer_phone)}`
                            )
                          }
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#3B2A20] hover:bg-[#2b1f17] text-white text-xs font-semibold shadow-xs transition-colors min-h-[44px] cursor-pointer"
                        >
                          <Truck className="w-4 h-4 text-[#8A9A7B]" />
                          <span>Track Order</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Scoped Media Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-order-area, #printable-order-area * {
            visibility: visible !important;
          }
          #printable-order-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #1a1a1a !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Single Order Invoice Modal (PDF / Print View) */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-[24px] shadow-2xl border border-[#E3D5C4] my-8 overflow-hidden animate-fade-in">
            {/* Modal Actions Bar (hidden when printing) */}
            <div className="no-print bg-[#FBF5EC] border-b border-[#E3D5C4] px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#B4502F]" />
                <span className="font-serif font-bold text-base text-[#3B2A20]">
                  Invoice #{invoiceModalOrder.order_number}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#3B2A20] hover:bg-[#2b1f17] text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => handleExportCSV([invoiceModalOrder])}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#E3D5C4] bg-white hover:bg-[#F3E9DC] text-[#3B2A20] text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#8A9A7B]" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  onClick={() => setInvoiceModalOrder(null)}
                  className="p-2 rounded-full text-[#6B5B50] hover:text-[#3B2A20] hover:bg-[#E3D5C4]/50 cursor-pointer transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Document */}
            <div id="printable-order-area" className="p-6 sm:p-8 space-y-6 bg-white text-[#3B2A20]">
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-[#E3D5C4]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/assets/aistudio/icon-512_1d7b5876.png"
                      alt="Arooj"
                      className="w-10 h-10 object-contain rounded-lg"
                    />
                    <div>
                      <h2 className="font-serif text-2xl font-bold tracking-tight text-[#3B2A20]">
                        AROOJ
                      </h2>
                      <p className="text-[11px] text-[#6B5B50] font-medium tracking-wider uppercase">
                        Shop smart · Live better
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-[#6B5B50] mt-3 space-y-0.5">
                    <p>Support: +92 303 9160621</p>
                    <p>Email: support@aroj.pk</p>
                    <p>Lahore, Pakistan</p>
                  </div>
                </div>

                <div className="sm:text-right space-y-1">
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#B4502F]/10 text-[#B4502F] border border-[#B4502F]/20">
                    TAX INVOICE / RECEIPT
                  </span>
                  <p className="font-mono font-bold text-base text-[#3B2A20] pt-1">
                    #{invoiceModalOrder.order_number}
                  </p>
                  <p className="text-xs text-[#6B5B50]">
                    Date: {formatDatePK(invoiceModalOrder.created_at)}
                  </p>
                  <p className="text-xs font-semibold uppercase text-[#8A9A7B]">
                    Status: {invoiceModalOrder.status}
                  </p>
                </div>
              </div>

              {/* Bill To & Order Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs pb-4 border-b border-[#E3D5C4]">
                <div>
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-[#8A9A7B] mb-2">
                    Delivered To
                  </h3>
                  <p className="font-bold text-sm text-[#3B2A20]">{invoiceModalOrder.customer_name}</p>
                  <p className="text-[#6B5B50]">{invoiceModalOrder.customer_phone}</p>
                  {invoiceModalOrder.customer_email && (
                    <p className="text-[#6B5B50]">{invoiceModalOrder.customer_email}</p>
                  )}
                  <p className="text-[#3B2A20] mt-1 font-medium">{invoiceModalOrder.shipping_address}</p>
                  <p className="text-[#3B2A20]">
                    {invoiceModalOrder.city}, {invoiceModalOrder.province}{' '}
                    {invoiceModalOrder.postal_code || ''}
                  </p>
                </div>

                <div className="sm:text-right">
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-[#8A9A7B] mb-2">
                    Payment Details
                  </h3>
                  <p className="font-semibold text-xs text-[#3B2A20]">
                    Method: Cash on Delivery (COD)
                  </p>
                  <p className="text-xs text-[#6B5B50]">
                    Payment Status:{' '}
                    <span className="font-bold uppercase text-[#3B2A20]">
                      {invoiceModalOrder.payment_status ||
                        (invoiceModalOrder.status === 'delivered' ? 'Paid' : 'Due on Delivery')}
                    </span>
                  </p>
                  {invoiceModalOrder.order_notes && (
                    <p className="text-xs text-[#6B5B50] italic mt-2">
                      Notes: {invoiceModalOrder.order_notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-bold uppercase tracking-wider text-[11px] text-[#8A9A7B] mb-3">
                  Purchased Items
                </h3>
                <div className="border border-[#E3D5C4] rounded-[16px] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FBF5EC] text-[#3B2A20] font-bold border-b border-[#E3D5C4]">
                      <tr>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3D5C4]">
                      {invoiceModalOrder.items && invoiceModalOrder.items.length > 0 ? (
                        invoiceModalOrder.items.map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-[#FBF5EC]/30">
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-[#3B2A20]">{it.product_name}</p>
                              {it.variant_label && (
                                <p className="text-[11px] text-[#6B5B50]">{it.variant_label}</p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-medium">{it.quantity}</td>
                            <td className="py-2.5 px-3 text-right text-[#6B5B50]">
                              {formatPKR(it.unit_price)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#3B2A20]">
                              {formatPKR(it.line_total)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-3 px-3 text-center text-[#6B5B50]">
                            Order items saved in store database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="flex justify-end pt-2">
                <div className="w-full max-w-xs space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#6B5B50]">
                    <span>Subtotal:</span>
                    <span className="font-medium text-[#3B2A20]">
                      {formatPKR(invoiceModalOrder.subtotal)}
                    </span>
                  </div>
                  {invoiceModalOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-[#2E7D4F] font-semibold">
                      <span>Voucher Discount:</span>
                      <span>- {formatPKR(invoiceModalOrder.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6B5B50]">
                    <span>Delivery Fee:</span>
                    <span className="font-bold text-[#8A9A7B] uppercase">FREE</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-[#3B2A20] text-sm font-bold text-[#3B2A20]">
                    <span>Total Amount (COD):</span>
                    <span className="font-serif text-base text-[#B4502F]">
                      {formatPKR(invoiceModalOrder.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Footer */}
              <div className="pt-4 border-t border-[#E3D5C4] text-center text-[11px] text-[#6B5B50] space-y-1">
                <p className="font-semibold text-[#3B2A20]">
                  Thank you for shopping with Arooj!
                </p>
                <p>
                  This is a computer-generated invoice for your Cash on Delivery order.
                  For queries or returns, contact WhatsApp +92 303 9160621.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Statement Modal (All / Filtered Orders Record PDF) */}
      {statementModalOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-[24px] shadow-2xl border border-[#E3D5C4] my-8 overflow-hidden animate-fade-in">
            {/* Modal Actions Bar (hidden when printing) */}
            <div className="no-print bg-[#FBF5EC] border-b border-[#E3D5C4] px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#8A9A7B]" />
                <span className="font-serif font-bold text-base text-[#3B2A20]">
                  Orders Statement ({statementModalOrders.length} orders)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#3B2A20] hover:bg-[#2b1f17] text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => handleExportCSV(statementModalOrders)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#E3D5C4] bg-white hover:bg-[#F3E9DC] text-[#3B2A20] text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#8A9A7B]" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setStatementModalOrders(null)}
                  className="p-2 rounded-full text-[#6B5B50] hover:text-[#3B2A20] hover:bg-[#E3D5C4]/50 cursor-pointer transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Statement Document */}
            <div id="printable-order-area" className="p-6 sm:p-8 space-y-6 bg-white text-[#3B2A20]">
              {/* Statement Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-[#E3D5C4]">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/aistudio/icon-512_1d7b5876.png"
                    alt="Arooj"
                    className="w-12 h-12 object-contain rounded-lg"
                  />
                  <div>
                    <h2 className="font-serif text-2xl font-bold tracking-tight text-[#3B2A20]">
                      AROOJ
                    </h2>
                    <p className="text-xs text-[#6B5B50] font-medium tracking-wider uppercase">
                      Customer Orders Statement · Official Offline Record
                    </p>
                  </div>
                </div>

                <div className="sm:text-right text-xs text-[#6B5B50] space-y-1">
                  <p>Generated: {new Date().toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="font-semibold text-[#3B2A20]">Support WhatsApp: +92 303 9160621</p>
                  <p>Store: arooj.pk</p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-[16px] bg-[#FBF5EC] border border-[#E3D5C4]">
                  <p className="text-[11px] uppercase tracking-wider text-[#6B5B50] font-semibold">Total Orders</p>
                  <p className="font-serif text-xl font-bold text-[#3B2A20] mt-1">{statementModalOrders.length}</p>
                </div>
                <div className="p-3.5 rounded-[16px] bg-[#FBF5EC] border border-[#E3D5C4]">
                  <p className="text-[11px] uppercase tracking-wider text-[#6B5B50] font-semibold">Total Spend</p>
                  <p className="font-serif text-xl font-bold text-[#B4502F] mt-1">
                    {formatPKR(statementModalOrders.reduce((acc, o) => acc + (o.total || 0), 0))}
                  </p>
                </div>
                <div className="p-3.5 rounded-[16px] bg-[#FBF5EC] border border-[#E3D5C4]">
                  <p className="text-[11px] uppercase tracking-wider text-[#6B5B50] font-semibold">Delivered</p>
                  <p className="font-serif text-xl font-bold text-[#2E7D4F] mt-1">
                    {statementModalOrders.filter((o) => o.status === 'delivered').length}
                  </p>
                </div>
                <div className="p-3.5 rounded-[16px] bg-[#FBF5EC] border border-[#E3D5C4]">
                  <p className="text-[11px] uppercase tracking-wider text-[#6B5B50] font-semibold">In Progress</p>
                  <p className="font-serif text-xl font-bold text-[#C98A12] mt-1">
                    {statementModalOrders.filter((o) => ['pending', 'confirmed', 'shipped'].includes(o.status)).length}
                  </p>
                </div>
              </div>

              {/* Orders Table */}
              <div className="border border-[#E3D5C4] rounded-[16px] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FBF5EC] text-[#3B2A20] font-bold border-b border-[#E3D5C4]">
                    <tr>
                      <th className="py-2.5 px-3">Order #</th>
                      <th className="py-2.5 px-3">Date (PKT)</th>
                      <th className="py-2.5 px-3">Customer / City</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Items</th>
                      <th className="py-2.5 px-3 text-right">Total (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3D5C4]">
                    {statementModalOrders.map((ord) => (
                      <tr key={ord.id || ord.order_number} className="hover:bg-[#FBF5EC]/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#3B2A20]">
                          #{ord.order_number}
                        </td>
                        <td className="py-2.5 px-3 text-[#6B5B50]">
                          {formatDatePK(ord.created_at)}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-[#3B2A20]">{ord.customer_name}</p>
                          <p className="text-[11px] text-[#6B5B50]">{ord.city}</p>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FBF5EC] border border-[#E3D5C4]">
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-[#6B5B50]">
                          {ord.items?.reduce((s, it) => s + it.quantity, 0) || ord.items?.length || 1}
                        </td>
                        <td className="py-2.5 px-3 text-right font-serif font-bold text-[#B4502F]">
                          {formatPKR(ord.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Statement Footer */}
              <div className="pt-4 border-t border-[#E3D5C4] text-center text-[11px] text-[#6B5B50]">
                <p>This statement reflects your Cash on Delivery order history recorded at Arooj.</p>
                <p>For support or verification, contact WhatsApp +92 303 9160621 or support@aroj.pk.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

