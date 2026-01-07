// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://mdetlqvfdgtfatufdkht.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_TV9x9pfZw_vYR3-lF7NCIQ_ybSLs5Fh'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tablaPerfiles = document.getElementById('tablaPerfiles');
const selectMadres = document.getElementById('cuenta_madre_id');
const gridMadresDetalle = document.getElementById('gridMadresDetalle');

// --- NAVEGACIÓN DE PESTAÑAS ---
function cambiarSeccion(idSeccion) {
    // Ocultar todas las secciones
    document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
    // Mostrar la seleccionada
    document.getElementById(idSeccion).classList.remove('hidden');
    
    // Actualizar estilos de botones
    document.getElementById('btn-tab-clientes').classList.remove('tab-active', 'text-blue-400');
    document.getElementById('btn-tab-clientes').classList.add('text-gray-500');
    document.getElementById('btn-tab-madres').classList.remove('tab-active', 'text-blue-400');
    document.getElementById('btn-tab-madres').classList.add('text-gray-500');

    if(idSeccion === 'seccion-clientes') {
        document.getElementById('btn-tab-clientes').classList.add('tab-active');
        document.getElementById('btn-tab-clientes').classList.remove('text-gray-500');
    } else {
        document.getElementById('btn-tab-madres').classList.add('tab-active');
        document.getElementById('btn-tab-madres').classList.remove('text-gray-500');
    }
}

// --- MENSAJES WHATSAPP ---
function msgVentaNueva(nombre, wa, plataforma, email, pass, perfil, vence) {
    const msg = `CUENTA: *${plataforma.toUpperCase()}*\nCORREO: ${email}\nCONTRASEÑA: ${pass}\nPERFIL: *${perfil}*\nVENCE EL: *${vence}*\n\n¡GRACIAS POR SU COMPRA!`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

function msgVencimiento(nombre, wa, plataforma, dias) {
    const t = dias <= 0 ? "HOY" : `en ${dias} días`;
    const msg = `Hola, te recordamos que tu servicio de *${plataforma}* vence ${t}.\n¿Deseas renovar?`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

// --- RENDERIZADO PRINCIPAL ---
async function renderizarTodo() {
    const { data: perfiles } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(*)');
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const { data: madres } = await _supabase.from('cuentas_madre').select('*');

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    
    // 1. Render Tabla Clientes
    perfiles.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
    tablaPerfiles.innerHTML = '';
    let activos = 0, cobrarHoy = 0, alertaMadres = 0;

    perfiles?.forEach(p => {
        const vence = new Date(p.fecha_vencimiento);
        const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        activos++; if(dif <= 0) cobrarHoy++;
        const m = p.cuentas_madre;

        tablaPerfiles.innerHTML += `
            <tr class="border-b border-gray-800 transition hover:bg-gray-850 ${dif <= 0 ? 'bg-red-900/10' : ''}">
                <td class="p-4 text-xs"><b>${p.nombre_cliente}</b><br><span class="text-green-500">${p.whatsapp || ''}</span></td>
                <td class="p-4 text-[10px]">
                    ${m ? `<b class="text-blue-400 font-bold uppercase">${m.plataforma}</b><br>${m.email_cuenta}<br><span class="text-yellow-500 font-bold">Pass: ${m.password_cuenta} | ${p.perfil_asignado}</span>` 
                    : '<span class="text-red-500 font-bold animate-pulse">SIN CUENTA ASIGNADA</span>'}
                </td>
                <td class="p-4 text-center font-bold ${dif <= 0 ? 'text-red-500' : 'text-green-400'}">${p.fecha_vencimiento}</td>
                <td class="p-4 text-right flex gap-1 justify-end">
                    <button onclick="msgVencimiento('${p.nombre_cliente}', '${p.whatsapp}', '${m?.plataforma}', ${dif})" class="bg-green-700 hover:bg-green-600 p-2 rounded text-xs transition">🔔</button>
                    <button onclick="abrirMigrar('${p.id}')" class="bg-purple-600 hover:bg-purple-500 p-2 rounded text-xs transition">⇄</button>
                    <button onclick="borrarP('${p.id}')" class="bg-red-900/40 hover:bg-red-600 p-2 rounded text-xs transition">✕</button>
                </td>
            </tr>`;
    });

    // 2. Render Grid Cuentas Madre (Inventario Detallado)
    gridMadresDetalle.innerHTML = '';
    madres?.forEach(m => {
        const vMadre = new Date(m.fecha_vencimiento);
        const difM = Math.ceil((vMadre - hoy) / (1000 * 60 * 60 * 24));
        if(difM <= 3) alertaMadres++;

        const ocupados = perfiles?.filter(p => p.cuenta_madre_id === m.id).length || 0;
        const disponibles = 5 - ocupados;

        gridMadresDetalle.innerHTML += `
            <div class="bg-gray-850 border border-gray-700 rounded-2xl p-5 shadow-lg relative overflow-hidden transition hover:border-blue-500/50">
                <div class="absolute top-0 right-0 p-2 ${difM <= 3 ? 'bg-red-600' : 'bg-green-600'} text-[9px] font-black uppercase rounded-bl-lg">
                    ${difM <= 0 ? '¡VENCIDA!' : 'Vence en '+difM+' días'}
                </div>
                
                <h4 class="text-xl font-black text-yellow-500 mb-1 uppercase tracking-tight">${m.plataforma}</h4>
                <div class="space-y-1 mb-4">
                    <div class="bg-black/40 p-2 rounded border border-gray-700">
                        <p class="text-[10px] text-gray-500 uppercase font-bold">Correo Acceso:</p>
                        <p class="text-xs font-mono text-gray-200 truncate">${m.email_cuenta}</p>
                    </div>
                    <div class="bg-black/40 p-2 rounded border border-gray-700">
                        <p class="text-[10px] text-gray-500 uppercase font-bold">Contraseña:</p>
                        <p class="text-xs font-mono text-blue-400 font-bold tracking-widest">${m.password_cuenta}</p>
                    </div>
                </div>

                <div class="flex justify-between items-center border-t border-gray-700 pt-4">
                    <div>
                        <span class="text-[9px] uppercase text-gray-500 block mb-1">Perfiles Ocupados</span>
                        <div class="flex gap-1">
                            ${Array.from({length: 5}, (_, i) => `
                                <div class="w-3 h-3 rounded-sm ${i < ocupados ? 'bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.5)]' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'}"></div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-2xl font-black ${disponibles > 0 ? 'text-white' : 'text-red-500'}">${disponibles}</span>
                        <span class="text-[9px] uppercase text-gray-500 block leading-none">Libres</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 mt-4">
                    <button onclick="eliminarMadre('${m.id}')" class="bg-red-900/20 hover:bg-red-600 text-[10px] font-bold py-2 rounded transition uppercase">Borrar</button>
                    <button class="bg-gray-700 hover:bg-gray-600 text-[10px] font-bold py-2 rounded transition uppercase text-gray-300">Detalles</button>
                </div>
            </div>`;
    });

    // 3. Totales
    document.getElementById('stat_activos').innerText = activos;
    document.getElementById('stat_cobrar_hoy').innerText = cobrarHoy;
    document.getElementById('stat_madres_alerta').innerText = alertaMadres;
    
    let ingresos = flujo?.filter(f=>f.tipo==='ingreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    let egresos = flujo?.filter(f=>f.tipo==='egreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    document.getElementById('balance_monto').innerText = `$${(ingresos - egresos).toFixed(2)}`;
    document.getElementById('stat_ganancia').innerText = `$${(ingresos - egresos).toFixed(2)}`;
}

// --- FORMULARIO GASTO MANUAL ---
document.getElementById('gastoManualForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = parseFloat(document.getElementById('g_monto').value);
    const mot = document.getElementById('g_motivo').value;
    if(confirm(`¿Descontar $${m} por ${mot}?`)) {
        await _supabase.from('flujo_caja').insert([{ tipo:'egreso', monto:m, descripcion: `GASTO MANUAL: ${mot}` }]);
        e.target.reset(); renderizarTodo();
    }
});

// --- FORMULARIO NUEVA MADRE ---
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

// --- FORMULARIO VENTA PERFIL ---
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
    if(confirm("¿Venta guardada! ¿Deseas enviar los datos al WhatsApp del cliente?")) msgVentaNueva(n, w, mad.plataforma, mad.email_cuenta, mad.password_cuenta, p, v);
    e.target.reset(); renderizarTodo();
});

// --- FUNCIONES AUXILIARES ---
async function borrarP(id) { if(confirm("¿Estás seguro de eliminar este cliente?")) { await _supabase.from('perfiles_clientes').delete().eq('id', id); renderizarTodo(); } }

async function eliminarMadre(id) {
    if(confirm("ALERTA: Al eliminar la cuenta madre, los clientes asociados quedarán sin cuenta asignada. ¿Continuar?")) {
        await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: null }).eq('cuenta_madre_id', id);
        await _supabase.from('cuentas_madre').delete().eq('id', id);
        init();
    }
}

function abrirMigrar(id) { document.getElementById('migrar_perfil_id').value = id; document.getElementById('modalMigrar').classList.remove('hidden'); }
function cerrarModal() { document.getElementById('modalMigrar').classList.add('hidden'); }

async function confirmarMigracion() {
    const nuevaMadre = document.getElementById('migrar_nueva_madre').value;
    if(!nuevaMadre) return alert("Selecciona una cuenta válida");
    await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: nuevaMadre }).eq('id', document.getElementById('migrar_perfil_id').value);
    cerrarModal(); renderizarTodo();
}

async function init() {
    const { data } = await _supabase.from('cuentas_madre').select('*');
    selectMadres.innerHTML = '<option value="">Seleccionar Cuenta Madre</option>';
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
