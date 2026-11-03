/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';
import { useCategories, useProducts } from '../../hooks/useStoreData';
import { siteConfig } from '../../config/site';
import { Footer } from './Footer';
import { Logo } from '../common/Logo';
import { KhayrAdvisorModal } from '../advisor/KhayrAdvisorModal';
import { ToastContainer } from '../common/ToastContainer';
import { FloatingWhatsAppButton } from '../common/FloatingWhatsAppButton';
import { FloatingAssistantButton } from '../common/FloatingAssistantButton';
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  Sparkles,
  LayoutDashboard,
  PackageCheck,
  LogOut,
  AlertCircle,
  Shield,
  ShieldCheck,
} from 'lucide-react';

export const StoreLayout: React.FC = () => {
  const { profile, isAdmin, isDemoMode, signOut } = useAuth();
  const { isAdvisorOpen, setIsAdvisorOpen, cart, isWishlistLoginModalOpen, closeWishlistLoginModal, showToast, logout, activeCategories, activeProducts } = useStore();
  const { itemCount: rawItemCount } = useCart();
  const { data: remoteCategories = [] } = useCategories();
  const { data: remoteProducts = [] } = useProducts();
  const navigate = useNavigate();
  const location = useLocation();

  const categories = remoteCategories.length > 0 ? remoteCategories : activeCategories;
  const allProducts = remoteProducts.length > 0 ? remoteProducts : activeProducts;

  useEffect(() => {
    if (location.state && (location.state as any).accessDenied) {
      showToast('Access denied', 'error');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, showToast, navigate, location.pathname]);

  const totalCartCount = cart.length > 0 ? cart.reduce((sum, item) => sum + item.quantity, 0) : rawItemCount;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchResults = searchQuery.trim()
    ? allProducts
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const handleSelectSearch = (slug: string) => {
    setSearchQuery('');
    setIsSearchFocused(false);
    navigate(`/product/${slug}`);
  };

  const handleSignOut = () => {
    logout();
    signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3E9DC] text-[#3B2A20] font-sans antialiased selection:bg-[#B4502F] selection:text-[#F3E9DC]">
      <ToastContainer />
      {isAdvisorOpen && <KhayrAdvisorModal />}

      {/* Guest Wishlist Prompt Modal */}
      {isWishlistLoginModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FBF5EC] rounded-[24px] shadow-2xl border border-[#E3D5C4] max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-[#B4502F]/10 text-[#B4502F] rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Heart className="w-7 h-7 fill-[#B4502F]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#3B2A20]">
                Please sign in to save items
              </h3>
              <p className="text-xs text-[#6B5B50] mt-1.5 leading-relaxed">
                Sign in to your account to save products to your personal wishlist and view them on any device.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login?redirect=/wishlist"
                onClick={closeWishlistLoginModal}
                className="w-full py-3 min-h-[44px] bg-[#B4502F] hover:bg-[#964225] text-white font-semibold text-xs rounded-full shadow-sm transition-colors block text-center"
              >
                Sign In
              </Link>
              <button
                type="button"
                onClick={closeWishlistLoginModal}
                className="w-full py-2.5 min-h-[44px] text-[#6B5B50] hover:text-[#3B2A20] text-xs font-semibold rounded-full border border-[#3B2A20]/30 hover:bg-[#E3D5C4]/30 transition-colors cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="bg-[#B4502F] text-white px-3 py-1.5 text-xs font-semibold text-center flex items-center justify-center gap-2 border-b border-[#964225]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          <span>Demo mode active — test user accounts & order workflows</span>
        </div>
      )}

      {/* Top Announcement Bar */}
      <div className="bg-[#3B2A20] text-[#F3E9DC] text-xs py-2 px-4 border-b border-[#3B2A20]/80 text-center font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="hidden md:inline text-[#DDE3D3]">
            🇵🇰 Nationwide Free Delivery Across 200+ Pakistani Cities
          </span>
          <span className="mx-auto md:mx-0 font-semibold tracking-wide">
            Free Delivery on All Orders · 100% Cash on Delivery
          </span>
          <span className="hidden md:inline text-[#DDE3D3]">
            WhatsApp: {siteConfig.support.whatsappDisplay}
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-[#FBF5EC] border-b border-[#E3D5C4] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 text-[#3B2A20] hover:bg-[#F3E9DC] rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" strokeWidth={1.5} /> : <Menu className="w-6 h-6" strokeWidth={1.5} />}
            </button>

            {/* Brand Logo Component */}
            <Link to="/" className="group flex items-center focus:outline-hidden">
              <Logo variant="dark" size="md" showTagline={true} />
            </Link>

            {/* Desktop Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md relative mx-4">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                  placeholder="Search products"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E3D5C4] rounded-full text-xs text-[#3B2A20] placeholder:text-[#6B5B50] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] focus:border-[#B4502F] transition-all"
                />
                <Search className="w-4 h-4 text-[#B4502F] absolute left-3.5 top-3" strokeWidth={1.5} />
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchFocused && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#FBF5EC] rounded-[16px] shadow-xl border border-[#E3D5C4] overflow-hidden z-50">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onMouseDown={() => handleSelectSearch(product.slug)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#F3E9DC] flex items-center gap-3 border-b border-[#E3D5C4]/50 last:border-0 transition-colors cursor-pointer"
                    >
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded-[12px] border border-[#E3D5C4]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#3B2A20] truncate">{product.name}</p>
                        <p className="text-xs text-[#B4502F] font-bold">
                          Rs. {product.base_price.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Nav Controls */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* AI Advisor Button */}
              <button
                onClick={() => setIsAdvisorOpen(true)}
                aria-label="Khayr AI Advisor"
                className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full bg-[#8A9A7B]/15 text-[#3B2A20] hover:bg-[#8A9A7B] hover:text-white border border-[#8A9A7B]/40 text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B4502F]" strokeWidth={1.5} />
                <span className="hidden sm:inline">Khayr AI</span>
              </button>

              {/* Admin Panel Direct Link (if admin) */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full text-xs font-semibold bg-[#B4502F] text-white hover:bg-[#964225] shadow-xs transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Admin
                </Link>
              )}

              {/* Wishlist */}
              <Link
                to={profile ? '/wishlist' : '/login?redirect=/wishlist'}
                aria-label="Wishlist"
                className="relative p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#3B2A20] hover:text-[#B4502F] hover:bg-[#F3E9DC] rounded-full transition-colors"
              >
                <Heart className="w-5 h-5 text-[#3B2A20]" strokeWidth={1.5} />
              </Link>

              {/* Cart Button (Outlined pill) */}
              <Link
                to="/cart"
                aria-label={`Cart (${totalCartCount} items)`}
                className="relative flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full border-[1.5px] border-[#3B2A20] bg-transparent text-[#3B2A20] hover:bg-[#3B2A20] hover:text-[#F3E9DC] transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#B4502F]" strokeWidth={1.5} />
                <span className="font-semibold text-xs hidden sm:inline">Cart</span>
                <span className="bg-[#B4502F] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {totalCartCount}
                </span>
              </Link>

              {/* User Account / Sign In */}
              {profile ? (
                <Link
                  to="/account"
                  className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#3B2A20] hover:text-[#B4502F] hover:bg-[#F3E9DC] rounded-full transition-colors"
                  aria-label="Account Settings"
                >
                  <User className="w-5 h-5" strokeWidth={1.5} />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center text-xs font-semibold text-[#3B2A20] hover:bg-[#3B2A20] hover:text-[#F3E9DC] px-4 py-2.5 min-h-[44px] rounded-full border-[1.5px] border-[#3B2A20] transition-colors"
                >
                  Sign In
                </Link>
              )}

              {/* Small Shield/Lock Icon Button (Admin Login / Admin Panel) */}
              <Link
                to={isAdmin ? '/admin' : '/admin/login'}
                aria-label={isAdmin ? 'Admin Panel' : 'Admin Login'}
                title={isAdmin ? 'Admin Panel' : 'Admin Login'}
                className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${
                  isAdmin
                    ? 'bg-[#B4502F] text-white shadow-xs'
                    : 'text-[#3B2A20] hover:bg-[#F3E9DC] hover:text-[#B4502F]'
                }`}
              >
                {isAdmin ? (
                  <ShieldCheck className="w-5 h-5 text-white" strokeWidth={1.5} />
                ) : (
                  <Shield className="w-5 h-5 text-[#3B2A20]" strokeWidth={1.5} />
                )}
              </Link>
            </div>
          </div>

          {/* Secondary Navigation Row (Desktop) */}
          <nav className="hidden md:flex items-center justify-between border-t border-[#E3D5C4] py-2.5 text-xs font-medium">
            <div className="flex items-center gap-7">
              <NavLink
                to="/shop"
                className={({ isActive }) =>
                  `transition-colors ${
                    isActive ? 'text-[#3B2A20] font-bold border-b-2 border-[#B4502F] pb-0.5' : 'text-[#6B5B50] hover:text-[#B4502F]'
                  }`
                }
              >
                Shop
              </NavLink>

              {/* Up to 4 active categories */}
              {categories
                .filter((c) => c.is_active)
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .slice(0, 4)
                .map((cat) => (
                  <NavLink
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    className={({ isActive }) =>
                      `transition-colors ${
                        isActive ? 'text-[#3B2A20] font-bold border-b-2 border-[#B4502F] pb-0.5' : 'text-[#6B5B50] hover:text-[#B4502F]'
                      }`
                    }
                  >
                    {cat.name}
                  </NavLink>
                ))}

              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `transition-colors ${
                    isActive ? 'text-[#3B2A20] font-bold border-b-2 border-[#B4502F] pb-0.5' : 'text-[#6B5B50] hover:text-[#B4502F]'
                  }`
                }
              >
                About
              </NavLink>

              <NavLink
                to="/contact"
                className={({ isActive }) =>
                  `transition-colors ${
                    isActive ? 'text-[#3B2A20] font-bold border-b-2 border-[#B4502F] pb-0.5' : 'text-[#6B5B50] hover:text-[#B4502F]'
                  }`
                }
              >
                Contact
              </NavLink>

              <NavLink
                to="/track-order"
                className={({ isActive }) =>
                  `transition-colors flex items-center gap-1.5 ${
                    isActive ? 'text-[#3B2A20] font-bold border-b-2 border-[#B4502F] pb-0.5' : 'text-[#6B5B50] hover:text-[#B4502F]'
                  }`
                }
              >
                <PackageCheck className="w-3.5 h-3.5 text-[#B4502F]" strokeWidth={1.5} />
                Track order
              </NavLink>
            </div>
          </nav>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FBF5EC] border-t border-[#E3D5C4] px-4 pt-3 pb-6 space-y-4 shadow-xl">
            {/* Mobile Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E3D5C4] rounded-full text-xs text-[#3B2A20]"
              />
              <Search className="w-4 h-4 text-[#B4502F] absolute left-3 top-3" strokeWidth={1.5} />
            </div>

            {searchResults.length > 0 && (
              <div className="bg-white rounded-[16px] p-2 space-y-1 border border-[#E3D5C4]">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      handleSelectSearch(p.slug);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs font-medium text-[#3B2A20] flex justify-between"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[#B4502F] font-bold">Rs. {p.base_price.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 text-left rounded-full bg-[#F3E9DC] text-[#3B2A20] font-medium text-xs min-h-[44px] flex items-center justify-center border border-[#E3D5C4]"
              >
                Home
              </Link>
              <Link
                to="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 text-left rounded-full bg-[#F3E9DC] text-[#3B2A20] font-medium text-xs min-h-[44px] flex items-center justify-center border border-[#E3D5C4]"
              >
                All Products
              </Link>
              <Link
                to="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 text-left rounded-full bg-[#F3E9DC] text-[#3B2A20] font-medium text-xs flex items-center justify-center gap-1.5 min-h-[44px] border border-[#E3D5C4]"
              >
                <PackageCheck className="w-4 h-4 text-[#B4502F]" strokeWidth={1.5} />
                Track Order
              </Link>
              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 text-left rounded-full bg-[#B4502F] text-white font-semibold text-xs flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <ShoppingBag className="w-4 h-4 text-white" strokeWidth={1.5} />
                Cart ({totalCartCount})
              </Link>
            </div>

            <div className="pt-1">
              <Link
                to={isAdmin ? '/admin' : '/admin/login'}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full p-3 text-left rounded-full font-semibold text-xs flex items-center justify-between min-h-[44px] transition-colors ${
                  isAdmin
                    ? 'bg-[#B4502F] text-white shadow-xs'
                    : 'bg-[#3B2A20] text-[#F3E9DC]'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isAdmin ? (
                    <ShieldCheck className="w-4 h-4 text-white" strokeWidth={1.5} />
                  ) : (
                    <Shield className="w-4 h-4 text-[#DDE3D3]" strokeWidth={1.5} />
                  )}
                  <span>{isAdmin ? 'Admin Panel' : 'Admin Login'}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider opacity-75">
                  {isAdmin ? 'Owner' : 'Portal'} →
                </span>
              </Link>
            </div>

            <div className="border-t border-[#E3D5C4] pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B5B50] mb-2">
                Departments
              </p>
              <div className="space-y-1">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/category/${c.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-xs text-[#3B2A20] hover:text-[#B4502F]"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E3D5C4] pt-3 flex items-center justify-between text-xs">
              {profile ? (
                <div className="flex items-center justify-between w-full">
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-medium text-[#3B2A20]"
                  >
                    My Account ({profile.full_name})
                  </Link>
                  <button onClick={handleSignOut} className="text-[#B3372F] flex items-center gap-1 cursor-pointer">
                    <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} /> Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 min-h-[44px] bg-[#B4502F] hover:bg-[#964225] text-white font-semibold rounded-full text-center block"
                >
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Floating Assistant & WhatsApp Support (Public & Customer Pages) */}
      <FloatingAssistantButton />
      <FloatingWhatsAppButton />

      {/* Footer with Dark Emerald and Light Logo */}
      <Footer setCurrentTab={(tab) => {
        if (tab === 'home') navigate('/');
        else if (tab === 'shop') navigate('/shop');
        else if (tab === 'track-order') navigate('/track-order');
        else if (tab === 'about') navigate('/about');
        else if (tab === 'contact') navigate('/contact');
        else if (tab === 'admin') navigate('/admin');
      }} />
    </div>
  );
};
