import { requireAuth, signOut, supabase } from './supabase.js';
await requireAuth('index.html');

const PLATAFORMAS = {
  'Netflix':         { color: '#E50914', label: 'NET' },
  'Disney+':         { color: '#113CCF', label: 'D+' },
  'Disney Estandar': { color: '#0B3D91', label: 'DIS' },
  'HBO Max':         { color: '#5822B4', label: 'HBO' },
  'Prime Video':     { color: '#00A8E1', label: 'PRI' },
  'Crunchyroll':     { color: '#F47521', label: 'CR' },
  'YouTube Premium': { color: '#FF0000', label: 'YT' },
  'WinTV':           { color: '#1A56DB', label: 'WIN' },
  'DirecTV':         { color: '#0077C8', label: 'DTV' },
  'Paramount':       { color: '#019DF4', label: 'PAR' },
  'Claro TV':        { color: '#DA0000', label: 'CLR' },
  'Rakuten':         { color: '#BF0000', label: 'RAK' },
};

let cuentas = [], editandoId = null, eliminandoId = null, plataformaSel = null;
const $ = id => document.getElementById(id);

const modalOverlay    = $('modalOverlay');
const deleteOverlay   = $('deleteOverlay');
const tableWrap       = $('tableWrap');
const tableCuerpo     = $('tableCuerpo');
const fEmail          = $('fEmail');
const fPassword       = $('fPassword');
const fPerfiles       = $('fPerfiles');
const fPrecio         = $('fPrecio');
const fRenovacion     = $('fRenovacion');
const fNotas          = $('fNotas');
const costoDisplay    = $('costoPorPerfil');
const plataformasGrid = $('plataformasGrid');

// Costo por perfil en tiempo real
function calcularCosto() {
  const precio = parseFloat(fPrecio.value) || 0;
  const perfs  = parseInt(fPerfiles.value) || 0;
  costoDisplay.textContent = perfs > 0 ? (precio / perfs).toFixed(2) : '0.00';
}
fPrecio.addEventListener('input', calcularCosto);
fPerfiles.addEventListener('input', calcularCosto);

// Toggle pass formulario
$('fTogglePass').addEventListener('click', () => {
  fPassword.type = fPassword.type === 'password' ? 'text' : 'password';
});

// Seleccion plataforma
plataformasGrid.querySelectorAll('.plat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    plataformasGrid.querySelectorAll('.plat-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    plataformaSel = btn.dataset.plat;
  });
});

// Abrir modal
function abrirModal(cuenta = null) {
  editandoId    = cuenta ? cuenta.id : null;
  plataformaSel = cuenta ? cuenta.plataforma : null;
  $('modalTitle').textContent     = cuenta ? 'Editar Cuenta' : 'Nueva Cuenta Madre';
  $('btnGuardarText').textContent = cuenta ? 'Actualizar'    : 'Guardar Cuenta';

  // Solo deshabilitar perfiles en edicion, precio si se puede editar
  fPerfiles.disabled = !!cuenta;
  fPrecio.disabled   = false;

  plataformasGrid.querySelectorAll('.plat-btn').forEach(b =>
    b.classList.toggle('selected', cuenta ? b.dataset.plat === cuenta.plataforma : false)
  );
  fEmail.value      = cuenta?.email            || '';
  fPassword.value   = cuenta?.password         || '';
  fPerfiles.value   = cuenta?.max_perfiles     || '';
  fPrecio.value     = cuenta?.precio_compra    || '';
  fRenovacion.value = cuenta?.fecha_renovacion || '';
  fNotas.value      = cuenta?.notas            || '';
  calcularCosto();
  modalOverlay.hidden = false;
}

function cerrarModal() {
  modalOverlay.hidden = true;
  fPerfiles.disabled  = false;
  fPrecio.disabled    = false;
}

$('btnNueva').addEventListener('click',   () => abrirModal());
$('modalClose').addEventListener('click', cerrarModal);
$('btnCancel').addEventListener('click',  cerrarModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) cerrarModal(); });

// ── Guardar cuenta ────────────────────────────────────────────
$('btnGuardar').addEventListener('click', async () => {
  if (!plataformaSel) return alert('Selecciona una plataforma.');
  if (!fEmail.value.trim() || !fPassword.value.trim()) return alert('Correo y contrasena obligatorios.');

  const esNueva = !editandoId;

  if (esNueva && (!fPerfiles.value || parseInt(fPerfiles.value) < 1))
    return alert('Cantidad de perfiles invalida.');

  const payload = {
    plataforma:       plataformaSel,
    email:            fEmail.value.trim(),
    password:         fPassword.value.trim(),
    fecha_renovacion: fRenovacion.value || null,
    notas:            fNotas.value.trim() || null,
    activa:           true,
    precio_compra:    parseFloat(fPrecio.value) || 0,
  };

  if (esNueva) {
    payload.max_perfiles = parseInt(fPerfiles.value);
  }

  $('btnGuardar').disabled      = true;
  $('btnGuardarText').hidden    = true;
  $('btnGuardarSpinner').hidden = false;

  if (esNueva) {
    const { error } = await supabase.from('cuentas_madres').insert(payload);
    if (error) {
      alert('Error: ' + error.message);
      $('btnGuardar').disabled      = false;
      $('btnGuardarText').hidden    = false;
      $('btnGuardarSpinner').hidden = true;
      return;
    }
  } else {
    const { error } = await supabase
      .from('cuentas_madres').update(payload).eq('id', editandoId);
    if (error) {
      alert('Error: ' + error.message);
      $('btnGuardar').disabled      = false;
      $('btnGuardarText').hidden    = false;
      $('btnGuardarSpinner').hidden = true;
      return;
    }
  }

  $('btnGuardar').disabled      = false;
  $('btnGuardarText').hidden    = false;
  $('btnGuardarSpinner').hidden = true;
  cerrarModal();
  cargarCuentas();
});

// ── Renovar +30 dias ──────────────────────────────────────────
async function renovar(id, fechaActual) {
  const base = fechaActual ? new Date(fechaActual + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + 30);
  const nueva = base.toISOString().split('T')[0];
  const { error } = await supabase
    .from('cuentas_madres').update({ fecha_renovacion: nueva }).eq('id', id);
  if (error) return alert('Error al renovar: ' + error.message);
  cargarCuentas();
}

// ── Eliminar ──────────────────────────────────────────────────
$('deleteClose').addEventListener('click',     () => { deleteOverlay.hidden = true; });
$('deleteCancelBtn').addEventListener('click', () => { deleteOverlay.hidden = true; });
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) deleteOverlay.hidden = true; });
$('deleteConfirmBtn').addEventListener('click', async () => {
  if (!eliminandoId) return;
  const { error } = await supabase.from('cuentas_madres').delete().eq('id', eliminandoId);
  if (error) return alert('Error: ' + error.message);
  deleteOverlay.hidden = true;
  eliminandoId = null;
  cargarCuentas();
});

// ── Toggle pass en tabla ──────────────────────────────────────
window.togglePassTabla = function(btn) {
  const cell = btn.parentElement;
  const dots = cell.querySelector('.pass-dots');
  const text = cell.querySelector('.pass-text');
  const vis  = text.style.display === 'inline';
  dots.style.display = vis ? 'inline' : 'none';
  text.style.display = vis ? 'none'   : 'inline';
};

// ── Render tabla ──────────────────────────────────────────────
function renderTabla(data) {
  tableWrap.hidden      = false;
  tableCuerpo.innerHTML = '';

  if (!data || data.length === 0) {
    tableCuerpo.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--muted2)">No hay cuentas registradas. Crea una con "+ Nueva Cuenta".</td></tr>`;
    return;
  }

  data.forEach(c => {
    const info  = PLATAFORMAS[c.plataforma] || { color: '#555', label: c.plataforma.slice(0,3).toUpperCase() };
    const costo = c.max_perfiles > 0 ? (c.precio_compra / c.max_perfiles).toFixed(2) : '0.00';
    const renov = c.fecha_renovacion
      ? new Date(c.fecha_renovacion + 'T00:00:00').toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })
      : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="plat-cell">
        <div class="plat-badge" style="background:${info.color}">${info.label}</div>
        <span class="plat-badge-name">${c.plataforma}</span>
      </div></td>
      <td>${c.email}</td>
      <td><div class="pass-cell">
        <span class="pass-dots">••••••••</span>
        <span class="pass-text" style="display:none">${c.password}</span>
        <button class="btn-show-pass" onclick="togglePassTabla(this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div></td>
      <td>${c.max_perfiles}</td>
      <td>S/ ${parseFloat(c.precio_compra).toFixed(2)}</td>
      <td style="color:var(--teal);font-weight:700">S/ ${costo}</td>
      <td>${renov}</td>
      <td><span class="estado-badge ${c.activa ? 'estado-activa' : 'estado-inactiva'}">${c.activa ? 'Activa' : 'Inactiva'}</span></td>
      <td><div class="acciones-cell">
        <button class="btn-accion renov" data-id="${c.id}" data-fecha="${c.fecha_renovacion || ''}" title="Renovar +30 dias">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
        <button class="btn-accion edit" data-id="${c.id}" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-accion del" data-id="${c.id}" title="Eliminar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div></td>`;
    tableCuerpo.appendChild(tr);
  });

  tableCuerpo.querySelectorAll('.btn-accion.renov').forEach(btn => {
    btn.addEventListener('click', () => renovar(btn.dataset.id, btn.dataset.fecha));
  });
  tableCuerpo.querySelectorAll('.btn-accion.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = cuentas.find(x => x.id === btn.dataset.id);
      if (c) abrirModal(c);
    });
  });
  tableCuerpo.querySelectorAll('.btn-accion.del').forEach(btn => {
    btn.addEventListener('click', () => {
      eliminandoId = btn.dataset.id;
      deleteOverlay.hidden = false;
    });
  });
}

// ── Stats ─────────────────────────────────────────────────────
function actualizarStats(data) {
  const perfs = data.reduce((s, c) => s + (c.max_perfiles || 0), 0);
  const inv   = data.reduce((s, c) => s + (parseFloat(c.precio_compra) || 0), 0);
  $('qsTotalCuentas').textContent  = data.length;
  $('qsTotalPerfiles').textContent = perfs;
  $('qsInversion').textContent     = `S/ ${inv.toFixed(2)}`;
  $('qsCostoPerfil').textContent   = `S/ ${perfs > 0 ? (inv/perfs).toFixed(2) : '0.00'}`;
}

// ── Cargar cuentas ────────────────────────────────────────────
async function cargarCuentas() {
  const { data, error } = await supabase
    .from('cuentas_madres').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  cuentas = data || [];
  actualizarStats(cuentas);
  renderTabla(filtrar(cuentas));
}

function filtrar(data) {
  const q = $('searchInput').value.trim().toLowerCase();
  return q ? data.filter(c =>
    c.plataforma.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  ) : data;
}

$('searchInput').addEventListener('input', () => renderTabla(filtrar(cuentas)));
$('btnLogout').addEventListener('click', () => signOut('index.html'));

cargarCuentas();
