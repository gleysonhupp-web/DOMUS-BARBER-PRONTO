// lib/supabase.ts
// Supabase client helper with reactive Mock Mode fallback

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Detect if we should use Mock Mode (missing or default keys)
export const isMockMode = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL';

if (isMockMode) {
  console.warn('DOMUS BARBER is running in [MOCK MODE] because Supabase env credentials are not configured.');
}

// Actual Supabase client instance (or null/dummy if in mock mode)
export const supabase = isMockMode
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);
