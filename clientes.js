// clientes.js - PARTE 1: GESTIÓN PRINCIPAL DE CLIENTES
// Módulo mejorado con protección contra doble clic

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
// FUNCIÓN FALLBACK DE FECHA
// ============================================
function obtenerFechaLocalFallback() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const fechaLocal = `${año}-${mes}-${dia}`;
    console.log('⚠️ Usando fecha fallback:', fechaLocal);
    return fechaLocal;
}

// ============================================
// FUNCIÓN MEJORADA PARA CALCULAR DÍAS RESTANTES
// ============================================
function calcularDiasRestantes(fechaVencimiento) {
    const ahora = new Date();
    const añoLocal = ahora.getFullYear();
    const mesLocal = ahora.getMonth();
    const diaLocal = ahora.getDate();
    
    const hoy = new Date(añoLocal, mesLocal, diaLocal);
    
    const [año, mes, dia] = fechaVencimiento.split('-').map(Number);
    const vence = new Date(año, mes - 1, dia);
    
    const diferenciaMilisegundos = vence - hoy;
    const diasRestantes = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Cálculo de días:`, {
        hoy: hoy.toLocaleDateString('es-PE'),
        vence: vence.toLocaleDateString('es-PE'),
        diasRestantes: diasRestantes
    });
    
    return diasRestantes;
}

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

    tabla.innerHTML = '';

    perfiles.forEach(p => {
        const diasRestantes = calcularDiasRestantes(p.fecha_vencimiento);
        const estaVencido = diasRestantes < 0;
        const porVencer = diasRestantes >= 0 && diasRestantes <= 7;
        const cuentaMadre = p.cuentas_madre;

        let estadoClase = '';
        let estadoTexto = '';
        let estadoBadge = '';
        
        if (estaVencido) {
            estadoClase = 'bg-red-900/10 border-l-4 border-red-500';
            estadoTexto = 'text-red-400';
            estadoBadge = 'bg-red-600 text-white animate-pulse';
            estadoTexto = '⚠️ VENCIDO';
        } else if (diasRestantes === 0) {
            estadoClase = 'bg-red-900/10 border-l-4 border-red-500';
            estadoTexto = 'text-red-400';
            estadoBadge = 'bg-red-600 text-white animate-pulse';
            estadoTexto = '⚠️ VENCE HOY';
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
}

// ============================================
// AUTO-COMPLETAR FECHA DE VENTA CON HOY
// ============================================
const inputFechaVenta = document.getElementById('fecha_venta');
if (inputFechaVenta && !inputFechaVenta.value) {
    inputFechaVenta.value = new Date().toISOString().split('T')[0];
    console.log('📅 Campo fecha_venta auto-completado con hoy');
}

// ============================================
// FORMULARIO CON PROTECCIÓN ANTI-DOBLE CLIC
// ============================================
const formPerfil = document.getElementById('perfilForm');
if (formPerfil) {
    formPerfil.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 🔒 OBTENER EL BOTÓN
        const btnSubmit = formPerfil.querySelector('button[type="submit"]');
        
        // 🔒 VERIFICAR SI YA ESTÁ PROCESANDO
        if (btnSubmit.disabled) {
            console.warn('⚠️ Ya hay una venta en proceso, ignorando clic...');
            return;
        }
        
        console.log('📝 Procesando nueva venta...');
        
        // 🔒 BLOQUEAR BOTÓN INMEDIATAMENTE
        btnSubmit.disabled = true;
        const textoOriginal = btnSubmit.textContent;
        btnSubmit.textContent = '⏳ GUARDANDO...';
        btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
        
        try {
            const nombreCliente = document.getElementById('nombre_cliente').value.trim();
            const whatsapp = document.getElementById('whatsapp').value.trim();
            const cuentaMadreId = document.getElementById('cuenta_madre_id').value;
            const perfilAsignado = document.getElementById('perfil_asignado').value.trim();
            const fechaVenta = document.getElementById('fecha_venta').value;
            const fechaVencimiento = document.getElementById('vencimiento_cliente').value;
            const montoVenta = parseFloat(document.getElementById('monto').value);

            // Validaciones
            if (!nombreCliente || !cuentaMadreId || !perfilAsignado || !fechaVenta || !fechaVencimiento || !montoVenta) {
                alert('⚠️ Por favor completa todos los campos obligatorios');
                return;
            }

            if (montoVenta <= 0) {
                alert('⚠️ El monto debe ser mayor a 0');
                return;
            }

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
                    fecha: fechaVenta
                }]);

            if (errorCaja) {
                console.warn('⚠️ Cliente guardado pero error en caja:', errorCaja);
            }

            // 3. Limpiar formulario y actualizar
            formPerfil.reset();
            alert(`✅ ¡Venta registrada con éxito!\n\nCliente: ${nombreCliente}\nMonto: $${montoVenta.toFixed(2)}`);
            
            // Actualizar interfaz
            if (typeof renderizarTodo === 'function') {
                await renderizarTodo();
            }

            console.log('✅ Venta completada exitosamente');

        } catch (err) {
            console.error('❌ Error inesperado:', err);
            alert('❌ Ocurrió un error inesperado. Revisa la consola.');
        } finally {
            // 🔒 DESBLOQUEAR BOTÓN DESPUÉS DE 2 SEGUNDOS
            setTimeout(() => {
                btnSubmit.disabled = false;
                btnSubmit.textContent = textoOriginal;
                btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
                console.log('✅ Botón desbloqueado');
            }, 2000);
        }
    });
}

console.log('✅ Módulo clientes.js PARTE 1 inicializado');
