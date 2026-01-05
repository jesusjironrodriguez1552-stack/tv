// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://TU_URL.supabase.co'; 
const SUPABASE_KEY = 'TU_KEY_ANON'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tablaPerfiles = document.getElementById('tablaPerfiles');
const selectMadres = document.getElementById('cuenta_madre_id');
const listaMadres = document.getElementById('listaMadres');

// --- MENSAJES ---
function msgVentaNueva(nombre, wa, plataforma, email, pass, perfil, vence) {
    const msg = `CUENTA: *${plataforma.toUpperCase()}*\nCORREO: ${email}\nCONTRASEÑA: ${pass}\nPERFIL: *${perfil}*\nVENCE EL: *${vence}*\n\n¡GRACIAS POR SU COMPRA!`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

function msgVencimiento(nombre, wa, plataforma, dias) {
    const t = dias <= 0 ? "HOY" : `en ${dias} días`;
    const msg = `Hola, te recordamos que tu servicio de *${plataforma}* vence ${t}.\n¿Deseas renovar?`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

// --- RENDERIZADO CON AUDITORÍA ---
async function renderizarTodo() {
    const { data: perfiles } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(*)');
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const { data: madres } = await _supabase.from('cuentas_madre').select('*');

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    
    // ORDEN: Vencidos primero
    perfiles.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));

    tablaPerfiles.innerHTML = '';
    let activos = 0, cobrarHoy = 0, alertaMadres = 0;

    perfiles?.forEach(p => {
        const vence = new Date(p.fecha_vencimiento);
        const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        activos++; if(dif <= 0) cobrarHoy++;
        const m = p.cuentas_madre;

        tablaPerfiles.innerHTML += `
            <tr class="border-b border-gray-800 ${dif <= 0 ? 'bg-red-900/10' : ''}">
                <td class="p-4 text-xs"><b>${p.nombre_cliente}</b><br><span class="text-green-500">${p.whatsapp || ''}</span></td>
                <td class="p-4 text-[10px]">
                    ${m ? `<b class="text-blue-400">${m.plataforma}</b><br>${m.email_cuenta}<br><span class="text-yellow-500">Pass: ${m.password_cuenta} | ${p.perfil_asignado}</span>` 
                    : '<span class="text-red-500 font-bold animate-pulse">REUBICAR YA</span>'}
                </td>
                <td class="p-4 text-center font-bold ${dif <= 0 ? 'text-red-500 animate-bounce' : 'text-green-400'}">${p.fecha_vencimiento}</td>
                <td class="p-4 text-right flex gap-1 justify-end">
                    <button onclick="msgVencimiento('${p.nombre_cliente}', '${p.whatsapp}', '${m?.plataforma}', ${dif})" class="bg-green-700 p-2 rounded text-xs">🔔</button>
                    <button onclick="abrirMigrar('${p.id}')" class="bg-purple-600 p-2 rounded text-xs">⇄</button>
                    <button onclick="borrarP('${p.id}')" class="bg-red-900/40 p-2 rounded text-xs hover:bg-red-600">✕</button>
                </td>
            </tr>`;
    });

    // MONITOR DE VIDAS MADRE
    listaMadres.innerHTML = '';
    madres?.forEach(m => {
        const vMadre = new Date(m.fecha_vencimiento);
        const difM = Math.ceil((vMadre - hoy) / (1000 * 60 * 60 * 24));
        if(difM <= 3) alertaMadres++;

        listaMadres.innerHTML += `
            <div class="bg-gray-800 p-4 rounded-xl border-l-4 ${difM <= 3 ? 'alerta-vencimiento bg-red-900/10' : 'border-green-500'}">
                <div class="flex justify-between items-start">
                    <h4 class="font-bold text-yellow-500 text-xs uppercase">${m.plataforma}</h4>
                    <span class="text-[10px] font-bold ${difM <= 3 ? 'text-red-500' : 'text-green-400'}">
                        ${difM <= 0 ? '¡VENCIDA!' : 'Vence en '+difM+' días'}
                    </span>
                </div>
                <p class="text-[10px] text-gray-400 truncate mt-1 font-mono">${m.email_cuenta}</p>
                <div class="flex justify-between mt-2 text-[9px] uppercase font-bold">
                    <span class="text-gray-500">Cupos: ${perfiles?.filter(p=>p.cuenta_madre_id===m.id).length}/5</span>
                    <button onclick="eliminarMadre('${m.id}')" class="text-red-500">Eliminar</button>
                </div>
            </div>`;
    });

    // TOTALES REALES
    document.getElementById('stat_activos').innerText = activos;
    document.getElementById('stat_cobrar_hoy').innerText = cobrarHoy;
    document.getElementById('stat_madres_alerta').innerText = alertaMadres;
    
    let ingresos = flujo?.filter(f=>f.tipo==='ingreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    let egresos = flujo?.filter(f=>f.tipo==='egreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    document.getElementById('balance_monto').innerText = `$${(ingresos - egresos).toFixed(2)}`;
    document.getElementById('stat_ganancia').innerText = `$${(ingresos - egresos).toFixed(2)}`;
}

// --- GASTO MANUAL ---
document.getElementById('gastoManualForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = parseFloat(document.getElementById('g_monto').value);
    const mot = document.getElementById('g_motivo').value;
    if(confirm(`¿Descontar $${m} por ${mot}?`)) {
        await _supabase.from('flujo_caja').insert([{ tipo:'egreso', monto:m, descripcion: `GASTO MANUAL: ${mot}` }]);
        e.target.reset(); renderizarTodo();
    }
});

// --- EL RESTO ---
async function borrarP(id) { if(confirm("¿Borrar?")) { await _supabase.from('perfiles_clientes').delete().eq('id', id); renderizarTodo(); } }

document.getElementById('madreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = parseFloat(document.getElementById('m_gasto').value);
    await _supabase.from('cuentas_madre').insert([{
        plataforma: document.getElementById('m_plataforma').value, email_cuenta: document.getElementById('m_email').value,
        password_cuenta: document.getElementById('m_password').value, fecha_vencimiento: document.getElementById('m_vencimiento').value,
        costo_compra: g
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo:'egreso', monto:g, descripcion:'Compra Madre' }]);
    e.target.reset(); init();
});

document.getElementById('perfilForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = parseFloat(document.getElementById('monto').value);
    const n = document.getElementById('nombre_cliente').value;
    const w = document.getElementById('whatsapp').value;
    const p = document.getElementById('perfil_asignado').value;
    const v = document.getElementById('vencimiento_cliente').value;
    const idM = document.getElementById('cuenta_madre_id').value;
    const { data: mad } = await _supabase.from('cuentas_madre').select('*').eq('id', idM).single();

    await _supabase.from('perfiles_clientes').insert([{
        nombre_cliente: n, whatsapp: w, cuenta_madre_id: idM,
        perfil_asignado: p, fecha_vencimiento: v, precio_venta: m
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo:'ingreso', monto:m, descripcion:'Venta Perfil' }]);
    if(confirm("¿Enviar WhatsApp?")) msgVentaNueva(n, w, mad.plataforma, mad.email_cuenta, mad.password_cuenta, p, v);
    e.target.reset(); renderizarTodo();
});

async function eliminarMadre(id) {
    if(confirm("¿Eliminar? Clientes quedarán libres.")) {
        await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: null }).eq('cuenta_madre_id', id);
        await _supabase.from('cuentas_madre').delete().eq('id', id);
        init();
    }
}

function abrirMigrar(id) { document.getElementById('migrar_perfil_id').value = id; document.getElementById('modalMigrar').classList.remove('hidden'); }
function cerrarModal() { document.getElementById('modalMigrar').classList.add('hidden'); }

async function confirmarMigracion() {
    await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: document.getElementById('migrar_nueva_madre').value }).eq('id', document.getElementById('migrar_perfil_id').value);
    cerrarModal(); renderizarTodo();
}

async function init() {
    const { data } = await _supabase.from('cuentas_madre').select('*');
    selectMadres.innerHTML = '<option value="">Seleccionar Cuenta</option>';
    const ms = document.getElementById('migrar_nueva_madre');
    ms.innerHTML = '<option value="">Dejar sin cuenta</option>';
    data?.forEach(m => {
        const opt = `<option value="${m.id}">${m.plataforma} (${m.email_cuenta})</option>`;
        selectMadres.innerHTML += opt;
        ms.innerHTML += opt;
    });
    renderizarTodo();
}
init();
