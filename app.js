// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://mdetlqvfdgtfatufdkht.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TV9x9pfZw_vYR3-lF7NCIQ_ybSLs5Fh';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Referencias DOM
const madreForm = document.getElementById('madreForm');
const perfilForm = document.getElementById('perfilForm');
const tablaPerfiles = document.getElementById('tablaPerfiles');
const selectMadres = document.getElementById('cuenta_madre_id');
const balanceMonto = document.getElementById('balance_monto');

// --- 1. GESTIÓN DE CUENTAS MADRE ---
madreForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        plataforma: document.getElementById('m_plataforma').value,
        email_cuenta: document.getElementById('m_email').value,
        fecha_vencimiento: document.getElementById('m_vencimiento').value
    };

    const { error } = await _supabase.from('cuentas_madre').insert([data]);
    if (error) alert("Error: " + error.message);
    else {
        alert("Cuenta Madre registrada exitosamente");
        madreForm.reset();
        actualizarSelectMadres();
    }
});

// Actualiza el menú desplegable de cuentas
async function actualizarSelectMadres() {
    const { data: madres } = await _supabase.from('cuentas_madre').select('id, email_cuenta, plataforma');
    selectMadres.innerHTML = '<option value="">Seleccione Cuenta Madre</option>';
    madres?.forEach(m => {
        selectMadres.innerHTML += `<option value="${m.id}">${m.plataforma} (${m.email_cuenta})</option>`;
    });
}

// --- 2. GESTIÓN DE VENTAS Y PERFILES ---
perfilForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const precio = parseFloat(document.getElementById('monto').value);
    const nombre = document.getElementById('nombre_cliente').value;

    const perfilData = {
        nombre_cliente: nombre,
        whatsapp: document.getElementById('whatsapp')?.value || '',
        cuenta_madre_id: selectMadres.value,
        fecha_vencimiento: document.getElementById('vencimiento_cliente').value,
        precio_venta: precio
    };

    // Insertar perfil
    const { error: pError } = await _supabase.from('perfiles_clientes').insert([perfilData]);
    
    // Registrar en caja
    const { error: cError } = await _supabase.from('flujo_caja').insert([
        { tipo: 'ingreso', monto: precio, descripcion: `Venta perfil: ${nombre}` }
    ]);

    if (pError || cError) alert("Error al procesar");
    else {
        alert("Venta guardada!");
        perfilForm.reset();
        renderizarTodo();
    }
});

// --- 3. RENDERIZADO Y ALERTAS ---
async function renderizarTodo() {
    const { data: perfiles } = await _supabase
        .from('perfiles_clientes')
        .select('*, cuentas_madre(email_cuenta, plataforma)')
        .order('fecha_vencimiento', { ascending: true });

    tablaPerfiles.innerHTML = '';
    const hoy = new Date();

    perfiles?.forEach(p => {
        const vence = new Date(p.fecha_vencimiento);
        const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        
        // Estilo según urgencia
        let filaClase = "";
        let fechaClase = "text-green-400";
        if (dif < 0) { filaClase = "bg-red-900/20"; fechaClase = "text-red-500 font-bold"; }
        else if (dif <= 3) { filaClase = "bg-yellow-900/20"; fechaClase = "text-yellow-500"; }

        tablaPerfiles.innerHTML += `
            <tr class="${filaClase} border-b border-gray-700">
                <td class="p-3 font-medium">${p.nombre_cliente}</td>
                <td class="p-3 text-center text-xs text-gray-400">
                    ${p.cuentas_madre?.plataforma}<br>${p.cuentas_madre?.email_cuenta}
                </td>
                <td class="p-3 text-center ${fechaClase}">${p.fecha_vencimiento}</td>
                <td class="p-3 text-center text-green-300 font-mono">$${p.precio_venta}</td>
                <td class="p-3 text-right">
                    <button onclick="borrarPerfil('${p.id}')" class="bg-gray-700 hover:bg-red-600 p-1 rounded transition">✕</button>
                </td>
            </tr>
        `;
    });
    actualizarCaja();
}

async function actualizarCaja() {
    const { data } = await _supabase.from('flujo_caja').select('tipo, monto');
    let total = data?.reduce((acc, mov) => mov.tipo === 'ingreso' ? acc + mov.monto : acc - mov.monto, 0) || 0;
    balanceMonto.innerText = `$${total.toFixed(2)}`;
}

async function borrarPerfil(id) {
    if(confirm("¿Eliminar este registro?")) {
        await _supabase.from('perfiles_clientes').delete().eq('id', id);
        renderizarTodo();
    }
}

// Inicialización
actualizarSelectMadres();
renderizarTodo();
