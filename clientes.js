// ============================================
// CLIENTES.JS - VERSIÓN COMPLETA Y CORREGIDA
// Sistema de gestión de clientes y ventas
// ============================================

console.log('⚙️ Módulo clientes.js cargado');

// ============================================
// CARGAR CUENTAS MADRE EN EL SELECT
// ============================================
async function cargarCuentasMadreSelect() {
    console.log('📂 Cargando cuentas madre en select...');
    
    const select = document.getElementById('cuenta_madre_id');
    if (!select) {
        console.error('❌ No se encontró el select cuenta_madre_id');
        return;
    }

    try {
        const { data: cuentas, error } = await _supabase
            .from('cuentas_madre')
            .select('*')
            .order('plataforma', { ascending: true });

        if (error) {
            console.error('❌ Error al cargar cuentas:', error);
            select.innerHTML = '<option value="">Error al cargar cuentas</option>';
            return;
        }

        if (!cuentas || cuentas.length === 0) {
            select.innerHTML = '<option value="">⚠️ No hay cuentas madre registradas</option>';
            console.warn('⚠️ No hay cuentas madre registradas');
            return;
        }

        select.innerHTML = '<option value="">📂 Seleccionar Cuenta Madre...</option>';
        
        cuentas.forEach(cuenta => {
            const option = document.createElement('option');
            option.value = cuenta.id;
            option.textContent = `${cuenta.plataforma} - ${cuenta.email_cuenta}`;
            select.appendChild(option);
        });

        console.log(`✅ ${cuentas.length} cuentas cargadas en el select`);

    } catch (err) {
        console.error('❌ Error inesperado:', err);
        select.innerHTML = '<option value="">Error al cargar</option>';
    }
}

// ============================================
// ESTABLECER FECHAS POR DEFECTO
// ============================================
function establecerFechasPorDefecto() {
    const hoy = new Date();
    const fechaHoyStr = hoy.toISOString().split('T')[0];
    
    // Fecha de venta = hoy
    const inputFechaVenta = document.getElementById('fecha_venta');
    if (inputFechaVenta && !inputFechaVenta.value) {
        inputFechaVenta.value = fechaHoyStr;
    }
    
    // Vencimiento = 30 días después
    const fechaVencimiento = new Date(hoy);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
    const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];
    
    const inputVencimiento = document.getElementById('vencimiento_cliente');
    if (inputVencimiento && !inputVencimiento.value) {
        inputVencimiento.value = fechaVencimientoStr;
    }
    
    console.log('📅 Fechas por defecto establecidas');
}

// ============================================
// EVENTO DEL FORMULARIO DE VENTA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM cargado, configurando formulario de ventas...');
    
    const form = document.getElementById('perfilForm');
    if (!form) {
        console.error('❌ No se encontró el formulario perfilForm');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📝 Formulario de venta enviado');
        
        // Obtener valores del formulario
        const nombreCliente = document.getElementById('nombre_cliente')?.value.trim();
        const whatsapp = document.getElementById('whatsapp')?.value.trim();
        const cuentaMadreId = document.getElementById('cuenta_madre_id')?.value;
        const perfilAsignado = document.getElementById('perfil_asignado')?.value.trim();
        const fechaVenta = document.getElementById('fecha_venta')?.value;
        const vencimiento = document.getElementById('vencimiento_cliente')?.value;
        const monto = parseFloat(document.getElementById('monto')?.value);

        console.log('📋 Datos capturados:', {
            nombreCliente,
            whatsapp: whatsapp || 'Sin WhatsApp',
            cuentaMadreId,
            perfilAsignado,
            fechaVenta,
            vencimiento,
            monto
        });

        // VALIDACIONES
        if (!nombreCliente) {
            alert('⚠️ El nombre del cliente es obligatorio');
            document.getElementById('nombre_cliente')?.focus();
            return;
        }

        if (!cuentaMadreId) {
            alert('⚠️ Debes seleccionar una cuenta madre');
            document.getElementById('cuenta_madre_id')?.focus();
            return;
        }

        if (!perfilAsignado) {
            alert('⚠️ El perfil asignado es obligatorio');
            document.getElementById('perfil_asignado')?.focus();
            return;
        }

        if (!fechaVenta || !vencimiento) {
            alert('⚠️ Las fechas son obligatorias');
            return;
        }

        if (!monto || monto <= 0 || isNaN(monto)) {
            alert('⚠️ El monto debe ser mayor a 0');
            document.getElementById('monto')?.focus();
            return;
        }

        // Confirmar venta
        const confirmar = confirm(
            `¿Confirmar registro de venta?\n\n` +
            `Cliente: ${nombreCliente}\n` +
            `Perfil: ${perfilAsignado}\n` +
            `Monto: $${monto.toFixed(2)}\n` +
            `Vence: ${new Date(vencimiento + 'T00:00:00').toLocaleDateString('es-PE')}`
        );

        if (!confirmar) {
            console.log('❌ Venta cancelada por el usuario');
            return;
        }

        try {
            console.log('💾 Iniciando guardado de venta...');

            // PASO 1: INSERTAR EN PERFILES_CLIENTES
            console.log('💾 Insertando en perfiles_clientes...');
            const { data: perfilNuevo, error: errorPerfil } = await _supabase
                .from('perfiles_clientes')
                .insert([{
                    cuenta_madre_id: cuentaMadreId,
                    nombre_cliente: nombreCliente,
                    whatsapp: whatsapp || null,
                    perfil_asignado: perfilAsignado,
                    precio_venta: monto,
                    fecha_vencimiento: vencimiento
                }])
                .select();

            if (errorPerfil) {
                console.error('❌ Error al insertar perfil:', errorPerfil);
                alert(`❌ Error al registrar venta:\n${errorPerfil.message}\n\nRevisa la consola para más detalles.`);
                return;
            }

            console.log('✅ Perfil insertado exitosamente:', perfilNuevo);

            // PASO 2: REGISTRAR EN FLUJO_CAJA
            console.log('💰 Registrando ingreso en flujo de caja...');
            const { data: ingreso, error: errorCaja } = await _supabase
                .from('flujo_caja')
                .insert([{
                    tipo: 'ingreso',
                    monto: monto,
                    descripcion: `Venta: ${nombreCliente}`,
                    fecha: fechaVenta
                }])
                .select();

            if (errorCaja) {
                console.error('⚠️ Error al registrar en caja:', errorCaja);
                alert(`⚠️ Venta guardada pero hubo un problema al registrar en caja:\n${errorCaja.message}`);
            } else {
                console.log('✅ Ingreso registrado en caja:', ingreso);
            }

            // PASO 3: LIMPIAR FORMULARIO
            console.log('🧹 Limpiando formulario...');
            form.reset();
            establecerFechasPorDefecto();

            // PASO 4: ACTUALIZAR VISTAS
            console.log('🔄 Actualizando vistas...');
            
            // Renderizar clientes
            if (typeof renderizarClientes === 'function') {
                await renderizarClientes();
            }
            
            // Actualizar balance si existe la función
            if (typeof actualizarBalance === 'function') {
                await actualizarBalance();
            }
            
            // Renderizar todo si existe
            if (typeof renderizarTodo === 'function') {
                await renderizarTodo();
            }

            // PASO 5: MOSTRAR CONFIRMACIÓN
            alert(
                `✅ ¡VENTA REGISTRADA EXITOSAMENTE!\n\n` +
                `Cliente: ${nombreCliente}\n` +
                `Perfil: ${perfilAsignado}\n` +
                `Monto: $${monto.toFixed(2)}\n` +
                `Vencimiento: ${new Date(vencimiento + 'T00:00:00').toLocaleDateString('es-PE')}\n\n` +
                `La venta ha sido registrada en el sistema y en caja.`
            );
            
            console.log('✅ ¡VENTA COMPLETADA EXITOSAMENTE!');

        } catch (error) {
            console.error('❌ Error crítico inesperado:', error);
            alert(
                `❌ Error crítico al procesar la venta.\n\n` +
                `Error: ${error.message}\n\n` +
                `Por favor, revisa la consola (F12) para más detalles.`
            );
        }
    });

    console.log('✅ Evento del formulario de ventas configurado correctamente');
});

// ============================================
// FUNCIÓN PRINCIPAL DE RENDERIZADO CON AGRUPACIÓN DE COMBOS
// ============================================
async function renderizarClientes() {
    console.log('🔄 Renderizando clientes...');
    
    const tabla = document.getElementById('tablaPerfiles');
    if (!tabla) {
        console.error('❌ No se encontró el elemento tablaPerfiles');
        return;
    }

    try {
        const { data: perfiles, error } = await _supabase
            .from('perfiles_clientes')
            .select('*, cuentas_madre(*)')
            .order('fecha_vencimiento', { ascending: true });

        if (error) {
            console.error("❌ Error al cargar clientes:", error);
            tabla.innerHTML = `
                <tr>
                    <td colspan="4" class="p-8 text-center text-red-400">
                        ❌ Error al cargar clientes: ${error.message}
                    </td>
                </tr>
            `;
            return;
        }

        if (!perfiles || perfiles.length === 0) {
            console.warn('⚠️ No hay clientes registrados');
            tabla.innerHTML = `
                <tr>
                    <td colspan="4" class="p-8 text-center text-gray-400">
                        📭 No hay clientes registrados aún
                        <p class="text-xs text-gray-500 mt-2">
                            Los clientes aparecerán aquí cuando registres tu primera venta
                        </p>
                    </td>
                </tr>
            `;
            return;
        }

        console.log(`✅ ${perfiles.length} perfiles cargados`);

        // AGRUPAR COMBOS POR COMBO_ID
        const grupos = {};
        const individuales = [];

        perfiles.forEach(p => {
            if (p.combo_id) {
                if (!grupos[p.combo_id]) {
                    grupos[p.combo_id] = [];
                }
                grupos[p.combo_id].push(p);
            } else {
                individuales.push(p);
            }
        });

        console.log(`📦 ${Object.keys(grupos).length} combos detectados`);
        console.log(`👤 ${individuales.length} ventas individuales`);

        tabla.innerHTML = '';

        // RENDERIZAR COMBOS
        Object.entries(grupos).forEach(([comboId, perfilesCombo]) => {
            const primerPerfil = perfilesCombo[0];
            const diasRestantes = calcularDiasRestantes(primerPerfil.fecha_vencimiento);
            const { estadoClase, estadoTexto, estadoBadge } = obtenerEstiloEstado(diasRestantes);

            const plataformasHTML = perfilesCombo.map(p => {
                const cuenta = p.cuentas_madre;
                return `
                    <div class="flex items-center gap-2 py-1">
                        <span class="text-blue-400 font-bold text-[10px]">${cuenta?.plataforma || '?'}</span>
                        <span class="text-gray-500 text-[9px]">•</span>
                        <span class="text-gray-400 text-[9px]">${p.perfil_asignado || 'Sin perfil'}</span>
                    </div>
                `;
            }).join('');

            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-800 transition hover:bg-gray-800/40 ${estadoClase}`;
            
            tr.innerHTML = `
                <td class="p-4">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[8px] font-black rounded uppercase">
                            🛒 COMBO
                        </span>
                        <p class="font-bold text-white uppercase text-xs">${primerPerfil.nombre_cliente}</p>
                    </div>
                    ${primerPerfil.whatsapp ? 
                        `<a href="https://wa.me/${primerPerfil.whatsapp.replace(/\D/g, '')}" target="_blank" 
                            class="text-[10px] text-green-500 font-mono hover:text-green-400 transition block mt-1">
                            📱 ${primerPerfil.whatsapp}
                        </a>` 
                        : '<span class="text-[10px] text-gray-500 block mt-1">Sin WhatsApp</span>'
                    }
                </td>
                <td class="p-4 text-[10px]">
                    <div class="space-y-1">
                        <p class="text-yellow-400 font-bold uppercase text-[10px] mb-2">
                            ${perfilesCombo.length} plataformas incluidas:
                        </p>
                        ${plataformasHTML}
                    </div>
                </td>
                <td class="p-4 text-center">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black ${estadoBadge}">
                        ${new Date(primerPerfil.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-PE')}
                    </span>
                    <p class="text-[8px] mt-1 ${estadoTexto} uppercase font-bold">
                        ${estadoTexto}
                    </p>
                    ${primerPerfil.precio_venta ? 
                        `<p class="text-[8px] mt-1 text-gray-600">Pagó: $${parseFloat(primerPerfil.precio_venta).toFixed(2)}</p>` 
                        : ''
                    }
                </td>
                <td class="p-4">
                    <div class="flex justify-end gap-2 flex-wrap">
                        ${primerPerfil.whatsapp ? 
                            `<button onclick="enviarRecordatorioCombo('${comboId}')" 
                                class="p-2 bg-green-600/20 hover:bg-green-600 text-white rounded-lg transition tooltip" 
                                title="Enviar recordatorio">
                                📲
                            </button>` 
                            : ''
                        }
                        <button onclick="renovarCombo('${comboId}')" 
                            class="p-2 bg-blue-600/20 hover:bg-blue-600 text-white rounded-lg transition tooltip" 
                            title="Renovar combo completo">
                            🔄
                        </button>
                        <button onclick="borrarCombo('${comboId}')" 
                            class="p-2 bg-red-600/20 hover:bg-red-600 text-white rounded-lg transition tooltip" 
                            title="Eliminar combo completo">
                            🗑️
                        </button>
                    </div>
                </td>
            `;
            tabla.appendChild(tr);
        });

        // RENDERIZAR VENTAS INDIVIDUALES
        individuales.forEach(p => {
            const diasRestantes = calcularDiasRestantes(p.fecha_vencimiento);
            const { estadoClase, estadoTexto, estadoBadge } = obtenerEstiloEstado(diasRestantes);
            const cuentaMadre = p.cuentas_madre;

            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-800 transition hover:bg-gray-800/40 ${estadoClase}`;
            
            tr.innerHTML = `
                <td class="p-4">
                    <p class="font-bold text-white uppercase text-xs">${p.nombre_cliente}</p>
                    ${p.whatsapp ? 
                        `<a href="https://wa.me/${p.whatsapp.replace(/\D/g, '')}" target="_blank" 
                            class="text-[10px] text-green-500 font-mono hover:text-green-400 transition">
                            📱 ${p.whatsapp}
                        </a>` 
                        : '<span class="text-[10px] text-gray-500">Sin WhatsApp</span>'
                    }
                </td>
                <td class="p-4 text-[10px]">
                    ${cuentaMadre ? 
                        `<div class="space-y-1">
                            <p class="text-blue-400 font-bold uppercase">${cuentaMadre.plataforma}</p>
                            <p class="text-gray-400">${cuentaMadre.email_cuenta}</p>
                            <p class="text-yellow-500 font-bold italic">PERFIL: ${p.perfil_asignado}</p>
                         </div>` 
                        : '<span class="text-red-500 font-bold animate-pulse uppercase">⚠️ CUENTA NO ASIGNADA</span>'
                    }
                </td>
                <td class="p-4 text-center">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black ${estadoBadge}">
                        ${new Date(p.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-PE')}
                    </span>
                    <p class="text-[8px] mt-1 ${estadoTexto} uppercase font-bold">
                        ${estadoTexto}
                    </p>
                    ${p.precio_venta ? 
                        `<p class="text-[8px] mt-1 text-gray-600">Pagó: $${parseFloat(p.precio_venta).toFixed(2)}</p>` 
                        : ''
                    }
                </td>
                <td class="p-4">
                    <div class="flex justify-end gap-2">
                        ${p.whatsapp ? 
                            `<button onclick="enviarRecordatorio('${p.nombre_cliente}', '${p.whatsapp}', '${cuentaMadre?.plataforma || 'tu servicio'}', ${diasRestantes})" 
                                class="p-2 bg-green-600/20 hover:bg-green-600 text-white rounded-lg transition tooltip" 
                                title="Enviar recordatorio de vencimiento">
                                📲
                            </button>
                            <button onclick="enviarDatosCuenta('${p.nombre_cliente}', '${p.whatsapp}', '${cuentaMadre?.plataforma || 'tu servicio'}', '${cuentaMadre?.email_cuenta || ''}', '${cuentaMadre?.password_cuenta || ''}', '${p.perfil_asignado}')" 
                                class="p-2 bg-cyan-600/20 hover:bg-cyan-600 text-white rounded-lg transition tooltip" 
                                title="Enviar datos de acceso">
                                🔑
                            </button>` 
                            : ''
                        }
                        <button onclick="abrirEdicion('${p.id}')" 
                            class="p-2 bg-yellow-600/20 hover:bg-yellow-600 text-white rounded-lg transition tooltip" 
                            title="Editar cliente">
                            ✏️
                        </button>
                        <button onclick="renovarCliente('${p.id}', '${p.nombre_cliente}')" 
                            class="p-2 bg-blue-600/20 hover:bg-blue-600 text-white rounded-lg transition tooltip" 
                            title="Renovar servicio">
                            🔄
                        </button>
                        <button onclick="abrirMigrar('${p.id}')" 
                            class="p-2 bg-purple-600/20 hover:bg-purple-600 text-white rounded-lg transition tooltip" 
                            title="Cambiar a otra cuenta">
                            ⇄
                        </button>
                        <button onclick="borrarCliente('${p.id}', '${p.nombre_cliente}')" 
                            class="p-2 bg-red-600/20 hover:bg-red-600 text-white rounded-lg transition tooltip" 
                            title="Eliminar cliente">
                            🗑️
                        </button>
                    </div>
                </td>
            `;
            tabla.appendChild(tr);
        });

        console.log('✅ Clientes renderizados correctamente');

    } catch (err) {
        console.error('❌ Error inesperado al renderizar:', err);
        tabla.innerHTML = `
            <tr>
                <td colspan="4" class="p-8 text-center text-red-400">
                    ❌ Error inesperado: ${err.message}
                </td>
            </tr>
        `;
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function calcularDiasRestantes(fechaVencimiento) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const [año, mes, dia] = fechaVencimiento.split('-').map(Number);
    const vencimiento = new Date(año, mes - 1, dia);
    vencimiento.setHours(0, 0, 0, 0);
    
    const diferencia = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
    return diferencia;
}

function obtenerEstiloEstado(diasRestantes) {
    let estadoClase = '';
    let estadoTexto = '';
    let estadoBadge = '';
    
    if (diasRestantes < 0) {
        estadoClase = 'bg-red-900/10 border-l-4 border-red-500';
        estadoTexto = 'text-red-400';
        estadoBadge = 'bg-red-600 text-white animate-pulse';
        estadoTexto = '⚠️ VENCIDO';
    } else if (diasRestantes === 0) {
        estadoClase = 'bg-red-900/10 border-l-4 border-red-500';
        estadoTexto = 'text-red-400';
        estadoBadge = 'bg-red-600 text-white animate-pulse';
        estadoTexto = '⚠️ VENCE HOY';
    } else if (diasRestantes <= 7) {
        estadoClase = 'bg-yellow-900/10 border-l-4 border-yellow-500';
        estadoTexto = 'text-yellow-400';
        estadoBadge = 'bg-yellow-600 text-black';
        estadoTexto = `⏰ ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`;
    } else {
        estadoClase = '';
        estadoTexto = 'text-green-400';
        estadoBadge = 'bg-gray-900 text-green-400 border border-green-900/50';
        estadoTexto = `✅ ${diasRestantes} días`;
    }
    
    return { estadoClase, estadoTexto, estadoBadge };
}

// ============================================
// FILTRO DE BÚSQUEDA
// ============================================
function filtrarTabla() {
    const buscador = document.getElementById('buscador');
    const filtro = buscador?.value.toUpperCase() || '';
    const tabla = document.getElementById('tablaPerfiles');
    const filas = tabla?.getElementsByTagName('tr') || [];

    for (let i = 0; i < filas.length; i++) {
        const textoFila = filas[i].textContent || filas[i].innerText;
        if (textoFila.toUpperCase().indexOf(filtro) > -1) {
            filas[i].style.display = '';
        } else {
            filas[i].style.display = 'none';
        }
    }
}

// ============================================
// FUNCIÓN DE VERIFICACIÓN PARA DEPURACIÓN
// ============================================
window.verificarFormularioVentas = () => {
    console.log('🔍 === VERIFICACIÓN DEL FORMULARIO ===');
    console.log('Formulario:', document.getElementById('perfilForm'));
    console.log('Nombre Cliente:', document.getElementById('nombre_cliente'));
    console.log('WhatsApp:', document.getElementById('whatsapp'));
    console.log('Cuenta Madre:', document.getElementById('cuenta_madre_id'));
    console.log('Perfil Asignado:', document.getElementById('perfil_asignado'));
    console.log('Fecha Venta:', document.getElementById('fecha_venta'));
    console.log('Vencimiento:', document.getElementById('vencimiento_cliente'));
    console.log('Monto:', document.getElementById('monto'));
    console.log('='.repeat(50));
};

// ============================================
// INICIALIZACIÓN
// ============================================
window.inicializarModuloClientes = async () => {
    console.log('🚀 Inicializando módulo de clientes...');
    await cargarCuentasMadreSelect();
    establecerFechasPorDefecto();
    await renderizarClientes();
    console.log('✅ Módulo de clientes inicializado');
};

console.log('✅ Módulo clientes.js cargado y listo');
