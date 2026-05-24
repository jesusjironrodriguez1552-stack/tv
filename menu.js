// ============================================================
//  menu.js — Lógica del Dashboard
// ============================================================

import { requireAuth, signOut, supabase } from './supabase.js';

// ── Guard: requiere sesión ───────────────────────────────────
const session = await requireAuth('index.html');
const userId  = session.user.id;

// ── Fecha de hoy ─────────────────────────────────────────────
function setFecha() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const str  = now.toLocaleDateString('es-PE', opts);
  // Capitalizar primera letra
  document.getElementById('fechaHoy').textContent =
    str.charAt(0).toUpperCase() + str.slice(1);
}
setFecha();

// ── Datos del admin logueado ──────────────────────────────────
async function loadAdminInfo() {
  const { data, error } = await supabase
    .from('admins')
    .select('nombre, rol')
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

// ── Estadísticas (placeholders hasta tener tablas de perfiles) ─
// Cuando crees las tablas reales, reemplaza estas funciones con
// queries reales a Supabase.
async function loadStats() {
  // ── Totales resumen (cards superiores) ──────────────────────

  // Cuentas madres
  try {
    const { count } = await supabase
      .from('cuentas_madres')
      .select('*', { count: 'exact', head: true });
    document.getElementById('totalCuentas').textContent = count ?? 0;
  } catch { document.getElementById('totalCuentas').textContent = '—'; }

  // Perfiles totales
  try {
    const { count } = await supabase
      .from('perfiles')
      .select('*', { count: 'exact', head: true });
    document.getElementById('totalPerfiles').textContent = count ?? 0;
  } catch { document.getElementById('totalPerfiles').textContent = '—'; }

  // Perfiles libres (sin asignar)
  try {
    const { count } = await supabase
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'libre');
    const libres = count ?? 0;
    document.getElementById('totalLibres').textContent  = libres;
    document.getElementById('statLibres').textContent   = libres;
  } catch {
    document.getElementById('totalLibres').textContent = '—';
    document.getElementById('statLibres').textContent  = '—';
  }

  // Perfiles vencidos
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo')
      .lt('fecha_vencimiento', hoy);
    const vencidos = count ?? 0;
    document.getElementById('totalVencidos').textContent = vencidos;
    document.getElementById('statVencidos').textContent  = vencidos;
  } catch {
    document.getElementById('totalVencidos').textContent = '—';
    document.getElementById('statVencidos').textContent  = '—';
  }

  // Perfiles por vencer (próximos 5 días)
  try {
    const hoy    = new Date();
    const en5    = new Date(hoy); en5.setDate(hoy.getDate() + 5);
    const hoyStr = hoy.toISOString().split('T')[0];
    const en5Str = en5.toISOString().split('T')[0];
    const { count } = await supabase
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo')
      .gte('fecha_vencimiento', hoyStr)
      .lte('fecha_vencimiento', en5Str);
    document.getElementById('statPorVencer').textContent = count ?? 0;
  } catch {
    document.getElementById('statPorVencer').textContent = '—';
  }
}
loadStats();

// ── Logout ───────────────────────────────────────────────────
document.getElementById('btnLogout').addEventListener('click', async () => {
  await signOut('index.html');
});

// ── Sidebar mobile toggle ────────────────────────────────────
const sidebar  = document.getElementById('sidebar');
const overlay  = document.getElementById('sidebarOverlay');
const menuBtn  = document.getElementById('menuToggle');

function openSidebar()  { sidebar.classList.add('open');   overlay.classList.add('active'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }

menuBtn.addEventListener('click', () =>
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar()
);
overlay.addEventListener('click', closeSidebar);
