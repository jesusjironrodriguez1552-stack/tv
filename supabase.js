// ============================================================
//  supabase.js — Conexión central (instancia única)
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://ctmrorchlncuukztgwrv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0bXJvcmNobG5jdXVrenRnd3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTUyNjAsImV4cCI6MjA5NTE3MTI2MH0.tLGsrJrp9OFjactrhbgDOBOM_nZsAl0tKV2RvhnDwwQ';

// Instancia única global — evita múltiples GoTrueClient
const KEY = '__sv_supabase__';
if (!window[KEY]) {
  window[KEY] = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: true,
      storageKey: 'sv-auth',
      autoRefreshToken: true,
      detectSessionInUrl: false,
    }
  });
}

export const supabase = window[KEY];

// ── Auth helpers ─────────────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth(redirectTo = 'index.html') {
  const session = await getSession();
  if (!session) window.location.href = redirectTo;
  return session;
}

export async function signOut(redirectTo = 'index.html') {
  await supabase.auth.signOut();
  window.location.href = redirectTo;
}
