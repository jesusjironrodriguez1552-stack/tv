// CONFIGURACIÓN (REEMPLAZA CON TUS DATOS REALES)
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co'; 
const SUPABASE_KEY = 'TU_KEY_ANON'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const selectMadres = document.getElementById('cuenta_madre_id');
const tablaPerfiles = document.getElementById('tablaPerfiles');
const balanceMonto = document.getElementById('balance_monto');

// LIMPIEZA DE NÚMERO PARA WHATSAPP
function limpiarNumero(num) {
    return num.replace(/\D/g, '');
}

// BOTÓN NOTIFICAR (COBRAR VENCIMIENTO)
function notificarVencimiento(nombre, whatsapp, emailCuenta, dias) {
    const num = limpiarNumero(whatsapp);
    let msg = dias < 0 
        ? `Hola ${nombre}, tu perfil en la cuenta (${emailCuenta}) ha VENCIDO. ¿Deseas renovar el servicio?` 
        : `Hola ${nombre}, te recordamos que tu perfil (${emailCuenta}) vence en ${dias} días.`;
    
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

// BOTÓN RENOVAR (+30 DÍAS Y MENSAJE GRACIAS)
async function renovarYNotificar(id, nombre, whatsapp, fechaActual, monto, emailCuenta) {
    let fecha = new Date(fechaActual);
    fecha.setDate(fecha.getDate() + 30);
    const nuevaFecha = fecha.toISOString().split('T')[0];

    if(confirm(`¿Renovar 30 días a ${nombre}?`)) {
        await _supabase.from('perfiles_clientes').update({ fecha_vencimiento: nuevaFecha }).eq('id', id);
        await _supabase.from('flujo_caja').insert([{ tipo: 'ingreso', monto: monto, descripcion: `Renovación: ${nombre}` }]);
        
        const num = limpiarNumero(whatsapp);
        const msg = `Hola ${nombre}, ¡Gracias por renovar! Tu cuenta (${emailCuenta}) ha sido extendida hasta el ${nuevaFecha}.`;
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
        renderizarTodo();
    }
}

// REGISTRO MADRE
document.getElementById('madreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const gasto = parseFloat(document.getElementById('m_gasto').value);
    const plat = document.getElementById('m_plataforma').value;
    const email = document.getElementById('m_email').value;

    const { error } = await _supabase.from('cuentas_madre').insert([{
        plataforma: plat, email_cuenta: email, fecha_vencimiento: document.getElementById('m_vencimiento').value, costo_compra: gasto
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo: 'egreso', monto: gasto, descripcion: `Compra: ${plat} (${email})` }]);

    if (!error) { e.target.reset(); init(); }
});

// REGISTRO VENTA
document.getElementById('perfilForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const precio = parseFloat(document.getElementById('monto').value);
    const nombre = document.getElementById('nombre_cliente').value;

    const { error } = await _supabase.from('perfiles_clientes').insert([{
        nombre_cliente: nombre, whatsapp: document.getElementById('whatsapp').value,
        cuenta_madre_id: selectMadres.value, fecha_vencimiento: document.getElementById('vencimiento_cliente').value,
        precio_venta: precio
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo: 'ingreso', monto: precio, descripcion: `Venta: ${nombre}` }]);

    if (!error) { e.target.reset(); renderizarTodo(); }
});

// RENDERIZADO Y ESTADÍSTICAS
async function renderizarTodo() {
    const { data: perfiles } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(email_cuenta, plataforma)').order('fecha_vencimiento', { ascending: true });
    const { data: flujo } = await _supabase.from('flujo_caja').select('tipo, monto');

    tablaPerfiles.innerHTML = '';
    let activos = 0, vencidos = 0, proximos = 0;
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    perfiles?.forEach(p => {
        const vence = new Date(p.fecha_vencimiento);
        vence.setHours(24,0,0,0);
        const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        
        activos++;
        if (dif < 0) vencidos++; else if (dif <= 3) proximos++;

        let color = dif < 0 ? "text-red-500 font-bold" : (dif <= 3 ? "text-yellow-500 font-bold" : "text-green-400");
        let filaBg = dif < 0 ? "bg-red-900/10" : "";

        tablaPerfiles.innerHTML += `
            <tr class="${filaBg} border-b border-gray-700 hover:bg-gray-750 transition">
                <td class="p-4">
                    <div class="font-bold">${p.nombre_cliente}</div>
                    <div class="text-[10px] text-green-500">${p.whatsapp || 'SIN WA'}</div>
                </td>
                <td class="p-4 text-center text-[10px] text-gray-400">
                    <span class="text-blue-400 font-bold uppercase">${p.cuentas_madre?.plataforma}</span><br>${p.cuentas_madre?.email_cuenta}
                </td>
                <td class="p-4 text-center">
                    <div class="${color}">${p.fecha_vencimiento}</div>
                    <div class="text-[9px] uppercase opacity-50">${dif < 0 ? 'Expiró' : 'Falta '+dif+'d'}</div>
                </td>
                <td class="p-4 text-center font-mono text-green-300 font-bold">$${p.precio_venta}</td>
                <td class="p-4 text-right flex justify-end gap-1">
                    <button onclick="notificarVencimiento('${p.nombre_cliente}', '${p.whatsapp}', '${p.cuentas_madre?.email_cuenta}', ${dif})" class="bg-green-700 px-2 py-1 rounded text-[10px]">🔔</button>
                    <button onclick="renovarYNotificar('${p.id}', '${p.nombre_cliente}', '${p.whatsapp}', '${p.fecha_vencimiento}', ${p.precio_venta}, '${p.cuentas_madre?.email_cuenta}')" class="bg-blue-600 px-2 py-1 rounded text-[10px]">🔄</button>
                    <button onclick="borrarPerfil('${p.id}')" class="bg-red-800 px-2 py-1 rounded text-[10px]">✕</button>
                </td>
            </tr>
        `;
    });

    document.getElementById('stat_activos').innerText = activos;
    document.getElementById('stat_vencidos').innerText = vencidos;
    document.getElementById('stat_proximos').innerText = proximos;
    
    let total = flujo?.reduce((acc, m) => m.tipo === 'ingreso' ? acc + m.monto : acc - m.monto, 0) || 0;
    balanceMonto.innerText = `$${total.toFixed(2)}`;
    document.getElementById('stat_ganancia').innerText = `$${total.toFixed(2)}`;
}

// BUSCADOR
function filtrarTabla() {
    const b = document.getElementById('buscador').value.toLowerCase();
    const filas = tablaPerfiles.getElementsByTagName('tr');
    for (let f of filas) f.style.display = f.innerText.toLowerCase().includes(b) ? '' : 'none';
}

// ELIMINAR
async function borrarPerfil(id) {
    if(confirm("¿Eliminar cliente?")) {
        await _supabase.from('perfiles_clientes').delete().eq('id', id);
        renderizarTodo();
    }
}

async function init() {
    const { data } = await _supabase.from('cuentas_madre').select('id, email_cuenta, plataforma');
    selectMadres.innerHTML = '<option value="">Seleccionar Cuenta</option>';
    data?.forEach(m => selectMadres.innerHTML += `<option value="${m.id}">${m.plataforma} (${m.email_cuenta})</option>`);
    renderizarTodo();
}

init();
