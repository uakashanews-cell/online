/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ShoppingBag, HelpCircle } from 'lucide-react';
import { siteConfig } from '../config/site';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-20 h-20 bg-[#DDE3D3] text-[#3B2A20] rounded-full flex items-center justify-center mx-auto border border-[#8A9A7B]/30 shadow-xs">
        <HelpCircle className="w-10 h-10 text-[#8A9A7B]" strokeWidth={1.5} />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#8A9A7B]">
          404 Not Found
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#3B2A20]">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-[#6B5B50] max-w-md mx-auto leading-relaxed">
          The page or product you were looking for doesn't exist or has been relocated. Explore our curated collections with 100% Free Nationwide Delivery.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          to="/"
          className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-full bg-[#B4502F] text-white font-semibold text-xs shadow-xs hover:bg-[#a04426] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4 text-white" strokeWidth={1.5} /> Return to Home
        </Link>
        <Link
          to="/shop"
          className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-full bg-transparent border-[1.5px] border-[#3B2A20] text-[#3B2A20] font-semibold text-xs hover:bg-[#3B2A20] hover:text-[#F3E9DC] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> Browse Catalog
        </Link>
      </div>

      <div className="pt-8 border-t border-[#E3D5C4] text-xs text-[#6B5B50]">
        Need assistance? WhatsApp our support team at{' '}
        <span className="font-semibold text-[#B4502F]">{siteConfig.support.whatsappDisplay}</span>
      </div>
    </div>
  );
};
