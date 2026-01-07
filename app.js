// app.js - EL COORDINADOR CENTRAL

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar sistema de pestañas
    configurarTabs();
    
    // 2. Carga inicial de datos
    renderizarTodo();
});

// --- FUNCIÓN MAESTRA DE ACTUALIZACIÓN ---
async function renderizarTodo() {
    console.log("Cerebro: Iniciando actualización global...");

    // Llamamos a los especialistas uno por uno con 'await' para esperar la respuesta de Supabase
    try {
        if (typeof renderizarMadres === 'function') {
            await renderizarMadres();
        }

        if (typeof renderizarClientes === 'function') {
            await renderizarClientes();
        }

        // Esta función en caja.js ahora también actualiza el balance del header
        if (typeof renderizarCaja === 'function') {
            await renderizarCaja();
        }

        // Actualiza los selectores de los formularios (dropdowns)
        actualizarSelectoresGlobales();

    } catch (error) {
        console.error("Error en la actualización global:", error);
    }
}

// --- GESTIÓN DE INTERFAZ (Tabs y Buscador) ---

function configurarTabs() {
    window.cambiarSeccion = (id) => {
        // Ocultar todas las secciones
        document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
        // Mostrar la seleccionada
        document.getElementById(id)?.classList.remove('hidden');

        // Actualizar estilo visual de los botones de navegación
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('text-blue-400', 'border-b-2', 'border-blue-400');
            btn.classList.add('text-gray-500');
        });

        // Aplicar estilo al botón activo (buscando por el ID de sección que activa)
        const btnActivo = document.querySelector(`button[onclick="cambiarSeccion('${id}')"]`);
        if (btnActivo) {
            btnActivo.classList.add('text-blue-400', 'border-b-2', 'border-blue-400');
            btnActivo.classList.remove('text-gray-500');
        }
    };
}

// Buscador de la tabla de clientes
window.filtrarTabla = () => {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    const filas = document.querySelectorAll('#tablaPerfiles tr');
    
    filas.forEach(fila => {
        const texto = fila.innerText.toLowerCase();
        fila.style.display = texto.includes(busqueda) ? '' : 'none';
    });
};

// --- UTILIDADES GLOBALES (Selectores y Modales) ---

async function actualizarSelectoresGlobales() {
    const { data, error } = await _supabase
        .from('cuentas_madre')
        .select('id, plataforma, email_cuenta');

    if (error) return console.error("Error al cargar selectores:", error);

    const sVenta = document.getElementById('cuenta_madre_id');
    const sMigrar = document.getElementById('migrar_nueva_madre');

    if (data) {
        const opciones = data.map(m => `
            <option value="${m.id}">${m.plataforma.toUpperCase()} - ${m.email_cuenta}</option>
        `).join('');

        if (sVenta) sVenta.innerHTML = `<option value="">Seleccionar Cuenta...</option>${opciones}`;
        if (sMigrar) sMigrar.innerHTML = opciones;
    }
}

// Lógica para cerrar el modal de migración
window.cerrarModal = () => {
    document.getElementById('modalMigrar').classList.add('hidden');
};

// Lógica para confirmar el cambio de cuenta de un cliente
window.confirmarMigracion = async () => {
    const idPerfil = document.getElementById('migrar_perfil_id').value;
    const nuevaMadreId = document.getElementById('migrar_nueva_madre').value;

    if (!nuevaMadreId) return alert("Selecciona una cuenta destino");

    const { error } = await _supabase
        .from('perfiles_clientes')
        .update({ cuenta_madre_id: nuevaMadreId })
        .eq('id', idPerfil);

    if (!error) {
        window.cerrarModal();
        renderizarTodo();
    } else {
        alert("Error al migrar perfil");
    }
};
