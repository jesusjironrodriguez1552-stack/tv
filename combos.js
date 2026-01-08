// combos.js - SISTEMA DE COMBOS Y VALIDACIÓN DE STOCK

console.log('📦 Módulo de combos cargado');

// ============================================
// CONFIGURACIÓN DE PRECIOS Y COMBOS
// ============================================

// Precios base de plataformas individuales
const PRECIOS_BASE = {
    'NETFLIX': { dias: 40, precio: 12.00, editable: true },
    'DISNEY+': { dias: 7, precio: 7.00, editable: false },
    'DISNEY': { dias: 7, precio: 7.00, editable: false },
    'HBO MAX': { dias: 7, precio: 7.00, editable: false },
    'HBO': { dias: 7, precio: 7.00, editable: false },
    'MAX': { dias: 7, precio: 7.00, editable: false },
    'CRUNCHYROLL': { dias: 3, precio: 6.00, editable: false },
    'PRIME VIDEO': { dias: 3, precio: 9.00, editable: false },
    'PRIME': { dias: 3, precio: 9.00, editable: false }
};

// Combos predefinidos
const COMBOS_PREDEFINIDOS = {
    // DÚOS
    'duo_premium': {
        nombre: '🔥 Dúo Premium',
        plataformas: ['NETFLIX', 'DISNEY+'],
        precio: 17.00,
        descripcion: 'Lo mejor de Netflix + Disney para toda la familia'
    },
    'duo_max': {
        nombre: '✅ Dúo Max',
        plataformas: ['NETFLIX', 'MAX'],
        precio: 17.50,
        descripcion: 'Netflix + HBO Max para los mejores estrenos'
    },
    'duo_prime': {
        nombre: '✅ Dúo Prime',
        plataformas: ['NETFLIX', 'PRIME VIDEO'],
        precio: 18.50,
        descripcion: 'Netflix + Amazon Prime Video'
    },
    'duo_junior': {
        nombre: '👶 Dúo Junior',
        plataformas: ['DISNEY+', 'MAX'],
        precio: 12.00,
        descripcion: 'El más barato, ideal para niños y familia'
    },
    'duo_cinema': {
        nombre: '🎬 Dúo Cinema',
        plataformas: ['MAX', 'PRIME VIDEO'],
        precio: 14.50,
        descripcion: 'Perfecto para calidad de imagen y películas'
    },
    'duo_ahorro': {
        nombre: '💸 Dúo Ahorro',
        plataformas: ['DISNEY+', 'PRIME VIDEO'],
        precio: 13.00,
        descripcion: 'Económico y completo'
    },
    
    // TRÍOS
    'trio_elite': {
        nombre: '🔥 Trío Élite',
        plataformas: ['NETFLIX', 'DISNEY+', 'MAX'],
        precio: 23.50,
        descripcion: 'Ideal para fans de estrenos - Ganancia ALTA'
    },
    'trio_cineasta': {
        nombre: '🎬 Trío Cineasta',
        plataformas: ['NETFLIX', 'MAX', 'PRIME VIDEO'],
        precio: 24.50,
        descripcion: 'Calidad de imagen total - Ganancia MÁXIMA'
    },
    'trio_geek': {
        nombre: '🎮 Trío Geek',
        plataformas: ['NETFLIX', 'DISNEY+', 'CRUNCHYROLL'],
        precio: 22.00,
        descripcion: 'Rápida salida - Para jóvenes'
    },
    'trio_full': {
        nombre: '🌟 Trío Full House',
        plataformas: ['DISNEY+', 'MAX', 'PRIME VIDEO'],
        precio: 19.50,
        descripcion: 'Económico sin Netflix'
    }
};

// ============================================
// VERIFICACIÓN DE STOCK DISPONIBLE
// ============================================

async function verificarStockDisponible(plataformas) {
    console.log('🔍 Verificando stock para:', plataformas);
    
    const resultado = {
        disponible: true,
        faltantes: [],
        cuentasDisponibles: {}
    };

    for (const plataforma of plataformas) {
        // Normalizar nombre de plataforma para búsqueda flexible
        const plataformaNormalizada = plataforma.toUpperCase().trim();
        
        // Buscar cuentas madre de esta plataforma (con búsqueda flexible)
        const { data: todasCuentas, error } = await _supabase
            .from('cuentas_madre')
            .select('id, plataforma, perfiles_totales');

        if (error) {
            console.error('❌ Error al consultar cuentas:', error);
            resultado.disponible = false;
            resultado.faltantes.push(plataforma);
            continue;
        }

        // Filtrar cuentas que coincidan (flexible: HBO MAX = HBO = MAX)
        const cuentas = todasCuentas?.filter(c => {
            const nombreCuenta = c.plataforma.toUpperCase().trim();
            return nombreCuenta === plataformaNormalizada || 
                   nombreCuenta.includes(plataformaNormalizada) ||
                   plataformaNormalizada.includes(nombreCuenta);
        });

        console.log(`📊 Plataforma ${plataforma}: ${cuentas?.length || 0} cuenta(s) encontrada(s)`);

        if (!cuentas || cuentas.length === 0) {
            resultado.disponible = false;
            resultado.faltantes.push(plataforma);
            continue;
        }

        // Para cada cuenta madre, verificar perfiles ocupados
        let hayStockEnPlataforma = false;
        
        for (const cuenta of cuentas) {
            const { data: perfiles } = await _supabase
                .from('perfiles_clientes')
                .select('id')
                .eq('cuenta_madre_id', cuenta.id);

            const ocupados = perfiles?.length || 0;
            const disponibles = cuenta.perfiles_totales - ocupados;

            console.log(`  📋 Cuenta ${cuenta.id} (${cuenta.plataforma}): ${ocupados}/${cuenta.perfiles_totales} ocupados, ${disponibles} libres`);

            if (disponibles > 0) {
                hayStockEnPlataforma = true;
                resultado.cuentasDisponibles[plataforma] = {
                    cuenta_id: cuenta.id,
                    disponibles: disponibles
                };
                console.log(`  ✅ Stock disponible en cuenta ${cuenta.id}`);
                break;
            }
        }

        if (!hayStockEnPlataforma) {
            resultado.disponible = false;
            resultado.faltantes.push(plataforma);
            console.log(`  ❌ Sin stock disponible para ${plataforma}`);
        }
    }

    console.log('📊 Resultado de stock:', resultado);
    return resultado;
}

// ============================================
// RENDERIZAR CATÁLOGO DE COMBOS
// ============================================

async function renderizarCatalogoCombos() {
    console.log('🎨 Renderizando catálogo de combos...');
    
    const container = document.getElementById('catalogoCombos');
    if (!container) {
        console.error('❌ No se encontró el contenedor catalogoCombos');
        return;
    }

    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';

    // SECCIÓN 1: PLATAFORMAS INDIVIDUALES
    html += `
        <div class="col-span-full">
            <h3 class="text-2xl font-black text-yellow-400 mb-4 flex items-center gap-2">
                📺 PLATAFORMAS INDIVIDUALES
            </h3>
        </div>
    `;

    for (const [plataforma, datos] of Object.entries(PRECIOS_BASE)) {
        const stock = await verificarStockDisponible([plataforma]);
        const disponible = stock.disponible;
        const stockInfo = disponible ? stock.cuentasDisponibles[plataforma] : null;

        html += `
            <div class="bg-gray-800/50 border ${disponible ? 'border-green-500/30' : 'border-red-500/50'} rounded-2xl p-6 relative">
                ${!disponible ? '<div class="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black animate-pulse">SIN STOCK</div>' : ''}
                <h4 class="text-xl font-black text-white mb-2">${plataforma}</h4>
                <p class="text-gray-400 text-sm mb-4">${datos.dias} días de servicio</p>
                <p class="text-3xl font-black text-yellow-400 mb-4">S/ ${datos.precio.toFixed(2)}</p>
                ${disponible ? 
                    `<p class="text-xs text-green-400 mb-4">✅ ${stockInfo.disponibles} perfil(es) disponible(s)</p>` :
                    `<p class="text-xs text-red-400 mb-4">❌ No hay perfiles libres</p>`
                }
                <button 
                    onclick="seleccionarProducto('individual', '${plataforma}', ${datos.precio}, ${datos.dias})"
                    class="${disponible ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'} w-full py-3 rounded-xl font-black text-white transition"
                    ${!disponible ? 'disabled' : ''}>
                    ${disponible ? '🛒 VENDER' : '❌ SIN STOCK'}
                </button>
            </div>
        `;
    }

    // SECCIÓN 2: DÚOS
    html += `
        <div class="col-span-full mt-8">
            <h3 class="text-2xl font-black text-cyan-400 mb-4 flex items-center gap-2">
                🤝 COMBOS DÚOS
            </h3>
        </div>
    `;

    const duos = Object.entries(COMBOS_PREDEFINIDOS).filter(([key]) => key.startsWith('duo_'));
    for (const [key, combo] of duos) {
        const stock = await verificarStockDisponible(combo.plataformas);
        const disponible = stock.disponible;

        html += `
            <div class="bg-gray-800/50 border ${disponible ? 'border-cyan-500/30' : 'border-red-500/50'} rounded-2xl p-6 relative">
                ${!disponible ? '<div class="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black animate-pulse">SIN STOCK</div>' : ''}
                <h4 class="text-xl font-black text-white mb-2">${combo.nombre}</h4>
                <p class="text-sm text-gray-400 mb-3">${combo.plataformas.join(' + ')}</p>
                <p class="text-3xl font-black text-cyan-400 mb-3">S/ ${combo.precio.toFixed(2)}</p>
                <p class="text-xs text-gray-500 mb-4">${combo.descripcion}</p>
                ${!disponible ? `<p class="text-xs text-red-400 mb-4">❌ Falta stock: ${stock.faltantes.join(', ')}</p>` : ''}
                <button 
                    onclick="seleccionarProducto('combo', '${key}', ${combo.precio}, 0)"
                    class="${disponible ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-gray-600 cursor-not-allowed'} w-full py-3 rounded-xl font-black text-white transition"
                    ${!disponible ? 'disabled' : ''}>
                    ${disponible ? '🛒 VENDER COMBO' : '❌ SIN STOCK'}
                </button>
            </div>
        `;
    }

    // SECCIÓN 3: TRÍOS
    html += `
        <div class="col-span-full mt-8">
            <h3 class="text-2xl font-black text-purple-400 mb-4 flex items-center gap-2">
                🎯 COMBOS TRÍOS (MÁXIMA GANANCIA)
            </h3>
        </div>
    `;

    const trios = Object.entries(COMBOS_PREDEFINIDOS).filter(([key]) => key.startsWith('trio_'));
    for (const [key, combo] of trios) {
        const stock = await verificarStockDisponible(combo.plataformas);
        const disponible = stock.disponible;

        html += `
            <div class="bg-gray-800/50 border ${disponible ? 'border-purple-500/30' : 'border-red-500/50'} rounded-2xl p-6 relative">
                ${!disponible ? '<div class="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black animate-pulse">SIN STOCK</div>' : ''}
                <h4 class="text-xl font-black text-white mb-2">${combo.nombre}</h4>
                <p class="text-sm text-gray-400 mb-3">${combo.plataformas.join(' + ')}</p>
                <p class="text-3xl font-black text-purple-400 mb-3">S/ ${combo.precio.toFixed(2)}</p>
                <p class="text-xs text-gray-500 mb-4">${combo.descripcion}</p>
                ${!disponible ? `<p class="text-xs text-red-400 mb-4">❌ Falta stock: ${stock.faltantes.join(', ')}</p>` : ''}
                <button 
                    onclick="seleccionarProducto('combo', '${key}', ${combo.precio}, 0)"
                    class="${disponible ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 cursor-not-allowed'} w-full py-3 rounded-xl font-black text-white transition"
                    ${!disponible ? 'disabled' : ''}>
                    ${disponible ? '🛒 VENDER COMBO' : '❌ SIN STOCK'}
                </button>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
    console.log('✅ Catálogo renderizado');
}

// ============================================
// SELECCIÓN DE PRODUCTO PARA VENTA
// ============================================

window.seleccionarProducto = async (tipo, identificador, precio, dias) => {
    console.log(`🛒 Producto seleccionado:`, { tipo, identificador, precio });

    // Abrir modal de venta y prellenar datos
    const modalVenta = document.getElementById('modalVentaCombo');
    if (!modalVenta) {
        alert('❌ Error: No se encontró el modal de venta');
        return;
    }

    // Determinar qué plataformas incluye
    let plataformas = [];
    let nombreProducto = '';
    
    if (tipo === 'individual') {
        plataformas = [identificador];
        nombreProducto = identificador;
        document.getElementById('venta_dias').value = dias;
    } else {
        const combo = COMBOS_PREDEFINIDOS[identificador];
        plataformas = combo.plataformas;
        nombreProducto = combo.nombre;
        // Para combos, usar el menor número de días
        const diasMinimos = Math.min(...plataformas.map(p => PRECIOS_BASE[p]?.dias || 30));
        document.getElementById('venta_dias').value = diasMinimos;
    }

    // Verificar stock nuevamente
    const stock = await verificarStockDisponible(plataformas);
    if (!stock.disponible) {
        alert(`❌ Stock insuficiente para:\n\n${stock.faltantes.join('\n')}\n\nPor favor, registra más cuentas madre de estas plataformas.`);
        return;
    }

    // Prellenar formulario
    document.getElementById('venta_producto_tipo').value = tipo;
    document.getElementById('venta_producto_id').value = identificador;
    document.getElementById('venta_plataformas').value = JSON.stringify(plataformas);
    document.getElementById('venta_precio').value = precio.toFixed(2);
    document.getElementById('venta_producto_nombre').textContent = nombreProducto;
    document.getElementById('venta_plataformas_lista').textContent = plataformas.join(' + ');

    // Mostrar modal
    modalVenta.classList.remove('hidden');
};

// ============================================
// CERRAR MODAL DE VENTA
// ============================================

window.cerrarModalVenta = () => {
    const modal = document.getElementById('modalVentaCombo');
    if (modal) {
        modal.classList.add('hidden');
        // Limpiar formulario
        document.getElementById('formVentaCombo').reset();
    }
};

// ============================================
// PROCESAR VENTA DE COMBO
// ============================================

window.procesarVentaCombo = async (event) => {
    event.preventDefault();
    console.log('💰 Procesando venta de combo...');

    const nombreCliente = document.getElementById('venta_cliente').value.trim();
    const whatsapp = document.getElementById('venta_whatsapp').value.trim();
    const precio = parseFloat(document.getElementById('venta_precio').value);
    const dias = parseInt(document.getElementById('venta_dias').value);
    const plataformas = JSON.parse(document.getElementById('venta_plataformas').value);

    if (!nombreCliente || !precio || !dias) {
        alert('⚠️ Por favor completa todos los campos obligatorios');
        return;
    }

    try {
        // Verificar stock final
        const stock = await verificarStockDisponible(plataformas);
        if (!stock.disponible) {
            alert(`❌ Stock agotado durante la venta:\n\n${stock.faltantes.join('\n')}`);
            return;
        }

        // Calcular fecha de vencimiento
        const hoy = new Date();
        const vencimiento = new Date(hoy);
        vencimiento.setDate(vencimiento.getDate() + dias);
        const fechaVencimiento = `${vencimiento.getFullYear()}-${String(vencimiento.getMonth() + 1).padStart(2, '0')}-${String(vencimiento.getDate()).padStart(2, '0')}`;

        // Registrar cliente por cada plataforma
        for (const plataforma of plataformas) {
            const cuentaInfo = stock.cuentasDisponibles[plataforma];
            
            // Obtener datos de la cuenta madre
            const { data: cuentaMadre } = await _supabase
                .from('cuentas_madre')
                .select('*')
                .eq('id', cuentaInfo.cuenta_id)
                .single();

            // Determinar perfil disponible
            const { data: perfilesOcupados } = await _supabase
                .from('perfiles_clientes')
                .select('perfil_asignado')
                .eq('cuenta_madre_id', cuentaInfo.cuenta_id);

            const perfilesUsados = perfilesOcupados?.map(p => p.perfil_asignado) || [];
            let perfilAsignado = '';
            
            for (let i = 1; i <= cuentaMadre.perfiles_totales; i++) {
                const nombrePerfil = `Perfil ${i}`;
                if (!perfilesUsados.includes(nombrePerfil)) {
                    perfilAsignado = nombrePerfil;
                    break;
                }
            }

            // Registrar cliente
            const { error: errorCliente } = await _supabase
                .from('perfiles_clientes')
                .insert([{
                    nombre_cliente: nombreCliente,
                    whatsapp: whatsapp || null,
                    cuenta_madre_id: cuentaInfo.cuenta_id,
                    perfil_asignado: perfilAsignado,
                    fecha_vencimiento: fechaVencimiento,
                    precio_venta: precio / plataformas.length // Dividir el precio entre las plataformas
                }]);

            if (errorCliente) {
                console.error('❌ Error al registrar cliente:', errorCliente);
                throw errorCliente;
            }
        }

        // Registrar ingreso en caja
        const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        await _supabase.from('flujo_caja').insert([{
            tipo: 'ingreso',
            monto: precio,
            descripcion: `Venta combo: ${nombreCliente} (${plataformas.join(' + ')})`,
            fecha: fechaHoy
        }]);

        alert(`✅ ¡Venta registrada exitosamente!\n\nCliente: ${nombreCliente}\nPlataformas: ${plataformas.join(' + ')}\nPrecio: S/ ${precio.toFixed(2)}\nVence: ${vencimiento.toLocaleDateString('es-PE')}`);

        // Cerrar modal y actualizar
        window.cerrarModalVenta();
        
        if (typeof renderizarTodo === 'function') {
            await renderizarTodo();
        } else {
            await renderizarCatalogoCombos();
        }

    } catch (error) {
        console.error('❌ Error al procesar venta:', error);
        alert('❌ Error al registrar la venta. Revisa la consola.');
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

// Hacer la función disponible globalmente
window.renderizarCatalogoCombos = renderizarCatalogoCombos;

console.log('✅ Sistema de combos inicializado');
