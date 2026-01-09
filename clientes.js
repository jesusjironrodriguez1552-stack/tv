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

    // ============================================
    // 🎯 AGRUPAR COMBOS POR COMBO_ID
    // ============================================
    const grupos = {};
    const individuales = [];

    perfiles.forEach(p => {
        if (p.combo_id) {
            // Es parte de un combo
            if (!grupos[p.combo_id]) {
                grupos[p.combo_id] = [];
            }
            grupos[p.combo_id].push(p);
        } else {
            // Es venta individual
            individuales.push(p);
        }
    });

    console.log(`📦 ${Object.keys(grupos).length} combos detectados`);
    console.log(`👤 ${individuales.length} ventas individuales`);

    // ============================================
    // RENDERIZAR
    // ============================================
    tabla.innerHTML = '';

    // 1. Renderizar COMBOS (agrupados)
    Object.entries(grupos).forEach(([comboId, perfilesCombo]) => {
        const primerPerfil = perfilesCombo[0];
        const diasRestantes = calcularDiasRestantes(primerPerfil.fecha_vencimiento);
        const estaVencido = diasRestantes < 0;
        const porVencer = diasRestantes >= 0 && diasRestantes <= 7;

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

        // Lista de plataformas del combo
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

    // 2. Renderizar VENTAS INDIVIDUALES
    individuales.forEach(p => {
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
