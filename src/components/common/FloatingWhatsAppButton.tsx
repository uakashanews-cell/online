/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { WhatsAppIcon } from './WhatsAppIcon';
import { buildWhatsAppUrl } from '../../lib/whatsapp';

export const FloatingWhatsAppButton: React.FC = () => {
  const location = useLocation();

  // Do not show on any admin route
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  // Raise position on product pages to avoid overlapping mobile sticky Add to Cart bar
  const isProductPage = location.pathname.startsWith('/product');
  const bottomPositionClass = isProductPage ? 'bottom-20 md:bottom-6' : 'bottom-6';

  const helpUrl = buildWhatsAppUrl('Hello BARVAKA, I need help.');

  return (
    <aside
      aria-label="Customer Support"
      className={`fixed right-4 sm:right-6 ${bottomPositionClass} z-30 transition-all duration-300`}
    >
      <a
        href={helpUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with BARVAKA Support on WhatsApp"
        className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-[0_6px_25px_rgba(37,211,102,0.4)] hover:shadow-[0_8px_30px_rgba(37,211,102,0.55)] transition-all transform hover:scale-105 active:scale-95 focus:outline-hidden focus:ring-4 focus:ring-[#25D366]/40 cursor-pointer"
      >
        <WhatsAppIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-xs" />

        {/* Pulse glow effect */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366]/30 animate-ping -z-10 opacity-75 pointer-events-none" />

        {/* Floating Tooltip Pill (Desktop) */}
        <span className="hidden lg:block absolute right-full mr-3 px-3 py-1.5 rounded-[8px] bg-[#0A2A21] text-[#F8F4EA] text-xs font-semibold whitespace-nowrap shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
          Chat with us on WhatsApp
          <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-[#0A2A21]" />
        </span>
      </a>
    </aside>
  );
};
