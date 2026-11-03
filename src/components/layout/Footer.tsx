/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  siteConfig,
  isPlaceholderEmail,
  CALL_NUMBER,
  WHATSAPP_NUMBER,
  DELIVERY_TIME_TEXT,
  RETURN_POLICY_TEXT,
  SOCIAL_FACEBOOK,
  SOCIAL_INSTAGRAM,
} from '../../config/site';
import { Logo } from '../common/Logo';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { Phone, Mail, MapPin, ShieldCheck, Shield, Lock, Truck, RefreshCw, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  setCurrentTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentTab }) => {
  const { isAdmin } = useAuth();
  const showEmail = !isPlaceholderEmail(siteConfig.support.email);

  return (
    <footer className="bg-[#3B2A20] text-[#F3E9DC] pt-14 pb-10 border-t border-[#6B5B50]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#6B5B50]/30">
          {/* Brand Info with Logo Component */}
          <div className="space-y-4">
            <Logo variant="light" size="md" showTagline={true} />
            <p className="text-xs text-[#F3E9DC]/80 leading-relaxed pt-1">
              BARVAKA is an online store in Pakistan offering stitched apparel, accessories, and lifestyle essentials with 100% Cash on Delivery and Free Delivery nationwide.
            </p>
            <div className="pt-2">
              <a
                href={buildWhatsAppUrl('Hello BARVAKA, I would like to inquire about your products.')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#8A9A7B]/20 hover:bg-[#8A9A7B]/30 text-[#F3E9DC] border border-[#8A9A7B]/40 text-xs font-semibold shadow-xs transition-colors min-h-[44px]"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                WhatsApp: {siteConfig.support.whatsappDisplay}
              </a>
            </div>
            {(SOCIAL_FACEBOOK.trim() !== '' || SOCIAL_INSTAGRAM.trim() !== '') && (
              <div className="flex items-center gap-3 pt-1 text-xs text-[#F3E9DC]/80">
                {SOCIAL_FACEBOOK.trim() !== '' && (
                  <a
                    href={SOCIAL_FACEBOOK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Facebook
                  </a>
                )}
                {SOCIAL_INSTAGRAM.trim() !== '' && (
                  <a
                    href={SOCIAL_INSTAGRAM}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-bold text-[#F3E9DC] tracking-wider uppercase border-b border-[#6B5B50]/40 pb-2">
              Customer Care
            </h4>
            <ul className="space-y-2 text-xs text-[#F3E9DC]/80">
              <li>
                <button
                  onClick={() => setCurrentTab('track-order')}
                  className="hover:text-[#DDE3D3] transition-colors text-left cursor-pointer"
                >
                  Track Your Order
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('shop')}
                  className="hover:text-[#DDE3D3] transition-colors text-left cursor-pointer"
                >
                  Catalog &amp; Categories
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('about')}
                  className="hover:text-[#DDE3D3] transition-colors text-left cursor-pointer"
                >
                  About BARVAKA
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('contact')}
                  className="hover:text-[#DDE3D3] transition-colors text-left cursor-pointer"
                >
                  Contact &amp; Inquiries
                </button>
              </li>
              <li className="pt-1 border-t border-[#6B5B50]/30">
                <Link
                  to={isAdmin ? '/admin' : '/admin/login'}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 text-[#DDE3D3] font-medium"
                >
                  {isAdmin ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#8A9A7B]" strokeWidth={1.5} />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-[#8A9A7B]" strokeWidth={1.5} />
                  )}
                  <span>{isAdmin ? 'Admin Panel' : 'Admin Login'}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Delivery & Trust */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-bold text-[#F3E9DC] tracking-wider uppercase border-b border-[#6B5B50]/40 pb-2">
              Trust &amp; Khayr
            </h4>
            <ul className="space-y-3 text-xs text-[#F3E9DC]/80">
              <li className="flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-[#8A9A7B] shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>
                  <strong className="text-[#F3E9DC] block font-medium">Free Delivery Nationwide</strong>
                  Free delivery on all orders across Pakistan.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#8A9A7B] shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>
                  <strong className="text-[#F3E9DC] block font-medium">Cash on Delivery</strong>
                  Cash on delivery only. Pay upon receiving your package.
                </span>
              </li>
              {DELIVERY_TIME_TEXT.trim() !== '' && (
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8A9A7B] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>
                    <strong className="text-[#F3E9DC] block font-medium">Delivery Time</strong>
                    {DELIVERY_TIME_TEXT.trim()}
                  </span>
                </li>
              )}
              {RETURN_POLICY_TEXT.trim() !== '' && (
                <li className="flex items-start gap-2.5">
                  <RefreshCw className="w-4 h-4 text-[#8A9A7B] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>
                    <strong className="text-[#F3E9DC] block font-medium">Return Policy</strong>
                    {RETURN_POLICY_TEXT.trim()}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Store Contact */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-bold text-[#F3E9DC] tracking-wider uppercase border-b border-[#6B5B50]/40 pb-2">
              Store Contact
            </h4>
            <div className="space-y-2.5 text-xs text-[#F3E9DC]/80">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#8A9A7B] shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>{siteConfig.support.address}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#8A9A7B] shrink-0" strokeWidth={1.5} />
                <a href={`tel:+${CALL_NUMBER}`} className="hover:text-white transition-colors">
                  Call: {siteConfig.support.phone}
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <WhatsAppIcon className="w-4 h-4 text-[#25D366] shrink-0" />
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp: {siteConfig.support.whatsappDisplay}
                </a>
              </p>
              {showEmail && (
                <p className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#8A9A7B] shrink-0" strokeWidth={1.5} />
                  <a href={`mailto:${siteConfig.support.email}`} className="hover:text-white transition-colors">
                    {siteConfig.support.email}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#F3E9DC]/60 gap-4">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Quality · Fast Delivery · Trust · Khayr.</p>
          <div className="flex items-center gap-4">
            <Link
              to={isAdmin ? '/admin' : '/admin/login'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border border-[#6B5B50]/60 text-[#F3E9DC] hover:border-[#8A9A7B] hover:text-[#DDE3D3]"
            >
              {isAdmin ? (
                <ShieldCheck className="w-3.5 h-3.5 text-[#8A9A7B]" strokeWidth={1.5} />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#8A9A7B]" strokeWidth={1.5} />
              )}
              <span>{isAdmin ? 'Admin Panel' : 'Admin Login'}</span>
            </Link>
            <span className="text-[#6B5B50]">|</span>
            <span className="text-[#F3E9DC]/80">Currency: PKR (Rs.)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
