import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const passwordResetRedirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL?.trim() ?? '';

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

const supabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error(
      'Supabase の接続情報が未設定です。`.env.local` に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。',
    );
  }

  return supabaseClient;
}

export function getPasswordResetRedirectUrl() {
  if (passwordResetRedirectUrl) {
    return passwordResetRedirectUrl;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  if (!/^https?:\/\//.test(window.location.origin)) {
    return null;
  }

  if (
    window.location.origin === 'http://localhost' ||
    window.location.origin === 'https://localhost' ||
    window.location.origin === 'http://127.0.0.1' ||
    window.location.origin === 'https://127.0.0.1'
  ) {
    return null;
  }

  return `${window.location.origin}${window.location.pathname}`;
}
