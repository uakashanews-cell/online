/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { formatPKR } from '../utils/ecommerce-logic';
import { ProductCard } from '../components/shop/ProductCard';
import { WhatsAppIcon } from '../components/common/WhatsAppIcon';
import { formatOrderMessage, buildWhatsAppUrl } from '../lib/whatsapp';
import {
  User,
  Package,
  Heart,
  LogOut,
  MapPin,
  Save,
  CheckCircle2,
  Clock,
  ArrowRight,
  Truck,
  ChevronLeft,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { usePageSEO } from '../hooks/usePageSEO';

interface AccountPageProps {
  initialTab?: 'profile' | 'orders' | 'wishlist';
  onNavigateTab?: (tab: string) => void;
  onSelectProduct?: (productId: string) => void;
  onTrackOrder?: (orderNumber: string, phone: string) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  initialTab,
  onNavigateTab,
  onSelectProduct,
  onTrackOrder,
}) => {
  usePageSEO({ title: 'My Account | Arooj', noindex: true });
  const navigate = useNavigate();
  const location = useLocation();
  const { orderNumber } = useParams<{ orderNumber: string }>();

  // Determine subtab
  const computedTab =
    initialTab ||
    (location.pathname.includes('wishlist')
      ? 'wishlist'
      : location.pathname.includes('orders')
      ? 'orders'
      : 'profile');

  const {
    currentUser,
    orders,
    wishlist,
    products,
    updateCurrentUserProfile,
    logout,
    showToast,
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'profile' | 'wishlist'>(computedTab);

  useEffect(() => {
    if (location.pathname.includes('wishlist')) {
      setActiveSubTab('wishlist');
    } else if (location.pathname.includes('orders')) {
      setActiveSubTab('orders');
    }
  }, [location.pathname]);

  const handleNavigate = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      if (tab === 'shop') navigate('/shop');
      else navigate('/');
    }
  };

  const handleSelectProduct = (productId: string) => {
    if (onSelectProduct) {
      onSelectProduct(productId);
    } else {
      const prod = products.find((p) => p.id === productId);
      navigate(prod ? `/product/${prod.slug}` : `/product/${productId}`);
    }
  };

  const handleTrack = (num: string, ph: string) => {
    if (onTrackOrder) {
      onTrackOrder(num, ph);
    } else {
      navigate(`/track-order?orderNumber=${encodeURIComponent(num)}&phone=${encodeURIComponent(ph)}`);
    }
  };

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    full_name: currentUser?.full_name || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    city: currentUser?.city || '',
    province: currentUser?.province || 'Sindh',
    postal_code: currentUser?.postal_code || '',
  });

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#3B2A20]">Sign In Required</h2>
        <p className="text-sm text-[#6B5B50]">Please sign in to view your account, order history, and wishlist.</p>
        <Link
          to="/login?redirect=/account"
          className="px-6 py-2.5 rounded-full bg-[#B4502F] hover:bg-[#a04426] text-white font-semibold text-xs inline-block min-h-[44px] leading-[44px] cursor-pointer"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  // Filter orders for this customer
  const userOrders = orders.filter(
    (o) =>
      o.user_id === currentUser.id ||
      (currentUser.phone && o.customer_phone.includes(currentUser.phone.slice(-7)))
  );

  // Wishlist products
  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id) && p.is_active);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile(profileForm);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Account Header */}
      <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#3B2A20] text-[#F3E9DC] flex items-center justify-center font-serif text-2xl font-bold shadow-md">
            {currentUser.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-[#3B2A20]">
                {currentUser.full_name}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#DDE3D3] text-[#3B2A20] border border-[#8A9A7B]/40">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-[#6B5B50] mt-0.5">{currentUser.email} · {currentUser.phone}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-4 py-2 border-[1.5px] border-[#3B2A20] hover:bg-[#3B2A20] hover:text-[#F3E9DC] text-[#3B2A20] rounded-full text-xs font-semibold min-h-[44px] transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E3D5C4] pb-2">
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
            activeSubTab === 'orders'
              ? 'bg-[#B4502F] text-white shadow-xs'
              : 'text-[#3B2A20] hover:bg-[#DDE3D3]/50'
          }`}
        >
          <Package className="w-4 h-4" />
          My Orders ({userOrders.length})
        </button>

        <button
          onClick={() => setActiveSubTab('wishlist')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
            activeSubTab === 'wishlist'
              ? 'bg-[#B4502F] text-white shadow-xs'
              : 'text-[#3B2A20] hover:bg-[#DDE3D3]/50'
          }`}
        >
          <Heart className="w-4 h-4" />
          Wishlist ({wishlistedProducts.length})
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
            activeSubTab === 'profile'
              ? 'bg-[#B4502F] text-white shadow-xs'
              : 'text-[#3B2A20] hover:bg-[#DDE3D3]/50'
          }`}
        >
          <User className="w-4 h-4" />
          Profile & Address
        </button>
      </div>

      {/* Tab 1: Orders */}
      {activeSubTab === 'orders' && (
        <div className="space-y-6">
          {/* If viewing a single order detail via /account/orders/:orderNumber */}
          {orderNumber ? (
            (() => {
              const selectedOrder = orders.find(
                (o) =>
                  o.order_number.toLowerCase() === orderNumber.toLowerCase() ||
                  o.id === orderNumber
              );

              if (!selectedOrder) {
                return (
                  <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-10 text-center space-y-4">
                    <AlertCircle className="w-10 h-10 text-[#C98A12] mx-auto" />
                    <h3 className="font-serif text-lg font-bold text-[#3B2A20]">Order Not Found</h3>
                    <p className="text-xs text-[#6B5B50]">
                      We could not locate order <code>{orderNumber}</code> associated with your account.
                    </p>
                    <button
                      onClick={() => navigate('/account/orders')}
                      className="px-5 py-2.5 bg-[#B4502F] hover:bg-[#a04426] text-white rounded-full text-xs font-bold min-h-[44px] cursor-pointer"
                    >
                      ← Back to All Orders
                    </button>
                  </div>
                );
              }

              const statusOrder = ['pending', 'confirmed', 'shipped', 'delivered'];
              const currentStepIndex = statusOrder.indexOf(selectedOrder.status);
              const isCancelled = selectedOrder.status === 'cancelled';

              return (
                <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 shadow-xs space-y-6">
                  {/* Top Bar: Back & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3D5C4] pb-4">
                    <div>
                      <button
                        onClick={() => navigate('/account/orders')}
                        className="text-xs font-bold text-[#6B5B50] hover:text-[#3B2A20] flex items-center gap-1 mb-2 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back to All Orders
                      </button>
                      <h2 className="font-mono text-2xl font-extrabold text-[#3B2A20]">
                        {selectedOrder.order_number}
                      </h2>
                      <p className="text-xs text-[#6B5B50] mt-0.5">
                        Placed on {new Date(selectedOrder.created_at).toLocaleDateString('en-PK', { dateStyle: 'full' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full ${
                          selectedOrder.status === 'delivered'
                            ? 'bg-[#2E7D4F]/15 text-[#2E7D4F] border border-[#2E7D4F]/30'
                            : selectedOrder.status === 'shipped'
                            ? 'bg-[#8A9A7B]/20 text-[#3B2A20] border border-[#8A9A7B]/40'
                            : selectedOrder.status === 'confirmed'
                            ? 'bg-[#2F6F8F]/15 text-[#2F6F8F] border border-[#2F6F8F]/30'
                            : selectedOrder.status === 'cancelled'
                            ? 'bg-[#B3372F]/15 text-[#B3372F] border border-[#B3372F]/30'
                            : 'bg-[#C98A12]/15 text-[#C98A12] border border-[#C98A12]/30'
                        }`}
                      >
                        {selectedOrder.status}
                      </span>

                      <button
                        onClick={() => handleTrack(selectedOrder.order_number, selectedOrder.customer_phone)}
                        className="px-4 py-2 bg-[#B4502F] hover:bg-[#a04426] text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs min-h-[44px] transition-colors cursor-pointer"
                      >
                        <Truck className="w-4 h-4 text-white" /> Live Tracking
                      </button>
                    </div>
                  </div>

                  {/* 4-Step Status Stepper */}
                  <div className="p-6 bg-[#DDE3D3]/30 rounded-[16px] border border-[#8A9A7B]/30">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B5B50] block mb-4">
                      Dispatch & Delivery Timeline
                    </span>

                    {isCancelled ? (
                      <div className="p-4 bg-[#B3372F]/10 border border-[#B3372F]/30 rounded-[12px] text-[#B3372F] text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>This order was cancelled. Reserved inventory was restored to available stock.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { key: 'pending', title: '1. Order Placed', desc: 'Received at Arooj' },
                          { key: 'confirmed', title: '2. Confirmed & Packed', desc: 'Quality verified at hub' },
                          { key: 'shipped', title: '3. Handed to Courier', desc: 'In transit with rider' },
                          { key: 'delivered', title: '4. Delivered', desc: 'Doorstep COD collected' },
                        ].map((step, idx) => {
                          const isDone = currentStepIndex >= idx;
                          const isCurrent = currentStepIndex === idx;

                          return (
                            <div
                              key={step.key}
                              className={`p-3.5 rounded-[12px] border transition-all ${
                                isCurrent
                                  ? 'bg-[#B4502F] text-white border-[#B4502F] shadow-md'
                                  : isDone
                                  ? 'bg-white text-[#3B2A20] border-[#E3D5C4]'
                                  : 'bg-white/60 text-[#6B5B50] border-[#E3D5C4]/60 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {isDone ? (
                                  <CheckCircle2 className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-[#2E7D4F]'}`} />
                                ) : (
                                  <Clock className="w-4 h-4 text-[#6B5B50]" />
                                )}
                                <span className="font-bold text-xs">{step.title}</span>
                              </div>
                              <p className={`text-[11px] ${isCurrent ? 'text-[#F3E9DC]' : 'text-[#6B5B50]'}`}>
                                {step.desc}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Consignee & Shipping Destination */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-[16px] bg-white border border-[#E3D5C4] space-y-1">
                      <span className="font-bold text-[#6B5B50] uppercase tracking-wider text-[10px] block mb-2">
                        Customer & Contact Details
                      </span>
                      <p className="font-bold text-sm text-[#3B2A20]">{selectedOrder.customer_name}</p>
                      <p className="font-mono text-[#3B2A20]">{selectedOrder.customer_phone}</p>
                      {selectedOrder.customer_email && (
                        <p className="text-[#6B5B50]">{selectedOrder.customer_email}</p>
                      )}
                    </div>

                    <div className="p-4 rounded-[16px] bg-white border border-[#E3D5C4] space-y-1">
                      <span className="font-bold text-[#6B5B50] uppercase tracking-wider text-[10px] block mb-2">
                        Delivery Destination
                      </span>
                      <p className="text-[#3B2A20]">{selectedOrder.shipping_address}</p>
                      <p className="font-bold text-[#3B2A20]">
                        {selectedOrder.city}, {selectedOrder.province} {selectedOrder.postal_code || ''}
                      </p>
                      <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#DDE3D3] text-[#3B2A20] font-bold text-[10px]">
                        Free Delivery Nationwide (Rs. 0)
                      </span>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-3">
                    <h3 className="font-serif text-base font-bold text-[#3B2A20]">
                      Ordered Products & Quantities
                    </h3>
                    <div className="divide-y divide-[#E3D5C4] border border-[#E3D5C4] rounded-[16px] overflow-hidden">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="p-4 flex items-center justify-between text-xs bg-white hover:bg-[#FBF5EC]">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="w-14 h-14 object-cover rounded-[12px] border border-[#E3D5C4]"
                            />
                            <div>
                              <p className="font-bold text-sm text-[#3B2A20]">{item.product_name}</p>
                              <p className="text-[#6B5B50] font-medium">{item.variant_label}</p>
                              <p className="text-[11px] font-mono text-[#6B5B50] mt-0.5">SKU: {item.sku || item.variant_id.slice(-6).toUpperCase()}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-[#6B5B50]">
                              {item.quantity} × {formatPKR(item.unit_price)}
                            </p>
                            <p className="font-serif text-sm font-bold text-[#B4502F]">
                              {formatPKR(item.line_total)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="flex justify-end">
                    <div className="w-full sm:w-80 space-y-2 text-xs bg-white p-5 rounded-[16px] border border-[#E3D5C4]">
                      <div className="flex justify-between text-[#6B5B50]">
                        <span>Items Subtotal:</span>
                        <span className="font-semibold text-[#3B2A20]">{formatPKR(selectedOrder.subtotal)}</span>
                      </div>
                      {selectedOrder.discount_amount > 0 && (
                        <div className="flex justify-between text-[#2E7D4F] font-semibold">
                          <span>Discount Voucher ({selectedOrder.coupon_code}):</span>
                          <span>- {formatPKR(selectedOrder.discount_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#6B5B50]">
                        <span>Delivery Fee:</span>
                        <span className="font-bold text-[#8A9A7B] uppercase">FREE</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t-2 border-[#3B2A20] font-serif text-lg font-bold text-[#3B2A20]">
                        <span>Cash on Delivery Total:</span>
                        <span className="text-[#B4502F]">{formatPKR(selectedOrder.total)}</span>
                      </div>
                      <p className="text-[11px] text-[#6B5B50] text-right mt-1">
                        * Exact cash to be paid to the courier rider upon delivery.
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp Fast Confirmation Callout */}
                  <div className="p-4 sm:p-5 rounded-[16px] bg-[#DDE3D3]/40 border border-[#8A9A7B]/30 text-center space-y-2.5">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[#3B2A20]">
                        Confirm your order faster by sending it to us on WhatsApp
                      </p>
                      <p className="text-[11px] text-[#6B5B50] mt-0.5">
                        Instantly share your order summary with customer support for priority processing.
                      </p>
                    </div>

                    <a
                      href={buildWhatsAppUrl(formatOrderMessage({ order: selectedOrder, origin: window.location.origin }))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 min-h-[44px] rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
                    >
                      <WhatsAppIcon className="w-4 h-4 text-white" />
                      <span>Send Order on WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              {/* Dedicated My Orders Hub Card */}
              <div className="bg-[#DDE3D3]/40 rounded-[20px] border border-[#8A9A7B]/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8A9A7B] text-white flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-[#3B2A20]">
                      Dedicated Order History & Live Status Hub
                    </h3>
                    <p className="text-xs text-[#6B5B50] mt-0.5">
                      View real-time fulfillment timelines, filter by status, and contact WhatsApp support.
                    </p>
                  </div>
                </div>

                <Link
                  to="/my-orders"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B4502F] hover:bg-[#a04426] text-white rounded-full text-xs font-semibold shadow-xs min-h-[44px] transition-colors shrink-0"
                >
                  <span>Open My Orders Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {userOrders.length === 0 ? (
            <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-12 text-center space-y-3">
              <Package className="w-10 h-10 text-[#8A9A7B] mx-auto" />
              <h3 className="font-serif font-bold text-base text-[#3B2A20]">No Orders Placed Yet</h3>
              <p className="text-xs text-[#6B5B50]">
                You haven't placed any orders with this account. Browse our catalog and enjoy Free Delivery!
              </p>
              <button
                onClick={() => handleNavigate('shop')}
                className="px-6 py-2.5 bg-[#B4502F] hover:bg-[#a04426] text-white text-xs font-bold rounded-full min-h-[44px] cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {userOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-5 sm:p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3D5C4] pb-4">
                    <div>
                      <span className="font-mono text-base font-extrabold text-[#3B2A20]">
                        {order.order_number}
                      </span>
                      <p className="text-xs text-[#6B5B50] mt-0.5">
                        Placed on {new Date(order.created_at).toLocaleDateString('en-PK', { dateStyle: 'long' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                          order.status === 'delivered'
                            ? 'bg-[#2E7D4F]/15 text-[#2E7D4F] border border-[#2E7D4F]/30'
                            : order.status === 'shipped'
                            ? 'bg-[#8A9A7B]/20 text-[#3B2A20] border border-[#8A9A7B]/40'
                            : order.status === 'confirmed'
                            ? 'bg-[#2F6F8F]/15 text-[#2F6F8F] border border-[#2F6F8F]/30'
                            : order.status === 'cancelled'
                            ? 'bg-[#B3372F]/15 text-[#B3372F] border border-[#B3372F]/30'
                            : 'bg-[#C98A12]/15 text-[#C98A12] border border-[#C98A12]/30'
                        }`}
                      >
                        {order.status}
                      </span>

                      <button
                        onClick={() => navigate(`/account/orders/${order.order_number}`)}
                        className="text-xs font-bold text-[#3B2A20] hover:text-[#B4502F] flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E3D5C4] bg-white hover:bg-[#F3E9DC] transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </button>

                      <button
                        onClick={() => handleTrack(order.order_number, order.customer_phone)}
                        className="text-xs font-bold text-[#B4502F] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Live Tracking <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image_url}
                            alt=""
                            className="w-10 h-10 object-cover rounded-[8px] border border-[#E3D5C4]"
                          />
                          <div>
                            <p className="font-semibold text-[#3B2A20]">{item.product_name}</p>
                            <p className="text-[#6B5B50]">{item.variant_label} · Qty {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold text-[#B4502F]">{formatPKR(item.line_total)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#E3D5C4] pt-3 flex items-center justify-between text-xs">
                    <span className="text-[#6B5B50]">Payment: Cash on Delivery ({order.payment_status.toUpperCase()})</span>
                    <span className="font-serif text-base font-extrabold text-[#3B2A20]">
                      Total: <span className="text-[#B4502F]">{formatPKR(order.total)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </div>
      )}

      {/* Tab 2: Wishlist */}
      {activeSubTab === 'wishlist' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#3B2A20]">
              Saved in Wishlist ({wishlistedProducts.length})
            </h2>
            {wishlistedProducts.length > 0 && (
              <button
                onClick={() => handleNavigate('shop')}
                className="text-xs font-semibold text-[#B4502F] hover:underline cursor-pointer"
              >
                Continue Shopping
              </button>
            )}
          </div>

          {wishlistedProducts.length === 0 ? (
            <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-12 text-center space-y-3 shadow-xs">
              <Heart className="w-10 h-10 text-[#8A9A7B] mx-auto" />
              <h3 className="font-serif font-bold text-base text-[#3B2A20]">Your Wishlist is Empty</h3>
              <p className="text-xs text-[#6B5B50]">Save items you love by clicking the heart icon on any product.</p>
              <button
                onClick={() => handleNavigate('shop')}
                className="px-6 py-2.5 bg-[#B4502F] hover:bg-[#a04426] text-white text-xs font-bold rounded-full min-h-[44px] cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {wishlistedProducts.map((p) => {
                const activeVars = p.variants.filter((v) => v.is_active);
                const hasVariantChoice = activeVars.length > 1 || (activeVars[0] && (activeVars[0].size || activeVars[0].color));

                return (
                  <div
                    key={p.id}
                    className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div
                      onClick={() => handleSelectProduct(p.id)}
                      className="cursor-pointer group p-3"
                    >
                      <div className="relative aspect-square bg-[#DDE3D3] rounded-[16px] overflow-hidden">
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3 space-y-1">
                        <h3 className="font-serif font-bold text-sm text-[#3B2A20] line-clamp-1 group-hover:text-[#B4502F]">
                          {p.name}
                        </h3>
                        <p className="font-serif font-extrabold text-sm text-[#B4502F]">
                          {formatPKR(p.base_price)}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 grid grid-cols-2 gap-2 border-t border-[#E3D5C4] mt-2">
                      <button
                        onClick={() => {
                          const { toggleWishlist } = useStore();
                          toggleWishlist(p.id);
                        }}
                        className="py-2.5 px-3 border border-[#E3D5C4] hover:bg-[#B3372F]/10 text-[#3B2A20] hover:text-[#B3372F] rounded-full text-xs font-semibold transition-colors text-center min-h-[44px] cursor-pointer"
                      >
                        Remove
                      </button>

                      <button
                        onClick={() => navigate(`/product/${p.slug}`)}
                        className="py-2.5 px-3 bg-[#B4502F] hover:bg-[#a04426] text-white rounded-full text-xs font-bold transition-colors text-center min-h-[44px] cursor-pointer"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Profile */}
      {activeSubTab === 'profile' && (
        <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <h2 className="font-serif text-xl font-bold text-[#3B2A20] border-b border-[#E3D5C4] pb-3">
            Profile & Delivery Details
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Read-Only Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                Email Address <span className="text-[#6B5B50] font-normal">(read-only)</span>
              </label>
              <input
                type="email"
                disabled
                readOnly
                value={currentUser.email}
                className="w-full px-4 py-2.5 bg-[#DDE3D3]/30 border border-[#E3D5C4] text-[#6B5B50] rounded-[12px] text-xs cursor-not-allowed font-medium min-h-[44px]"
              />
              <span className="text-[11px] text-[#6B5B50] block mt-0.5">
                Your email is permanently tied to your customer order records.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                Mobile Number (Pakistan)
              </label>
              <input
                type="tel"
                required
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                Default Address
              </label>
              <textarea
                rows={2}
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                placeholder="House, Street, Area..."
                className="w-full px-4 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  placeholder="e.g. Islamabad"
                  className="w-full px-3 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                  Province
                </label>
                <input
                  type="text"
                  value={profileForm.province}
                  onChange={(e) => setProfileForm({ ...profileForm, province: e.target.value })}
                  placeholder="e.g. Punjab"
                  className="w-full px-3 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 bg-[#B4502F] hover:bg-[#a04426] text-white font-bold text-xs rounded-full shadow-md min-h-[44px] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Profile Details
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
