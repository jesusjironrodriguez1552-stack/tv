// ============================================================
//  cuentas.js — Panel Cuentas Madres
// ============================================================

import { requireAuth, signOut, supabase } from './supabase.js';

// ── Guard ────────────────────────────────────────────────────
await requireAuth('index.html');

// ── Colores por plataforma ───────────────────────────────────
const PLATAFORMAS = {
  'Netflix':          { color: '#E50914', label: 'NET' },
  'Disney+':          { color: '#113CCF', label: 'D+' },
  'Disney Estándar':  { color: '#0B3D91', label: 'DIS' },
  'HBO Max':          { color: '#5822B4', label: 'HBO' },
  'Prime Video':      { color: '#00A8E1', label: 'PRI' },
  'Crunchyroll':      { color: '#F47521', label: 'CR' },
  'YouTube Premium':  { color: '#FF0000', label: 'YT' },
  'WinTV':            { color: '#1A56DB', label: 'WIN' },
  'DirecTV':          { color: '#0077C8', label: 'DTV' },
  'Movistar Play':    { color: '#019DF4', label: 'MOV' },
  'Claro TV':         { color: '#DA0000', label: 'CLR' },
  'Rakuten':          { color: '#BF0000', label: 'RAK' },
};

// ── Estado local ─────────────────────────────────────────────
let cuentas       = [];
let editandoId    = null;
let eliminandoId  = null;
let plataformaSel = null;

// ── Referencias DOM ──────────────────────────────────────────
const btnNueva         = document.getElementById('btnNueva');
const btnEmptyNueva    = document.getElementById('btnEmptyNueva');
const btnLogout        = document.getElementById('btnLogout');
const modalOverlay     = document.getElementById('modalOverlay');
const modalTitle       = document.getElementById('modalTitle');
const modalClose       = document.getElementById('modalClose');
const btnCancel        = document.getElementById('btnCancel');
const btnGuardar       = document.getElementById('btnGuardar');
const btnGuardarText   = document.getElementById('btnGuardarText');
const btnGuardarSpinner= document.getElementById('btnGuardarSpinner');
const deleteOverlay    = document.getElementById('deleteOverlay');
const deleteClose      = document.getElementById('deleteClose');
const deleteCancelBtn  = document.getElementById('deleteCancelBtn');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
const searchInput      = document.getElementById('searchInput');
const tableCuerpo      = document.getElementById('tableCuerpo');
const tableWrap        = document.getElementById('tableWrap');
const tableLoading     = document.getElementById('tableLoading');
const emptyState       = document.getElementById('emptyState');
const plataformasGrid  = document.getElementById('plataformasGrid');

// Campos form
const fEmail     = document.getElementById('fEmail');
const fPassword  = document.getElementById('fPassword');
const fPerfiles  = document.getElementById('fPerfiles');
const fPrecio    = document.getElementById('fPrecio');
const fRenovacion= document.getElementById('fRenovacion');
const fNotas     = document.getElementById('fNotas');
const costoDisplay = document.getElementById('costoPorPerfil');

// ── Logout ────────────────────────────────────────────────────
btnLogout.addEventListener('click', () => signOut('index.html'));

// ── Cálculo costo por perfil en tiempo real ──────────────────
function calcularCosto() {
  const precio   = parseFloat(fPrecio.value)   || 0;
  const perfiles = parseInt(fPerfiles.value)   || 0;
  const costo    = perfiles > 0 ? (precio / perfiles).toFixed(2) : '0.00';
  costoDisplay.textContent = costo;
}
fPrecio.addEventListener('input', calcularCosto);
fPerfiles.addEventListener('input', calcularCosto);

// ── Toggle contraseña en formulario ──────────────────────────
document.getElementById('fTogglePass').addEventListener('click', () => {
  fPassword.type = fPassword.type === 'password' ? 'text' : 'password';
});

// ── Selección de plataforma ──────────────────────────────────
plataformasGrid.querySelectorAll('.plat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    plataformasGrid.querySelectorAll('.plat-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    plataformaSel = btn.dataset.plat;
  });
});

// ── Abrir modal nueva cuenta ──────────────────────────────────
function abrirModalNueva() {
  editandoId    = null;
  plataformaSel = null;
  modalTitle.textContent = 'Nueva Cuenta Madre';
  btnGuardarText.textContent = 'Guardar Cuenta';
  plataformasGrid.querySelectorAll('.plat-btn').forEach(b => b.classList.remove('selected'));
  fEmail.value = ''; fPassword.value = '';
  fPerfiles.value = ''; fPrecio.value = '';
  fRenovacion.value = ''; fNotas.value = '';
  costoDisplay.textContent = '0.00';
  modalOverlay.hidden = false;
  fEmail.focus();
}

btnNueva.addEventListener('click', abrirModalNueva);
btnEmptyNueva.addEventListener('click', abrirModalNueva);

// ── Cerrar modal ──────────────────────────────────────────────
function cerrarModal() { modalOverlay.hidden = true; }
modalClose.addEventListener('click', cerrarModal);
btnCancel.addEventListener('click', cerrarModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) cerrarModal(); });

// ── Abrir modal editar ────────────────────────────────────────
function abrirModalEditar(cuenta) {
  editandoId    = cuenta.id;
  plataformaSel = cuenta.plataforma;
  modalTitle.textContent = 'Editar Cuenta';
  btnGuardarText.textContent = 'Actualizar Cuenta';

  // Seleccionar plataforma en el grid
  plataformasGrid.querySelectorAll('.plat-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.plat === cuenta.plataforma);
  });

  fEmail.value      = cuenta.email       || '';
  fPassword.value   = cuenta.password    || '';
  fPerfiles.value   = cuenta.max_perfiles|| '';
  fPrecio.value     = cuenta.precio_compra|| '';
  fRenovacion.value = cuenta.fecha_renovacion || '';
  fNotas.value      = cuenta.notas       || '';
  calcularCosto();
  modalOverlay.hidden = false;
}

// ── Guardar cuenta (crear o editar) ──────────────────────────
btnGuardar.addEventListener('click', async () => {
  if (!plataformaSel) {
    alert('Por favor selecciona una plataforma.');
    return;
  }
  if (!fEmail.value.trim() || !fPassword.value.trim()) {
    alert('El correo y la contraseña son obligatorios.');
    return;
  }
  if (!fPerfiles.value || parseInt(fPerfiles.value) < 1) {
    alert('Ingresa una cantidad válida de perfiles.');
    return;
  }

  const payload = {
    plataforma:       plataformaSel,
    email:            fEmail.value.trim(),
    password:         fPassword.value.trim(),
    max_perfiles:     parseInt(fPerfiles.value),
    precio_compra:    parseFloat(fPrecio.value) || 0,
    fecha_renovacion: fRenovacion.value || null,
    notas:            fNotas.value.trim() || null,
    activa:           true,
  };

  setGuardando(true);

  let error;
  if (editandoId) {
    ({ error } = await supabase.from('cuentas_madres').update(payload).eq('id', editandoId));
  } else {
    ({ error } = await supabase.from('cuentas_madres').insert(payload));
  }

  setGuardando(false);

  if (error) {
    alert('Error al guardar: ' + error.message);
    return;
  }

  cerrarModal();
  await cargarCuentas();
});

function setGuardando(state) {
  btnGuardar.disabled         = state;
  btnGuardarText.hidden       = state;
  btnGuardarSpinner.hidden    = !state;
}

// ── Eliminar cuenta ───────────────────────────────────────────
function abrirModalEliminar(id) {
  eliminandoId = id;
  deleteOverlay.hidden = false;
}
function cerrarModalEliminar() { deleteOverlay.hidden = true; eliminandoId = null; }

deleteClose.addEventListener('click', cerrarModalEliminar);
deleteCancelBtn.addEventListener('click', cerrarModalEliminar);
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) cerrarModalEliminar(); });

deleteConfirmBtn.addEventListener('click', async () => {
  if (!eliminandoId) return;
  const { error } = await supabase.from('cuentas_madres').delete().eq('id', eliminandoId);
  if (error) { alert('Error al eliminar: ' + error.message); return; }
  cerrarModalEliminar();
  await cargarCuentas();
});

// ── Toggle ver contraseña en tabla ────────────────────────────
function togglePassTabla(btn) {
  const dots = btn.previousElementSibling.previousElementSibling;
  const text = btn.previousElementSibling;
  const visible = text.style.display === 'inline';
  dots.style.display = visible ? 'inline' : 'none';
  text.style.display = visible ? 'none'   : 'inline';
}

// ── Renderizar tabla ──────────────────────────────────────────
function renderTabla(data) {
  tableLoading.hidden = true;

  if (!data.length) {
    emptyState.hidden = false;
    tableWrap.hidden  = true;
    return;
  }

  emptyState.hidden = true;
  tableWrap.hidden  = false;
  tableCuerpo.innerHTML = '';

  data.forEach(c => {
    const info   = PLATAFORMAS[c.plataforma] || { color: '#555', label: c.plataforma.slice(0,3).toUpperCase() };
    const costo  = c.max_perfiles > 0 ? (c.precio_compra / c.max_perfiles).toFixed(2) : '0.00';
    const renov  = c.fecha_renovacion
      ? new Date(c.fecha_renovacion + 'T00:00:00').toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })
      : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="plat-cell">
          <div class="plat-badge" style="background:${info.color};">${info.label}</div>
          <span class="plat-badge-name">${c.plataforma}</span>
        </div>
      </td>
      <td>${c.email}</td>
      <td>
        <div class="pass-cell">
          <span class="pass-dots">••••••••</span>
          <span class="pass-text">${c.password}</span>
          <button class="btn-show-pass" onclick="togglePassTabla(this)" title="Ver contraseña">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </td>
      <td>${c.max_perfiles}</td>
      <td>S/ ${parseFloat(c.precio_compra).toFixed(2)}</td>
      <td style="color:var(--accent-teal);font-weight:600;">S/ ${costo}</td>
      <td>${renov}</td>
      <td>
        <span class="estado-badge ${c.activa ? 'estado-activa' : 'estado-inactiva'}">
          ${c.activa ? 'Activa' : 'Inactiva'}
        </span>
      </td>
      <td>
        <div class="acciones-cell">
          <button class="btn-accion edit" data-id="${c.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-accion del" data-id="${c.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </td>
    `;
    tableCuerpo.appendChild(tr);
  });

  // Eventos botones editar / eliminar
  tableCuerpo.querySelectorAll('.btn-accion.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const cuenta = cuentas.find(c => c.id === btn.dataset.id);
      if (cuenta) abrirModalEditar(cuenta);
    });
  });
  tableCuerpo.querySelectorAll('.btn-accion.del').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEliminar(btn.dataset.id));
  });
}

// ── Actualizar stats rápidas ──────────────────────────────────
function actualizarStats(data) {
  const totalCuentas  = data.length;
  const totalPerfiles = data.reduce((s, c) => s + (c.max_perfiles || 0), 0);
  const inversion     = data.reduce((s, c) => s + (parseFloat(c.precio_compra) || 0), 0);
  const costoProm     = totalPerfiles > 0 ? (inversion / totalPerfiles).toFixed(2) : '0.00';

  document.getElementById('qsTotalCuentas').textContent  = totalCuentas;
  document.getElementById('qsTotalPerfiles').textContent = totalPerfiles;
  document.getElementById('qsInversion').textContent     = `S/ ${inversion.toFixed(2)}`;
  document.getElementById('qsCostoPerfil').textContent   = `S/ ${costoProm}`;
}

// ── Cargar cuentas desde Supabase ────────────────────────────
async function cargarCuentas() {
  tableLoading.hidden = false;
  tableWrap.hidden    = true;
  emptyState.hidden   = true;

  const { data, error } = await supabase
    .from('cuentas_madres')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tableLoading.hidden = true;
    emptyState.hidden   = false;
    console.error(error);
    return;
  }

  cuentas = data || [];
  actualizarStats(cuentas);
  renderTabla(filtrar(cuentas));
}

// ── Búsqueda ──────────────────────────────────────────────────
function filtrar(data) {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return data;
  return data.filter(c =>
    c.plataforma.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q)
  );
}

searchInput.addEventListener('input', () => renderTabla(filtrar(cuentas)));

// ── Exponer toggle de contraseña globalmente ──────────────────
window.togglePassTabla = togglePassTabla;

// ── Init ──────────────────────────────────────────────────────
cargarCuentas();
