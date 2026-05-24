// ============================================================
//  supabase.js — Conexión central al proyecto Supabase
//  Todos los módulos importan desde este archivo
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://ctmrorchlncuukztgwrv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0bXJvcmNobG5jdXVrenRnd3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTUyNjAsImV4cCI6MjA5NTE3MTI2MH0.tLGsrJrp9OFjactrhbgDOBOM_nZsAl0tKV2RvhnDwwQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth helpers ─────────────────────────────────────────────

/** Devuelve la sesión activa o null */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Redirige al login si no hay sesión activa */
export async function requireAuth(redirectTo = 'index.html') {
  const session = await getSession();
  if (!session) {
    window.location.href = redirectTo;
  }
  return session;
}

/** Cierra sesión y redirige */
export async function signOut(redirectTo = 'index.html') {
  await supabase.auth.signOut();
  window.location.href = redirectTo;
}

// ── Escucha cambios de sesión globalmente ────────────────────
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = 'index.html';
  }
});
