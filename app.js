// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'TU_URL_AQUÍ';
const SUPABASE_KEY = 'TU_KEY_AQUÍ';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const selectMadres = document.getElementById('cuenta_madre_id');
const tablaPerfiles = document.getElementById('tablaPerfiles');
const balanceMonto = document.getElementById('balance_monto');

// --- 1. REGISTRAR CUENTA MADRE Y GASTO ---
document.getElementById('madreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const gasto = parseFloat(document.getElementById('m_gasto').value);
    const plataforma = document.getElementById('m_plataforma').value;
    const email = document.getElementById('m_email').value;
    
    const { error: e1 } = await _supabase.from('cuentas_madre').insert([{
        plataforma: plataforma,
        email_cuenta: email,
        fecha_vencimiento: document.getElementById('m_vencimiento').value,
        costo_compra: gasto
    }]);

    // Registro de EGRESO en caja
    await _supabase.from('flujo_caja').insert([{ 
        tipo: 'egreso', 
        monto: gasto, 
        descripcion: `Compra Cuenta: ${plataforma} (${email})` 
    }]);

    if (!e1) { alert("Cuenta y Gasto registrados!"); e.target.reset(); init(); }
});

// --- 2. REGISTRAR VENTA ---
document.getElementById('perfilForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const precio = parseFloat(document.getElementById('monto').value);
    const nombre = document.getElementById('nombre_cliente').value;

    const { error: e1 } = await _supabase.from('perfiles_clientes').insert([{
        nombre_cliente: nombre,
        whatsapp: document.getElementById('whatsapp').value,
        cuenta_madre_id: selectMadres.value,
        fecha_vencimiento: document.getElementById('vencimiento_cliente').value,
        precio_venta: precio,
        estado: 'activo'
    }]);

    // Registro de INGRESO en caja
    await _supabase.from('flujo_caja').insert([{ 
        tipo: 'ingreso', 
        monto: precio, 
        descripcion: `Venta perfil a: ${nombre}` 
    }]);

    if (!e1) { alert("Venta registrada con éxito"); e.target.reset(); renderizarTodo(); }
});

// --- 3. FUNCIÓN RENOVAR +30 DÍAS + WHATSAPP ---
async function renovarYNotificar(id, nombre, whatsapp, fechaActual, monto, emailCuenta) {
    let fecha = new Date(fechaActual);
    fecha.setDate(fecha.getDate() + 30);
    const nuevaFecha = fecha.toISOString().split('T')[0];

    if(confirm(`¿Renovar 30 días a ${nombre}? Nueva fecha: ${nuevaFecha}`)) {
        // Update en base de datos
        await _supabase.from('perfiles_clientes').update({ fecha_vencimiento: nuevaFecha }).eq('id', id);
        
        // Registrar ingreso por renovación en caja
        await _supabase.from('flujo_caja').insert([{ 
            tipo: 'ingreso', 
            monto: monto, 
            descripcion: `Renovación: ${nombre}` 
        }]);

        // LINK DE WHATSAPP CON MENSAJE SOLICITADO
        const mensaje = `Hola ${nombre}, tu cuenta (${emailCuenta}) ha sido renovada. vence el ${nuevaFecha}. ¡Gracias por tu preferencia!`;
        const waLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`;
        
        window.open(waLink, '_blank');
        renderizarTodo();
    }
}

// --- 4. RENDERIZADO Y FILTROS ---
async function renderizarTodo() {
    const { data: perfiles } = await _supabase
        .from('perfiles_clientes')
        .select('*, cuentas_madre(email_cuenta, plataforma)')
        .order('fecha_vencimiento', { ascending: true });

    tablaPerfiles.innerHTML = '';
    perfiles?.forEach(p => {
        const hoy = new Date();
        const vence = new Date(p.fecha_vencimiento);
        const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        
        let colorFecha = "text-green-400";
        let filaBg = "";
        if (dif < 0) { colorFecha = "text-red-500 font-bold"; filaBg = "bg-red-900/10"; }
        else if (dif <= 3) { colorFecha = "text-yellow-500 font-bold"; filaBg = "bg-yellow-900/10"; }

        tablaPerfiles.innerHTML += `
            <tr class="${filaBg} border-b border-gray-700 hover:bg-gray-750 transition">
                <td class="p-4">
                    <div class="font-bold">${p.nombre_cliente}</div>
                    <div class="text-[10px] text-green-500 font-mono">${p.whatsapp || 'Sin WA'}</div>
                </td>
                <td class="p-4 text-center text-xs">
                    <span class="text-blue-300 font-semibold">${p.cuentas_madre?.plataforma}</span><br>
                    <span class="text-gray-500">${p.cuentas_madre?.email_cuenta}</span>
                </td>
                <td class="p-4 text-center ${colorFecha}">${p.fecha_vencimiento}</td>
                <td class="p-4 text-center font-mono text-green-300">$${p.precio_venta}</td>
                <td class="p-4 text-right space-x-2">
                    <button onclick="renovarYNotificar('${p.id}', '${p.nombre_cliente}', '${p.whatsapp}', '${p.fecha_vencimiento}', ${p.precio_venta}, '${p.cuentas_madre?.email_cuenta}')" class="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-xs transition">🔄 Renovar</button>
                    <button onclick="borrarPerfil('${p.id}')" class="bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-xs transition">✕</button>
                </td>
            </tr>
        `;
    });
    actualizarBalance();
}

function filtrarTabla() {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    const filas = tablaPerfiles.getElementsByTagName('tr');
    for (let fila of filas) {
        fila.style.display = fila.innerText.toLowerCase().includes(busqueda) ? '' : 'none';
    }
}

async function actualizarBalance() {
    const { data } = await _supabase.from('flujo_caja').select('tipo, monto');
    const total = data?.reduce((acc, m) => m.tipo === 'ingreso' ? acc + m.monto : acc - m.monto, 0) || 0;
    balanceMonto.innerText = `$${total.toFixed(2)}`;
}

async function actualizarSelectMadres() {
    const { data } = await _supabase.from('cuentas_madre').select('id, email_cuenta, plataforma');
    selectMadres.innerHTML = '<option value="">Seleccionar Cuenta Madre</option>';
    data?.forEach(m => {
        selectMadres.innerHTML += `<option value="${m.id}">${m.plataforma} (${m.email_cuenta})</option>`;
    });
}

async function borrarPerfil(id) {
    if(confirm("¿Eliminar este perfil?")) {
        await _supabase.from('perfiles_clientes').delete().eq('id', id);
        renderizarTodo();
    }
}

function init() { actualizarSelectMadres(); renderizarTodo(); }
init();
