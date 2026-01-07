// madres.js - GESTIÓN ESPECIALIZADA DE CUENTAS MADRE (INVENTARIO)

console.log('🖥️ Módulo madres.js cargado');

// ============================================
// FUNCIÓN HELPER: OBTENER FECHA LOCAL
// ============================================
function obtenerFechaLocal() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

// ============================================
// FUNCIÓN PRINCIPAL DE RENDERIZADO
// ============================================
async function renderizarMadres() {
    console.log('🔄 Renderizando cuentas madre...');
    
    // 1. Obtener datos de Supabase usando los nombres reales de tus columnas
    const { data: madres, error } = await _supabase
        .from('cuentas_madre')
        .select('*')
        .order('fecha_vencimiento', { ascending: true });

    const { data: perfiles } = await _supabase
        .from('perfiles_clientes')
        .select('cuenta_madre_id');

    const grid = document.getElementById('gridMadresDetalle');
    if (!grid) {
        console.error('❌ No se encontró gridMadresDetalle');
        return;
    }
    
    if (error) {
        console.error("❌ Error al cargar madres:", error);
        grid.innerHTML = '<p class="text-red-500">Error al conectar con el inventario.</p>';
        return;
    }

    if (!madres || madres.length === 0) {
        grid.innerHTML = `
            <div class="col-span-2 p-8 text-center text-gray-400">
                📭 No hay cuentas madre registradas
                <p class="text-xs text-gray-500 mt-2">
                    Usa el formulario de la izquierda para agregar tu primera cuenta
                </p>
            </div>
        `;
        return;
    }

    console.log(`✅ ${madres.length} cuentas madre cargadas`);

    grid.innerHTML = '';

    madres.forEach(m => {
        // Cálculo de capacidad
        const ocupados = perfiles?.filter(p => p.cuenta_madre_id === m.id).length || 0;
        const limite = m.perfiles_totales || 5; // Usar el valor de la base de datos o 5 por defecto
        const disponibles = limite - ocupados;
        
        // Formatear fecha para alerta visual
        const hoy = new Date();
        const vence = new Date(m.fecha_vencimiento);
        const diasRestantes = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));

        grid.innerHTML += `
            <div class="bg-gray-800/50 border ${diasRestantes <= 5 ? 'border-red-500/50' : 'border-gray-700'} rounded-[2rem] p-6 shadow-xl relative overflow-hidden transition hover:bg-gray-800">
                
                <div class="absolute top-0 right-0 px-4 py-1 ${diasRestantes <= 5 ? 'bg-red-600' : 'bg-blue-600'} text-[9px] font-black uppercase rounded-bl-xl text-white">
                    ${diasRestantes <= 0 ? 'Vencida' : 'Vence en ' + diasRestantes + 'd'}
                </div>

                <h4 class="text-2xl font-black text-yellow-500 mb-4 uppercase italic tracking-tighter">${m.plataforma}</h4>
                
                <div class="space-y-2 mb-6">
                    <div class="flex items-center justify-between bg-black/30 p-2 rounded-lg border border-gray-700/50 group">
                        <div class="truncate">
                            <p class="text-[8px] text-gray-500 font-bold uppercase">Correo</p>
                            <p class="text-xs font-mono text-gray-300 truncate">${m.email_cuenta}</p>
                        </div>
                        <button onclick="copiarTexto('${m.email_cuenta}', 'Correo')" class="p-2 hover:text-blue-400 transition">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                        </button>
                    </div>

                    <div class="flex items-center justify-between bg-black/30 p-2 rounded-lg border border-gray-700/50 group">
                        <div class="truncate">
                            <p class="text-[8px] text-gray-500 font-bold uppercase">Contraseña</p>
                            <p class="text-xs font-mono text-blue-400 font-bold tracking-widest">${m.password_cuenta}</p>
                        </div>
                        <button onclick="copiarTexto('${m.password_cuenta}', 'Contraseña')" class="p-2 hover:text-blue-400 transition">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                        </button>
                    </div>
                </div>

                <div class="bg-gray-900/50 p-3 rounded-xl mb-4 border border-gray-700/50">
                    <p class="text-[9px] text-gray-500 uppercase font-black mb-2">Capacidad de perfiles</p>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] text-gray-400">${ocupados} ocupados de ${limite} totales</span>
                        <span class="text-xs font-bold ${disponibles > 0 ? 'text-green-400' : 'text-red-400'}">
                            ${disponibles} libres
                        </span>
                    </div>
                    <div class="flex gap-1">
                        ${Array.from({ length: limite }, (_, i) => `
                            <div class="flex-1 h-2 rounded-full ${i < ocupados ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500/20'}"></div>
                        `).join('')}
                    </div>
                </div>

                <div class="text-right mb-4">
                    <p class="text-[8px] text-gray-500 uppercase font-black">Inversión</p>
                    <p class="text-xl font-black font-mono text-yellow-400">$${parseFloat(m.costo_compra || 0).toFixed(2)}</p>
                </div>

                <button onclick="eliminarMadre('${m.id}', '${m.plataforma}')" class="w-full py-2 bg-red-900/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white text-[10px] font-black uppercase rounded-xl transition-all duration-300">
                    🗑️ Eliminar Cuenta
                </button>
            </div>
        `;
    });

    console.log('✅ Cuentas madre renderizadas');
}

// ============================================
// UTILIDADES ESPECÍFICAS
// ============================================

// Copiar texto al portapapeles
window.copiarTexto = (texto, tipo) => {
    navigator.clipboard.writeText(texto).then(() => {
        console.log(`✅ ${tipo} copiado: ${texto}`);
        // Opcional: mostrar toast o notificación
        alert(`✅ ${tipo} copiado al portapapeles`);
    }).catch(err => {
        console.error('❌ Error al copiar:', err);
        alert('❌ No se pudo copiar. Intenta manualmente.');
    });
};

// Eliminar cuenta madre
window.eliminarMadre = async (id, nombre) => {
    const confirmacion = confirm(
        `⚠️ ¿Estás seguro de eliminar la cuenta de ${nombre}?\n\n` +
        `Esta acción:\n` +
        `• Eliminará la cuenta madre\n` +
        `• Los clientes asignados quedarán sin cuenta\n` +
        `• NO se puede deshacer\n\n` +
        `¿Continuar?`
    );
    
    if (!confirmacion) {
        console.log('❌ Eliminación cancelada');
        return;
    }

    try {
        console.log(`🗑️ Eliminando cuenta madre: ${nombre} (${id})`);
        
        const { error } = await _supabase
            .from('cuentas_madre')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('❌ Error al eliminar:', error);
            alert('❌ Error al eliminar la cuenta');
            return;
        }

        console.log('✅ Cuenta eliminada');
        alert(`✅ Cuenta de ${nombre} eliminada correctamente`);
        
        // Actualizar interfaz
        if (typeof renderizarTodo === 'function') {
            await renderizarTodo();
        }
        
    } catch (err) {
        console.error('❌ Error inesperado:', err);
        alert('❌ Error al eliminar la cuenta');
    }
};

// ============================================
// FORMULARIO DE NUEVA CUENTA MADRE
// ============================================
const formMadre = document.getElementById('madreForm');
if (formMadre) {
    formMadre.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📝 Procesando nueva cuenta madre...');
        
        const plataforma = document.getElementById('m_plataforma').value.trim();
        const email = document.getElementById('m_email').value.trim();
        const password = document.getElementById('m_password').value.trim();
        const vencimiento = document.getElementById('m_vencimiento').value;
        const costo = parseFloat(document.getElementById('m_costo').value);
        const perfilesTotales = parseInt(document.getElementById('m_perfiles_totales').value) || 5;

        // Validaciones
        if (!plataforma || !email || !password || !vencimiento || !costo) {
            alert('⚠️ Por favor completa todos los campos');
            return;
        }

        if (costo <= 0) {
            alert('⚠️ El costo debe ser mayor a 0');
            return;
        }

        if (perfilesTotales <= 0 || perfilesTotales > 20) {
            alert('⚠️ El número de perfiles debe estar entre 1 y 20');
            return;
        }

        try {
            // 1. Registrar la cuenta madre
            const { data: nuevaMadre, error: errorMadre } = await _supabase
                .from('cuentas_madre')
                .insert([{
                    plataforma: plataforma.toUpperCase(),
                    email_cuenta: email,
                    password_cuenta: password,
                    fecha_vencimiento: vencimiento,
                    costo_compra: costo,
                    perfiles_totales: perfilesTotales
                }])
                .select();

            if (errorMadre) {
                console.error('❌ Error al guardar cuenta:', errorMadre);
                alert(`❌ Error al registrar cuenta: ${errorMadre.message}`);
                return;
            }

            console.log('✅ Cuenta madre registrada:', nuevaMadre);

            // 2. Registrar el gasto automáticamente en flujo de caja
            const { error: errorCaja } = await _supabase
                .from('flujo_caja')
                .insert([{
                    tipo: 'egreso',
                    monto: costo,
                    descripcion: `Compra Madre: ${plataforma.toUpperCase()}`,
                    fecha: obtenerFechaLocal() // Usar fecha local correcta
                }]);

            if (errorCaja) {
                console.warn('⚠️ Cuenta guardada pero error en caja:', errorCaja);
            }

            // 3. Limpiar formulario
            e.target.reset();
            
            alert(
                `✅ ¡Cuenta madre registrada!\n\n` +
                `Plataforma: ${plataforma.toUpperCase()}\n` +
                `Costo: $${costo.toFixed(2)}\n` +
                `Perfiles disponibles: ${perfilesTotales}\n\n` +
                `El gasto se registró automáticamente en Balance Mensual`
            );

            console.log('✅ Cuenta madre completada');

            // 4. Actualizar interfaz
            if (typeof renderizarTodo === 'function') {
                await renderizarTodo();
            }

        } catch (err) {
            console.error('❌ Error inesperado:', err);
            alert('❌ Ocurrió un error inesperado. Revisa la consola.');
        }
    });
    
    console.log('✅ Formulario de cuenta madre configurado');
} else {
    console.warn('⚠️ No se encontró el formulario madreForm');
}

console.log('✅ Módulo madres.js inicializado correctamente');
