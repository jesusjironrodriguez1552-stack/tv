// clientes.js - ESPECIALISTA EN GESTIÓN DE CLIENTES Y VENTAS
// Módulo mejorado con mejor UX y mensajes personalizados

console.log('👥 Módulo clientes.js cargado');

// ============================================
// CONFIGURACIÓN DEL NEGOCIO
// ============================================
const CONFIG_NEGOCIO = {
    nombre: "Streaming Store",
    saludo: "Hola! Somos Streaming Store",
    despedida: "Gracias por confiar en nosotros 🎬"
};

// ============================================
// FUNCIÓN PRINCIPAL DE RENDERIZADO
// ============================================
async function renderizarClientes() {
    console.log('🔄 Renderizando clientes...');
    
    const tabla = document.getElementById('tablaPerfiles');
    if (!tabla) {
        console.error('❌ No se encontró el elemento tablaPerfiles');
        return;
    }

    // 1. Obtener datos con JOIN a cuentas madre
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

    console.log(`✅ ${perfiles.length} clientes cargados`);

    // 2. Preparar fecha actual
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // 3. Limpiar tabla
    tabla.innerHTML = '';

    // 4. Renderizar cada cliente
    perfiles.forEach(p => {
        const vence = new Date(p.fecha_vencimiento);
        const diasRestantes = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        const estaVencido = diasRestantes <= 0;
        const porVencer = diasRestantes > 0 && diasRestantes <= 7;
        const cuentaMadre = p.cuentas_madre;

        // Determinar color y estilo según estado
        let estadoClase = '';
        let estadoTexto = '';
        let estadoBadge = '';
        
        if (estaVencido) {
            estadoClase = 'bg-red-900/10 border-l-4 border-red-500';
            estadoTexto = 'text-red-400';
            estadoBadge = 'bg-red-600 text-white animate-pulse';
            estadoTexto = '⚠️ VENCIDO';
        } else if (porVencer) {
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
                    ${new Date(p.fecha_vencimiento).toLocaleDateString('es-ES')}
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
                            title="Enviar recordatorio por WhatsApp">
                            📲
                        </button>` 
                        : ''
                    }
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
}

// ============================================
// FORMULARIO DE REGISTRO DE VENTAS
// ============================================
const formPerfil = document.getElementById('perfilForm');
if (formPerfil) {
    formPerfil.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📝 Procesando nueva venta...');
        
        const nombreCliente = document.getElementById('nombre_cliente').value.trim();
        const whatsapp = document.getElementById('whatsapp').value.trim();
        const cuentaMadreId = document.getElementById('cuenta_madre_id').value;
        const perfilAsignado = document.getElementById('perfil_asignado').value.trim();
        const fechaVencimiento = document.getElementById('vencimiento_cliente').value;
        const montoVenta = parseFloat(document.getElementById('monto').value);

        // Validaciones
        if (!nombreCliente || !cuentaMadreId || !perfilAsignado || !fechaVencimiento || !montoVenta) {
            alert('⚠️ Por favor completa todos los campos obligatorios');
            return;
        }

        if (montoVenta <= 0) {
            alert('⚠️ El monto debe ser mayor a 0');
            return;
        }

        try {
            // 1. Registrar el cliente
            const { data: nuevoCliente, error: errorCliente } = await _supabase
                .from('perfiles_clientes')
                .insert([{
                    nombre_cliente: nombreCliente,
                    whatsapp: whatsapp || null,
                    cuenta_madre_id: cuentaMadreId,
                    perfil_asignado: perfilAsignado,
                    fecha_vencimiento: fechaVencimiento,
                    precio_venta: montoVenta
                }])
                .select();

            if (errorCliente) {
                console.error('❌ Error al guardar cliente:', errorCliente);
                alert(`❌ Error al guardar cliente: ${errorCliente.message}`);
                return;
            }

            console.log('✅ Cliente registrado:', nuevoCliente);

            // 2. Registrar el ingreso en flujo de caja
            const { error: errorCaja } = await _supabase
                .from('flujo_caja')
                .insert([{
                    tipo: 'ingreso',
                    monto: montoVenta,
                    descripcion: `Venta de perfil: ${nombreCliente}`,
                    fecha: new Date().toISOString().split('T')[0] // Solo fecha YYYY-MM-DD
                }]);

            if (errorCaja) {
                console.warn('⚠️ Cliente guardado pero error en caja:', errorCaja);
            }

            // 3. Limpiar formulario y actualizar
            e.target.reset();
            alert(`✅ ¡Venta registrada con éxito!\n\nCliente: ${nombreCliente}\nMonto: $${montoVenta.toFixed(2)}`);
            
            // Actualizar toda la interfaz
            if (typeof renderizarTodo === 'function') {
                await renderizarTodo();
            }

            console.log('✅ Venta completada exitosamente');

        } catch (err) {
            console.error('❌ Error inesperado:', err);
            alert('❌ Ocurrió un error inesperado. Revisa la consola.');
        }
    });
}

// ============================================
// FUNCIONES GLOBALES (ACCIONES DE CLIENTE)
// ============================================

// Enviar recordatorio por WhatsApp
window.enviarRecordatorio = (nombre, whatsapp, plataforma, diasRestantes) => {
    console.log(`📲 Enviando recordatorio a ${nombre}...`);
    
    if (!whatsapp || whatsapp === 'undefined' || whatsapp === 'null') {
        alert("⚠️ Este cliente no tiene número de WhatsApp registrado");
        return;
    }

    // Limpiar número (solo dígitos)
    const numeroLimpio = whatsapp.replace(/\D/g, '');
    
    // Crear mensaje personalizado según estado
    let mensaje = `${CONFIG_NEGOCIO.saludo}! 👋\n\n`;
    
    if (diasRestantes <= 0) {
        mensaje += `Te recordamos que tu servicio de *${plataforma}* *ha vencido hoy*. 😔\n\n`;
        mensaje += `¿Deseas renovarlo para seguir disfrutando de tu mismo perfil? 🎬\n\n`;
    } else if (diasRestantes <= 3) {
        mensaje += `Tu servicio de *${plataforma}* vence en *${diasRestantes} día${diasRestantes > 1 ? 's' : ''}* ⏰\n\n`;
        mensaje += `Renueva ahora para no perder tu perfil y seguir disfrutando sin interrupciones 🎬\n\n`;
    } else {
        mensaje += `Te recordamos que tu servicio de *${plataforma}* vence en *${diasRestantes} días* 📅\n\n`;
        mensaje += `¿Deseas renovar con anticipación? Así aseguras tu mismo perfil 🎬\n\n`;
    }
    
    mensaje += `${CONFIG_NEGOCIO.despedida}`;

    // Abrir WhatsApp
    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    
    console.log('✅ WhatsApp abierto');
};

// Renovar cliente (extender vencimiento)
window.renovarCliente = async (id, nombre) => {
    console.log(`🔄 Iniciando renovación de ${nombre}...`);
    
    const dias = prompt(`¿Por cuántos días deseas renovar a ${nombre}?`, '30');
    if (!dias || isNaN(dias) || parseInt(dias) <= 0) {
        console.log('❌ Renovación cancelada');
        return;
    }

    const monto = prompt(`¿Cuánto pagó ${nombre} por la renovación?`, '');
    if (!monto || isNaN(monto) || parseFloat(monto) <= 0) {
        console.log('❌ Renovación cancelada - monto inválido');
        return;
    }

    try {
        // Obtener datos actuales del cliente
        const { data: cliente, error: errorConsulta } = await _supabase
            .from('perfiles_clientes')
            .select('fecha_vencimiento')
            .eq('id', id)
            .single();

        if (errorConsulta) {
            alert('❌ Error al consultar cliente');
            return;
        }

        // Calcular nueva fecha (desde la fecha actual de vencimiento)
        const fechaActual = new Date(cliente.fecha_vencimiento);
        const nuevaFecha = new Date(fechaActual);
        nuevaFecha.setDate(nuevaFecha.getDate() + parseInt(dias));

        // Actualizar cliente
        const { error: errorUpdate } = await _supabase
            .from('perfiles_clientes')
            .update({ 
                fecha_vencimiento: nuevaFecha.toISOString().split('T')[0],
                precio_venta: parseFloat(monto)
            })
            .eq('id', id);

        if (errorUpdate) {
            alert('❌ Error al renovar cliente');
            return;
        }

        // Registrar ingreso en caja
        await _supabase.from('flujo_caja').insert([{
            tipo: 'ingreso',
            monto: parseFloat(monto),
            descripcion: `Renovación: ${nombre}`,
            fecha: new Date().toISOString().split('T')[0]
        }]);

        alert(`✅ Cliente renovado exitosamente\n\nNueva fecha: ${nuevaFecha.toLocaleDateString('es-ES')}\nMonto: $${parseFloat(monto).toFixed(2)}`);
        
        if (typeof renderizarTodo === 'function') {
            await renderizarTodo();
        }

        console.log('✅ Renovación completada');

    } catch (err) {
        console.error('❌ Error en renovación:', err);
        alert('❌ Error al renovar cliente');
    }
};

// Abrir modal para migrar cliente a otra cuenta
window.abrirMigrar = (id) => {
    console.log(`⇄ Abriendo migración para cliente ${id}`);
    document.getElementById('migrar_perfil_id').value = id;
    document.getElementById('modalMigrar').classList.remove('hidden');
};

// Borrar cliente
window.borrarCliente = async (id, nombre) => {
    console.log(`🗑️ Intentando eliminar a ${nombre}...`);
    
    const confirmacion = confirm(
        `⚠️ ¿Estás seguro de eliminar a "${nombre}"?\n\n` +
        `Esta acción no se puede deshacer.\n` +
        `Se eliminará toda la información del cliente.`
    );
    
    if (!confirmacion) {
        console.log('❌ Eliminación cancelada');
        return;
    }

    try {
        const { error } = await _supabase
            .from('perfiles_clientes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ Error al eliminar:', error);
            alert('❌ Error al eliminar cliente');
            return;
        }

        console.log('✅ Cliente eliminado');
        alert(`✅ Cliente "${nombre}" eliminado correctamente`);
        
        if (typeof renderizarTodo === 'function') {
            await renderizarTodo();
        }

    } catch (err) {
        console.error('❌ Error inesperado:', err);
        alert('❌ Error al eliminar cliente');
    }
};

console.log('✅ Módulo clientes.js inicializado correctamente');
