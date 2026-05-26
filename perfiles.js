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
  'Movistar Play':   { color: '#019DF4', label: 'MOV' },
  'Claro TV':        { color: '#DA0000', label: 'CLR' },
  'Rakuten':         { color: '#BF0000', label: 'RAK' },
};

const $ = id => document.getElementById(id);

let perfiles     = [];
let cuentas      = [];
let editandoId   = null;
let liberandoId  = null;
let filtroActivo = 'todos';

// DOM
const modalOverlay  = $('modalOverlay');
const deleteOverlay = $('deleteOverlay');
const tableCuerpo   = $('tableCuerpo');
const fCuenta       = $('fCuenta');
const fNombrePerfil = $('fNombrePerfil');
const fCliente      = $('fCliente');
const fCelular      = $('fCelular');
const fPin          = $('fPin');
const fVencimiento  = $('fVencimiento');
const fPrecioVenta  = $('fPrecioVenta');
const fExtra        = $('fExtra');

// ── Cargar cuentas madres para el select ─────────────────────
async function cargarCuentas() {
  const { data } = await supabase
    .from('cuentas_madres')
    .select('id, plataforma, email, precio_compra, max_perfiles')
    .eq('activa', true)
    .order('plataforma');
  cuentas = data || [];
  fCuenta.innerHTML = '<option value="">Selecciona una cuenta...</option>';
  cuentas.forEach(c => {
    const opt = document.createElement('option');
    opt.value       = c.id;
    opt.textContent = `${c.plataforma} — ${c.email}`;
    opt.dataset.precio    = c.precio_compra;
    opt.dataset.maxPerfiles = c.max_perfiles;
    fCuenta.appendChild(opt);
  });
}

// ── Al cambiar cuenta, cargar perfiles libres de esa cuenta ──
fCuenta.addEventListener('change', async () => {
  fNombrePerfil.innerHTML = '<option value="">Cargando...</option>';
  const cuentaId = fCuenta.value;
  if (!cuentaId) {
    fNombrePerfil.innerHTML = '<option value="">Selecciona cuenta primero...</option>';
    actualizarCalc();
    return;
  }

  // Si es extra, no filtra por libre
  const esExtra = fExtra.checked;
  let q = supabase.from('perfiles').select('id, nombre_perfil, estado').eq('cuenta_madre_id', cuentaId);
  if (!esExtra) q = q.eq('estado', 'libre');

  const { data } = await q;
  fNombrePerfil.innerHTML = '';

  if (!data || data.length === 0) {
    if (esExtra) {
      // Perfil extra: input libre
      const opt = document.createElement('option');
      opt.value = '__nuevo__';
      opt.textContent = 'Crear perfil extra';
      fNombrePerfil.appendChild(opt);
    } else {
      fNombrePerfil.innerHTML = '<option value="">No hay perfiles libres</option>';
    }
  } else {
    data.forEach(p => {
      const opt = document.createElement('option');
      opt.value       = p.id;
      opt.textContent = p.nombre_perfil;
      fNombrePerfil.appendChild(opt);
    });
    if (esExtra) {
      const opt = document.createElement('option');
      opt.value = '__nuevo__';
      opt.textContent = '+ Crear perfil extra nuevo';
      fNombrePerfil.appendChild(opt);
    }
  }
  actualizarCalc();
});

fExtra.addEventListener('change', () => {
  if (fCuenta.value) fCuenta.dispatchEvent(new Event('change'));
});

// ── Calcular costo y ganancia ─────────────────────────────────
function actualizarCalc() {
  const opt     = fCuenta.options[fCuenta.selectedIndex];
  const precio  = parseFloat(opt?.dataset?.precio) || 0;
  const maxPerf = parseInt(opt?.dataset?.maxPerfiles) || 1;
  const costo   = maxPerf > 0 ? precio / maxPerf : 0;
  const venta   = parseFloat(fPrecioVenta.value) || 0;
  const gan     = venta - costo;

  $('displayCosto').textContent    = `S/ ${costo.toFixed(2)}`;
  $('displayGanancia').textContent = `S/ ${gan.toFixed(2)}`;
  $('displayGanancia').className   = `calc-val ${gan >= 0 ? 'green' : 'red'}`;
}
fPrecioVenta.addEventListener('input', actualizarCalc);

// ── Abrir modal ───────────────────────────────────────────────
async function abrirModal(perfil = null) {
  editandoId = perfil ? perfil.id : null;
  $('modalTitle').textContent     = perfil ? 'Editar Perfil' : 'Asignar Perfil';
  $('btnGuardarText').textContent = perfil ? 'Actualizar'    : 'Guardar';

  await cargarCuentas();

  if (perfil) {
    const esHuerfano = !perfil.cuenta_madre_id;

    // Si es huérfano, la cuenta y el perfil quedan habilitados para reasignar
    fCuenta.value      = perfil.cuenta_madre_id || '';
    fExtra.checked     = perfil.extra || false;

    if (esHuerfano) {
      // Huérfano: permitir elegir nueva cuenta madre
      fCuenta.disabled       = false;
      fNombrePerfil.disabled = true;
      fNombrePerfil.innerHTML = `<option value="${perfil.id}">${perfil.nombre_perfil}</option>`;
    } else {
      await fCuenta.dispatchEvent(new Event('change'));
      fNombrePerfil.value    = perfil.id;
      fNombrePerfil.disabled = true;
      fCuenta.disabled       = true;
    }

    fCliente.value      = perfil.cliente_nombre    || '';
    fCelular.value      = perfil.cliente_celular   || '';
    fPin.value          = perfil.pin               || '';
    fVencimiento.value  = perfil.fecha_vencimiento || '';
    fPrecioVenta.value  = perfil.precio_venta      || '';
  } else {
    fCuenta.value       = '';
    fExtra.checked      = false;
    fNombrePerfil.innerHTML  = '<option value="">Selecciona cuenta primero...</option>';
    fNombrePerfil.disabled   = false;
    fCuenta.disabled         = false;
    fCliente.value      = '';
    fCelular.value      = '';
    fPin.value          = '';
    fVencimiento.value  = '';
    fPrecioVenta.value  = '';
  }
  actualizarCalc();
  modalOverlay.hidden = false;
}

function cerrarModal() {
  modalOverlay.hidden    = true;
  fNombrePerfil.disabled = false;
  fCuenta.disabled       = false;
}

$('btnNuevo').addEventListener('click',   () => abrirModal());
$('modalClose').addEventListener('click', cerrarModal);
$('btnCancel').addEventListener('click',  cerrarModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) cerrarModal(); });

// ── Guardar perfil ────────────────────────────────────────────
$('btnGuardar').addEventListener('click', async () => {
  const cuentaId    = fCuenta.value;
  const perfilId    = fNombrePerfil.value;
  const cliente     = fCliente.value.trim();
  const celular     = fCelular.value.trim();
  const vencimiento = fVencimiento.value;
  const precioVenta = parseFloat(fPrecioVenta.value) || 0;
  const esExtra     = fExtra.checked;

  if (!cuentaId)    return alert('Selecciona una cuenta madre.');
  if (!cliente)     return alert('El nombre del cliente es obligatorio.');
  if (!celular)     return alert('El celular es obligatorio.');
  if (!vencimiento) return alert('La fecha de vencimiento es obligatoria.');
  if (!precioVenta) return alert('El precio de venta es obligatorio.');

  $('btnGuardar').disabled      = true;
  $('btnGuardarText').hidden    = true;
  $('btnGuardarSpinner').hidden = false;

  let error;

  if (editandoId) {
    const perfilActual = perfiles.find(x => x.id === editandoId);
    const esHuerfano   = !perfilActual?.cuenta_madre_id;

    if (esHuerfano) {
      // Reasignar cuenta madre al perfil huérfano
      ({ error } = await supabase.from('perfiles').update({
        cuenta_madre_id:   cuentaId,
        cliente_nombre:    cliente,
        cliente_celular:   celular,
        pin:               fPin.value.trim() || null,
        fecha_vencimiento: vencimiento,
        precio_venta:      precioVenta,
        estado:            'activo',
      }).eq('id', editandoId));

      if (!error) {
        // Eliminar un perfil libre de la cuenta destino para no inflar el stock
        const { data: libreEnCuenta } = await supabase
          .from('perfiles')
          .select('id')
          .eq('cuenta_madre_id', cuentaId)
          .eq('estado', 'libre')
          .limit(1)
          .single();
        if (libreEnCuenta) {
          await supabase.from('perfiles').delete().eq('id', libreEnCuenta.id);
        }
      }
    } else {
      // Actualizar perfil existente normal
      ({ error } = await supabase.from('perfiles').update({
        cliente_nombre:   cliente,
        cliente_celular:  celular,
        pin:              fPin.value.trim() || null,
        fecha_vencimiento: vencimiento,
        precio_venta:     precioVenta,
        estado:           'activo',
      }).eq('id', editandoId));
    }

  } else if (perfilId === '__nuevo__' || esExtra) {
    // Crear perfil extra nuevo
    const { data: cuenta } = await supabase
      .from('cuentas_madres').select('max_perfiles').eq('id', cuentaId).single();
    const { data: existentes } = await supabase
      .from('perfiles').select('id', { count: 'exact' }).eq('cuenta_madre_id', cuentaId);
    const numExtra = (existentes?.length || 0) - (cuenta?.max_perfiles || 0) + 1;

    ({ error } = await supabase.from('perfiles').insert({
      cuenta_madre_id:   cuentaId,
      nombre_perfil:     `Perfil Extra ${numExtra}`,
      cliente_nombre:    cliente,
      cliente_celular:   celular,
      pin:               fPin.value.trim() || null,
      fecha_vencimiento: vencimiento,
      precio_venta:      precioVenta,
      estado:            'activo',
      extra:             true,
    }));

  } else {
    // Asignar perfil libre existente
    if (!perfilId) return alert('Selecciona un perfil.');
    ({ error } = await supabase.from('perfiles').update({
      cliente_nombre:    cliente,
      cliente_celular:   celular,
      pin:               fPin.value.trim() || null,
      fecha_vencimiento: vencimiento,
      precio_venta:      precioVenta,
      estado:            'activo',
      fecha_inicio:      new Date().toISOString().split('T')[0],
    }).eq('id', perfilId));
  }

  $('btnGuardar').disabled      = false;
  $('btnGuardarText').hidden    = false;
  $('btnGuardarSpinner').hidden = true;

  if (error) return alert('Error: ' + error.message);
  cerrarModal();
  cargarPerfiles();
});

// ── Renovar +30 dias ──────────────────────────────────────────
async function renovar(id, fechaActual) {
  const base = fechaActual ? new Date(fechaActual + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + 30);
  const nueva = base.toISOString().split('T')[0];
  const { error } = await supabase
    .from('perfiles').update({ fecha_vencimiento: nueva, estado: 'activo' }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  cargarPerfiles();
}

// ── Liberar perfil ────────────────────────────────────────────
$('deleteClose').addEventListener('click',     () => { deleteOverlay.hidden = true; });
$('deleteCancelBtn').addEventListener('click', () => { deleteOverlay.hidden = true; });
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) deleteOverlay.hidden = true; });

$('deleteConfirmBtn').addEventListener('click', async () => {
  if (!liberandoId) return;
  const { error } = await supabase.from('perfiles').update({
    cliente_nombre:    null,
    cliente_celular:   null,
    pin:               null,
    fecha_inicio:      null,
    fecha_vencimiento: null,
    precio_venta:      null,
    estado:            'libre',
  }).eq('id', liberandoId);
  if (error) return alert('Error: ' + error.message);
  deleteOverlay.hidden = true;
  liberandoId = null;
  cargarPerfiles();
});

// ── Estado visual ─────────────────────────────────────────────
function getEstadoVisual(p) {
  if (!p.cuenta_madre_id) return { clase: 'estado-huerfano', texto: '⚠ Sin cuenta madre' };
  if (p.estado === 'libre') return { clase: 'estado-libre', texto: 'Libre' };
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const venc = p.fecha_vencimiento ? new Date(p.fecha_vencimiento + 'T00:00:00') : null;
  if (!venc) return { clase: 'estado-activo', texto: 'Activo' };
  const dias = Math.ceil((venc - hoy) / 86400000);
  if (dias < 0)  return { clase: 'estado-vencido',    texto: 'Vencido' };
  if (dias <= 5) return { clase: 'estado-por-vencer', texto: `Vence en ${dias}d` };
  return { clase: 'estado-activo', texto: 'Activo' };
}

// ── Render tabla ──────────────────────────────────────────────
function renderTabla(data) {
  tableCuerpo.innerHTML = '';

  if (!data || data.length === 0) {
    tableCuerpo.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--muted2)">No hay perfiles que mostrar.</td></tr>`;
    return;
  }

  data.forEach(p => {
    const esHuerfano = !p.cuenta_madre_id;
    const cuenta = cuentas.find(c => c.id === p.cuenta_madre_id);
    const plat   = p.cuentas_madres?.plataforma || cuenta?.plataforma || '—';
    const info   = esHuerfano
      ? { color: '#7c3aed', label: '?' }
      : (PLATAFORMAS[plat] || { color: '#555', label: plat.slice(0,3).toUpperCase() });
    const ev     = getEstadoVisual(p);

    const costo  = esHuerfano
      ? '—'
      : cuenta
        ? (parseFloat(cuenta.precio_compra) / (cuenta.max_perfiles || 1)).toFixed(2)
        : (p.cuentas_madres
          ? (parseFloat(p.cuentas_madres.precio_compra) / (p.cuentas_madres.max_perfiles || 1)).toFixed(2)
          : '—');
    const venta  = p.precio_venta ? parseFloat(p.precio_venta).toFixed(2) : '—';
    const ganNum = p.precio_venta && costo !== '—' ? (parseFloat(p.precio_venta) - parseFloat(costo)) : null;
    const ganTxt = ganNum !== null ? `S/ ${ganNum.toFixed(2)}` : '—';
    const ganCls = ganNum !== null ? (ganNum >= 0 ? 'ganancia-pos' : 'ganancia-neg') : '';

    const vencStr = p.fecha_vencimiento
      ? new Date(p.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })
      : '—';

    const tr = document.createElement('tr');
    if (esHuerfano) tr.classList.add('fila-huerfana');

    tr.innerHTML = `
      <td><div class="plat-cell">
        <div class="plat-badge" style="background:${info.color}">${info.label}</div>
        <span class="plat-name">${esHuerfano ? 'Sin cuenta' : plat}</span>
      </div></td>
      <td>${p.nombre_perfil}</td>
      <td>${p.cliente_nombre || '—'}</td>
      <td>${p.cliente_celular || '—'}</td>
      <td>${p.pin || '—'}</td>
      <td>${vencStr}</td>
      <td><span class="estado-badge ${ev.clase}">${ev.texto}</span></td>
      <td style="color:var(--red);font-weight:600">${costo !== '—' ? 'S/ '+costo : '—'}</td>
      <td>${venta !== '—' ? 'S/ '+venta : '—'}</td>
      <td class="${ganCls}">${ganTxt}</td>
      <td>${p.extra ? '<span class="badge-extra">Extra</span>' : '—'}</td>
      <td><div class="acciones-cell">
        ${p.estado !== 'libre' && !esHuerfano ? `
        <button class="btn-accion renov" data-id="${p.id}" data-fecha="${p.fecha_vencimiento||''}" title="Renovar +30 días">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>` : ''}
        <button class="btn-accion edit ${esHuerfano ? 'huerfano' : ''}" data-id="${p.id}" title="${esHuerfano ? 'Reasignar cuenta madre' : 'Editar'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        ${p.estado !== 'libre' && !esHuerfano ? `
        <button class="btn-accion del" data-id="${p.id}" title="Liberar perfil">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        </button>` : ''}
      </div></td>`;
    tableCuerpo.appendChild(tr);
  });

  tableCuerpo.querySelectorAll('.btn-accion.renov').forEach(btn =>
    btn.addEventListener('click', () => renovar(btn.dataset.id, btn.dataset.fecha))
  );
  tableCuerpo.querySelectorAll('.btn-accion.edit').forEach(btn =>
    btn.addEventListener('click', () => {
      const p = perfiles.find(x => x.id === btn.dataset.id);
      if (p) abrirModal(p);
    })
  );
  tableCuerpo.querySelectorAll('.btn-accion.del').forEach(btn =>
    btn.addEventListener('click', () => {
      liberandoId = btn.dataset.id;
      deleteOverlay.hidden = false;
    })
  );
}

// ── Stats ─────────────────────────────────────────────────────
function actualizarStats(data) {
  const hoy    = new Date(); hoy.setHours(0,0,0,0);
  let libres = 0, activos = 0, porVencer = 0, vencidos = 0, ingresos = 0, huerfanos = 0;

  data.forEach(p => {
    if (!p.cuenta_madre_id) { huerfanos++; return; }
    if (p.estado === 'libre') { libres++; return; }
    const venc = p.fecha_vencimiento ? new Date(p.fecha_vencimiento + 'T00:00:00') : null;
    const dias = venc ? Math.ceil((venc - hoy) / 86400000) : 999;
    if (dias < 0)       vencidos++;
    else if (dias <= 5) porVencer++;
    else                activos++;

    // Ingresos del mes actual
    const ini = p.fecha_inicio ? new Date(p.fecha_inicio) : null;
    if (ini && ini.getMonth() === hoy.getMonth() && ini.getFullYear() === hoy.getFullYear()) {
      ingresos += parseFloat(p.precio_venta) || 0;
    }
  });

  $('statTotal').textContent     = data.length;
  $('statLibres').textContent    = libres;
  $('statActivos').textContent   = activos;
  $('statPorVencer').textContent = porVencer;
  $('statVencidos').textContent  = vencidos;
  $('statIngresos').textContent  = `S/ ${ingresos.toFixed(2)}`;
  $('statHuerfanos').textContent = huerfanos;
}

// ── Filtrar ───────────────────────────────────────────────────
function filtrar(data) {
  const q   = $('searchInput').value.trim().toLowerCase();
  let result = data;

  if (filtroActivo !== 'todos') {
    result = result.filter(p => {
      if (filtroActivo === 'huerfano') return !p.cuenta_madre_id;
      if (filtroActivo === 'libre')   return p.estado === 'libre';
      if (filtroActivo === 'vencido') {
        if (!p.fecha_vencimiento) return false;
        return new Date(p.fecha_vencimiento + 'T00:00:00') < new Date();
      }
      if (filtroActivo === 'activo') {
        if (p.estado !== 'activo') return false;
        if (!p.fecha_vencimiento) return true;
        return new Date(p.fecha_vencimiento + 'T00:00:00') >= new Date();
      }
      return true;
    });
  }

  if (q) {
    result = result.filter(p =>
      (p.cliente_nombre   || '').toLowerCase().includes(q) ||
      (p.cliente_celular  || '').toLowerCase().includes(q) ||
      (p.nombre_perfil    || '').toLowerCase().includes(q)
    );
  }
  return result;
}

// ── Cargar perfiles ───────────────────────────────────────────
async function cargarPerfiles() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*, cuentas_madres(plataforma, precio_compra, max_perfiles)')
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return; }
  perfiles = data || [];
  actualizarStats(perfiles);
  renderTabla(filtrar(perfiles));
}

// ── Filtro tabs ───────────────────────────────────────────────
document.querySelectorAll('.filtro-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filtro-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filtroActivo = tab.dataset.filtro;
    renderTabla(filtrar(perfiles));
  });
});

$('searchInput').addEventListener('input', () => renderTabla(filtrar(perfiles)));
$('btnLogout').addEventListener('click', () => signOut('index.html'));

cargarPerfiles();
