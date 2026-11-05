/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ToastContainer } from '../common/ToastContainer';
import { Logo } from '../common/Logo';
import { AdminErrorBoundary } from '../admin/AdminErrorBoundary';
import { usePageSEO } from '../../hooks/usePageSEO';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Tag,
  Users,
  Store,
  LogOut,
  AlertCircle,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  usePageSEO({ title: 'Admin Panel | Arooj', noindex: true });
  const { profile, signOut, isDemoMode } = useAuth();
  const { logout, showToast, refreshAdminData, isAdminDataLoading, orders } = useStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const pendingOrdersCount = React.useMemo(() => {
    return orders.filter((o) => o.status === 'pending').length;
  }, [orders]);

  // 60-second auto-refresh in admin area
  React.useEffect(() => {
    const interval = setInterval(() => {
      refreshAdminData(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshAdminData]);

  // Prefix browser tab title with "(N) New orders" while N > 0
  React.useEffect(() => {
    const baseTitle = 'Admin Panel | Arooj';
    if (pendingOrdersCount > 0) {
      document.title = `(${pendingOrdersCount}) New orders · ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [pendingOrdersCount]);

  // Show a toast "New order received" when the pending count increases (no sound)
  const prevPendingRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (prevPendingRef.current !== null && pendingOrdersCount > prevPendingRef.current) {
      showToast('New order received', 'info');
    }
    prevPendingRef.current = pendingOrdersCount;
  }, [pendingOrdersCount, showToast]);

  // 30-minute inactivity auto-logout
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const lastActivityRef = React.useRef<number>(Date.now());

  const handleAdminLogout = React.useCallback(
    async (reason?: string) => {
      logout();
      await signOut();
      showToast(reason || 'Admin logged out successfully', 'info');
      navigate('/admin/login', { replace: true });
    },
    [logout, signOut, showToast, navigate]
  );

  React.useEffect(() => {
    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        handleAdminLogout('Session expired after 30 minutes of inactivity.');
      }
    }, 15000); // Check every 15 seconds

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      clearInterval(checkInterval);
    };
  }, [handleAdminLogout]);

  const navItems = [
    { to: '/admin', label: 'Dashboard & Sales', icon: LayoutDashboard, end: true },
    {
      to: '/admin/orders',
      label: 'Orders & Dispatch',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    { to: '/admin/products', label: 'Products & Stock', icon: Package },
    { to: '/admin/categories', label: 'Categories', icon: Layers },
    { to: '/admin/coupons', label: 'Discount Coupons', icon: Tag },
    { to: '/admin/customers', label: 'Customers', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#F3E9DC] flex flex-col font-sans text-[#3B2A20]">
      <ToastContainer />
      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="bg-[#B4502F] text-white px-4 py-1.5 text-xs font-semibold text-center flex items-center justify-center gap-2 border-b border-[#964225]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          <span>Demo mode active — full admin permissions enabled</span>
        </div>
      )}

      {/* Top Admin Header */}
      <header className="bg-[#3B2A20] text-[#F3E9DC] border-b border-[#3B2A20]/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 text-[#F3E9DC] hover:text-white rounded-[12px]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
          </button>

          <Link to="/admin" className="flex items-center gap-2.5" aria-label="Arooj Admin">
            <img src="/logo.png" alt="Arooj" className="h-8 w-auto object-contain select-none" />
            <span className="font-serif text-xl font-bold text-[#F3E9DC] tracking-tight">Arooj</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#B4502F]/30 text-[#F3E9DC] border border-[#B4502F]/50 hidden sm:inline-block">
              Store Owner Portal
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Live Data Refresh Button with Spinner */}
          <button
            onClick={() => refreshAdminData(false)}
            disabled={isAdminDataLoading}
            title="Refresh Orders & Store Data"
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full bg-[#3B2A20] hover:bg-[#3B2A20]/80 text-[#F3E9DC] border border-[#E3D5C4]/30 font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#B4502F] ${isAdminDataLoading ? 'animate-spin' : ''}`}
              strokeWidth={1.5}
            />
            <span className="hidden sm:inline">{isAdminDataLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/"
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full bg-[#3B2A20] hover:bg-[#3B2A20]/80 text-[#F3E9DC] border border-[#E3D5C4]/30 font-medium transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-[#B4502F]" strokeWidth={1.5} /> Storefront
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="text-[#F3E9DC]/80 hidden sm:inline">
              {profile?.full_name || 'Admin'}
            </span>
            <button
              onClick={() => handleAdminLogout()}
              className="p-2 text-[#F3E9DC]/80 hover:text-[#B3372F] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Admin Shell Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Warm Dark Brown Sidebar */}
        <aside
          className={`w-full md:w-64 bg-[#3B2A20] text-[#F3E9DC] border-r border-[#3B2A20]/90 p-4 flex flex-col shrink-0 ${
            mobileMenuOpen ? 'block' : 'hidden md:flex'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#8A9A7B] px-3 py-2">
            Store Management
          </div>

          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#B4502F] text-white shadow-xs'
                        : 'text-[#F3E9DC]/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="bg-[#B4502F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Visible Sidebar Logout Button */}
          <div className="pt-4 mt-6 border-t border-white/10">
            <button
              type="button"
              onClick={() => handleAdminLogout()}
              className="w-full flex items-center justify-center gap-3 px-3.5 py-3 min-h-[44px] rounded-full text-xs font-semibold text-[#F3E9DC] bg-white/5 hover:bg-[#B3372F] hover:text-white border border-white/10 hover:border-[#B3372F] transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              <span>Logout Admin</span>
            </button>
            <p className="text-[10px] text-[#F3E9DC]/50 text-center mt-2">
              Auto log-out after 30m idle
            </p>
          </div>
        </aside>

        {/* Clean Warm Boutique Dashboard Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#F3E9DC]">
          <AdminErrorBoundary fallbackTitle="Error loading admin view">
            <Outlet />
          </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
};
