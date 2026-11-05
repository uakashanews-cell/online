/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { TrustStrip } from '../components/common/TrustStrip';
import { ProductCard } from '../components/shop/ProductCard';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { ArrowRight, ChevronRight, CheckCircle2, Sparkles, Tag, ShieldCheck } from 'lucide-react';
import { usePageSEO } from '../hooks/usePageSEO';
import { useQuery } from '@tanstack/react-query';
import { bannerService } from '../services/bannerService';
import { HomeHeroBanner } from '../components/home/HomeHeroBanner';
import { DELIVERY_TIME_TEXT, RETURN_POLICY_TEXT } from '../config/site';

interface HomePageProps {
  onSelectProduct?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
  openAuthModal?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectProduct,
  onNavigateTab,
  openAuthModal,
}) => {
  usePageSEO({ title: 'Arooj | Shop smart · Live better' });
  const navigate = useNavigate();
  const { activeProducts, activeCategories, applyCouponCode } = useStore();

  const { data: banner } = useQuery({
    queryKey: ['home-banner', 'public'],
    queryFn: bannerService.getPublicBanner,
    staleTime: 60 * 1000,
  });

  const handleNavigate = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      if (tab === 'shop') navigate('/shop');
      else if (tab.startsWith('category-')) navigate(`/category/${tab.replace('category-', '')}`);
      else if (tab === 'track-order') navigate('/track-order');
      else navigate('/');
    }
  };

  const handleSelectProduct = (id: string) => {
    if (onSelectProduct) {
      onSelectProduct(id);
    } else {
      const prod = activeProducts.find((p) => p.id === id);
      navigate(prod ? `/product/${prod.slug}` : `/product/${id}`);
    }
  };

  const featuredProducts = activeProducts.filter((p) => p.is_featured).slice(0, 4);
  const newArrivals = [...activeProducts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-16 sm:space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#F3E9DC] border-b border-[#E3D5C4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Small sage pill */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8A9A7B]/15 border border-[#8A9A7B]/40 text-[#3B2A20] text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#8A9A7B]" />
                <span>Free delivery · Pay on arrival</span>
              </div>

              {/* Large Fraunces headline */}
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[58px] font-bold tracking-tight text-[#3B2A20] leading-[1.12]">
                Little things that make a house feel like home
              </h1>

              {/* Short paragraph */}
              <p className="text-base sm:text-lg text-[#6B5B50] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Curated Pakistani essentials crafted for comfort, quiet dignity, and genuine beauty. Free nationwide doorstep delivery with 100% Cash on Delivery.
              </p>

              {/* Terracotta pill button */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => handleNavigate('shop')}
                  className="w-full sm:w-auto btn-primary gap-2 text-sm shadow-xs"
                >
                  Explore the shop
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>

                <button
                  onClick={() => handleNavigate('track-order')}
                  className="w-full sm:w-auto btn-secondary text-sm"
                >
                  Track your parcel
                </button>
              </div>

              {/* Verified Trust badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-[#6B5B50]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> Free Delivery Nationwide
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> 100% Cash on Delivery
                </span>
                {DELIVERY_TIME_TEXT.trim() !== '' && (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> {DELIVERY_TIME_TEXT.trim()}
                  </span>
                )}
                {RETURN_POLICY_TEXT.trim() !== '' && (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> {RETURN_POLICY_TEXT.trim()}
                  </span>
                )}
              </div>
            </div>

            {/* Right Hero Showcase: HomeHeroBanner */}
            <div className="lg:col-span-5 relative">
              <HomeHeroBanner banner={banner || null} />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <TrustStrip />

      {/* Pill Category Chips */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-bold text-[#8A9A7B] tracking-wider uppercase">
              Curated Collections
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3B2A20] mt-1">
              Shop by Category
            </h2>
          </div>
          <button
            onClick={() => handleNavigate('shop')}
            className="text-xs font-semibold text-[#3B2A20] hover:text-[#B4502F] flex items-center gap-1 transition-colors"
          >
            All Departments <ChevronRight className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Pill category chips row */}
        <div className="flex flex-wrap gap-2.5 pb-2">
          <button
            onClick={() => handleNavigate('shop')}
            className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#3B2A20] text-[#F3E9DC] hover:bg-[#B4502F] transition-all min-h-[44px]"
          >
            All Items
          </button>
          {activeCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleNavigate(`category-${category.slug}`)}
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#FBF5EC] text-[#3B2A20] hover:bg-[#8A9A7B]/20 border border-[#E3D5C4] transition-all min-h-[44px]"
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Products: 2 columns mobile, 3 tablet, 4 desktop */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold text-[#8A9A7B] tracking-wider uppercase">
              Handpicked Craft
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3B2A20] mt-1">
              Featured Products
            </h2>
          </div>
          <button
            onClick={() => handleNavigate('shop')}
            className="text-xs font-semibold text-[#3B2A20] hover:text-[#B4502F] flex items-center gap-1 transition-colors"
          >
            View More <ChevronRight className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} />
          </button>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-12 text-center space-y-3 shadow-xs">
            <p className="font-serif text-lg font-bold text-[#3B2A20]">No products yet. Check back soon!</p>
            <p className="text-xs text-[#6B5B50] max-w-md mx-auto">
              Our curated collection is currently being assembled with grace and dignity.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={handleSelectProduct}
                openAuthModal={openAuthModal}
              />
            ))}
          </div>
        )}
      </section>

      {/* Promotional Closing Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] bg-[#3B2A20] text-[#F3E9DC] p-6 sm:p-10 relative overflow-hidden border border-[#6B5B50]/40 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Subtle decorative circles */}
          <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none translate-x-10 translate-y-10">
            <div className="w-64 h-64 rounded-full bg-[#C65D3B]" />
          </div>

          <div className="space-y-2.5 text-center md:text-left relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-[#8A9A7B]/40 text-[#DDE3D3] text-xs font-semibold">
              <Tag className="w-3.5 h-3.5 text-[#DDE3D3]" strokeWidth={1.5} />
              <span>Inaugural Khayr Blessing</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#F3E9DC]">
              Save 10% Extra on Your First Purchase
            </h3>
            <p className="text-[#F3E9DC]/80 text-xs sm:text-sm max-w-lg leading-relaxed">
              Use code <strong className="text-white font-mono bg-white/15 px-2 py-0.5 rounded-full border border-white/20">WELCOME10</strong> during checkout on orders of Rs. 2,000 or more.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-10">
            <button
              onClick={() => {
                applyCouponCode('WELCOME10');
                handleNavigate('shop');
              }}
              className="btn-primary"
            >
              Apply WELCOME10 &amp; Shop
            </button>
          </div>
        </div>
      </section>

      {/* New Arrivals: 2 columns mobile, 3 tablet, 4 desktop */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold text-[#8A9A7B] tracking-wider uppercase">
              Fresh in Collection
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3B2A20] mt-1">
              New Arrivals
            </h2>
          </div>
          <button
            onClick={() => handleNavigate('shop')}
            className="text-xs font-semibold text-[#3B2A20] hover:text-[#B4502F] flex items-center gap-1 transition-colors"
          >
            See All <ChevronRight className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {newArrivals.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={handleSelectProduct}
              openAuthModal={openAuthModal}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
