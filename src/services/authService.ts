/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';
import { MOCK_PROFILES } from '../lib/mockData';
import { Profile } from '../types';
import { ADMIN_EMAIL, siteConfig } from '../config/site';

const isDevEnv = (): boolean => {
  if (typeof (globalThis as any).__BARVAKA_DEV__ !== 'undefined') {
    return Boolean((globalThis as any).__BARVAKA_DEV__);
  }
  return Boolean((import.meta as any).env?.DEV);
};

let localProfiles = [...MOCK_PROFILES];

export const authService = {
  async signIn(email: string, password?: string): Promise<{ profile: Profile }> {
    if (!password) {
      throw new Error('Password is required.');
    }

    if (isDemoMode || !supabase) {
      const isDev = isDevEnv();
      if (!isDev) {
        throw new Error('Store is not connected to its database yet.');
      }
      const found = localProfiles.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!found) {
        throw new Error('Account not found with this email.');
      }
      if (found.role === 'admin') {
        throw new Error('Admin must sign in via Admin Portal.');
      }
      return { profile: found };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('User not found');

    const profile = await this.getProfile(data.user.id);
    if (!profile) throw new Error('User profile could not be loaded');

    return { profile };
  },

  async signInAdmin(email: string, password: string): Promise<{ profile: Profile }> {
    const cleanEmail = email.trim().toLowerCase();
    const adminEmailLower = ADMIN_EMAIL.toLowerCase();

    // Only ADMIN_EMAIL can ever log into the admin panel
    if (cleanEmail !== adminEmailLower) {
      throw new Error('Invalid email or password.');
    }

    if (isDemoMode || !supabase) {
      const isDev = isDevEnv();
      if (!isDev) {
        throw new Error('Store is not connected to its database yet.');
      }

      if (password !== 'demo1234') {
        throw new Error('Invalid email or password.');
      }
      const admin = localProfiles.find(
        (p) => p.email.toLowerCase() === adminEmailLower && p.role === 'admin'
      ) || {
        id: 'user-admin-01',
        email: ADMIN_EMAIL,
        full_name: 'Store Owner (Admin)',
        phone: siteConfig.support.whatsappDisplay,
        role: 'admin',
        created_at: new Date().toISOString(),
      };
      return { profile: admin };
    }

    // Real Supabase mode (demo check completely disabled)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data.user) {
      throw new Error('Invalid email or password.');
    }

    // Verify email strictly equals ADMIN_EMAIL (case-insensitive)
    const userEmail = data.user.email?.trim().toLowerCase();
    if (userEmail !== adminEmailLower) {
      await supabase.auth.signOut();
      throw new Error('Invalid email or password.');
    }

    // Verify profiles.role = 'admin'
    const profile = await this.getProfile(data.user.id);
    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('Invalid email or password.');
    }

    return { profile };
  },

  async signUp(email: string, password: string, fullName: string, phone: string): Promise<{ profile: Profile }> {
    if (isDemoMode || !supabase) {
      const newProfile: Profile = {
        id: `user-${Date.now()}`,
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        role: 'customer',
        created_at: new Date().toISOString(),
      };
      localProfiles.push(newProfile);
      return { profile: newProfile };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Sign up failed');

    const profile = await this.getProfile(data.user.id);
    return { profile: profile || {
      id: data.user.id,
      email: data.user.email || email,
      full_name: fullName,
      phone,
      role: 'customer',
      created_at: new Date().toISOString(),
    }};
  },

  async signOut(): Promise<void> {
    if (isDemoMode || !supabase) return;
    await supabase.auth.signOut();
  },

  async resetPassword(email: string): Promise<void> {
    if (isDemoMode || !supabase) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    if (isDemoMode || !supabase) {
      return localProfiles.find((p) => p.id === userId) || null;
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    if (isDemoMode || !supabase) {
      localProfiles = localProfiles.map((p) => (p.id === userId ? { ...p, ...updates } : p));
      const updated = localProfiles.find((p) => p.id === userId);
      if (!updated) throw new Error('Profile not found');
      return updated;
    }

    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  },
};
