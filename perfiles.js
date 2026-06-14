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
    opt.value               = c.id;
    opt.textContent         = `${c.plataforma} — ${c.email}`;
    opt.dataset.precio      = c.precio_compra;
    opt.dataset.maxPerfiles = c.max_perfiles;
    fCuenta.appendChild(opt);
  });
}

// ── Al cambiar cuenta, mostrar slots disponibles ──────────────
fCuenta.addEventListener('change', async () => {
  const cuentaId = fCuenta.value;
  if (!cuentaId) {
    fNombrePerfil.value = '';
    actualizarCalc();
    return;
  }

  const { data: usados } = await supabase
    .from('perfiles')
    .select('id')
    .eq('cuenta_madre_id', cuentaId)
    .neq('estado', 'libre');

  const opt         = fCuenta.options[fCuenta.selectedIndex];
  const maxPerf     = parseInt(opt?.dataset?.maxPerfiles) || 0;
  const usadosCount = usados?.length || 0;
  const esExtra     = fExtra.checked;
  const disponibles = maxPerf - usadosCount;

  if (!esExtra && disponibles <= 0) {
    fNombrePerfil.value       = '';
    fNombrePerfil.placeholder = 'Sin slots disponibles';
    fNombrePerfil.disabled    = true;
  } else {
    fNombrePerfil.placeholder = `Ej: Perfil 1  (${disponibles} slot${disponibles !== 1 ? 's' : ''} libre${disponibles !== 1 ? 's' : ''})`;
    fNombrePerfil.disabled    = false;
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

    fCuenta.value  = perfil.cuenta_madre_id || '';
    fExtra.checked = perfil.extra || false;

    if (esHuerfano) {
      fCuenta.disabled       = false;
      fNombrePerfil.value    = perfil.nombre_perfil || '';
      fNombrePerfil.disabled = true;
    } else {
      fCuenta.disabled       = true;
      fNombrePerfil.value    = perfil.nombre_perfil || '';
      fNombrePerfil.disabled = true;
    }

    fCliente.value     = perfil.cliente_nombre    || '';
    fCelular.value     = perfil.cliente_celular   || '';
    fPin.value         = perfil.pin               || '';
    fVencimiento.value = perfil.fecha_vencimiento || '';
    fPrecioVenta.value = perfil.precio_venta      || '';
  } else {
    fCuenta.value             = '';
    fExtra.checked            = false;
    fNombrePerfil.value       = '';
    fNombrePerfil.placeholder = 'Selecciona cuenta primero...';
    fNombrePerfil.disabled    = false;
    fCuenta.disabled          = false;
    fCliente.value     = '';
    fCelular.value     = '';
    fPin.value         = '';
    fVencimiento.value = '';
    fPrecioVenta.value = '';
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
  const cuentaId     = fCuenta.value;
  const nombrePerfil = fNombrePerfil.value.trim();
  const cliente      = fCliente.value.trim();
  const celular      = fCelular.value.trim();
  const vencimiento  = fVencimiento.value;
  const precioVenta  = parseFloat(fPrecioVenta.value) || 0;
  const esExtra      = fExtra.checked;

  if (!cuentaId)     return alert('Selecciona una cuenta madre.');
  if (!nombrePerfil) return alert('El nombre del perfil es obligatorio.');
  if (!cliente)      return alert('El nombre del cliente es obligatorio.');
  if (!celular)      return alert('El celular es obligatorio.');
  if (!vencimiento)  return alert('La fecha de vencimiento es obligatoria.');
  if (!precioVenta)  return alert('El precio de venta es obligatorio.');

  $('btnGuardar').disabled      = true;
  $('btnGuardarText').hidden    = true;
  $('btnGuardarSpinner').hidden = false;

  let error;

  if (editandoId) {
    const perfilActual = perfiles.find(x => x.id === editandoId);
    const esHuerfano   = !perfilActual?.cuenta_madre_id;

    if (esHuerfano) {
      ({ error } = await supabase.from('perfiles').update({
        cuenta_madre_id:   cuentaId,
        cliente_nombre:    cliente,
        cliente_celular:   celular,
        pin:               fPin.value.trim() || null,
        fecha_vencimiento: vencimiento,
        precio_venta:      precioVenta,
        estado:            'activo',
      }).eq('id', editandoId));
    } else {
      ({ error } = await supabase.from('perfiles').update({
        cliente_nombre:    cliente,
        cliente_celular:   celular,
        pin:               fPin.value.trim() || null,
        fecha_vencimiento: vencimiento,
        precio_venta:      precioVenta,
        estado:            'activo',
      }).eq('id', editandoId));
    }
  } else {
    ({ error } = await supabase.from('perfiles').insert({
      cuenta_madre_id:   cuentaId,
      nombre_perfil:     nombrePerfil,
      cliente_nombre:    cliente,
      cliente_celular:   celular,
      pin:               fPin.value.trim() || null,
      fecha_vencimiento: vencimiento,
      precio_venta:      precioVenta,
      estado:            'activo',
      extra:             esExtra,
      fecha_inicio:      new Date().toISOString().split('T')[0],
    }));
  }

  $('btnGuardar').disabled      = false;
  $('btnGuardarText').hidden    = false;
  $('btnGuardarSpinner').hidden = true;

  if (error) return alert('Error: ' + error.message);
  cerrarModal();
  cargarPerfiles();
});

// ── Renovar +30 dias + WhatsApp ───────────────────────────────
async function renovar(id, fechaActual) {
  const base = fechaActual ? new Date(fechaActual + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + 30);
  const nueva = base.toISOString().split('T')[0];

  const { error } = await supabase
    .from('perfiles').update({ fecha_vencimiento: nueva, estado: 'activo' }).eq('id', id);
  if (error) return alert('Error: ' + error.message);

  const p = perfiles.find(x => x.id === id);
  if (p) {
    const celular = (p.cliente_celular || '').replace(/\D/g, '');
    if (celular) {
      const plat    = p.cuentas_madres?.plataforma || '—';
      const vencStr = new Date(nueva + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
      const mensaje =
        `Hola ${p.cliente_nombre || 'cliente'} 👋\n` +
        `Tu perfil de *${plat}* ha sido *renovado* exitosamente. ✅\n\n` +
        `📅 *Nueva fecha de vencimiento:* ${vencStr}\n` +
        (p.pin ? `🔑 *PIN:* ${p.pin}\n` : '') +
        `\n¡Gracias por tu preferencia! 🙌`;
      window.open(`https://wa.me/51${celular}?text=${encodeURIComponent(mensaje)}`, '_blank');
    }
  }

  cargarPerfiles();
}

// ── WhatsApp manual ───────────────────────────────────────────
function enviarWhatsApp(p) {
  const celular = (p.cliente_celular || '').replace(/\D/g, '');
  if (!celular) return alert('Este perfil no tiene celular registrado.');

  const plat    = p.cuentas_madres?.plataforma || '—';
  const vencStr = p.fecha_vencimiento
    ? new Date(p.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const ev = getEstadoVisual(p);
  let mensaje = '';

  if (ev.clase === 'estado-vencido') {
    mensaje =
      `Hola ${p.cliente_nombre || 'cliente'} 👋\n` +
      `Tu perfil de *${plat}* ha *vencido* el ${vencStr}.\n` +
      `Para renovar y seguir disfrutando, contáctanos. 🎬`;
  } else if (ev.clase === 'estado-por-vencer') {
    mensaje =
      `Hola ${p.cliente_nombre || 'cliente'} 👋\n` +
      `Te recordamos que tu perfil de *${plat}* vence el *${vencStr}*.\n` +
      `Renueva a tiempo para no perder acceso. 🎬`;
  } else {
    mensaje =
      `Hola ${p.cliente_nombre || 'cliente'} 👋\n` +
      `Aquí están los datos de tu perfil:\n\n` +
      `📺 *Plataforma:* ${plat}\n` +
      `👤 *Perfil:* ${p.nombre_perfil || '—'}\n` +
      `📅 *Vence:* ${vencStr}\n` +
      (p.pin ? `🔑 *PIN:* ${p.pin}\n` : '') +
      `\n¡Gracias por tu preferencia! 🙌`;
  }

  window.open(`https://wa.me/51${celular}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

// ── WhatsApp seguridad: cambio de acceso ─────────────────────
function enviarRecordatorioDatos(p) {
  const celular = (p.cliente_celular || '').replace(/\D/g, '');
  if (!celular) return alert('Este perfil no tiene celular registrado.');

  const plat  = p.cuentas_madres?.plataforma || '—';
  const email = p.cuentas_madres?.email      || '—';

  const mensaje =
    `Hola ${p.cliente_nombre || 'cliente'} 👋\n` +
    `Por tu seguridad se ha cambiado el acceso a tu cuenta de *${plat}*.\n\n` +
    `Aquí tus nuevos datos:\n` +
    `📧 *Correo:* ${email}\n` +
    `👤 *Perfil:* ${p.nombre_perfil || '—'}\n` +
    (p.pin ? `🔑 *PIN:* ${p.pin}\n` : '') +
    `\n¡Cualquier duda, aquí estamos! 🙌`;

  window.open(`https://wa.me/51${celular}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

// ── Liberar / eliminar perfil ─────────────────────────────────
$('deleteClose').addEventListener('click',     () => { deleteOverlay.hidden = true; });
$('deleteCancelBtn').addEventListener('click', () => { deleteOverlay.hidden = true; });
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) deleteOverlay.hidden = true; });

$('deleteConfirmBtn').addEventListener('click', async () => {
  if (!liberandoId) return;
  const { error } = await supabase.from('perfiles').delete().eq('id', liberandoId);
  if (error) return alert('Error: ' + error.message);
  deleteOverlay.hidden = true;
  liberandoId = null;
  cargarPerfiles();
});

// ── Estado visual ─────────────────────────────────────────────
function getEstadoVisual(p) {
  if (!p.cuenta_madre_id) return { clase: 'estado-huerfano', texto: '⚠ Sin cuenta madre' };
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
        <button class="btn-accion wsp" data-id="${p.id}" title="Enviar WhatsApp">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        </button>
        <button class="btn-accion datos" data-id="${p.id}" title="Recordar datos de cuenta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0 1.1.9 2 2 2z"/><polyline points="22,6 12,12 2,6"/></svg>
        </button>
        ${!esHuerfano ? `
        <button class="btn-accion renov" data-id="${p.id}" data-fecha="${p.fecha_vencimiento||''}" title="Renovar +30 días">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>` : ''}
        <button class="btn-accion edit ${esHuerfano ? 'huerfano' : ''}" data-id="${p.id}" title="${esHuerfano ? 'Reasignar cuenta madre' : 'Editar'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-accion del" data-id="${p.id}" title="Eliminar perfil">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        </button>
      </div></td>`;
    tableCuerpo.appendChild(tr);
  });

  tableCuerpo.querySelectorAll('.btn-accion.wsp').forEach(btn =>
    btn.addEventListener('click', () => {
      const p = perfiles.find(x => x.id === btn.dataset.id);
      if (p) enviarWhatsApp(p);
    })
  );
  tableCuerpo.querySelectorAll('.btn-accion.datos').forEach(btn =>
    btn.addEventListener('click', () => {
      const p = perfiles.find(x => x.id === btn.dataset.id);
      if (p) enviarRecordatorioDatos(p);
    })
  );
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
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  let disponibles = 0, activos = 0, porVencer = 0, vencidos = 0, ingresos = 0, huerfanos = 0;

  cuentas.forEach(c => {
    const usados = perfiles.filter(p => p.cuenta_madre_id === c.id && !p.extra).length;
    disponibles += Math.max(0, (c.max_perfiles || 0) - usados);
  });

  data.forEach(p => {
    if (!p.cuenta_madre_id) { huerfanos++; return; }
    const venc = p.fecha_vencimiento ? new Date(p.fecha_vencimiento + 'T00:00:00') : null;
    const dias = venc ? Math.ceil((venc - hoy) / 86400000) : 999;
    if (dias < 0)       vencidos++;
    else if (dias <= 5) porVencer++;
    else                activos++;

    const ini = p.fecha_inicio ? new Date(p.fecha_inicio) : null;
    if (ini && ini.getMonth() === hoy.getMonth() && ini.getFullYear() === hoy.getFullYear()) {
      ingresos += parseFloat(p.precio_venta) || 0;
    }
  });

  $('statTotal').textContent     = data.length;
  $('statLibres').textContent    = disponibles;
  $('statActivos').textContent   = activos;
  $('statPorVencer').textContent = porVencer;
  $('statVencidos').textContent  = vencidos;
  $('statIngresos').textContent  = `S/ ${ingresos.toFixed(2)}`;
  $('statHuerfanos').textContent = huerfanos;
}

// ── Filtrar ───────────────────────────────────────────────────
function filtrar(data) {
  const q = $('searchInput').value.trim().toLowerCase();
  let result = data;

  if (filtroActivo !== 'todos') {
    result = result.filter(p => {
      if (filtroActivo === 'huerfano') return !p.cuenta_madre_id;
      if (filtroActivo === 'vencido') {
        if (!p.fecha_vencimiento) return false;
        return new Date(p.fecha_vencimiento + 'T00:00:00') < new Date();
      }
      if (filtroActivo === 'activo') {
        if (!p.fecha_vencimiento) return true;
        return new Date(p.fecha_vencimiento + 'T00:00:00') >= new Date();
      }
      return true;
    });
  }

  if (q) {
    result = result.filter(p =>
      (p.cliente_nombre  || '').toLowerCase().includes(q) ||
      (p.cliente_celular || '').toLowerCase().includes(q) ||
      (p.nombre_perfil   || '').toLowerCase().includes(q)
    );
  }
  return result;
}

// ── Cargar perfiles ───────────────────────────────────────────
async function cargarPerfiles() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*, cuentas_madres(plataforma, email, precio_compra, max_perfiles)')
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
