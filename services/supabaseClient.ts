
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Try to grab keys from various possible environment locations
const getEnv = (key: string): string => {
  if (typeof window === 'undefined') return '';
  
  // Try Vite/Vercel standard locations
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv[key]) return metaEnv[key];
  
  // Try standard process.env (often polyfilled by builders)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {
    // process.env might not be defined
  }

  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

// Initialize only if keys exist, otherwise provide a null-safe reference or log warning
let supabaseInstance: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
  }
} else {
  console.warn("Supabase configuration missing. Cloud features will be disabled.");
}

export const supabase = supabaseInstance;
