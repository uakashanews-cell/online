/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL } from '../config/site';
import { Logo } from '../components/common/Logo';
import { Lock, Mail, User, Phone, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register' | 'forgot';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode }) => {
  const { showToast } = useStore();
  const { signIn, signInAdmin, signUp, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const redirectPath = searchParams.get('redirect') || '/';

  const defaultMode =
    initialMode ||
    (location.pathname.includes('register')
      ? 'register'
      : location.pathname.includes('forgot')
      ? 'forgot'
      : 'login');

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    if (!email.trim()) {
      setValidationErrors({ email: 'Please enter your email address' });
      return;
    }
    if (!password) {
      setValidationErrors({ password: 'Password is required' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const isAdminEmail = cleanEmail === ADMIN_EMAIL.toLowerCase();

    // If admin logs in at /login, authenticate and redirect to /admin
    if (isAdminEmail) {
      try {
        await signInAdmin(cleanEmail, password);
        navigate('/admin');
        return;
      } catch (err: any) {
        setValidationErrors({ email: err?.message || 'Invalid email or password.' });
        return;
      }
    }

    // Customer login: customers must never open /admin/*
    const safeRedirect = redirectPath.startsWith('/admin') ? '/account' : (redirectPath !== '/' ? redirectPath : '/account');

    try {
      await signIn(email, password);
      navigate(safeRedirect);
    } catch (err: any) {
      setValidationErrors({ email: err?.message || 'Invalid email or password.' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!email.trim()) errs.email = 'Email address is required';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters long';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      return;
    }

    setValidationErrors({});
    try {
      await signUp(email, password, fullName, phone.trim() || '03001234567');
      navigate(redirectPath !== '/' ? redirectPath : '/account');
    } catch (err: any) {
      setValidationErrors({ email: err?.message || 'Registration failed' });
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setValidationErrors({ email: 'Email address is required' });
      return;
    }
    setValidationErrors({});
    setForgotSubmitted(true);
    showToast('If this email exists, a reset link was sent', 'success');
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4 sm:px-6">
      <div className="bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Header with Logo */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <Logo size="sm" showTagline={false} />
          <h2 className="font-serif text-2xl font-bold text-[#3B2A20] pt-2">
            {mode === 'login' && 'Sign in to BARVAKA'}
            {mode === 'register' && 'Create your Account'}
            {mode === 'forgot' && 'Reset your Password'}
          </h2>
          <p className="text-xs text-[#6B5B50]">
            {mode === 'login' && 'Access order history, saved addresses, and wishlist'}
            {mode === 'register' && 'Quick registration for seamless COD shopping nationwide'}
            {mode === 'forgot' && 'Enter your email to receive recovery instructions'}
          </p>
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hassan@example.com"
                  className={`w-full pl-9 pr-3 py-2.5 min-h-[44px] rounded-[12px] bg-white border text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] ${
                    validationErrors.email ? 'border-[#B3372F] bg-[#B3372F]/5' : 'border-[#E3D5C4]'
                  }`}
                />
                <Mail className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3.5" strokeWidth={1.5} />
              </div>
              {validationErrors.email && (
                <p className="text-xs text-[#B3372F] mt-1 font-medium">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-[#3B2A20] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-[#B4502F] hover:underline font-medium cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 min-h-[44px] rounded-[12px] bg-white border border-[#E3D5C4] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                />
                <Lock className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3.5" strokeWidth={1.5} />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#a04426] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              Sign In to Account
            </button>

            <div className="text-center pt-2 text-xs text-[#6B5B50]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-[#B4502F] font-semibold hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                Full Name <span className="text-[#B3372F]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Hassan Ali"
                  className={`w-full pl-9 pr-3 py-2.5 min-h-[44px] rounded-[12px] bg-white border text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] ${
                    validationErrors.fullName ? 'border-[#B3372F] bg-[#B3372F]/5' : 'border-[#E3D5C4]'
                  }`}
                />
                <User className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3.5" strokeWidth={1.5} />
              </div>
              {validationErrors.fullName && (
                <p className="text-xs text-[#B3372F] mt-1 font-medium">{validationErrors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                Email Address <span className="text-[#B3372F]">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hassan@example.com"
                  className={`w-full pl-9 pr-3 py-2.5 min-h-[44px] rounded-[12px] bg-white border text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] ${
                    validationErrors.email ? 'border-[#B3372F] bg-[#B3372F]/5' : 'border-[#E3D5C4]'
                  }`}
                />
                <Mail className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3.5" strokeWidth={1.5} />
              </div>
              {validationErrors.email && (
                <p className="text-xs text-[#B3372F] mt-1 font-medium">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                Mobile Number (For Courier)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full pl-9 pr-3 py-2.5 min-h-[44px] rounded-[12px] bg-white border border-[#E3D5C4] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                />
                <Phone className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3.5" strokeWidth={1.5} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                Password <span className="text-[#B3372F]">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`w-full pl-9 pr-3 py-2.5 min-h-[44px] rounded-[12px] bg-white border text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] ${
                    validationErrors.password ? 'border-[#B3372F] bg-[#B3372F]/5' : 'border-[#E3D5C4]'
                  }`}
                />
                <Lock className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3.5" strokeWidth={1.5} />
              </div>
              {validationErrors.password && (
                <p className="text-xs text-[#B3372F] mt-1 font-medium">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                Confirm Password <span className="text-[#B3372F]">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className={`w-full pl-9 pr-3 py-2.5 min-h-[44px] rounded-[12px] bg-white border text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] ${
                    validationErrors.confirmPassword ? 'border-[#B3372F] bg-[#B3372F]/5' : 'border-[#E3D5C4]'
                  }`}
                />
                <Lock className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3.5" strokeWidth={1.5} />
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-xs text-[#B3372F] mt-1 font-medium">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#a04426] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              Register Account <ArrowRight className="w-4 h-4 text-white" strokeWidth={1.5} />
            </button>

            <div className="text-center pt-2 text-xs text-[#6B5B50]">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#B4502F] font-semibold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* Forgot Password */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {forgotSubmitted ? (
              <div className="p-4 bg-[#DDE3D3]/40 border border-[#8A9A7B]/30 rounded-[16px] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#2E7D4F] mx-auto" strokeWidth={1.5} />
                <p className="text-sm font-bold text-[#3B2A20]">Reset Instructions Sent</p>
                <p className="text-xs text-[#6B5B50]">
                  If an account exists for this email, you will receive password reset instructions.
                </p>
                <button
                  onClick={() => {
                    setForgotSubmitted(false);
                    setMode('login');
                  }}
                  className="mt-3 px-5 py-2.5 min-h-[44px] bg-[#B4502F] hover:bg-[#a04426] text-white text-xs font-semibold rounded-full cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3B2A20] mb-1.5 uppercase tracking-wider">
                    Registered Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`w-full pl-9 pr-3 py-2.5 min-h-[44px] rounded-[12px] bg-white border text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] ${
                        validationErrors.email ? 'border-[#B3372F] bg-[#B3372F]/5' : 'border-[#E3D5C4]'
                      }`}
                    />
                    <Mail className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3.5" strokeWidth={1.5} />
                  </div>
                  {validationErrors.email && (
                    <p className="text-xs text-[#B3372F] mt-1 font-medium">{validationErrors.email}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 min-h-[44px] rounded-full bg-[#B4502F] hover:bg-[#a04426] text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                >
                  Send Reset Link
                </button>

                <div className="text-center pt-2 text-xs text-[#6B5B50]">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-[#B4502F] font-semibold hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
