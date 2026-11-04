/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { CheckoutFormData, Order } from '../types';
import { formatPKR, validateCheckoutForm } from '../utils/ecommerce-logic';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { ShieldCheck, Truck, Banknote, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { usePageSEO } from '../hooks/usePageSEO';

const PAKISTAN_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Abbottabad',
  'Bahawalpur',
  'Sargodha',
  'Sukkur',
  'Mardan',
  'Mirpur (AJK)',
];

interface CheckoutPageProps {
  onNavigateTab?: (tab: string) => void;
  onOrderSuccess?: (order: Order) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onNavigateTab,
  onOrderSuccess,
}) => {
  usePageSEO({ title: 'Checkout | Arooj', noindex: true });
  const navigate = useNavigate();
  const { cart, products, cartTotals, placeOrder, currentUser, showToast } = useStore();

  const handleNavigate = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      if (tab === 'cart') navigate('/cart');
      else if (tab === 'shop') navigate('/shop');
      else navigate('/');
    }
  };

  const handleOrderSuccess = (order: Order) => {
    if (onOrderSuccess) {
      onOrderSuccess(order);
    } else {
      navigate(`/order-success/${order.order_number}`);
    }
  };

  const invalidCartItems = cart.filter((item) => {
    const prod = products.find((p) => p.id === item.product_id);
    if (!prod || !prod.is_active) return true;
    const variant = prod.variants.find((v) => v.id === item.variant_id);
    if (!variant || !variant.is_active || variant.stock_quantity < item.quantity) return true;
    return false;
  });

  const hasInvalidItems = invalidCartItems.length > 0;

  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: currentUser?.full_name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    address: currentUser?.address || '',
    city: currentUser?.city || 'Karachi',
    province: currentUser?.province || 'Sindh',
    postalCode: currentUser?.postal_code || '',
    orderNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || currentUser.full_name,
        phone: prev.phone || currentUser.phone,
        email: prev.email || currentUser.email,
        address: prev.address || currentUser.address || '',
        city: prev.city || currentUser.city || 'Karachi',
        province: prev.province || currentUser.province || 'Sindh',
        postalCode: prev.postalCode || currentUser.postal_code || '',
      }));
    }
  }, [currentUser]);

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#3B2A20]">Your Cart is Empty</h2>
        <p className="text-xs text-[#6B5B50]">Please select your items before proceeding to checkout.</p>
        <button
          onClick={() => handleNavigate('shop')}
          className="px-6 py-3 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#a04426] text-white font-semibold text-xs shadow-xs cursor-pointer"
        >
          Browse Products
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasInvalidItems) {
      showToast('Some items in your cart are no longer available in the requested quantity.', 'error');
      navigate('/cart');
      return;
    }

    const validation = validateCheckoutForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      showToast('Please fix the errors in the delivery form', 'error');
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await placeOrder(formData);
      if (result.success && result.order) {
        handleOrderSuccess(result.order);
      } else {
        showToast(result.error || 'Failed to place order. Returning to cart.', 'error');
        navigate('/cart');
      }
    } catch {
      showToast('An unexpected error occurred while placing your order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E3D5C4] pb-4">
        <div>
          <button
            onClick={() => handleNavigate('cart')}
            className="text-xs font-semibold text-[#3B2A20] hover:text-[#B4502F] flex items-center gap-1 mb-1 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Cart
          </button>
          <h1 className="font-serif text-3xl font-bold text-[#3B2A20]">Cash on Delivery Checkout</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#3B2A20] bg-[#DDE3D3] px-3.5 py-1.5 rounded-full font-medium">
          <Lock className="w-3.5 h-3.5 text-[#8A9A7B]" strokeWidth={1.5} />
          <span>Single-Form Checkout</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Delivery Details Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#3B2A20] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#8A9A7B]" strokeWidth={1.5} /> Delivery Address (Pakistan)
              </h2>
              <p className="text-xs text-[#6B5B50] mt-0.5">
                {currentUser
                  ? `Ordering as ${currentUser.full_name} (${currentUser.email})`
                  : 'Fast checkout as Guest · No registration required'}
              </p>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                  Full Name <span className="text-[#B3372F]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Muhammad Usman"
                  className={`w-full px-4 py-2.5 min-h-[44px] bg-white border rounded-[12px] text-xs text-[#3B2A20] placeholder:text-[#6B5B50] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] ${
                    errors.fullName ? 'border-[#B3372F] bg-[#B3372F]/5' : 'border-[#E3D5C4]'
                  }`}
                />
                {errors.fullName && (
                  <p className="text-xs text-[#B3372F] mt-1 font-medium">{errors.fullName}</p>
                )}
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                    Mobile Number <span className="text-[#B3372F]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0300-1234567"
                    className={`w-full px-4 py-2.5 min-h-[44px] bg-white border rounded-[12px] text-xs text-[#3B2A20] placeholder:text-[#6B5B50] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] ${
                      errors.phone ? 'border-[#B3372F] bg-[#B3372F]/5' : 'border-[#E3D5C4]'
                    }`}
                  />
                  <span className="text-[11px] text-[#6B5B50] block mt-0.5">
                    For rider call upon delivery
                  </span>
                  {errors.phone && (
                    <p className="text-xs text-[#B3372F] mt-1 font-medium">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                    Email Address <span className="text-[#6B5B50] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usman@example.com"
                    className={`w-full px-4 py-2.5 min-h-[44px] bg-white border rounded-[12px] text-xs text-[#3B2A20] placeholder:text-[#6B5B50] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] ${
                      errors.email ? 'border-[#B3372F] bg-[#B3372F]/5' : 'border-[#E3D5C4]'
                    }`}
                  />
                  <span className="text-[11px] text-[#6B5B50] block mt-0.5">
                    For order invoice receipt
                  </span>
                  {errors.email && (
                    <p className="text-xs text-[#B3372F] mt-1 font-medium">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Complete Address */}
              <div>
                <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                  Complete Street Address <span className="text-[#B3372F]">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="House / Flat #, Street #, Sector / Area, Landmark..."
                  className={`w-full px-4 py-2.5 bg-white border rounded-[12px] text-xs text-[#3B2A20] placeholder:text-[#6B5B50] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] ${
                    errors.address ? 'border-[#B3372F] bg-[#B3372F]/5' : 'border-[#E3D5C4]'
                  }`}
                />
                {errors.address && (
                  <p className="text-xs text-[#B3372F] mt-1 font-medium">{errors.address}</p>
                )}
              </div>

              {/* City, Province, Postal Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                    City <span className="text-[#B3372F]">*</span>
                  </label>
                  <input
                    list="pakistan-cities"
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Lahore"
                    className="w-full px-3 py-2.5 min-h-[44px] bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                  />
                  <datalist id="pakistan-cities">
                    {PAKISTAN_CITIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                    Province
                  </label>
                  <select
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-3 py-2.5 min-h-[44px] bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                  >
                    <option value="Sindh">Sindh</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Khyber Pakhtunkhwa">KPK</option>
                    <option value="Balochistan">Balochistan</option>
                    <option value="Islamabad Capital">Islamabad Capital</option>
                    <option value="Azad Kashmir">Azad Kashmir</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                    Postal Code <span className="text-[#6B5B50] font-normal">(Opt)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="75500"
                    className="w-full px-3 py-2.5 min-h-[44px] bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                  />
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                  Special Delivery Instructions <span className="text-[#6B5B50] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.orderNotes}
                  onChange={(e) => setFormData({ ...formData, orderNotes: e.target.value })}
                  placeholder="e.g. Call before arrival, deliver after 2 PM..."
                  className="w-full px-4 py-2.5 min-h-[44px] bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Card: COD Highlighted */}
          <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 shadow-xs space-y-4">
            <h2 className="font-serif text-lg font-bold text-[#3B2A20] flex items-center gap-2">
              <Banknote className="w-5 h-5 text-[#8A9A7B]" strokeWidth={1.5} /> Payment Method
            </h2>

            <div className="p-4 rounded-[16px] bg-[#DDE3D3]/40 border-2 border-[#B4502F] flex items-start gap-3.5">
              <div className="w-5 h-5 rounded-full bg-[#B4502F] text-white flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-[#3B2A20]">
                    Cash on Delivery (COD)
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-[#DDE3D3] text-[#3B2A20] border border-[#8A9A7B]/40 rounded-full">
                    No Upfront Payment
                  </span>
                </div>
                <p className="text-xs text-[#3B2A20]/90 leading-relaxed">
                  Pay <strong>{formatPKR(cartTotals.total)}</strong> to the delivery rider when your parcel arrives. You are welcome to inspect the package upon delivery.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Items & Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 shadow-xs space-y-5">
            <h2 className="font-serif text-lg font-bold text-[#3B2A20] border-b border-[#E3D5C4] pb-3">
              Order Summary ({cartTotals.itemCount})
            </h2>

            {/* Line items review */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-xs">
                  <div className="w-12 h-12 rounded-[12px] overflow-hidden border border-[#E3D5C4] shrink-0 bg-[#DDE3D3]">
                    <ImageWithFallback
                      src={item.image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#3B2A20] truncate">{item.product_name}</p>
                    <p className="text-[#6B5B50]">{item.variant_label}</p>
                    <p className="text-[#6B5B50]">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-[#B4502F] shrink-0 tabular-nums">
                    {formatPKR(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-2.5 text-xs text-[#6B5B50] pt-3 border-t border-[#E3D5C4]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-[#3B2A20] tabular-nums">
                  {formatPKR(cartTotals.subtotal)}
                </span>
              </div>

              {cartTotals.discount > 0 && (
                <div className="flex justify-between text-[#2E7D4F]">
                  <span>Coupon Discount</span>
                  <span className="font-semibold tabular-nums">- {formatPKR(cartTotals.discount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Nationwide Delivery</span>
                <span className="font-bold text-[#8A9A7B] bg-[#DDE3D3] px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                  FREE
                </span>
              </div>

              <div className="pt-3 border-t border-[#E3D5C4] flex justify-between items-baseline">
                <span className="font-bold text-sm text-[#3B2A20]">Total (Pay on Delivery)</span>
                <span className="font-serif text-2xl font-bold text-[#B4502F] tabular-nums">
                  {formatPKR(cartTotals.total)}
                </span>
              </div>
            </div>

            {/* Submit Order Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#a04426] disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={1.5} />
              {isSubmitting ? 'Confirming Order...' : 'Confirm Order (Cash on Delivery)'}
            </button>

            <div className="text-center text-[11px] text-[#6B5B50] flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8A9A7B]" strokeWidth={1.5} />
              <span>Inspection allowed upon arrival before payment.</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
