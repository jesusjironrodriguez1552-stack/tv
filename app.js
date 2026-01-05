// 1. CONFIGURACIÓN DE SUPABASE (Reemplaza con tus datos reales)
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_KEY = 'tu-anon-key-aqui';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Elementos del DOM
const perfilForm = document.getElementById('perfilForm');
const tablaPerfiles = document.getElementById('tablaPerfiles');
const balanceDisplay = document.getElementById('balance');

// 2. FUNCIÓN PARA CARGAR LOS PERFILES Y VER SOBREVENTA
async function cargarDatos() {
    // Traemos perfiles y datos de la cuenta madre
    const { data: perfiles, error } = await _supabase
        .from('perfiles_clientes')
        .select(`
            *,
            cuentas_madre (email_cuenta, perfiles_oficiales)
        `)
        .order('fecha_vencimiento', { ascending: true });

    if (error) return console.error(error);

    tablaPerfiles.innerHTML = '';
    
    perfiles.forEach(perfil => {
        // Lógica de colores para vencimiento
        const hoy = new Date();
        const fechaVence = new Date(perfil.fecha_vencimiento);
        const diasRestantes = Math.ceil((fechaVence - hoy) / (1000 * 60 * 60 * 24));
        
        let colorClase = 'text-green-400';
        if (diasRestantes <= 0) colorClase = 'text-red-500 font-bold';
        else if (diasRestantes <= 3) colorClase = 'text-yellow-500';

        tablaPerfiles.innerHTML += `
            <tr class="border-b border-gray-700 hover:bg-gray-750 transition">
                <td class="p-3">${perfil.nombre_cliente}</td>
                <td class="p-3 text-sm text-gray-400">${perfil.cuentas_madre?.email_cuenta || 'Sin asignar'}</td>
                <td class="p-3 ${colorClase}">${perfil.fecha_vencimiento}</td>
                <td class="p-3">
                    <span class="px-2 py-1 rounded text-xs ${perfil.estado === 'activo' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}">
                        ${perfil.estado}
                    </span>
                </td>
                <td class="p-3 text-right">
                    <button onclick="eliminarPerfil('${perfil.id}')" class="text-red-400 hover:text-red-600">✕</button>
                </td>
            </tr>
        `;
    });
    actualizarBalance();
}

// 3. FUNCIÓN PARA GUARDAR VENTA Y REGISTRAR EN CAJA
perfilForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        nombre_cliente: document.getElementById('nombre_cliente').value,
        whatsapp: document.getElementById('whatsapp').value,
        cuenta_madre_id: document.getElementById('cuenta_madre_id').value,
        fecha_vencimiento: document.getElementById('vencimiento_cliente').value,
        precio_venta: parseFloat(document.getElementById('monto').value)
    };

    // Paso A: Insertar el Perfil
    const { data: nuevoPerfil, error: errPerfil } = await _supabase
        .from('perfiles_clientes')
        .insert([formData])
        .select();

    if (errPerfil) return alert("Error al guardar perfil: " + errPerfil.message);

    // Paso B: Registrar el Ingreso en la Caja
    const { error: errCaja } = await _supabase
        .from('flujo_caja')
        .insert([{
            tipo: 'ingreso',
            monto: formData.precio_venta,
            descripcion: `Venta perfil a: ${formData.nombre_cliente}`
        }]);

    if (!errCaja) {
        alert("Venta registrada y dinero sumado a caja");
        perfilForm.reset();
        cargarDatos();
    }
});

// 4. CALCULAR TOTAL DE DINERO (INGRESOS - EGRESOS)
async function actualizarBalance() {
    const { data: movimientos } = await _supabase.from('flujo_caja').select('tipo, monto');
    
    let total = 0;
    movimientos?.forEach(m => {
        if (m.tipo === 'ingreso') total += m.monto;
        if (m.tipo === 'egreso') total -= m.monto;
    });

    balanceDisplay.innerText = `Caja: $${total.toFixed(2)}`;
    balanceDisplay.className = total >= 0 ? 'text-green-400 font-mono text-lg' : 'text-red-400 font-mono text-lg';
}

// 5. ELIMINAR PERFIL
async function eliminarPerfil(id) {
    if (confirm('¿Eliminar este cliente?')) {
        await _supabase.from('perfiles_clientes').delete().eq('id', id);
        cargarDatos();
    }
}

// Iniciar app
cargarDatos();
