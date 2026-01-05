// CONFIGURACIÓN SUPABASE (PON TUS DATOS AQUÍ)
const SUPABASE_URL = 'https://mdetlqvfdgtfatufdkht.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_TV9x9pfZw_vYR3-lF7NCIQ_ybSLs5Fh'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Referencias
const tablaPerfiles = document.getElementById('tablaPerfiles');
const selectMadres = document.getElementById('cuenta_madre_id');
const listaMadres = document.getElementById('listaMadres');

// --- UTILIDADES ---
function limpiarNum(n) { return n.replace(/\D/g, ''); }

// SEMÁFORO DE ADVERTENCIA EN EL REGISTRO
async function validarVencimientoMadre() {
    const id = selectMadres.value;
    if(!id) return;
    
    const { data } = await _supabase.from('cuentas_madre').select('fecha_vencimiento').eq('id', id).single();
    const vence = new Date(data.fecha_vencimiento);
    const hoy = new Date();
    const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
    
    const msg = document.getElementById('msg_advertencia');
    msg.classList.remove('hidden', 'text-green-400', 'text-yellow-400', 'text-red-500');

    if (dif <= 0) {
        msg.innerText = "❌ CUENTA VENCIDA. No metas clientes aquí.";
        msg.classList.add('text-red-500', 'block');
    } else if (dif <= 5) {
        msg.innerText = `⚠️ CUIDADO: Vence en ${dif} días. Soporte pronto.`;
        msg.classList.add('text-yellow-400', 'block');
    } else {
        msg.innerText = `✅ Cuenta sana (${dif} días restantes).`;
        msg.classList.add('text-green-400', 'block');
    }
}

// RENDERIZAR TODO
async function renderizarTodo() {
    const { data: perfiles } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(*)').order('fecha_vencimiento', { ascending: true });
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const { data: madres } = await _supabase.from('cuentas_madre').select('*');

    // 1. TABLA CLIENTES
    tablaPerfiles.innerHTML = '';
    let activos = 0, vencidos = 0;
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    perfiles?.forEach(p => {
        const vence = new Date(p.fecha_vencimiento);
        const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        activos++; if(dif < 0) vencidos++;

        const infoCuenta = p.cuentas_madre 
            ? `<span class="text-blue-400 font-bold">${p.cuentas_madre.plataforma}</span><br><span class="text-[10px] text-gray-500">${p.cuentas_madre.email_cuenta}</span>`
            : `<span class="bg-red-900 text-red-200 px-2 py-1 rounded text-[10px] animate-pulse font-bold">⚠️ SOPORTE PENDIENTE</span>`;

        tablaPerfiles.innerHTML += `
            <tr class="border-b border-gray-800 hover:bg-gray-800/50">
                <td class="p-4">
                    <div class="font-bold">${p.nombre_cliente}</div>
                    <div class="text-[10px] text-green-500 font-mono">${p.whatsapp || 'Sin WhatsApp'}</div>
                </td>
                <td class="p-4">${infoCuenta}</td>
                <td class="p-4 text-center">
                    <div class="${dif < 0 ? 'text-red-500' : 'text-green-400'} font-bold">${p.fecha_vencimiento}</div>
                    <div class="text-[9px] opacity-50 uppercase">${dif < 0 ? 'Venció' : 'En '+dif+'d'}</div>
                </td>
                <td class="p-4 text-right flex justify-end gap-1">
                    <button onclick="notificar('${p.nombre_cliente}', '${p.whatsapp}', '${p.cuentas_madre?.email_cuenta}', ${dif})" class="bg-green-700 p-2 rounded text-xs" title="Cobrar">🔔</button>
                    <button onclick="abrirMigrar('${p.id}', '${p.fecha_vencimiento}')" class="bg-purple-600 p-2 rounded text-xs" title="Migrar/Emergencia">⇄</button>
                    <button onclick="renovar('${p.id}', '${p.nombre_cliente}', '${p.whatsapp}', '${p.fecha_vencimiento}', ${p.precio_venta}, '${p.cuentas_madre?.email_cuenta}')" class="bg-blue-600 p-2 rounded text-xs" title="Renovar">🔄</button>
                    <button onclick="borrarP('${p.id}')" class="bg-gray-700 p-2 rounded text-xs">✕</button>
                </td>
            </tr>
        `;
    });

    // 2. INVENTARIO MADRES
    listaMadres.innerHTML = '';
    madres?.forEach(m => {
        const cupos = perfiles?.filter(p => p.cuenta_madre_id === m.id).length || 0;
        listaMadres.innerHTML += `
            <div class="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-yellow-500 uppercase text-xs">${m.plataforma}</h4>
                    <button onclick="eliminarMadre('${m.id}')" class="text-red-400 hover:text-red-200 text-xs">Eliminar Correo</button>
                </div>
                <p class="text-[11px] text-gray-300 truncate mb-2">${m.email_cuenta}</p>
                <div class="flex justify-between text-[10px] font-bold">
                    <span class="text-gray-400">VENCE: ${m.fecha_vencimiento}</span>
                    <span class="${cupos >= 5 ? 'text-red-400' : 'text-green-400'}">${cupos}/5 Cupos</span>
                </div>
            </div>
        `;
    });

    // 3. STATS
    document.getElementById('stat_activos').innerText = activos;
    document.getElementById('stat_vencidos').innerText = vencidos;
    document.getElementById('stat_madres').innerText = madres?.length || 0;
    let total = flujo?.reduce((acc, m) => m.tipo === 'ingreso' ? acc + m.monto : acc - m.monto, 0) || 0;
    document.getElementById('balance_monto').innerText = `$${total.toFixed(2)}`;
    document.getElementById('stat_ganancia').innerText = `$${total.toFixed(2)}`;
}

// --- ACCIONES ---

// Notificar WhatsApp
function notificar(nombre, wa, email, dias) {
    const num = limpiarNum(wa);
    const msg = dias < 0 ? `Hola ${nombre}, tu cuenta (${email}) ha VENCIDO. ¿Deseas renovar?` : `Hola ${nombre}, tu cuenta (${email}) vence en ${dias} días.`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Renovar y Gracias
async function renovar(id, nombre, wa, fechaA, monto, email) {
    let f = new Date(fechaA); f.setDate(f.getDate() + 30);
    const nf = f.toISOString().split('T')[0];
    if(confirm(`¿Renovar 30 días a ${nombre}?`)) {
        await _supabase.from('perfiles_clientes').update({ fecha_vencimiento: nf }).eq('id', id);
        await _supabase.from('flujo_caja').insert([{ tipo:'ingreso', monto, descripcion:`Renovación: ${nombre}` }]);
        const msg = `Hola ${nombre}, ¡Gracias por renovar! Tu cuenta (${email}) ahora vence el ${nf}.`;
        window.open(`https://wa.me/${limpiarNum(wa)}?text=${encodeURIComponent(msg)}`, '_blank');
        renderizarTodo();
    }
}

// Eliminar Madre (Sin perder clientes)
async function eliminarMadre(id) {
    if(confirm("¿Eliminar este correo? Los clientes no se borrarán, quedarán en 'Soporte Pendiente'.")) {
        await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: null }).eq('cuenta_madre_id', id);
        await _supabase.from('cuentas_madre').delete().eq('id', id);
        init();
    }
}

// Migración/Modal
function abrirMigrar(id, fecha) {
    document.getElementById('migrar_perfil_id').value = id;
    document.getElementById('modalMigrar').classList.remove('hidden');
}
function cerrarModal() { document.getElementById('modalMigrar').classList.add('hidden'); }

async function confirmarMigracion() {
    const id = document.getElementById('migrar_perfil_id').value;
    const nuevaM = document.getElementById('migrar_nueva_madre').value;
    await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: nuevaM }).eq('id', id);
    alert("Cliente movido exitosamente");
    cerrarModal();
    renderizarTodo();
}

// Buscador
function filtrarTabla() {
    const b = document.getElementById('buscador').value.toLowerCase();
    const filas = tablaPerfiles.getElementsByTagName('tr');
    for (let f of filas) f.style.display = f.innerText.toLowerCase().includes(b) ? '' : 'none';
}

// Borrar Perfil
async function borrarP(id) { if(confirm("¿Borrar cliente?")) { await _supabase.from('perfiles_clientes').delete().eq('id', id); renderizarTodo(); } }

// REGISTROS
document.getElementById('madreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const gasto = parseFloat(document.getElementById('m_gasto').value);
    await _supabase.from('cuentas_madre').insert([{
        plataforma: document.getElementById('m_plataforma').value,
        email_cuenta: document.getElementById('m_email').value,
        fecha_vencimiento: document.getElementById('m_vencimiento').value,
        costo_compra: gasto
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo:'egreso', monto:gasto, descripcion:'Compra Madre' }]);
    e.target.reset(); init();
});

document.getElementById('perfilForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p = parseFloat(document.getElementById('monto').value);
    await _supabase.from('perfiles_clientes').insert([{
        nombre_cliente: document.getElementById('nombre_cliente').value,
        whatsapp: document.getElementById('whatsapp').value,
        cuenta_madre_id: selectMadres.value,
        fecha_vencimiento: document.getElementById('vencimiento_cliente').value,
        precio_venta: p
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo:'ingreso', monto:p, descripcion:'Venta Perfil' }]);
    e.target.reset(); renderizarTodo();
});

async function init() {
    const { data } = await _supabase.from('cuentas_madre').select('*');
    selectMadres.innerHTML = '<option value="">Seleccionar Cuenta</option>';
    document.getElementById('migrar_nueva_madre').innerHTML = '<option value="">Mover a Sin Cuenta</option>';
    data?.forEach(m => {
        const opt = `<option value="${m.id}">${m.plataforma} (${m.email_cuenta})</option>`;
        selectMadres.innerHTML += opt;
        document.getElementById('migrar_nueva_madre').innerHTML += opt;
    });
    renderizarTodo();
}

init();
