/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Demo mode is active when Supabase env variables are not set
export const isDemoMode = !url || !key || url.includes('your-project');

export const supabase = isDemoMode ? null : createClient(url, key);
