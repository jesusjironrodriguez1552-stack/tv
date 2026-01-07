// app.js - EL COORDINADOR CENTRAL CVSE V6.5
// Este archivo gestiona la navegación y coordina todas las secciones del sistema

console.log('🚀 CVSE V6.5 - Sistema iniciando...');

// ============================================
// INICIALIZACIÓN DEL SISTEMA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM completamente cargado');
    
    // 1. Configurar sistema de pestañas
    configurarTabs();
    
    // 2. Cargar datos iniciales de todas las secciones
    renderizarTodo();
});

// ============================================
// FUNCIÓN MAESTRA DE ACTUALIZACIÓN GLOBAL
// ============================================
async function renderizarTodo() {
    console.log("🧠 Cerebro: Iniciando actualización global...");
    
    try {
        // Renderizar Cuentas Madre
        if (typeof renderizarMadres === 'function') {
            console.log('📂 Renderizando cuentas madre...');
            await renderizarMadres();
        } else {
            console.warn('⚠️ renderizarMadres() no está definida');
        }
        
        // Renderizar Clientes
        if (typeof renderizarClientes === 'function') {
            console.log('👥 Renderizando clientes...');
            await renderizarClientes();
        } else {
            console.warn('⚠️ renderizarClientes() no está definida');
        }
        
        // Renderizar Balance/Caja (también actualiza el header)
        if (typeof renderizarCaja === 'function') {
            console.log('💰 Renderizando balance de caja...');
            await renderizarCaja();
        } else {
            console.warn('⚠️ renderizarCaja() no está definida');
        }
        
        // Actualizar selectores de los formularios
        actualizarSelectoresGlobales();
        
        console.log("✅ Actualización global completada exitosamente");
    } catch (error) {
        console.error("❌ Error en la actualización global:", error);
    }
}

// ============================================
// GESTIÓN DE NAVEGACIÓN (TABS)
// ============================================
function configurarTabs() {
    // Crear función global para cambiar entre secciones
    window.cambiarSeccion = async (id) => {
        console.log(`🔄 Cambiando a sección: ${id}`);
        
        // 1. Ocultar todas las secciones
        document.querySelectorAll('.seccion-contenido').forEach(seccion => {
            seccion.classList.add('hidden');
        });
        
        // 2. Mostrar la sección seleccionada
        const seccionActiva = document.getElementById(id);
        if (seccionActiva) {
            seccionActiva.classList.remove('hidden');
            console.log(`✅ Sección ${id} visible`);
        } else {
            console.error(`❌ No se encontró la sección: ${id}`);
            return;
        }
        
        // 3. Actualizar estilos de los botones de navegación
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('text-blue-400', 'border-b-2', 'border-blue-400');
            btn.classList.add('text-gray-500');
        });
        
        // 4. Aplicar estilo activo al botón correspondiente
        const btnActivo = document.querySelector(`button[onclick="cambiarSeccion('${id}')"]`);
        if (btnActivo) {
            btnActivo.classList.add('text-blue-400', 'border-b-2', 'border-blue-400');
            btnActivo.classList.remove('text-gray-500');
        }
        
        // 5. 🎯 RENDERIZADO INTELIGENTE POR SECCIÓN
        // Cada vez que cambias de pestaña, se re-renderiza esa sección específica
        // Esto asegura que los datos siempre estén frescos
        
        if (id === 'seccion-caja') {
            console.log('💰 Ejecutando renderizado de Balance Mensual...');
            if (typeof renderizarCaja === 'function') {
                await renderizarCaja();
                console.log('✅ Balance renderizado');
            } else {
                console.error('❌ renderizarCaja() no está disponible');
            }
        } 
        else if (id === 'seccion-madres') {
            console.log('🖥️ Ejecutando renderizado de Cuentas Madre...');
            if (typeof renderizarMadres === 'function') {
                await renderizarMadres();
                console.log('✅ Cuentas madre renderizadas');
            } else {
                console.error('❌ renderizarMadres() no está disponible');
            }
        } 
        else if (id === 'seccion-clientes') {
            console.log('👥 Ejecutando renderizado de Clientes...');
            if (typeof renderizarClientes === 'function') {
                await renderizarClientes();
                console.log('✅ Clientes renderizados');
            } else {
                console.error('❌ renderizarClientes() no está disponible');
            }
        }
    };
    
    console.log('✅ Sistema de tabs configurado');
}

// ============================================
// BUSCADOR DE CLIENTES
// ============================================
window.filtrarTabla = () => {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    const filas = document.querySelectorAll('#tablaPerfiles tr');
    
    let resultados = 0;
    filas.forEach(fila => {
        const texto = fila.innerText.toLowerCase();
        if (texto.includes(busqueda)) {
            fila.style.display = '';
            resultados++;
        } else {
            fila.style.display = 'none';
        }
    });
    
    console.log(`🔍 Búsqueda: "${busqueda}" - ${resultados} resultados`);
};

// ============================================
// ACTUALIZACIÓN DE SELECTORES GLOBALES
// ============================================
async function actualizarSelectoresGlobales() {
    console.log('🔄 Actualizando selectores de cuentas madre...');
    
    // Obtener todas las cuentas madre
    const { data, error } = await _supabase
        .from('cuentas_madre')
        .select('id, plataforma, email_cuenta');
    
    if (error) {
        console.error("❌ Error al cargar selectores:", error);
        return;
    }
    
    // Referencias a los selectores
    const sVenta = document.getElementById('cuenta_madre_id');
    const sMigrar = document.getElementById('migrar_nueva_madre');
    
    if (data && data.length > 0) {
        // Generar opciones HTML
        const opciones = data.map(m => `
            <option value="${m.id}">${m.plataforma.toUpperCase()} - ${m.email_cuenta}</option>
        `).join('');
        
        // Actualizar selector del formulario de ventas
        if (sVenta) {
            sVenta.innerHTML = `<option value="">Seleccionar Cuenta...</option>${opciones}`;
        }
        
        // Actualizar selector del modal de migración
        if (sMigrar) {
            sMigrar.innerHTML = opciones;
        }
        
        console.log(`✅ Selectores actualizados con ${data.length} cuentas`);
    } else {
        console.warn('⚠️ No hay cuentas madre registradas');
    }
}

// ============================================
// GESTIÓN DEL MODAL DE MIGRACIÓN
// ============================================

// Cerrar modal
window.cerrarModal = () => {
    console.log('🔒 Cerrando modal de migración');
    document.getElementById('modalMigrar').classList.add('hidden');
};

// Confirmar migración de cliente a otra cuenta
window.confirmarMigracion = async () => {
    const idPerfil = document.getElementById('migrar_perfil_id').value;
    const nuevaMadreId = document.getElementById('migrar_nueva_madre').value;
    
    // Validación
    if (!nuevaMadreId) {
        alert("⚠️ Debes seleccionar una cuenta destino");
        console.warn('⚠️ Intento de migración sin cuenta destino');
        return;
    }
    
    console.log(`🔄 Migrando perfil ${idPerfil} a cuenta ${nuevaMadreId}...`);
    
    // Actualizar en Supabase
    const { error } = await _supabase
        .from('perfiles_clientes')
        .update({ cuenta_madre_id: nuevaMadreId })
        .eq('id', idPerfil);
    
    if (!error) {
        console.log('✅ Migración exitosa');
        window.cerrarModal();
        
        // Actualizar toda la interfaz
        await renderizarTodo();
        
        alert('✅ Cliente migrado exitosamente');
    } else {
        console.error('❌ Error en migración:', error);
        alert("❌ Error al migrar el perfil");
    }
};

// ============================================
// LOGS DE DEPURACIÓN
// ============================================
console.log('📋 Funciones globales disponibles:');
console.log('  - cambiarSeccion(id)');
console.log('  - filtrarTabla()');
console.log('  - cerrarModal()');
console.log('  - confirmarMigracion()');
console.log('  - renderizarTodo()');
console.log('🎯 Sistema CVSE listo para usar');
