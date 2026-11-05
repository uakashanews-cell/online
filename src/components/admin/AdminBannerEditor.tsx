/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HomeBanner, Category, Product } from '../../types';
import { bannerService } from '../../services/bannerService';
import { settingsService } from '../../services/settingsService';
import { HomeHeroBanner } from '../home/HomeHeroBanner';
import { isDemoMode } from '../../lib/supabaseClient';
import { validateImageFile } from '../../services/storageService';
import {
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Link as LinkIcon,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';

interface AdminBannerEditorProps {
  categories: Category[];
  products: Product[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminBannerEditor: React.FC<AdminBannerEditorProps> = ({
  categories,
  products,
  showToast,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: initialBanner, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['home-banner', 'admin'],
    queryFn: settingsService.getHeroBanner,
    staleTime: 30 * 1000,
    retry: 1,
  });

  // Local form state
  const [isActive, setIsActive] = useState(true);
  const [label, setLabel] = useState('');
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [buttonText, setButtonText] = useState('Shop now');
  const [linkSelection, setLinkSelection] = useState<string>('/shop');
  const [customLink, setCustomLink] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string>('');
  const [oldUploadedUrl, setOldUploadedUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Sync state when initialBanner loads
  useEffect(() => {
    if (initialBanner) {
      setIsActive(initialBanner.is_active);
      setLabel(initialBanner.label || '');
      setHeadline(initialBanner.headline || '');
      setSubtext(initialBanner.subtext || '');
      setButtonText(initialBanner.button_text || 'Explore the shop');
      setImageUrl(initialBanner.image_url || null);
      setOldUploadedUrl(initialBanner.image_url || null);

      if (initialBanner.ends_at) {
        // Convert ISO string to YYYY-MM-DDTHH:mm for datetime-local input
        try {
          const date = new Date(initialBanner.ends_at);
          const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setEndsAt(localIso);
        } catch {
          setEndsAt('');
        }
      } else {
        setEndsAt('');
      }

      // Check if button_link matches a preset
      const link = initialBanner.button_link || '/shop';
      const isKnown =
        link === '/shop' ||
        categories.some((c) => `/category/${c.slug}` === link) ||
        products.some((p) => `/product/${p.slug}` === link);

      if (isKnown) {
        setLinkSelection(link);
        setCustomLink('');
      } else {
        setLinkSelection('custom');
        setCustomLink(link);
      }
    }
  }, [initialBanner, categories, products]);

  // Determine computed button_link
  const computedButtonLink = useMemo(() => {
    if (linkSelection === 'custom') {
      return customLink.trim().startsWith('/') ? customLink.trim() : `/${customLink.trim()}`;
    }
    return linkSelection;
  }, [linkSelection, customLink]);

  // Construct banner preview object
  const previewBanner: HomeBanner = useMemo(() => {
    let resolvedEndsAt: string | null = null;
    if (endsAt) {
      try {
        resolvedEndsAt = new Date(endsAt).toISOString();
      } catch {
        resolvedEndsAt = null;
      }
    }

    return {
      id: 1,
      is_active: isActive,
      label: label.trim(),
      headline: headline.trim() || 'Welcome to Arooj',
      subtext: subtext.trim(),
      button_text: buttonText.trim() || 'Explore the shop',
      button_link: computedButtonLink || '/shop',
      image_url: imageUrl,
      ends_at: resolvedEndsAt,
      updated_at: new Date().toISOString(),
    };
  }, [isActive, label, headline, subtext, buttonText, computedButtonLink, imageUrl, endsAt]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const check = validateImageFile(file);
    if (!check.valid) {
      setUploadError(check.error || 'Invalid image file (Must be JPG, PNG, or WebP under 2 MB)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      // If there was an existing uploaded image, delete it
      if (imageUrl && imageUrl !== oldUploadedUrl) {
        await bannerService.deleteBannerImage(imageUrl).catch(() => {});
      }

      const uploadedUrl = await bannerService.uploadBannerImage(file);
      setImageUrl(uploadedUrl);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload image. Please check storage bucket permissions.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (imageUrl) {
      if (!isDemoMode) {
        bannerService.deleteBannerImage(imageUrl).catch(() => {});
      }
      setImageUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isActive && !headline.trim()) {
      showToast('Please enter a headline for the active banner.', 'error');
      return;
    }

    if (linkSelection === 'custom' && (!customLink.trim() || !customLink.startsWith('/'))) {
      showToast('Custom link must start with a forward slash "/" (e.g. /shop).', 'error');
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage(null);
    try {
      // If image changed from the initial row's image, delete the original old image
      if (oldUploadedUrl && imageUrl !== oldUploadedUrl) {
        bannerService.deleteBannerImage(oldUploadedUrl).catch(() => {});
      }

      const saved = await settingsService.saveHeroBanner({
        is_active: isActive,
        label: label.trim().slice(0, 30),
        headline: headline.trim().slice(0, 80),
        subtext: subtext.trim().slice(0, 200),
        button_text: (buttonText.trim() || 'Shop now').slice(0, 24),
        button_link: computedButtonLink,
        image_url: imageUrl,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      });

      // Update baseline oldUploadedUrl
      setOldUploadedUrl(imageUrl);

      // Instantly update cache and invalidate queries so admin and storefront update immediately without reload
      queryClient.setQueryData(['home-banner', 'admin'], saved);
      queryClient.setQueryData(['home-banner', 'public'], saved);
      await queryClient.invalidateQueries({ queryKey: ['home-banner'] });

      showToast('Home banner updated successfully!', 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to save home banner.';
      setSaveErrorMessage(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4]">
        <RefreshCw className="w-6 h-6 animate-spin text-[#B4502F]" />
        <span className="ml-3 text-sm font-medium text-[#3B2A20]">Loading home banner...</span>
      </div>
    );
  }

  if (isError && !isDemoMode && !initialBanner) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-red-50 rounded-[24px] border border-red-300 text-red-900 shadow-xs space-y-3">
          <div className="flex items-center gap-3 text-red-700 font-bold text-base">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <span>Banner settings not found or not accessible. Run the site_settings SQL in Supabase.</span>
          </div>
          <p className="text-xs text-red-700">
            {(queryError as any)?.message || 'The site_settings table could not be read from your Supabase database. Please execute the site_settings SQL migration in your Supabase SQL editor.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo mode warning notice */}
      {isDemoMode && (
        <div className="p-4 bg-amber-50 rounded-[16px] border border-amber-200 text-amber-900 flex items-center gap-3 text-xs sm:text-sm font-medium">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Demo mode: changes are kept in memory for this session and not permanently saved to Supabase.</span>
        </div>
      )}

      {saveErrorMessage && (
        <div className="p-4 bg-red-50 rounded-[16px] border border-red-300 text-red-700 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{saveErrorMessage}</span>
        </div>
      )}

      {/* Main Grid: Form on left/top, Live Preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Form Card */}
        <div className="lg:col-span-7 bg-[#FBF5EC] rounded-[24px] border border-[#E3D5C4] p-5 sm:p-7 shadow-xs">
          <div className="border-b border-[#E3D5C4] pb-4 mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B4502F] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Storefront Hero Management
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#3B2A20] mt-1">
              Home Hero Banner
            </h2>
            <p className="text-xs text-[#6B5B50] mt-1">
              Configure the large highlight banner displayed on the right side of the homepage hero.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* 1. Show Banner Toggle */}
            <div className="flex items-center justify-between p-4 bg-white rounded-[16px] border border-[#E3D5C4]">
              <div>
                <label htmlFor="is_active_toggle" className="text-xs font-bold text-[#3B2A20] block cursor-pointer">
                  Show banner
                </label>
                <span className="text-[11px] text-[#6B5B50]">
                  When disabled or expired, the storefront displays the neutral Arooj card.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer min-h-[44px]">
                <input
                  id="is_active_toggle"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#E3D5C4] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B4502F]" />
              </label>
            </div>

            {/* 2. Label */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#3B2A20]">
                  Label / Tag <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <span className={`text-[11px] font-mono ${label.length > 30 ? 'text-[#B3372F] font-bold' : 'text-[#6B5B50]'}`}>
                  {label.length}/30
                </span>
              </div>
              <input
                type="text"
                maxLength={30}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. New Season, Curated Essentials"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
              />
            </div>

            {/* 3. Headline */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#3B2A20]">
                  Headline <span className="text-[#B4502F]">*</span>
                </label>
                <span className={`text-[11px] font-mono ${headline.length > 80 ? 'text-[#B3372F] font-bold' : 'text-[#6B5B50]'}`}>
                  {headline.length}/80
                </span>
              </div>
              <input
                type="text"
                maxLength={80}
                required={isActive}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Little things that make a house feel like home"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
              />
            </div>

            {/* 4. Subtext */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#3B2A20]">
                  Subtext <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <span className={`text-[11px] font-mono ${subtext.length > 200 ? 'text-[#B3372F] font-bold' : 'text-[#6B5B50]'}`}>
                  {subtext.length}/200
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={200}
                value={subtext}
                onChange={(e) => setSubtext(e.target.value)}
                placeholder="Brief description or feature highlight..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] resize-none"
              />
            </div>

            {/* 5. Button Text & Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#3B2A20]">Button text</label>
                  <span className={`text-[11px] font-mono ${buttonText.length > 24 ? 'text-[#B3372F] font-bold' : 'text-[#6B5B50]'}`}>
                    {buttonText.length}/24
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={24}
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="e.g. Explore the shop"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#3B2A20] block mb-1.5">Button destination</label>
                <select
                  value={linkSelection}
                  onChange={(e) => setLinkSelection(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F] cursor-pointer"
                >
                  <option value="/shop">Shop (/shop)</option>
                  <optgroup label="Active Categories">
                    {categories
                      .filter((c) => c.is_active)
                      .map((cat) => (
                        <option key={cat.id} value={`/category/${cat.slug}`}>
                          Category: {cat.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Active Products">
                    {products
                      .filter((p) => p.is_active)
                      .slice(0, 30)
                      .map((prod) => (
                        <option key={prod.id} value={`/product/${prod.slug}`}>
                          Product: {prod.name}
                        </option>
                      ))}
                  </optgroup>
                  <option value="custom">Custom internal path...</option>
                </select>
              </div>
            </div>

            {/* Custom Link Input if selected */}
            {linkSelection === 'custom' && (
              <div>
                <label className="text-xs font-bold text-[#3B2A20] block mb-1.5">
                  Custom path (must start with /)
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-[#6B5B50] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="/shop or /about"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] font-mono focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
                  />
                </div>
              </div>
            )}

            {/* 6. Image Upload */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-[#3B2A20] block">
                Banner background photo <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <p className="text-[11px] text-[#6B5B50]">
                JPG, PNG, or WebP under 2 MB. Recommended 1000x1000 px. If no photo is uploaded, a boutique sage background with geometric circles is used.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 min-h-[44px] bg-[#3B2A20] hover:bg-[#251A14] disabled:opacity-50 text-white text-xs font-semibold rounded-full flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Uploading image...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> {imageUrl ? 'Replace photo' : 'Upload photo'}
                    </>
                  )}
                </button>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-4 py-2.5 min-h-[44px] bg-white border border-[#E3D5C4] hover:bg-rose-50 text-[#B3372F] text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove photo
                  </button>
                )}
              </div>

              {uploadError && (
                <p className="text-xs text-[#B3372F] font-medium flex items-center gap-1.5 pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
                </p>
              )}
            </div>

            {/* 7. End Date & Time */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#3B2A20] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#B4502F]" /> End date and time <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                {endsAt && (
                  <button
                    type="button"
                    onClick={() => setEndsAt('')}
                    className="text-[11px] text-[#B4502F] hover:underline cursor-pointer"
                  >
                    Clear expiration
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E3D5C4] rounded-[12px] text-xs text-[#3B2A20] focus:outline-hidden focus:ring-2 focus:ring-[#B4502F]"
              />
              <p className="text-[11px] text-[#6B5B50] flex items-center gap-1">
                <Info className="w-3 h-3 text-[#8A9A7B]" /> Banner hides automatically after this datetime in Karachi time (PKT).
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-[#E3D5C4] flex items-center justify-between">
              <span className="text-[11px] text-[#6B5B50]">
                Changes immediately invalidate cache and refresh live storefront.
              </span>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 min-h-[44px] bg-[#B4502F] hover:bg-[#964225] disabled:opacity-50 text-white font-bold text-xs rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Save banner
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-3 sticky top-6">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#3B2A20] uppercase tracking-wider flex items-center gap-1.5">
              Live Preview
            </span>
            <span className="text-[11px] text-[#6B5B50]">
              Homepage hero right block
            </span>
          </div>

          <div className="p-3 bg-white/70 rounded-[32px] border border-[#E3D5C4] shadow-xs">
            <HomeHeroBanner banner={previewBanner} isPreview={true} />
          </div>

          <p className="text-[11px] text-[#6B5B50] text-center px-4">
            This preview updates live as you type or change photos, rendering with the exact same component used on the homepage.
          </p>
        </div>
      </div>
    </div>
  );
};
