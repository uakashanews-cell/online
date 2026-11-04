/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { HomeBanner } from '../../types';
import { Logo } from '../common/Logo';
import { ArrowRight, Truck } from 'lucide-react';

interface HomeHeroBannerProps {
  banner: HomeBanner | null;
  /** When used in admin live preview, override click behavior or pass custom preview banner */
  isPreview?: boolean;
}

export const HomeHeroBanner: React.FC<HomeHeroBannerProps> = ({ banner, isPreview = false }) => {
  // 1. If banner exists and has an image
  if (banner && banner.is_active && banner.image_url) {
    const content = (
      <div className="relative w-full aspect-4/5 sm:aspect-square lg:aspect-4/5 rounded-[48px] overflow-hidden shadow-lg border border-[#E3D5C4] group">
        <img
          src={banner.image_url}
          alt={banner.headline}
          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        />
        {/* Dark brown overlay (about 55% to 80% opacity) ensuring >= 4.5:1 text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#3B2A20]/90 via-[#3B2A20]/60 to-transparent flex flex-col justify-end p-6 sm:p-8 md:p-10 text-[#F3E9DC]">
          {banner.label && (
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold bg-[#8A9A7B] text-[#F3E9DC] w-fit mb-3 shadow-xs">
              {banner.label}
            </span>
          )}
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#F3E9DC] leading-snug tracking-tight mb-2">
            {banner.headline}
          </h3>
          {banner.subtext && (
            <p className="text-xs sm:text-sm text-[#F3E9DC]/90 line-clamp-3 mb-6 max-w-md font-normal leading-relaxed">
              {banner.subtext}
            </p>
          )}
          {isPreview ? (
            <span className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-full bg-[#B4502F] text-white text-xs font-semibold shadow-md w-fit">
              <span>{banner.button_text || 'Explore'}</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </span>
          ) : (
            <Link
              to={banner.button_link || '/shop'}
              className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#964225] text-white text-xs font-semibold shadow-md transition-all w-fit cursor-pointer"
            >
              <span>{banner.button_text || 'Explore'}</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
          )}
        </div>
      </div>
    );
    return content;
  }

  // 2. If banner exists without an image: rounded sage block with cream card and geometric shapes
  if (banner && banner.is_active) {
    return (
      <div className="relative w-full aspect-4/5 sm:aspect-square lg:aspect-4/5 rounded-[48px] bg-[#8A9A7B] overflow-hidden shadow-lg flex items-center justify-center p-6 sm:p-8 border border-[#8A9A7B]/40">
        {/* Decorative CSS shapes */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#C65D3B]/40 blur-xs pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-[#F3E9DC]/35 blur-xs pointer-events-none" />

        {/* Cream Card Container */}
        <div className="relative z-10 w-full max-w-sm bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 text-[#3B2A20] shadow-md space-y-3">
          {banner.label && (
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-[#8A9A7B]/20 text-[#3B2A20] border border-[#8A9A7B]/30">
              {banner.label}
            </span>
          )}
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#3B2A20] leading-snug">
            {banner.headline}
          </h3>
          {banner.subtext && (
            <p className="text-xs text-[#6B5B50] leading-relaxed line-clamp-3">
              {banner.subtext}
            </p>
          )}
          <div className="pt-2">
            {isPreview ? (
              <span className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-full bg-[#B4502F] text-white text-xs font-semibold shadow-md w-fit">
                <span>{banner.button_text || 'Explore'}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </span>
            ) : (
              <Link
                to={banner.button_link || '/shop'}
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#964225] text-white text-xs font-semibold shadow-md transition-all w-fit cursor-pointer"
              >
                <span>{banner.button_text || 'Explore'}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. No active banner: neutral default card showing only Arooj wordmark and "Free delivery · Pay on arrival"
  return (
    <div className="relative w-full aspect-4/5 sm:aspect-square lg:aspect-4/5 rounded-[48px] bg-[#FBF5EC] border border-[#E3D5C4] overflow-hidden shadow-md flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#8A9A7B]/20 border border-[#8A9A7B]/40 flex items-center justify-center text-[#3B2A20]">
        <Truck className="w-8 h-8 text-[#8A9A7B]" strokeWidth={1.5} />
      </div>
      <div>
        <span className="font-serif text-3xl sm:text-4xl font-bold text-[#3B2A20] tracking-wider block">
          Arooj
        </span>
        <p className="text-xs text-[#6B5B50] mt-1 font-medium">
          Shop smart · Live better
        </p>
      </div>
      <span className="px-4 py-2 min-h-[44px] flex items-center rounded-full text-xs font-semibold bg-[#8A9A7B]/20 text-[#3B2A20] border border-[#8A9A7B]/30 shadow-2xs">
        Free delivery · Pay on arrival
      </span>
    </div>
  );
};
