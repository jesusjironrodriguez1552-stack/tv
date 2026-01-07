// app.js - EL CEREBRO COORDINADOR

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configura el sistema de pestañas
    configurarTabs();
    
    // 2. Manda a cargar todos los módulos
    renderizarTodo();

    // 3. Escucha el formulario de ventas (Clientes)
    // Nota: Esta parte la moveremos a clientes.js en el siguiente paso
    configurarFormularioVentas();
});

// --- FUNCIÓN MAESTRA DE ACTUALIZACIÓN ---
async function renderizarTodo() {
    console.log("Cerebro: Iniciando actualización global...");

    // Llamamos al especialista de Madres (definido en madres.js)
    if (typeof renderizarMadres === 'function') {
        await renderizarMadres();
    }

    // Llamamos al especialista de Clientes (que por ahora vive aquí abajo)
    await renderizarTablaClientes();

    // Actualizamos los selectores (dropdowns) de las cuentas
    actualizarSelectoresGlobales();
    
    // Actualizamos el balance de dinero
    actualizarBalanceDinero();
}

// --- GESTIÓN DE CLIENTES (Aún en el cerebro, por ahora) ---
async function renderizarTablaClientes() {
    const { data: perfiles } = await _supabase
        .from('perfiles_clientes')
        .select('*, cuentas_madre(*)');

    const tabla = document.getElementById('tablaPerfiles');
    if (!tabla) return;
    tabla.innerHTML = '';

    perfiles?.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-800 hover:bg-gray-800/30 transition";
        tr.innerHTML = `
            <td class="p-4 text-xs font-bold uppercase text-white">${p.nombre_cliente}</td>
            <td class="p-4 text-[10px] text-blue-400 uppercase font-black">
                ${p.cuentas_madre?.plataforma || 'SIN CUENTA'}
            </td>
            <td class="p-4 text-center font-mono text-xs text-green-500">${p.fecha_vencimiento}</td>
            <td class="p-4 text-right">
                <button onclick="borrarP('${p.id}')" class="text-red-500 hover:scale-110 transition">✕</button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

// --- UTILIDADES COMPARTIDAS ---

function configurarTabs() {
    window.cambiarSeccion = (id) => {
        document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
        document.getElementById(id)?.classList.remove('hidden');
    };
}

async function actualizarSelectoresGlobales() {
    const { data } = await _supabase.from('cuentas_madre').select('id, plataforma, email_cuenta');
    const selectVenta = document.getElementById('cuenta_madre_id');
    const selectMigrar = document.getElementById('migrar_nueva_madre');
    
    const opciones = data?.map(m => `<option value="${m.id}">${m.plataforma} (${m.email_cuenta})</option>`).join('');
    if (selectVenta) selectVenta.innerHTML = `<option value="">Seleccionar...</option>${opciones}`;
    if (selectMigrar) selectMigrar.innerHTML = opciones;
}

async function actualizarBalanceDinero() {
    const { data } = await _supabase.from('flujo_caja').select('monto, tipo');
    const total = data?.reduce((acc, f) => f.tipo === 'ingreso' ? acc + f.monto : acc - f.monto, 0) || 0;
    const el = document.getElementById('balance_monto');
    if (el) el.innerText = `$${total.toFixed(2)}`;
}

// Funciones Globales (Para que los botones onclick del HTML funcionen)
window.borrarP = async (id) => {
    if(confirm("¿Eliminar cliente?")) {
        await _supabase.from('perfiles_clientes').delete().eq('id', id);
        renderizarTodo();
    }
};

function configurarFormularioVentas() {
    document.getElementById('perfilForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Lógica de guardado...
        // Al final:
        renderizarTodo(); 
    });
}
