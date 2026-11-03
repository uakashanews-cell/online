/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { formatPKR } from '../utils/ecommerce-logic';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { WhatsAppIcon } from '../components/common/WhatsAppIcon';
import { formatCartMessage, buildWhatsAppUrl } from '../lib/whatsapp';
import { Trash2, Plus, Minus, ArrowRight, Tag, ShoppingBag, Truck } from 'lucide-react';
import { usePageSEO } from '../hooks/usePageSEO';

interface CartPageProps {
  onNavigateTab?: (tab: string) => void;
  onSelectProduct?: (productId: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigateTab, onSelectProduct }) => {
  usePageSEO({ title: 'Cart | BARVAKA', noindex: true });
  const navigate = useNavigate();
  const {
    products,
    cart,
    removeFromCart,
    updateCartQuantity,
    cartTotals,
    appliedCoupon,
    applyCouponCode,
    removeCoupon,
  } = useStore();

  const handleNavigate = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      if (tab === 'checkout') navigate('/checkout');
      else if (tab === 'shop') navigate('/shop');
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

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError('');
    const res = applyCouponCode(couponInput);
    if (res.success) {
      setCouponInput('');
    } else {
      setCouponError(res.message);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 bg-[#DDE3D3] text-[#3B2A20] rounded-full flex items-center justify-center mx-auto shadow-xs">
          <ShoppingBag className="w-7 h-7 text-[#8A9A7B]" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#3B2A20]">Your Cart is Empty</h2>
        <p className="text-xs text-[#6B5B50] max-w-md mx-auto leading-relaxed">
          You haven't added any products yet. Discover premium fabrics, attars, and everyday essentials with 100% Free Nationwide Delivery!
        </p>
        <div>
          <button
            onClick={() => handleNavigate('shop')}
            className="px-8 py-3.5 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#a04426] text-white font-semibold text-xs shadow-md transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            Start Shopping Now <ArrowRight className="w-4 h-4 text-white" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#3B2A20]">Shopping Cart</h1>
        <p className="text-xs text-[#6B5B50] mt-1">
          {cartTotals.itemCount} {cartTotals.itemCount === 1 ? 'item' : 'items'} in your bag · Free Cash on Delivery in Pakistan
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List: 2-column desktop (items left, summary right) */}
        <div className="lg:col-span-8 bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-5 sm:p-6 shadow-xs space-y-5">
          {cart.map((item) => {
            const prod = products.find((p) => p.id === item.product_id);
            const variant = prod?.variants.find((v) => v.id === item.variant_id);
            const isInactive = !prod?.is_active || !variant?.is_active;
            const currentStock = variant ? variant.stock_quantity : item.max_stock;
            const isOutOfStock = currentStock <= 0;
            const isStockExceeded = item.quantity > currentStock;
            const hasIssue = isInactive || isOutOfStock || isStockExceeded;

            const lineTotal = item.unit_price * item.quantity;
            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#E3D5C4]/60 last:border-0 last:pb-0 ${
                  hasIssue ? 'bg-[#B3372F]/5 -mx-3 px-3 py-3 rounded-[16px] border border-[#B3372F]/20' : ''
                }`}
              >
                <div
                  onClick={() => handleSelectProduct(item.product_id)}
                  className="flex items-center gap-4 cursor-pointer group flex-1 min-w-0"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[16px] overflow-hidden border border-[#E3D5C4] shrink-0 bg-[#DDE3D3]">
                    <ImageWithFallback
                      src={item.image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif font-bold text-sm sm:text-base text-[#3B2A20] group-hover:text-[#B4502F] truncate transition-colors">
                      {item.product_name}
                    </h3>
                    <p className="text-xs font-medium text-[#6B5B50] mt-0.5">
                      {item.variant_label}
                    </p>
                    <p className="text-xs text-[#B4502F] font-semibold mt-1 tabular-nums">
                      {formatPKR(item.unit_price)} each
                    </p>
                    {hasIssue && (
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#B3372F] text-white font-bold text-[10px]">
                        {isInactive
                          ? 'Item Unavailable'
                          : isOutOfStock
                          ? 'Out of Stock'
                          : `Only ${currentStock} left in stock`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls & Line Total */}
                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-[#E3D5C4] rounded-full bg-white p-1 min-h-[44px]">
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      className="p-1.5 min-w-[32px] text-[#6B5B50] hover:text-[#3B2A20] cursor-pointer"
                      aria-label={`Decrease quantity of ${item.product_name}`}
                    >
                      <Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-[#3B2A20] tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.max_stock}
                      className="p-1.5 min-w-[32px] text-[#6B5B50] hover:text-[#3B2A20] disabled:opacity-30 cursor-pointer"
                      aria-label={`Increase quantity of ${item.product_name}`}
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-24">
                    <span className="font-bold text-sm sm:text-base text-[#B4502F] tabular-nums block">
                      {formatPKR(lineTotal)}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.product_name} from cart`}
                    className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#6B5B50] hover:text-[#B3372F] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary & Coupon Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 shadow-xs space-y-5">
            <h2 className="font-serif text-lg font-bold text-[#3B2A20] border-b border-[#E3D5C4] pb-3">
              Order Summary
            </h2>

            {/* Coupon Code Section */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3B2A20] block mb-2">
                Discount Coupon
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#DDE3D3]/40 border border-[#8A9A7B]/40 text-xs text-[#3B2A20]">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} />
                    <span>
                      Code: <strong className="font-mono font-bold">{appliedCoupon.code}</strong> applied
                    </span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-[#B3372F] font-semibold hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        if (couponError) setCouponError('');
                      }}
                      placeholder="e.g. WELCOME10"
                      className="flex-1 uppercase font-mono text-xs px-3 py-2.5 min-h-[44px] bg-white border border-[#E3D5C4] rounded-[12px] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 min-h-[44px] bg-[#B4502F] hover:bg-[#a04426] text-white rounded-full text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                  {couponError && (
                    <p className="text-xs text-[#B3372F] font-medium pt-0.5">{couponError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-3 text-xs text-[#6B5B50] pt-2 border-t border-[#E3D5C4]/60">
              <div className="flex justify-between">
                <span>Subtotal ({cartTotals.itemCount} items)</span>
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
                <span>Nationwide Express Delivery</span>
                <span className="font-bold text-[#8A9A7B] uppercase tracking-wide bg-[#DDE3D3] px-2.5 py-0.5 rounded-full text-[10px]">
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

            {/* Reassurance Strip */}
            <div className="p-3 bg-[#DDE3D3]/40 border border-[#8A9A7B]/30 text-[#3B2A20] rounded-[16px] text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-[#3B2A20]">
                <Truck className="w-3.5 h-3.5 text-[#8A9A7B]" strokeWidth={1.5} /> Free Delivery &amp; Open Parcel
              </p>
              <p className="text-[#6B5B50] text-[11px]">
                Pay cash at your doorstep only after verifying the package.
              </p>
            </div>

            {/* Checkout Button */}
            {(() => {
              const hasIssue = cart.some((item) => {
                const prod = products.find((p) => p.id === item.product_id);
                const variant = prod?.variants.find((v) => v.id === item.variant_id);
                return !prod?.is_active || !variant?.is_active || (variant?.stock_quantity ?? 0) < item.quantity;
              });

              const handleOrderViaWhatsApp = () => {
                if (cart.length === 0) return;
                const message = formatCartMessage({
                  items: cart,
                  subtotal: cartTotals.subtotal,
                  discount: cartTotals.discount,
                  total: cartTotals.total,
                  couponCode: appliedCoupon?.code,
                  origin: window.location.origin,
                });
                const url = buildWhatsAppUrl(message);
                window.open(url, '_blank', 'noopener,noreferrer');
              };

              return (
                <div className="space-y-2.5">
                  <button
                    onClick={() => handleNavigate('checkout')}
                    disabled={hasIssue}
                    className="w-full py-3.5 px-6 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#a04426] disabled:bg-[#E3D5C4] disabled:cursor-not-allowed text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={handleOrderViaWhatsApp}
                    disabled={hasIssue}
                    className="w-full py-3 px-6 min-h-[44px] rounded-full border-[1.5px] border-[#3B2A20] hover:bg-[#3B2A20] hover:text-[#F3E9DC] text-[#3B2A20] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                    <span>Order via WhatsApp</span>
                  </button>

                  {hasIssue && (
                    <p className="text-center text-xs text-[#B3372F] font-medium">
                      Please adjust out-of-stock items before proceeding to checkout.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="text-center">
            <button
              onClick={() => handleNavigate('shop')}
              className="text-xs text-[#6B5B50] hover:text-[#B4502F] underline font-medium cursor-pointer"
            >
              ← Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
