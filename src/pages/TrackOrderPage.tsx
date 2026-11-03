/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Order, OrderStatus } from '../types';
import { formatPKR } from '../utils/ecommerce-logic';
import { siteConfig } from '../config/site';
import { WhatsAppIcon } from '../components/common/WhatsAppIcon';
import { formatOrderMessage, buildWhatsAppUrl } from '../lib/whatsapp';
import {
  Search,
  CheckCircle2,
  Truck,
  Home,
  XCircle,
  Clock,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { usePageSEO } from '../hooks/usePageSEO';

interface TrackOrderPageProps {
  initialOrderNumber?: string;
  initialPhone?: string;
}

export const TrackOrderPage: React.FC<TrackOrderPageProps> = ({
  initialOrderNumber,
  initialPhone,
}) => {
  usePageSEO({ title: 'Track Order | BARVAKA' });
  const [searchParams] = useSearchParams();
  const queryOrderNum = searchParams.get('orderNumber') || '';
  const queryPhone = searchParams.get('phone') || '';

  const effOrderNum = initialOrderNumber || queryOrderNum;
  const effPhone = initialPhone || queryPhone;

  const { findOrderByTracking, fetchOrderByTracking, orders } = useStore();

  const [orderNumber, setOrderNumber] = useState(effOrderNum);
  const [phone, setPhone] = useState(effPhone);
  const [searched, setSearched] = useState(Boolean(effOrderNum && effPhone));
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrder, setFoundOrder] = useState<Order | null>(() => {
    if (effOrderNum && effPhone) {
      return findOrderByTracking(effOrderNum, effPhone);
    }
    return null;
  });

  useEffect(() => {
    if (effOrderNum && effPhone) {
      setOrderNumber(effOrderNum);
      setPhone(effPhone);
      const immediate = findOrderByTracking(effOrderNum, effPhone);
      if (immediate) {
        setFoundOrder(immediate);
        setSearched(true);
      } else if (fetchOrderByTracking) {
        setIsSearching(true);
        fetchOrderByTracking(effOrderNum, effPhone).then((res) => {
          setFoundOrder(res);
          setSearched(true);
          setIsSearching(false);
        });
      }
    }
  }, [effOrderNum, effPhone, findOrderByTracking, fetchOrderByTracking]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) return;

    setIsSearching(true);
    let result = findOrderByTracking(orderNumber, phone);
    if (!result && fetchOrderByTracking) {
      result = await fetchOrderByTracking(orderNumber, phone);
    }
    setFoundOrder(result);
    setSearched(true);
    setIsSearching(false);
  };

  const steps: { key: OrderStatus; label: string; desc: string; icon: any }[] = [
    { key: 'pending', label: 'Order Placed', desc: 'Received in our system', icon: Clock },
    { key: 'confirmed', label: 'Order Confirmed', desc: 'Inspected and packed', icon: CheckCircle2 },
    { key: 'shipped', label: 'Dispatched (In Transit)', desc: 'Courier rider on the road', icon: Truck },
    { key: 'delivered', label: 'Delivered', desc: 'Handed over at doorstep', icon: Home },
  ];

  const getStepStatus = (stepKey: OrderStatus, currentStatus: OrderStatus) => {
    if (currentStatus === 'cancelled') return 'cancelled';

    const orderHierarchy: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];
    const currentIndex = orderHierarchy.indexOf(currentStatus);
    const stepIndex = orderHierarchy.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return 'bg-[#2E7D4F]/15 text-[#2E7D4F] border border-[#2E7D4F]/30';
      case 'shipped':
        return 'bg-[#8A9A7B]/20 text-[#3B2A20] border border-[#8A9A7B]/40';
      case 'confirmed':
        return 'bg-[#2F6F8F]/15 text-[#2F6F8F] border border-[#2F6F8F]/30';
      case 'cancelled':
        return 'bg-[#B3372F]/15 text-[#B3372F] border border-[#B3372F]/30';
      case 'pending':
      default:
        return 'bg-[#C98A12]/15 text-[#C98A12] border border-[#C98A12]/30';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl font-bold text-[#3B2A20]">Track Your Parcel</h1>
        <p className="text-xs sm:text-sm text-[#6B5B50] max-w-md mx-auto">
          Enter your <strong>BRV Order Number</strong> and the <strong>Mobile Number</strong> used during checkout to view live status.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#3B2A20] mb-1.5">
              Order Number
            </label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. BRV-261029-A7K2"
              className="w-full font-mono uppercase text-xs px-4 py-2.5 min-h-[44px] bg-white border border-[#E3D5C4] rounded-[12px] text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#3B2A20] mb-1.5">
              Mobile Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0300-1234567"
              className="w-full text-xs px-4 py-2.5 min-h-[44px] bg-white border border-[#E3D5C4] rounded-[12px] text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 min-h-[44px] bg-[#B4502F] hover:bg-[#a04426] text-white font-semibold text-xs rounded-full shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Search className="w-4 h-4 text-white" strokeWidth={1.5} />
              Track
            </button>
          </div>
        </form>

        {/* Demo Orders Quick Fill */}
        {orders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#E3D5C4]/60 flex flex-wrap items-center gap-2 text-xs text-[#6B5B50]">
            <span className="font-semibold text-[#3B2A20]">Quick Demo Lookup:</span>
            {orders.slice(0, 3).map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setOrderNumber(o.order_number);
                  setPhone(o.customer_phone);
                  setFoundOrder(o);
                  setSearched(true);
                }}
                className="px-3 py-1 bg-white hover:bg-[#DDE3D3] text-[#3B2A20] rounded-full font-mono text-[11px] border border-[#E3D5C4] cursor-pointer"
              >
                {o.order_number} ({o.status})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Section */}
      {searched && (
        <>
          {foundOrder ? (
            <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 shadow-xs space-y-8 animate-in fade-in">
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3D5C4] pb-5">
                <div>
                  <span className="text-xs font-semibold text-[#8A9A7B] uppercase tracking-wider">
                    Parcel Details
                  </span>
                  <h2 className="font-mono text-2xl font-bold text-[#3B2A20] mt-0.5">
                    {foundOrder.order_number}
                  </h2>
                  <p className="text-xs text-[#6B5B50] mt-1">
                    Placed on {new Date(foundOrder.created_at).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                  </p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(
                      foundOrder.status
                    )}`}
                  >
                    {foundOrder.status}
                  </span>
                </div>
              </div>

              {/* Visual Timeline (if not cancelled) */}
              {foundOrder.status !== 'cancelled' ? (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3B2A20]">
                    Delivery Progress
                  </h3>

                  <div className="relative grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {steps.map((s) => {
                      const state = getStepStatus(s.key, foundOrder.status);
                      const isComplete = state === 'completed' || state === 'current';
                      const Icon = s.icon;

                      return (
                        <div
                          key={s.key}
                          className={`p-4 rounded-[16px] border transition-all ${
                            state === 'current'
                              ? 'bg-[#DDE3D3]/50 border-2 border-[#B4502F]'
                              : isComplete
                              ? 'bg-white border-[#E3D5C4] text-[#3B2A20]'
                              : 'bg-white/60 border-[#E3D5C4]/60 text-[#6B5B50] opacity-60'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 ${
                              state === 'current'
                                ? 'bg-[#B4502F] text-white'
                                : isComplete
                                ? 'bg-[#3B2A20] text-white'
                                : 'bg-[#E3D5C4] text-[#6B5B50]'
                            }`}
                          >
                            <Icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                          </div>
                          <p className="font-bold text-xs text-[#3B2A20]">{s.label}</p>
                          <p className="text-[11px] text-[#6B5B50] mt-0.5">{s.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#B3372F]/10 border border-[#B3372F]/30 rounded-[16px] flex items-start gap-3 text-[#B3372F] text-xs">
                  <XCircle className="w-5 h-5 text-[#B3372F] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <strong className="block font-semibold">Order Cancelled</strong>
                    <span>This order has been cancelled. For inquiries or reinstatement, contact our WhatsApp helpline at {siteConfig.support.whatsappDisplay}.</span>
                  </div>
                </div>
              )}

              {/* Order Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#6B5B50] bg-white p-5 rounded-[16px] border border-[#E3D5C4]/60">
                <div className="space-y-1.5">
                  <span className="font-semibold text-[#3B2A20] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> Destination
                  </span>
                  <p className="font-medium text-[#3B2A20]">{foundOrder.customer_name}</p>
                  <p>{foundOrder.shipping_address}, {foundOrder.city}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="font-semibold text-[#3B2A20] flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> Payment Mode
                  </span>
                  <p className="font-medium text-[#3B2A20]">Cash on Delivery (COD)</p>
                  <p className="font-serif font-bold text-[#B4502F] text-sm tabular-nums">
                    Amount Due: {formatPKR(foundOrder.total)}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3B2A20]">
                  Ordered Items ({foundOrder.items.length})
                </h3>
                <div className="divide-y divide-[#E3D5C4]/60 border-y border-[#E3D5C4]/60">
                  {foundOrder.items.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-[#3B2A20]">{item.product_name}</p>
                        <p className="text-[#6B5B50]">{item.variant_label} · Qty: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-[#B4502F] tabular-nums">
                        {formatPKR(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp Fast Confirmation Callout */}
              <div className="p-4 sm:p-5 rounded-[16px] bg-[#DDE3D3]/40 border border-[#8A9A7B]/30 text-center space-y-2.5">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[#3B2A20]">
                    Confirm your order faster by sending it to us on WhatsApp
                  </p>
                  <p className="text-[11px] text-[#6B5B50] mt-0.5">
                    Need instant courier coordination or updates? Message our support desk in Rahim Yar Khan directly.
                  </p>
                </div>

                <a
                  href={buildWhatsAppUrl(formatOrderMessage({ order: foundOrder, origin: window.location.origin }))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 min-h-[44px] rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>Send Order on WhatsApp</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-8 text-center space-y-3 shadow-xs">
              <p className="font-serif text-lg font-bold text-[#3B2A20]">No Order Found</p>
              <p className="text-xs text-[#6B5B50]">
                We could not find an order matching "{orderNumber}" with phone "{phone}". Please check your order confirmation details or contact our WhatsApp helpline.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
