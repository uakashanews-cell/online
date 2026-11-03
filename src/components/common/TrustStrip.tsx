/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Truck, Handshake, Sprout } from 'lucide-react';

export const TrustStrip: React.FC = () => {
  const items = [
    {
      icon: ShieldCheck,
      title: 'Quality Assured',
      description: 'Carefully checked materials, authentic craftsmanship & precision finish.',
    },
    {
      icon: Truck,
      title: 'Free Delivery',
      description: 'Free delivery on all orders nationwide across Pakistan.',
    },
    {
      icon: Handshake,
      title: 'Cash on Delivery',
      description: '100% Cash on Delivery (COD). Pay when you receive your parcel.',
    },
    {
      icon: Sprout,
      title: 'Khayr & Trust',
      description: 'Honest pricing, ethical trade & dedicated customer service.',
    },
  ];

  return (
    <section className="bg-[#FBF5EC] border-y border-[#E3D5C4] py-8 sm:py-10 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-4 p-5 rounded-[24px] bg-[#F3E9DC]/70 border border-[#E3D5C4] hover:bg-[#F3E9DC] transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-full bg-[#8A9A7B]/20 border border-[#8A9A7B]/30 flex items-center justify-center shrink-0 shadow-xs">
                  <Icon className="w-5 h-5 text-[#8A9A7B]" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-serif text-base font-bold text-[#3B2A20] tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#6B5B50] mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
