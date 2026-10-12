
import { createClient } from '@supabase/supabase-js';

// Get connection details from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey
);

// Create Supabase connection
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
