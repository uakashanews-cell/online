/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { ADMIN_EMAIL } from '../config/site';
import { isDemoMode } from '../lib/supabaseClient';
import { Logo } from '../components/common/Logo';
import { Lock, Mail, ShieldAlert, ArrowLeft, AlertCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { usePageSEO } from '../hooks/usePageSEO';

const LOCKOUT_KEY = 'brv_admin_lockout_v1';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_SEC = 60;

interface LockoutState {
  attempts: number;
  lockedUntil: number | null;
}

export const AdminLoginPage: React.FC = () => {
  usePageSEO({ title: 'Admin Login | BARVAKA', noindex: true });
  const { signInAdmin, isAdmin, loading: authLoading } = useAuth();
  const { showToast } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // If already authenticated as admin, redirect immediately to /admin
  useEffect(() => {
    if (isAdmin) {
      const from = (location.state as any)?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAdmin, navigate, location.state]);

  // Read stored lockout state
  const getStoredLockout = (): LockoutState => {
    try {
      const raw = sessionStorage.getItem(LOCKOUT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          attempts: Number(parsed.attempts) || 0,
          lockedUntil: parsed.lockedUntil ? Number(parsed.lockedUntil) : null,
        };
      }
    } catch {
      // ignore
    }
    return { attempts: 0, lockedUntil: null };
  };

  const saveLockout = (state: LockoutState) => {
    try {
      sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  };

  // Timer loop for lockout countdown
  useEffect(() => {
    const checkLockout = () => {
      const state = getStoredLockout();
      if (state.lockedUntil) {
        const now = Date.now();
        const diffMs = state.lockedUntil - now;
        if (diffMs > 0) {
          const sec = Math.ceil(diffMs / 1000);
          setRemainingSeconds(sec);
        } else {
          // Lockout expired
          saveLockout({ attempts: 0, lockedUntil: null });
          setRemainingSeconds(0);
        }
      } else {
        setRemainingSeconds(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const isLocked = remainingSeconds > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLocked) {
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Invalid email or password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signInAdmin(email, password);
      // Success: clear lockout
      saveLockout({ attempts: 0, lockedUntil: null });
      showToast('Admin authenticated successfully', 'success');
      navigate('/admin', { replace: true });
    } catch (err: any) {
      // Track failed attempt
      const current = getStoredLockout();
      const newAttempts = current.attempts + 1;

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_SEC * 1000;
        saveLockout({ attempts: newAttempts, lockedUntil: lockUntil });
        setRemainingSeconds(LOCKOUT_DURATION_SEC);
      } else {
        saveLockout({ attempts: newAttempts, lockedUntil: null });
      }

      if (err?.message === 'Store is not connected to its database yet.') {
        setErrorMessage('Store is not connected to its database yet.');
      } else {
        setErrorMessage('Invalid email or password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3E9DC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-[#3B2A20] selection:bg-[#B4502F] selection:text-[#F3E9DC]">
      {/* Back to store link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#3B2A20] hover:text-[#B4502F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#B4502F]" strokeWidth={1.5} />
          Back to store
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Card */}
        <div className="bg-[#FBF5EC] py-8 px-6 sm:px-10 rounded-[24px] border border-[#E3D5C4] shadow-md space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-3 flex flex-col items-center">
            <Logo variant="dark" size="md" showTagline={false} />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8A9A7B]/15 border border-[#8A9A7B]/40 text-[10px] font-bold text-[#3B2A20] uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-[#B4502F]" strokeWidth={1.5} />
              Store Owner Portal · Authorized Access Only
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#3B2A20]">
              Admin Sign In
            </h1>
            <p className="text-xs text-[#6B5B50] max-w-xs leading-relaxed">
              Authenticate with your verified administrator credentials to access the BARVAKA store control center.
            </p>
          </div>

          {/* Lockout Notice */}
          {isLocked && (
            <div
              className="bg-[#B3372F]/10 border border-[#B3372F]/30 rounded-[12px] p-3.5 text-center space-y-1.5 animate-in fade-in"
              role="alert"
            >
              <div className="flex items-center justify-center gap-2 text-[#B3372F] font-bold text-xs">
                <Clock className="w-4 h-4 animate-pulse" strokeWidth={1.5} />
                <span>Security Lockout Active</span>
              </div>
              <p className="text-xs text-[#B3372F]">
                Too many failed attempts. Form is locked for{' '}
                <strong className="font-mono text-sm underline">{remainingSeconds}s</strong>.
              </p>
              <p className="text-[11px] text-[#6B5B50]">
                Please wait for the timer to expire before re-entering credentials.
              </p>
            </div>
          )}

          {/* Generic Error Notice */}
          {!isLocked && errorMessage && (
            <div
              className="bg-[#B3372F]/10 border border-[#B3372F]/30 rounded-[12px] p-3 flex items-center gap-2.5 text-xs text-[#B3372F] font-medium"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Demo Mode Helper Notice (only shown in development preview, completely disabled in production) */}
          {isDemoMode && Boolean((import.meta as any).env?.DEV) && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-[12px] p-3 text-[11px] text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-[#3B2A20]">
                <span className="w-2 h-2 rounded-full bg-[#B4502F]" />
                Development demo mode: use demo password demo1234.
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-[#3B2A20] uppercase tracking-wider mb-1.5"
              >
                Administrator Email <span className="text-[#B3372F]">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="off"
                  disabled={isLocked || isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] rounded-[12px] bg-white border border-[#E3D5C4] text-xs text-[#3B2A20] placeholder:text-[#6B5B50]/60 focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] focus:border-[#B4502F] transition-all disabled:opacity-50 disabled:bg-[#F3E9DC]"
                />
                <Mail className="w-4 h-4 text-[#B4502F] absolute left-3.5 top-3.5" strokeWidth={1.5} />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-[#3B2A20] uppercase tracking-wider mb-1.5"
              >
                Password <span className="text-[#B3372F]">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="off"
                  disabled={isLocked || isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 min-h-[44px] rounded-[12px] bg-white border border-[#E3D5C4] text-xs text-[#3B2A20] placeholder:text-[#6B5B50]/60 focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] focus:border-[#B4502F] transition-all disabled:opacity-50 disabled:bg-[#F3E9DC]"
                />
                <Lock className="w-4 h-4 text-[#B4502F] absolute left-3.5 top-3.5" strokeWidth={1.5} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  className="absolute right-3.5 top-3 text-[#6B5B50] hover:text-[#3B2A20] transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLocked || isSubmitting}
              className="w-full py-3.5 px-4 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#964225] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : isLocked ? (
                <span>Locked ({remainingSeconds}s)</span>
              ) : (
                <span>Sign In to Admin Portal</span>
              )}
            </button>
          </form>

          {/* Footer Security Stamp */}
          <div className="pt-2 border-t border-[#E3D5C4] text-center text-[10px] text-[#6B5B50]">
            Strict rate-limiting and audit logging are active. Unauthorized access attempts are monitored.
          </div>
        </div>
      </div>
    </div>
  );
};
