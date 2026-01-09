// clientes-acciones.js - PARTE 2: ACCIONES Y MODALES DE CLIENTES
// Funciones de WhatsApp, edición, renovación y eliminación

console.log('⚙️ Módulo clientes-acciones.js cargado');

// ============================================
// ENVIAR RECORDATORIO POR WHATSAPP
// ============================================
window.enviarRecordatorio = (nombre, whatsapp, plataforma, diasRestantes) => {
    console.log(`📲 Enviando recordatorio a ${nombre}...`);
    
    if (!whatsapp || whatsapp === 'undefined' || whatsapp === 'null') {
        alert("⚠️ Este cliente no tiene número de WhatsApp registrado");
        return;
    }

    const numeroLimpio = whatsapp.replace(/\D/g, '');
    
    let mensaje = `${CONFIG_NEGOCIO.saludo}! 👋\n\n`;
    
    if (diasRestantes < 0) {
        mensaje += `Te recordamos que tu servicio de *${plataforma}* *ya venció* hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? 's' : ''}. 😔\n\n`;
        mensaje += `¿Deseas renovarlo para seguir disfrutando de tu mismo perfil? 🎬\n\n`;
    } else if (diasRestantes === 0) {
        mensaje += `Te recordamos que tu servicio de *${plataforma}* *vence HOY*. ⚠️\n\n`;
        mensaje += `Renueva ahora para no perder tu perfil 🎬\n\n`;
    } else if (diasRestantes <= 3) {
        mensaje += `Tu servicio de *${plataforma}* vence en *${diasRestantes} día${diasRestantes > 1 ? 's' : ''}* ⏰\n\n`;
        mensaje += `Renueva ahora para no perder tu perfil y seguir disfrutando sin interrupciones 🎬\n\n`;
    } else {
        mensaje += `Te recordamos que tu servicio de *${plataforma}* vence en *${diasRestantes} días* 📅\n\n`;
        mensaje += `¿Deseas renovar con anticipación? Así aseguras tu mismo perfil 🎬\n\n`;
    }
    
    mensaje += `${CONFIG_NEGOCIO.despedida}`;

    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    
    console.log('✅ WhatsApp abierto');
};

// ============================================
// ENVIAR DATOS DE ACCESO
// ============================================
window.enviarDatosCuenta = (nombre, whatsapp, plataforma, email, password, perfil) => {
    console.log(`🔑 Enviando datos de cuenta a ${nombre}...`);
    
    if (!whatsapp || whatsapp === 'undefined' || whatsapp === 'null') {
        alert("⚠️ Este cliente no tiene número de WhatsApp registrado");
        return;
    }

    if (!email || !password) {
        alert("⚠️ Esta cuenta no tiene datos de acceso completos");
        return;
    }

    const numeroLimpio = whatsapp.replace(/\D/g, '');
    
    let mensaje = `${CONFIG_NEGOCIO.saludo}! 👋\n\n`;
    mensaje += `Aquí están los datos de acceso a tu cuenta de *${plataforma}* 🔐\n\n`;
    mensaje += `━━━━━━━━━━━━━━━\n`;
    mensaje += `📧 *Email:* ${email}\n`;
    mensaje += `🔒 *Contraseña:* ${password}\n`;
    mensaje += `👤 *Tu Perfil:* ${perfil}\n`;
    mensaje += `━━━━━━━━━━━━━━━\n\n`;
    mensaje += `⚠️ *IMPORTANTE:*\n`;
    mensaje += `• No compartas estos datos con nadie\n`;
    mensaje += `• No cambies la contraseña\n`;
    mensaje += `• Usa solo tu perfil asignado\n\n`;
    mensaje += `¿Necesitas ayuda para entrar? Escríbenos 😊\n\n`;
    mensaje += `${CONFIG_NEGOCIO.despedida}`;

    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    
    console.log('✅ Datos de cuenta enviados por WhatsApp');
};

// ============================================
// RENOVAR CLIENTE
// ============================================
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
        const { data: cliente, error: errorConsulta } = await _supabase
            .from('perfiles_clientes')
            .select('fecha_vencimiento')
            .eq('id', id)
            .single();

        if (errorConsulta) {
            alert('❌ Error al consultar cliente');
            return;
        }

        const [año, mes, dia] = cliente.fecha_vencimiento.split('-').map(Number);
        const fechaActual = new Date(año, mes - 1, dia);
        const nuevaFecha = new Date(fechaActual);
        nuevaFecha.setDate(nuevaFecha.getDate() + parseInt(dias));
        
        const nuevaFechaStr = `${nuevaFecha.getFullYear()}-${String(nuevaFecha.getMonth() + 1).padStart(2, '0')}-${String(nuevaFecha.getDate()).padStart(2, '0')}`;

        const { error: errorUpdate } = await _supabase
            .from('perfiles_clientes')
            .update({ 
                fecha_vencimiento: nuevaFechaStr,
                precio_venta: parseFloat(monto)
            })
            .eq('id', id);

        if (errorUpdate) {
            alert('❌ Error al renovar cliente');
            return;
        }

        const hoy = new Date();
        const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        
        await _supabase.from('flujo_caja').insert([{
            tipo: 'ingreso',
            monto: parseFloat(monto),
            descripcion: `Renovación: ${nombre}`,
            fecha: fechaHoy
        }]);

        alert(`✅ Cliente renovado exitosamente\n\nNueva fecha: ${nuevaFecha.toLocaleDateString('es-PE')}\nMonto: $${parseFloat(monto).toFixed(2)}`);
        
        if (typeof renderizarTodo === 'function') {
            await renderizarTodo();
        }

        console.log('✅ Renovación completada');

    } catch (err) {
        console.error('❌ Error en renovación:', err);
        alert('❌ Error al renovar cliente');
    }
};

// ============================================
// MIGRAR CLIENTE
// ============================================
window.abrirMigrar = (id) => {
    console.log(`⇄ Abriendo migración para cliente ${id}`);
    document.getElementById('migrar_perfil_id').value = id;
    document.getElementById('modalMigrar').classList.remove('hidden');
};

// ============================================
// EDICIÓN DE CLIENTE
// ============================================
window.abrirEdicion = async (id) => {
    console.log(`✏️ Abriendo edición para cliente ${id}`);
    
    try {
        const { data: cliente, error } = await _supabase
            .from('perfiles_clientes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('❌ Error al consultar cliente:', error);
            alert('❌ Error al cargar los datos del cliente');
            return;
        }

        console.log('📋 Datos del cliente:', cliente);

        document.getElementById('editar_cliente_id').value = cliente.id;
        document.getElementById('editar_nombre').value = cliente.nombre_cliente || '';
        document.getElementById('editar_whatsapp').value = cliente.whatsapp || '';
        document.getElementById('editar_perfil').value = cliente.perfil_asignado || '';
        document.getElementById('editar_precio').value = cliente.precio_venta || '';
        document.getElementById('editar_vencimiento').value = cliente.fecha_vencimiento || '';

        document.getElementById('modalEditar').classList.remove('hidden');

    } catch (err) {
        console.error('❌ Error inesperado:', err);
        alert('❌ Error al abrir el editor');
    }
};

window.cerrarModalEditar = () => {
    console.log('🔒 Cerrando modal de edición');
    document.getElementById('modalEditar').classList.add('hidden');
};

window.guardarEdicion = async () => {
    console.log('💾 Guardando edición...');
    
    const id = document.getElementById('editar_cliente_id').value;
    const nombre = document.getElementById('editar_nombre').value.trim();
    const whatsapp = document.getElementById('editar_whatsapp').value.trim();
    const perfil = document.getElementById('editar_perfil').value.trim();
    const precio = parseFloat(document.getElementById('editar_precio').value);
    const vencimiento = document.getElementById('editar_vencimiento').value;

    if (!nombre || !perfil || !precio || !vencimiento) {
        alert('⚠️ Por favor completa todos los campos obligatorios');
        return;
    }

    if (precio <= 0) {
        alert('⚠️ El precio debe ser mayor a 0');
        return;
    }

    try {
        const { error } = await _supabase
            .from('perfiles_clientes')
            .update({
                nombre_cliente: nombre,
                whatsapp: whatsapp || null,
                perfil_asignado: perfil,
                precio_venta: precio,
                fecha_vencimiento: vencimiento
            })
            .eq('id', id);

        if (error) {
            console.error('❌ Error al actualizar:', error);
            alert(`❌ Error al guardar cambios: ${error.message}`);
            return;
        }

        console.log('✅ Cliente actualizado');
        
        window.cerrarModalEditar();
        
        alert(`✅ Cliente "${nombre}" actualizado correctamente`);
        
        if (typeof renderizarTodo === 'function') {
            await renderizarTodo();
        } else if (typeof renderizarClientes === 'function') {
            await renderizarClientes();
        }

    } catch (err) {
        console.error('❌ Error inesperado:', err);
        alert('❌ Error al guardar cambios');
    }
};

// ============================================
// ELIMINAR CLIENTE
// ============================================
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

console.log('✅ Módulo clientes-acciones.js inicializado');

// ============================================
// FUNCIONES ESPECIALES PARA COMBOS
// ============================================

// Renovar combo completo
window.renovarCombo = async (comboId) => {
    console.log(`🔄 Renovando combo ${comboId}...`);
    
    // Obtener todos los perfiles del combo
    const { data: perfiles, error } = await _supabase
        .from('perfiles_clientes')
        .select('*')
        .eq('combo_id', comboId);
    
    if (error || !perfiles || perfiles.length === 0) {
        alert('❌ Error al cargar el combo');
        return;
    }
    
    const nombreCliente = perfiles[0].nombre_cliente;
    const cantidadPlataformas = perfiles.length;
    
    const dias = prompt(
        `🔄 Renovar combo de ${nombreCliente}\n` +
        `${cantidadPlataformas} plataformas incluidas\n\n` +
        `¿Por cuántos días deseas renovar?`, 
        '30'
    );
    
    if (!dias || isNaN(dias) || parseInt(dias) <= 0) {
        return;
    }

    const monto = prompt(`¿Cuánto pagó ${nombreCliente} por la renovación del combo?`, '');
    if (!monto || isNaN(monto) || parseFloat(monto) <= 0) {
        return;
    }

    try {
        // Calcular nueva fecha
        const [año, mes, dia] = perfiles[0].fecha_vencimiento.split('-').map(Number);
        const fechaActual = new Date(año, mes - 1, dia);
        const nuevaFecha = new Date(fechaActual);
        nuevaFecha.setDate(nuevaFecha.getDate() + parseInt(dias));
        
        const nuevaFechaStr = `${nuevaFecha.getFullYear()}-${String(nuevaFecha.getMonth() + 1).padStart(2, '0')}-${String(nuevaFecha.getDate()).padStart(2, '0')}`;

        // Actualizar TODOS los perfiles del combo
        const { error: errorUpdate } = await _supabase
            .from('perfiles_clientes')
            .update({ 
                fecha_vencimiento: nuevaFechaStr,
                precio_venta: parseFloat(monto)
            })
            .eq('combo_id', comboId);

        if (errorUpdate) {
            alert('❌ Error al renovar combo');
            return;
        }

        // Registrar ingreso en caja
        const hoy = new Date();
        const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        
        await _supabase.from('flujo_caja').insert([{
            tipo: 'ingreso',
            monto: parseFloat(monto),
            descripcion: `Renovación Combo: ${nombreCliente} (${cantidadPlataformas} plataformas)`,
            fecha: fechaHoy
        }]);

        alert(
            `✅ Combo renovado exitosamente\n\n` +
            `Cliente: ${nombreCliente}\n` +
            `Plataformas: ${cantidadPlataformas}\n` +
            `Nueva fecha: ${nuevaFecha.toLocaleDateString('es-PE')}\n` +
            `Monto: $${parseFloat(monto).toFixed(2)}`
        );
        
        if (typeof renderizarTodo === 'function') {
            await renderizarTodo();
        }

    } catch (err) {
        console.error('❌ Error en renovación de combo:', err);
        alert('❌ Error al renovar combo');
    }
};

// Eliminar combo completo
window.borrarCombo = async (comboId) => {
    console.log(`🗑️ Eliminando combo ${comboId}...`);
    
    // Obtener información del combo
    const { data: perfiles } = await _supabase
        .from('perfiles_clientes')
        .select('*')
        .eq('combo_id', comboId);
    
    if (!perfiles || perfiles.length === 0) {
        alert('❌ No se encontró el combo');
        return;
    }
    
    const nombreCliente = perfiles[0].nombre_cliente;
    const cantidadPlataformas = perfiles.length;
    
    const confirmacion = confirm(
        `⚠️ ¿Eliminar el combo completo de ${nombreCliente}?\n\n` +
        `Se eliminarán ${cantidadPlataformas} plataformas:\n` +
        perfiles.map(p => `• ${p.cuentas_madre?.plataforma || 'Plataforma'}`).join('\n') +
        `\n\n¿Continuar?`
    );
    
    if (!confirmacion) {
        return;
    }

    try {
        const { error } = await _supabase
            .from('perfiles_clientes')
            .delete()
            .eq('combo_id', comboId);

        if (error) {
            alert('❌ Error al eliminar combo');
            return;
        }

        alert(`✅ Combo de ${nombreCliente} eliminado correctamente`);
        
        if (typeof renderizarTodo === 'function') {
            await renderizarTodo();
        }

    } catch (err) {
        console.error('❌ Error al eliminar combo:', err);
        alert('❌ Error al eliminar combo');
    }
};

// Enviar recordatorio de combo
window.enviarRecordatorioCombo = async (comboId) => {
    console.log(`📲 Enviando recordatorio de combo ${comboId}...`);
    
    const { data: perfiles } = await _supabase
        .from('perfiles_clientes')
        .select('*, cuentas_madre(*)')
        .eq('combo_id', comboId);
    
    if (!perfiles || perfiles.length === 0) {
        alert('❌ No se encontró el combo');
        return;
    }
    
    const primerPerfil = perfiles[0];
    const whatsapp = primerPerfil.whatsapp;
    
    if (!whatsapp) {
        alert("⚠️ Este cliente no tiene WhatsApp registrado");
        return;
    }

    const diasRestantes = calcularDiasRestantes(primerPerfil.fecha_vencimiento);
    const numeroLimpio = whatsapp.replace(/\D/g, '');
    const plataformas = perfiles.map(p => p.cuentas_madre?.plataforma).join(', ');
    
    let mensaje = `${CONFIG_NEGOCIO.saludo}! 👋\n\n`;
    
    if (diasRestantes < 0) {
        mensaje += `Te recordamos que tu COMBO (${plataformas}) *ya venció* hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? 's' : ''}. 😔\n\n`;
    } else if (diasRestantes === 0) {
        mensaje += `Tu COMBO (${plataformas}) *vence HOY*. ⚠️\n\n`;
    } else if (diasRestantes <= 3) {
        mensaje += `Tu COMBO (${plataformas}) vence en *${diasRestantes} día${diasRestantes > 1 ? 's' : ''}* ⏰\n\n`;
    } else {
        mensaje += `Tu COMBO (${plataformas}) vence en *${diasRestantes} días* 📅\n\n`;
    }
    
    mensaje += `¿Deseas renovar? Contáctanos 🎬\n\n${CONFIG_NEGOCIO.despedida}`;

    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
};

console.log('✅ Funciones de combos agregadas');
