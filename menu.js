// ============================================================
//  menu.js — Dashboard StreamVault (sin sidebar)
// ============================================================

import { requireAuth, signOut, supabase } from './supabase.js';

// ── Guard: requiere sesión ───────────────────────────────────
const session = await requireAuth('index.html');
const userId  = session.user.id;

// ── Fecha de hoy ─────────────────────────────────────────────
function setFecha() {
  const now  = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const str  = now.toLocaleDateString('es-PE', opts);
  document.getElementById('fechaHoy').textContent =
    str.charAt(0).toUpperCase() + str.slice(1);
}
setFecha();

// ── Datos del admin ───────────────────────────────────────────
async function loadAdminInfo() {
  const { data, error } = await supabase
    .from('admins')
    .select('nombre')
    .eq('id', userId)
    .single();

  if (!error && data) {
    const nombre = data.nombre;
    document.getElementById('userName').textContent    = nombre;
    document.getElementById('welcomeName').textContent = nombre;
    document.getElementById('userAvatar').textContent  = nombre.charAt(0).toUpperCase();
  }
}
loadAdminInfo();

// ── Estadísticas ──────────────────────────────────────────────
async function loadStats() {
  const hoy   = new Date();
  const hoyStr = hoy.toISOString().split('T')[0];

  const en5    = new Date(hoy);
  en5.setDate(hoy.getDate() + 5);
  const en5Str = en5.toISOString().split('T')[0];

  // Helper: query segura con fallback a 0
  async function count(table, filters = []) {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    for (const [col, op, val] of filters) {
      if      (op === 'eq')  q = q.eq(col, val);
      else if (op === 'lt')  q = q.lt(col, val);
      else if (op === 'gte') q = q.gte(col, val);
      else if (op === 'lte') q = q.lte(col, val);
    }
    const { count: c, error } = await q;
    return error ? null : (c ?? 0);
  }

  // Cuentas madres
  const cuentas = await count('cuentas_madres');
  document.getElementById('totalCuentas').textContent =
    cuentas !== null ? cuentas : '—';

  // Perfiles totales
  const perfiles = await count('perfiles');
  document.getElementById('totalPerfiles').textContent =
    perfiles !== null ? perfiles : '—';

  // Perfiles libres
  const libres = await count('perfiles', [['estado', 'eq', 'libre']]);
  document.getElementById('totalLibres').textContent  = libres !== null ? libres : '—';
  document.getElementById('statLibres').textContent   = libres !== null ? libres : '—';

  // Vencidos (fecha_vencimiento pasada y estado activo)
  const vencidos = await count('perfiles', [
    ['estado', 'eq', 'activo'],
    ['fecha_vencimiento', 'lt', hoyStr]
  ]);
  document.getElementById('totalVencidos').textContent = vencidos !== null ? vencidos : '—';
  document.getElementById('statVencidos').textContent  = vencidos !== null ? vencidos : '—';

  // Por vencer (próximos 5 días)
  const porVencer = await count('perfiles', [
    ['estado', 'eq', 'activo'],
    ['fecha_vencimiento', 'gte', hoyStr],
    ['fecha_vencimiento', 'lte', en5Str]
  ]);
  document.getElementById('statPorVencer').textContent =
    porVencer !== null ? porVencer : '—';
}
loadStats();

// ── Logout ────────────────────────────────────────────────────
document.getElementById('btnLogout').addEventListener('click', async () => {
  await signOut('index.html');
});
