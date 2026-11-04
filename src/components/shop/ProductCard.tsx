/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { formatPKR } from '../../utils/ecommerce-logic';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { Heart, Eye, Star } from 'lucide-react';
import { isDemoMode } from '../../lib/supabaseClient';

interface ProductCardProps {
  product: Product;
  onSelect: (productId: string) => void;
  openAuthModal?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  openAuthModal,
}) => {
  const { isInWishlist, toggleWishlist, categories, reviews } = useStore();
  const wishlisted = isInWishlist(product.id);
  const [isHovered, setIsHovered] = useState(false);

  // Review stats - only shown in demo mode
  const productReviews = isDemoMode && reviews ? reviews.filter((r) => r.product_id === product.id) : [];
  const hasReviews = isDemoMode && productReviews.length > 0;
  const avgRating = hasReviews
    ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
    : null;

  // Find category name
  const category = categories.find((c) => c.id === product.category_id);

  // Calculate discount percentage if compare_at_price exists
  const hasDiscount =
    product.compare_at_price && product.compare_at_price > product.base_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.base_price) / product.compare_at_price!) * 100)
    : 0;

  // Calculate total stock across active variants
  const activeVariants = product.variants ? product.variants.filter((v) => v.is_active) : [];
  const totalStock = activeVariants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
  const isOutOfStock = activeVariants.length === 0 || totalStock === 0;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = toggleWishlist(product.id);
    if (result.requiresAuth && openAuthModal) {
      openAuthModal();
    }
  };

  const hasSecondImage = product.images && product.images.length > 1;
  const displayImage = isHovered && hasSecondImage ? product.images[1] : product.images[0];

  return (
    <div
      onClick={() => onSelect(product.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] overflow-hidden p-3 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* 1:1 Image Container */}
      <div className="relative aspect-square w-full bg-[#DDE3D3] rounded-[16px] overflow-hidden">
        <ImageWithFallback
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-all duration-500 ease-out"
        />

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-[#3B2A20]/70 backdrop-blur-[2px] flex items-center justify-center p-4 z-20">
            <span className="px-3.5 py-1.5 rounded-full bg-[#FBF5EC] text-[#3B2A20] text-xs font-bold uppercase tracking-wider shadow-md">
              Out of Stock
            </span>
          </div>
        )}

        {/* Badges top-left */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {hasDiscount && (
            <span className="bg-[#B4502F] text-white text-[10.5px] font-bold px-2.5 py-0.5 rounded-full shadow-xs tracking-wide">
              Save {discountPercent}%
            </span>
          )}
          {product.is_featured && !hasDiscount && (
            <span className="bg-[#8A9A7B] text-white text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              Curated
            </span>
          )}
        </div>

        {/* Wishlist Button top-right */}
        <button
          onClick={handleWishlistClick}
          aria-label={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full backdrop-blur-xs flex items-center justify-center transition-all shadow-xs z-10 ${
            wishlisted
              ? 'bg-[#B3372F]/15 text-[#B3372F]'
              : 'bg-white/90 text-[#6B5B50] hover:text-[#B3372F] hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-[#B3372F]' : ''}`} strokeWidth={1.5} />
        </button>

        {/* Quick View Button on Hover */}
        {!isOutOfStock && (
          <div className="absolute inset-x-3 bottom-3 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <span className="w-full py-2 bg-[#3B2A20]/90 hover:bg-[#3B2A20] text-[#F3E9DC] text-xs font-semibold rounded-full text-center shadow-md backdrop-blur-xs flex items-center justify-center gap-1.5 min-h-[38px]">
              <Eye className="w-3.5 h-3.5 text-[#DDE3D3]" strokeWidth={1.5} />
              View Options
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-3 pb-1 px-1 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            {category && (
              <p className="text-[11px] font-semibold text-[#8A9A7B] uppercase tracking-wider">
                {category.name}
              </p>
            )}
            {hasReviews && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#3B2A20] ml-auto">
                <Star className="w-3 h-3 fill-[#C98A12] text-[#C98A12]" />
                <span>{avgRating}</span>
                <span className="text-[10px] text-[#6B5B50] font-normal">({productReviews.length})</span>
              </span>
            )}
          </div>
          <h3 className="font-serif font-bold text-[#3B2A20] text-sm sm:text-[15px] leading-snug line-clamp-2 group-hover:text-[#B4502F] transition-colors">
            {product.name}
          </h3>

          <div className="mt-1 flex items-center gap-2 text-xs text-[#6B5B50]">
            {product.variants && product.variants.length > 1 && (
              <span>{product.variants.length} options ·</span>
            )}
            {isOutOfStock ? (
              <span className="text-[#B3372F] font-semibold">Out of stock</span>
            ) : totalStock <= 5 ? (
              <span className="text-[#C98A12] font-semibold">Only {totalStock} left</span>
            ) : (
              <span className="text-[#2E7D4F] font-semibold">In stock</span>
            )}
          </div>
        </div>

        {/* Price & Free Delivery Tag */}
        <div className="mt-3 pt-2.5 border-t border-[#E3D5C4] flex items-baseline justify-between gap-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-bold text-[15px] sm:text-base text-[#B4502F] tabular-nums">
              {formatPKR(product.base_price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#6B5B50] line-through tabular-nums">
                {formatPKR(product.compare_at_price!)}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold text-[#3B2A20] bg-[#DDE3D3] px-2.5 py-0.5 rounded-full shrink-0">
            Free Delivery
          </span>
        </div>
      </div>
    </div>
  );
};
