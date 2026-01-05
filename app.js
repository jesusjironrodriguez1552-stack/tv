// CONFIGURACIÓN SUPABASE (ASEGURATE DE PONER TUS DATOS)
const SUPABASE_URL = 'https://mdetlqvfdgtfatufdkht.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_TV9x9pfZw_vYR3-lF7NCIQ_ybSLs5Fh'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tablaPerfiles = document.getElementById('tablaPerfiles');
const selectMadres = document.getElementById('cuenta_madre_id');
const listaMadres = document.getElementById('listaMadres');

// --- FORMATO WHATSAPP ---

function msgVentaNueva(nombre, wa, plataforma, email, pass, perfil, vence) {
    const num = limpiarNum(wa);
    const msg = `CUENTA: *${plataforma.toUpperCase()}*\nCORREO: ${email}\nCONTRASEÑA: ${pass}\nPERFIL: *${perfil}*\nVENCE EL: *${vence}*\n\n¡GRACIAS POR SU COMPRA!`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

function msgSoporteCambio(nombre, wa, plataforma, email, pass, perfil) {
    const num = limpiarNum(wa);
    const msg = `Hola, por seguridad se ha modificado el correo de su cuenta de *${plataforma}*.\n\nCORREO: ${email}\nCONTRASEÑA: ${pass}\nPERFIL: *${perfil}*`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

function msgRecordarDatos(nombre, wa, plataforma, email, pass, perfil, vence) {
    const num = limpiarNum(wa);
    const msg = `Hola te recordamos tus datos de acceso:\n\nCUENTA: *${plataforma}*\nCORREO: ${email}\nCONTRASEÑA: ${pass}\nPERFIL: ${perfil}\nVENCE: ${vence}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

function msgVencimiento(nombre, wa, plataforma, dias) {
    const num = limpiarNum(wa);
    const t = dias === 0 ? "HOY" : (dias < 0 ? "hace " + Math.abs(dias) + " días" : "en " + dias + " días");
    const msg = `Hola, te recordamos que su cuenta de *${plataforma}* vence ${t}.\n¿Deseas renovar el servicio?`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

// --- LÓGICA DE NEGOCIO ---

function limpiarNum(n) { return n ? n.replace(/\D/g, '') : ''; }

async function validarVencimientoMadre() {
    const id = selectMadres.value;
    if(!id) return;
    const { data } = await _supabase.from('cuentas_madre').select('fecha_vencimiento').eq('id', id).single();
    const dif = Math.ceil((new Date(data.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
    const msg = document.getElementById('msg_advertencia');
    msg.classList.remove('hidden', 'text-green-400', 'text-yellow-400', 'text-red-500');
    if (dif <= 1) { msg.innerText = "⚠️ OJO: Vence en 1 día o ya venció."; msg.classList.add('text-red-500', 'block'); }
    else if (dif <= 5) { msg.innerText = `⚠️ Quedan ${dif} días de vida.`; msg.classList.add('text-yellow-400', 'block'); }
    else { msg.innerText = `✅ Cuenta sana (${dif} días).`; msg.classList.add('text-green-400', 'block'); }
}

async function renderizarTodo() {
    const { data: perfiles } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(*)');
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const { data: madres } = await _supabase.from('cuentas_madre').select('*');

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    // ORDEN INTELIGENTE (Prioriza urgencias)
    perfiles.sort((a, b) => {
        if (!a.cuenta_madre_id && b.cuenta_madre_id) return -1;
        if (a.cuenta_madre_id && !b.cuenta_madre_id) return 1;
        return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento);
    });

    tablaPerfiles.innerHTML = '';
    let activos = 0, cobrarHoy = 0, soporte = 0;

    perfiles?.forEach(p => {
        const vence = new Date(p.fecha_vencimiento);
        const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        activos++;
        if (dif <= 0) cobrarHoy++;
        if (!p.cuenta_madre_id) soporte++;

        const m = p.cuentas_madre;

        tablaPerfiles.innerHTML += `
            <tr class="border-b border-gray-800 hover:bg-gray-800/80 ${dif <= 0 ? 'bg-red-900/10' : ''}">
                <td class="p-4">
                    <div class="font-bold ${dif <= 0 ? 'text-red-400' : 'text-gray-200'}">${p.nombre_cliente}</div>
                    <div class="text-[10px] text-green-500 font-mono italic">${p.whatsapp || '---'}</div>
                </td>
                <td class="p-4">
                    ${m ? `
                        <div class="text-blue-400 font-bold uppercase text-[10px]">${m.plataforma}</div>
                        <div class="text-[10px] text-gray-400 truncate w-40">${m.email_cuenta}</div>
                        <div class="text-[10px] text-yellow-500 font-mono">🔑 ${m.password_cuenta} | ${p.perfil_asignado}</div>
                    ` : `
                        <span class="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold animate-pulse">REUBICAR - SIN CUENTA</span>
                    `}
                </td>
                <td class="p-4 text-center">
                    <div class="${dif < 0 ? 'text-red-500' : (dif === 0 ? 'text-yellow-500' : 'text-green-400')} font-bold">${p.fecha_vencimiento}</div>
                    <div class="text-[9px] opacity-50 uppercase font-bold">${dif < 0 ? 'VENCIDO' : (dif === 0 ? 'VENCE HOY' : 'Faltan '+dif+'d')}</div>
                </td>
                <td class="p-4 text-right flex justify-end gap-1">
                    <button onclick="msgRecordarDatos('${p.nombre_cliente}', '${p.whatsapp}', '${m?.plataforma}', '${m?.email_cuenta}', '${m?.password_cuenta}', '${p.perfil_asignado}', '${p.fecha_vencimiento}')" class="bg-gray-700 p-2 rounded text-xs" title="Datos">🔑</button>
                    <button onclick="msgVencimiento('${p.nombre_cliente}', '${p.whatsapp}', '${m?.plataforma}', ${dif})" class="bg-green-700 p-2 rounded text-xs" title="Cobrar">🔔</button>
                    <button onclick="abrirMigrar('${p.id}')" class="bg-purple-600 p-2 rounded text-xs" title="Migrar">⇄</button>
                    <button onclick="confirmarRenovacion('${p.id}', '${p.nombre_cliente}', '${p.whatsapp}', '${p.fecha_vencimiento}', ${p.precio_venta}, '${m?.plataforma}', '${m?.email_cuenta}', '${m?.password_cuenta}', '${p.perfil_asignado}')" class="bg-blue-600 p-2 rounded text-xs" title="Renovar">🔄</button>
                    <button onclick="borrarP('${p.id}')" class="bg-red-900/20 p-2 rounded text-xs hover:bg-red-600">✕</button>
                </td>
            </tr>
        `;
    });

    // MAPA DE CUPOS
    listaMadres.innerHTML = '';
    madres?.forEach(m => {
        const ocupados = perfiles?.filter(p => p.cuenta_madre_id === m.id).length || 0;
        const libres = 5 - ocupados;
        listaMadres.innerHTML += `
            <div class="bg-gray-800 p-4 rounded-xl border ${libres > 0 ? 'border-gray-700' : 'border-red-900'}">
                <div class="flex justify-between items-start">
                    <h4 class="font-bold text-yellow-500 uppercase text-[10px]">${m.plataforma}</h4>
                    <span class="text-[9px] font-bold ${libres > 0 ? 'text-green-500' : 'text-red-500'}">${libres} LIBRES</span>
                </div>
                <div class="mt-2 h-1 w-full bg-gray-700 rounded-full">
                    <div class="h-full bg-blue-500 transition-all" style="width: ${(ocupados/5)*100}%"></div>
                </div>
                <p class="text-[9px] text-gray-500 truncate mt-1">${m.email_cuenta}</p>
                <button onclick="eliminarMadre('${m.id}')" class="mt-2 text-[8px] text-red-500 uppercase font-bold tracking-tighter hover:underline">Eliminar Madre</button>
            </div>`;
    });

    document.getElementById('stat_activos').innerText = activos;
    document.getElementById('stat_cobrar_hoy').innerText = cobrarHoy;
    document.getElementById('stat_madres').innerText = madres?.length || 0;
    document.getElementById('stat_soporte').innerText = soporte;
    let total = flujo?.reduce((acc, m) => m.tipo === 'ingreso' ? acc + m.monto : acc - m.monto, 0) || 0;
    document.getElementById('balance_monto').innerText = `$${total.toFixed(2)}`;
    document.getElementById('stat_ganancia').innerText = `$${total.toFixed(2)}`;
}

// --- ACCIONES RESTANTES ---

async function confirmarRenovacion(id, nombre, wa, fechaA, monto, plat, email, pass, perfil) {
    let f = new Date(fechaA); f.setDate(f.getDate() + 30);
    const nf = f.toISOString().split('T')[0];
    if(confirm(`¿Renovar 30 días a ${nombre}?`)) {
        await _supabase.from('perfiles_clientes').update({ fecha_vencimiento: nf }).eq('id', id);
        await _supabase.from('flujo_caja').insert([{ tipo:'ingreso', monto, descripcion:`Renovación: ${nombre}` }]);
        msgVentaNueva(nombre, wa, plat, email, pass, perfil, nf);
        renderizarTodo();
    }
}

async function eliminarMadre(id) {
    if(confirm("¿Eliminar este correo? Los clientes quedarán en 'Soporte Pendiente'.")) {
        await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: null }).eq('cuenta_madre_id', id);
        await _supabase.from('cuentas_madre').delete().eq('id', id);
        init();
    }
}

function abrirMigrar(id) { document.getElementById('migrar_perfil_id').value = id; document.getElementById('modalMigrar').classList.remove('hidden'); }
function cerrarModal() { document.getElementById('modalMigrar').classList.add('hidden'); }

async function confirmarMigracion() {
    const id = document.getElementById('migrar_perfil_id').value;
    const nuevaM = document.getElementById('migrar_nueva_madre').value;
    const { data: p } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(*)').eq('id', id).single();
    const { data: m } = await _supabase.from('cuentas_madre').select('*').eq('id', nuevaM).single();
    await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: nuevaM }).eq('id', id);
    if(nuevaM) msgSoporteCambio(p.nombre_cliente, p.whatsapp, m.plataforma, m.email_cuenta, m.password_cuenta, p.perfil_asignado);
    cerrarModal(); renderizarTodo();
}

document.getElementById('madreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const gasto = parseFloat(document.getElementById('m_gasto').value);
    await _supabase.from('cuentas_madre').insert([{
        plataforma: document.getElementById('m_plataforma').value, email_cuenta: document.getElementById('m_email').value,
        password_cuenta: document.getElementById('m_password').value, fecha_vencimiento: document.getElementById('m_vencimiento').value,
        costo_compra: gasto
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo:'egreso', monto:gasto, descripcion:'Compra Madre' }]);
    e.target.reset(); init();
});

document.getElementById('perfilForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const monto = parseFloat(document.getElementById('monto').value);
    const nombre = document.getElementById('nombre_cliente').value;
    const wa = document.getElementById('whatsapp').value;
    const perfil = document.getElementById('perfil_asignado').value;
    const vence = document.getElementById('vencimiento_cliente').value;
    const idM = document.getElementById('cuenta_madre_id').value;
    const { data: m } = await _supabase.from('cuentas_madre').select('*').eq('id', idM).single();

    await _supabase.from('perfiles_clientes').insert([{
        nombre_cliente: nombre, whatsapp: wa, cuenta_madre_id: idM,
        perfil_asignado: perfil, fecha_vencimiento: vence, precio_venta: monto
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo:'ingreso', monto:monto, descripcion:'Venta Perfil' }]);
    if(confirm("¿Enviar datos de venta por WhatsApp?")) msgVentaNueva(nombre, wa, m.plataforma, m.email_cuenta, m.password_cuenta, perfil, vence);
    e.target.reset(); renderizarTodo();
});

function filtrarTabla() {
    const b = document.getElementById('buscador').value.toLowerCase();
    const filas = tablaPerfiles.getElementsByTagName('tr');
    for (let f of filas) f.style.display = f.innerText.toLowerCase().includes(b) ? '' : 'none';
}

async function borrarP(id) { if(confirm("¿Borrar cliente definitivamente?")) { await _supabase.from('perfiles_clientes').delete().eq('id', id); renderizarTodo(); } }

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
