/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { siteConfig, isPlaceholderEmail, CALL_NUMBER, WHATSAPP_NUMBER } from '../config/site';
import { WhatsAppIcon } from '../components/common/WhatsAppIcon';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { ShieldCheck, Truck, Handshake, Sprout, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { usePageSEO } from '../hooks/usePageSEO';

export const AboutPage: React.FC = () => {
  usePageSEO({ title: 'About | BARVAKA' });
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs font-semibold text-[#8A9A7B] tracking-wider uppercase">
          Brand Philosophy
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#3B2A20]">
          About {siteConfig.name}
        </h1>
        <p className="text-base text-[#6B5B50] max-w-xl mx-auto font-normal leading-relaxed">
          Rooted in authenticity, craftsmanship, ethical trade, and customer dignity across Pakistan.
        </p>
      </div>

      <div className="prose prose-stone mx-auto text-sm text-[#3B2A20] leading-relaxed space-y-6 bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-8 shadow-xs">
        <h3 className="font-serif text-xl font-bold text-[#3B2A20]">The Story of BARVAKA</h3>
        <p>
          BARVAKA was created with a clear standard: commerce in Pakistan should honor trust, craftsmanship, and transparency. Derived from our signature monogram emblem with warm artisanal tones, our brand represents dignity, longevity, and Khayr.
        </p>
        <p>
          Every item in our catalog—from stitched kurtas and fine attars to premium leather accessories and everyday lifestyle items—is inspected with utmost scrutiny in our fulfillment hub in Rahim Yar Khan prior to dispatch.
        </p>

        <h3 className="font-serif text-xl font-bold text-[#3B2A20] mt-6">Our 4 Core Pillars</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose mt-4">
          <div className="p-4 rounded-[16px] bg-[#F3E9DC] border border-[#E3D5C4] space-y-1.5">
            <h4 className="font-bold text-sm text-[#3B2A20] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> 1. Quality
            </h4>
            <p className="text-xs text-[#6B5B50]">
              Carefully curated materials and thorough inspection on every product before packing.
            </p>
          </div>

          <div className="p-4 rounded-[16px] bg-[#F3E9DC] border border-[#E3D5C4] space-y-1.5">
            <h4 className="font-bold text-sm text-[#3B2A20] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> 2. Fast Delivery
            </h4>
            <p className="text-xs text-[#6B5B50]">
              Orders are dispatched swiftly nationwide to 200+ cities in Pakistan with 100% Free Delivery.
            </p>
          </div>

          <div className="p-4 rounded-[16px] bg-[#F3E9DC] border border-[#E3D5C4] space-y-1.5">
            <h4 className="font-bold text-sm text-[#3B2A20] flex items-center gap-2">
              <Handshake className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> 3. Trust
            </h4>
            <p className="text-xs text-[#6B5B50]">
              We operate strictly on Cash on Delivery, so you only pay when your parcel arrives.
            </p>
          </div>

          <div className="p-4 rounded-[16px] bg-[#F3E9DC] border border-[#E3D5C4] space-y-1.5">
            <h4 className="font-bold text-sm text-[#3B2A20] flex items-center gap-2">
              <Sprout className="w-4 h-4 text-[#8A9A7B]" strokeWidth={1.5} /> 4. Khayr
            </h4>
            <p className="text-xs text-[#6B5B50]">
              Khayr embodies ethical trade, honest pricing, and genuine customer-first service via our direct WhatsApp helpline ({siteConfig.support.whatsappDisplay}).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  usePageSEO({ title: 'Contact | BARVAKA' });
  const showEmail = !isPlaceholderEmail(siteConfig.support.email);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-[#8A9A7B] tracking-wider uppercase">
          Customer Support
        </span>
        <h1 className="font-serif text-3xl font-bold text-[#3B2A20]">
          Contact BARVAKA
        </h1>
        <p className="text-xs sm:text-sm text-[#6B5B50] max-w-md mx-auto">
          We are here to assist you with order status, sizing inquiries, product advice, or exchanges.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Support Channels */}
        <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="font-serif text-xl font-bold text-[#3B2A20] border-b border-[#E3D5C4] pb-3">
            Direct Assistance
          </h2>

          <div className="space-y-4 text-xs sm:text-sm text-[#3B2A20]">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30">
                <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
              </div>
              <div>
                <p className="font-semibold text-[#3B2A20]">WhatsApp Helpline</p>
                <p className="text-xs text-[#6B5B50] mt-0.5">{siteConfig.support.whatsappDisplay}</p>
                <a
                  href={buildWhatsAppUrl('Hello BARVAKA, I am reaching out from your Contact page.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 min-h-[44px] rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                  <span>Open WhatsApp Chat</span>
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-[#E3D5C4]/60">
              <div className="p-2.5 rounded-full bg-[#8A9A7B]/20 text-[#3B2A20] border border-[#8A9A7B]/40">
                <Phone className="w-5 h-5 text-[#3B2A20]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold text-[#3B2A20]">Telephone Support</p>
                <a href={`tel:+${CALL_NUMBER}`} className="text-xs text-[#6B5B50] hover:text-[#B4502F] mt-0.5 block">
                  {siteConfig.support.phone}
                </a>
              </div>
            </div>

            {showEmail && (
              <div className="flex items-start gap-3 pt-2 border-t border-[#E3D5C4]/60">
                <div className="p-2.5 rounded-full bg-[#8A9A7B]/20 text-[#3B2A20] border border-[#8A9A7B]/40">
                  <Mail className="w-5 h-5 text-[#3B2A20]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-[#3B2A20]">Email Support</p>
                  <a href={`mailto:${siteConfig.support.email}`} className="text-xs text-[#6B5B50] hover:text-[#B4502F] mt-0.5 block">
                    {siteConfig.support.email}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fulfillment & Address */}
        <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="font-serif text-xl font-bold text-[#3B2A20] border-b border-[#E3D5C4] pb-3">
            Fulfillment Center
          </h2>

          <div className="space-y-4 text-xs sm:text-sm text-[#3B2A20]">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-[#8A9A7B]/20 text-[#3B2A20] border border-[#8A9A7B]/40">
                <MapPin className="w-5 h-5 text-[#3B2A20]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold text-[#3B2A20]">Hub Address</p>
                <p className="text-xs text-[#6B5B50] mt-0.5 leading-relaxed">{siteConfig.support.address}</p>
              </div>
            </div>

            {siteConfig.support.timing && (
              <div className="flex items-start gap-3 pt-2 border-t border-[#E3D5C4]/60">
                <div className="p-2.5 rounded-full bg-[#8A9A7B]/20 text-[#3B2A20] border border-[#8A9A7B]/40">
                  <Clock className="w-5 h-5 text-[#3B2A20]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-[#3B2A20]">Business Hours</p>
                  <p className="text-xs text-[#6B5B50] mt-0.5">{siteConfig.support.timing}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
