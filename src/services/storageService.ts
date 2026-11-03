/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';

const BUCKET_NAME = 'product-images';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG, and WebP images are accepted.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image size must be less than 2 MB.' };
  }
  return { valid: true };
}

export const storageService = {
  async uploadProductImage(productId: string, file: File): Promise<string> {
    const check = validateImageFile(file);
    if (!check.valid) throw new Error(check.error);

    if (isDemoMode || !supabase) {
      // In demo mode, return an object URL or high quality unsplash image
      return URL.createObjectURL(file);
    }

    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const path = `products/${productId}/${timestamp}-${cleanFileName}`;

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadCategoryImage(categoryId: string, file: File): Promise<string> {
    const check = validateImageFile(file);
    if (!check.valid) throw new Error(check.error);

    if (isDemoMode || !supabase) {
      return URL.createObjectURL(file);
    }

    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const path = `categories/${categoryId}/${timestamp}-${cleanFileName}`;

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  },

  async deleteImage(urlOrPath: string): Promise<void> {
    if (isDemoMode || !supabase) return;
    try {
      let path = urlOrPath;
      if (path.includes(BUCKET_NAME + '/')) {
        path = path.split(BUCKET_NAME + '/')[1];
      }
      if (path && (path.startsWith('products/') || path.startsWith('categories/'))) {
        await supabase.storage.from(BUCKET_NAME).remove([path]);
      }
    } catch (err) {
      console.warn('Failed to delete image from storage:', err);
    }
  },

  async testConnection(): Promise<{
    mode: 'real' | 'demo';
    dbOk: boolean;
    storageOk: boolean;
    dbMessage: string;
    storageMessage: string;
  }> {
    if (isDemoMode || !supabase) {
      return {
        mode: 'demo',
        dbOk: false,
        storageOk: false,
        dbMessage: 'Demo mode active. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect real database.',
        storageMessage: 'Demo mode active. Images are not persisted to cloud storage.',
      };
    }

    let dbOk = false;
    let dbMessage = '';
    try {
      const { error } = await supabase.from('categories').select('id', { count: 'exact', head: true });
      if (error) {
        dbOk = false;
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          dbMessage = "Connected to Supabase, but database tables are not yet created. Execute supabase/schema.sql in your Supabase SQL Editor.";
        } else {
          dbMessage = error.message || 'Could not query categories table. Run supabase/schema.sql in the Supabase SQL Editor.';
        }
      } else {
        dbOk = true;
        dbMessage = 'Successfully connected to Supabase PostgreSQL database.';
      }
    } catch (err: any) {
      dbOk = false;
      dbMessage = err?.message || 'Database connection error. Verify your Supabase URL and anon key.';
    }

    let storageOk = false;
    let storageMessage = '';
    try {
      // 1x1 transparent PNG to satisfy allowed_mime_types check (image/png)
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
      ]);
      const blob = new Blob([pngBytes], { type: 'image/png' });
      const testPath = `test/ping-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(testPath, blob, {
        contentType: 'image/png',
        upsert: true,
      });

      if (uploadError) {
        // If upload fails because user is not admin / unauthenticated, check if the bucket exists by listing
        const { error: listError } = await supabase.storage.from(BUCKET_NAME).list('', { limit: 1 });
        if (!listError) {
          storageOk = true;
          storageMessage = `Storage bucket '${BUCKET_NAME}' is accessible (uploads require admin authentication).`;
        } else {
          storageOk = false;
          storageMessage = uploadError.message || `Bucket '${BUCKET_NAME}' is missing or restricted. Run supabase/schema.sql in Supabase.`;
        }
      } else {
        await supabase.storage.from(BUCKET_NAME).remove([testPath]);
        storageOk = true;
        storageMessage = `Storage bucket '${BUCKET_NAME}' is accessible and operational.`;
      }
    } catch (err: any) {
      storageOk = false;
      storageMessage = err?.message || `Storage bucket '${BUCKET_NAME}' could not be reached.`;
    }

    return {
      mode: 'real',
      dbOk,
      storageOk,
      dbMessage,
      storageMessage,
    };
  },
};
