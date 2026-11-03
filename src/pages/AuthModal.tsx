/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User, Phone, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useStore();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    try {
      await signIn(email, password);
      showToast('Signed in successfully', 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Invalid email or password', 'error');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim() || !phone.trim() || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      await signUp(email, password, fullName, phone);
      showToast('Account created successfully', 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Registration failed', 'error');
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Password reset link sent to ${email}`, 'info');
    setMode('login');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#FBF5EC] rounded-[24px] shadow-2xl border border-[#E3D5C4] max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-[#3B2A20] text-[#F3E9DC] flex items-center justify-between border-b border-[#3B2A20]/80">
          <div>
            <h3 className="font-serif text-xl font-bold">
              {mode === 'login' && 'Sign in to BARVAKA'}
              {mode === 'register' && 'Create Customer Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h3>
            <p className="text-xs text-[#F3E9DC]/80 mt-0.5">
              Quality · Fast Delivery · Trust · Khayr
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-[#F3E9DC] hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hassan@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
                  />
                  <Mail className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#3B2A20]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-[#B4502F] hover:underline cursor-pointer"
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
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
                  />
                  <Lock className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#B4502F] hover:bg-[#a04426] text-white font-bold text-xs rounded-full shadow-md min-h-[44px] transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ali Khan"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
                  />
                  <User className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                  Mobile Number (Pakistan)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
                  />
                  <Phone className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ali@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
                  />
                  <Mail className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
                  />
                  <Lock className="w-4 h-4 text-[#8A9A7B] absolute left-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#B4502F] hover:bg-[#a04426] text-white font-bold text-xs rounded-full shadow-md min-h-[44px] transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2A20] mb-1">
                  Enter Your Account Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:ring-2 focus:ring-[#B4502F] min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#B4502F] hover:bg-[#a04426] text-white font-bold text-xs rounded-full shadow-md min-h-[44px] transition-colors cursor-pointer"
              >
                Send Recovery Instructions
              </button>
            </form>
          )}

          {/* Mode Switcher footer */}
          <div className="text-center text-xs text-[#6B5B50] pt-2 border-t border-[#E3D5C4]">
            {mode === 'login' && (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-[#B4502F] font-bold hover:underline cursor-pointer"
                >
                  Register now
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-[#B4502F] font-bold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#B4502F] font-bold hover:underline cursor-pointer"
              >
                ← Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
