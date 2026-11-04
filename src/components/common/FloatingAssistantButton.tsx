/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { Sparkles, MessageSquare } from 'lucide-react';

export const FloatingAssistantButton: React.FC = () => {
  const location = useLocation();
  const { isAdvisorOpen, setIsAdvisorOpen } = useStore();

  // Hide on any admin route
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  // Raise position on product pages so it never overlaps mobile sticky Add to Cart bar or WhatsApp button
  const isProductPage = location.pathname.startsWith('/product');
  const bottomPositionClass = isProductPage ? 'bottom-36 md:bottom-22' : 'bottom-22 md:bottom-22';

  return (
    <aside
      aria-label="Store Assistant"
      className={`fixed right-4 sm:right-6 ${bottomPositionClass} z-30 transition-all duration-300`}
    >
      <button
        type="button"
        onClick={() => setIsAdvisorOpen(!isAdvisorOpen)}
        aria-label="Open Arooj assistant"
        className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 min-h-[44px] min-w-[44px] rounded-full bg-[#B4502F] hover:bg-[#964225] text-white shadow-[0_6px_25px_rgba(180,80,47,0.4)] hover:shadow-[0_8px_30px_rgba(180,80,47,0.55)] transition-all transform hover:scale-105 active:scale-95 focus:outline-hidden focus:ring-4 focus:ring-[#B4502F]/40 cursor-pointer"
      >
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" strokeWidth={1.5} />

        {/* Floating Tooltip Pill (Desktop) */}
        <span className="hidden lg:block absolute right-full mr-3 px-3 py-1.5 rounded-[8px] bg-[#3B2A20] text-[#F3E9DC] text-xs font-semibold whitespace-nowrap shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
          Ask Arooj assistant
          <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-[#3B2A20]" />
        </span>
      </button>
    </aside>
  );
};
