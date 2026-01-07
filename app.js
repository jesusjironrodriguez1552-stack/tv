// app.js - EL CEREBRO COORDINADOR

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configurar elementos visuales que no cambian (pestañas)
    configurarTabs();
    
    // 2. Mandar a cargar todos los datos por primera vez
    renderizarTodo();
});

// --- ESTA ES LA FUNCIÓN QUE "LLAMA" A LOS DEMÁS ---
async function renderizarTodo() {
    console.log("Cerebro: Actualizando módulos...");

    // Llamada a madres.js
    if (typeof renderizarMadres === 'function') {
        await renderizarMadres();
    }

    // Llamada a clientes.js
    if (typeof renderizarClientes === 'function') {
        await renderizarClientes();
    }

    // Llamada a caja.js
    if (typeof renderizarCaja === 'function') {
        await renderizarCaja();
    }

    // Actualizar elementos comunes
    actualizarSelectoresGlobales();
}

// --- FUNCIONES COMPARTIDAS (El cerebro las maneja) ---

function configurarTabs() {
    window.cambiarSeccion = (id) => {
        // Ocultar todas
        document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
        // Mostrar la elegida
        document.getElementById(id)?.classList.remove('hidden');
        
        // Estilo visual de los botones
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('text-blue-400', 'border-b-2', 'border-blue-400');
            btn.classList.add('text-gray-500');
        });
        const btnActivo = document.querySelector(`button[onclick="cambiarSeccion('${id}')"]`);
        if(btnActivo) {
            btnActivo.classList.add('text-blue-400', 'border-b-2', 'border-blue-400');
            btnActivo.classList.remove('text-gray-500');
        }
    };
}

async function actualizarSelectoresGlobales() {
    const { data } = await _supabase.from('cuentas_madre').select('id, plataforma, email_cuenta');
    const sVenta = document.getElementById('cuenta_madre_id');
    const sMigrar = document.getElementById('migrar_nueva_madre');
    
    if (data) {
        const opciones = data.map(m => `<option value="${m.id}">${m.plataforma} (${m.email_cuenta})</option>`).join('');
        if (sVenta) sVenta.innerHTML = `<option value="">Seleccionar Cuenta...</option>${opciones}`;
        if (sMigrar) sMigrar.innerHTML = opciones;
    }
}

// Utilidades del Modal (Viven aquí porque afectan a la interfaz general)
window.cerrarModal = () => document.getElementById('modalMigrar').classList.add('hidden');

window.confirmarMigracion = async () => {
    const id = document.getElementById('migrar_perfil_id').value;
    const nuevaMadre = document.getElementById('migrar_nueva_madre').value;
    await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: nuevaMadre }).eq('id', id);
    window.cerrarModal();
    renderizarTodo(); // El cerebro ordena refrescar todo tras el cambio
};

window.filtrarTabla = () => {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    document.querySelectorAll('#tablaPerfiles tr').forEach(f => {
        f.style.display = f.innerText.toLowerCase().includes(busqueda) ? '' : 'none';
    });
};
