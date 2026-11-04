/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { siteConfig } from '../../config/site';
import { Logo } from '../common/Logo';
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  Sparkles,
  LogOut,
  PackageCheck,
  LayoutDashboard,
  Shield,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAuthModal: () => void;
  onSearchSelect?: (productId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  openAuthModal,
  onSearchSelect,
}) => {
  const {
    cart,
    wishlist,
    currentUser,
    logout,
    setIsAdvisorOpen,
    products,
    activeCategories,
  } = useStore();

  const { isAdmin } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const wishItemCount = wishlist.length;

  const searchResults = searchQuery.trim()
    ? products
        .filter(
          (p) =>
            p.is_active &&
            (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 5)
    : [];

  const handleSelectSearchResult = (productId: string) => {
    setSearchQuery('');
    setIsSearchFocused(false);
    if (onSearchSelect) {
      onSearchSelect(productId);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FBF5EC] border-b border-[#E3D5C4] shadow-xs">
      {/* Top Announcement Bar */}
      <div className="bg-[#3B2A20] text-[#F3E9DC] text-xs py-2 px-4 text-center font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="hidden md:inline text-[#DDE3D3]">
            🇵🇰 Nationwide Free Delivery Across 200+ Pakistani Cities
          </span>
          <span className="mx-auto md:mx-0 font-semibold tracking-wide">
            Free Delivery on All Orders · 100% Cash on Delivery
          </span>
          <span className="hidden md:inline text-[#DDE3D3]">
            Helpline: {siteConfig.support.whatsappDisplay}
          </span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 text-[#3B2A20] hover:text-[#B4502F] rounded-full hover:bg-[#F3E9DC] min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Brand Logo */}
          <button
            onClick={() => {
              setCurrentTab('home');
              setMobileMenuOpen(false);
            }}
            className="flex items-center text-left group focus:outline-hidden cursor-pointer"
            aria-label="Arooj"
          >
            <img
              src="/logo.png"
              alt="Arooj"
              className="h-8 sm:h-10 w-auto object-contain select-none"
            />
          </button>

          {/* Centered Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
            <a
              href="/shop"
              onClick={(e) => {
                e.preventDefault();
                setCurrentTab('shop');
              }}
              className={`hover:text-[#B4502F] transition-colors py-1 ${
                currentTab === 'shop' ? 'text-[#B4502F] font-bold border-b-2 border-[#B4502F]' : 'text-[#3B2A20]'
              }`}
            >
              Shop
            </a>
            {[...activeCategories]
              .filter((c) => c.is_active)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .slice(0, 4)
              .map((cat) => (
                <a
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentTab(`category-${cat.slug}`);
                  }}
                  className={`hover:text-[#B4502F] transition-colors py-1 ${
                    currentTab === `category-${cat.slug}` ? 'text-[#B4502F] font-bold border-b-2 border-[#B4502F]' : 'text-[#3B2A20]'
                  }`}
                >
                  {cat.name}
                </a>
              ))}
            <a
              href="/about"
              onClick={(e) => {
                e.preventDefault();
                setCurrentTab('about');
              }}
              className={`hover:text-[#B4502F] transition-colors py-1 ${
                currentTab === 'about' ? 'text-[#B4502F] font-bold border-b-2 border-[#B4502F]' : 'text-[#3B2A20]'
              }`}
            >
              About
            </a>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                setCurrentTab('contact');
              }}
              className={`hover:text-[#B4502F] transition-colors py-1 ${
                currentTab === 'contact' ? 'text-[#B4502F] font-bold border-b-2 border-[#B4502F]' : 'text-[#3B2A20]'
              }`}
            >
              Contact
            </a>
            <a
              href="/track-order"
              onClick={(e) => {
                e.preventDefault();
                setCurrentTab('track-order');
              }}
              className={`hover:text-[#B4502F] transition-colors py-1 flex items-center gap-1.5 ${
                currentTab === 'track-order' ? 'text-[#B4502F] font-bold border-b-2 border-[#B4502F]' : 'text-[#3B2A20]'
              }`}
            >
              <PackageCheck className="w-4 h-4 text-[#8A9A7B]" />
              Track order
            </a>
          </nav>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xs relative mx-2">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                placeholder="Search catalog..."
                className="w-full pl-9 pr-4 py-2 bg-[#F3E9DC] border border-[#E3D5C4] rounded-full text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] focus:bg-white transition-all"
              />
              <Search className="w-3.5 h-3.5 text-[#6B5B50] absolute left-3 top-2.5" />
            </div>

            {/* Autocomplete Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#FBF5EC] rounded-[16px] shadow-lg border border-[#E3D5C4] overflow-hidden z-50">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    onMouseDown={() => handleSelectSearchResult(product.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#F3E9DC] flex items-center gap-3 border-b border-[#E3D5C4]/60 last:border-0 transition-colors"
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-9 h-9 object-cover rounded-[10px]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#3B2A20] truncate">{product.name}</p>
                      <p className="text-xs text-[#B4502F] font-semibold">
                        Rs. {product.base_price.toLocaleString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nav Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* AI Advisor Button */}
            <button
              onClick={() => setIsAdvisorOpen(true)}
              aria-label="Khayr AI Advisor"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#8A9A7B]/15 text-[#3B2A20] hover:bg-[#8A9A7B]/25 border border-[#8A9A7B]/40 text-xs font-semibold shadow-xs transition-colors shrink-0 min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8A9A7B]" />
              <span className="hidden sm:inline">Khayr AI</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={() => {
                if (!currentUser) {
                  openAuthModal();
                } else {
                  setCurrentTab('account-wishlist');
                }
              }}
              aria-label={`Wishlist (${wishItemCount} items)`}
              className="relative p-2.5 text-[#3B2A20] hover:text-[#B4502F] rounded-full hover:bg-[#F3E9DC] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Heart className="w-5 h-5" strokeWidth={1.5} />
              {wishItemCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#B3372F] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishItemCount}
                </span>
              )}
            </button>

            {/* Outlined Pill Cart Button */}
            <button
              onClick={() => setCurrentTab('cart')}
              aria-label={`Cart (${cartItemCount} items)`}
              className={`border-[1.5px] border-[#3B2A20] text-[#3B2A20] rounded-full px-4 py-2 hover:bg-[#3B2A20]/5 transition-all flex items-center gap-2 min-h-[44px] font-medium text-xs ${
                currentTab === 'cart' ? 'bg-[#3B2A20] text-[#F3E9DC]' : ''
              }`}
            >
              <ShoppingBag className={`w-4 h-4 ${currentTab === 'cart' ? 'text-[#DDE3D3]' : 'text-[#3B2A20]'}`} strokeWidth={1.5} />
              <span>Cart ({cartItemCount})</span>
            </button>

            {/* Account Profile / Login Button */}
            {currentUser ? (
              <button
                onClick={() => setCurrentTab('account')}
                className="p-2.5 text-[#3B2A20] hover:text-[#B4502F] rounded-full hover:bg-[#F3E9DC] min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Account Settings"
              >
                <User className="w-5 h-5" strokeWidth={1.5} />
              </button>
            ) : (
              <button
                onClick={openAuthModal}
                className="hidden sm:inline-flex text-xs font-semibold text-[#3B2A20] hover:text-[#B4502F] px-4 py-2 rounded-full hover:bg-[#F3E9DC] border border-[#E3D5C4] min-h-[44px] items-center"
              >
                Sign In
              </button>
            )}

            {/* Admin Gatekeeper Icon Button (Visible to everyone) */}
            <button
              onClick={() => setCurrentTab(isAdmin ? 'admin' : 'admin-login')}
              aria-label={isAdmin ? 'Admin Panel' : 'Admin Login'}
              title={isAdmin ? 'Admin Panel' : 'Admin Login'}
              className={`p-2.5 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                isAdmin
                  ? 'bg-[#8A9A7B]/20 text-[#3B2A20] border border-[#8A9A7B]/40'
                  : 'text-[#3B2A20] hover:text-[#B4502F] hover:bg-[#F3E9DC]'
              }`}
            >
              {isAdmin ? (
                <ShieldCheck className="w-5 h-5 text-[#8A9A7B]" strokeWidth={1.5} />
              ) : (
                <Shield className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FBF5EC] border-t border-[#E3D5C4] px-4 pt-3 pb-6 space-y-3">
          {/* Mobile Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 bg-[#F3E9DC] border border-[#E3D5C4] rounded-full text-xs text-[#3B2A20]"
            />
            <Search className="w-4 h-4 text-[#6B5B50] absolute left-3 top-2.5" />
          </div>

          {searchResults.length > 0 && (
            <div className="bg-white rounded-[16px] p-2 space-y-1 border border-[#E3D5C4]">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    handleSelectSearchResult(p.id);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs font-medium text-[#3B2A20] flex justify-between"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[#B4502F] font-semibold">Rs. {p.base_price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                setCurrentTab('home');
                setMobileMenuOpen(false);
              }}
              className="p-3 text-left rounded-full bg-[#F3E9DC] text-[#3B2A20] font-medium text-xs min-h-[44px]"
            >
              Home
            </button>
            <button
              onClick={() => {
                setCurrentTab('shop');
                setMobileMenuOpen(false);
              }}
              className="p-3 text-left rounded-full bg-[#F3E9DC] text-[#3B2A20] font-medium text-xs min-h-[44px]"
            >
              Shop All
            </button>
            <button
              onClick={() => {
                setCurrentTab('track-order');
                setMobileMenuOpen(false);
              }}
              className="p-3 text-left rounded-full bg-[#F3E9DC] text-[#3B2A20] font-medium text-xs min-h-[44px] flex items-center gap-1.5"
            >
              <PackageCheck className="w-4 h-4 text-[#8A9A7B]" />
              Track Order
            </button>
            <button
              onClick={() => {
                setIsAdvisorOpen(true);
                setMobileMenuOpen(false);
              }}
              className="p-3 text-left rounded-full bg-[#8A9A7B]/20 text-[#3B2A20] font-semibold text-xs min-h-[44px] flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-[#8A9A7B]" />
              Khayr Advisor
            </button>
          </div>

          <div className="border-t border-[#E3D5C4] pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B5B50] mb-2">
              Categories
            </p>
            <div className="space-y-1">
              {activeCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCurrentTab(`category-${c.slug}`);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-1 text-sm text-[#3B2A20] hover:text-[#B4502F]"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E3D5C4] pt-3 flex items-center justify-between text-xs">
            {currentUser ? (
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={() => {
                    setCurrentTab('account');
                    setMobileMenuOpen(false);
                  }}
                  className="font-medium text-[#3B2A20]"
                >
                  My Account ({currentUser.full_name})
                </button>
                <button onClick={logout} className="text-[#B3372F] flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  openAuthModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full btn-primary text-center"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
