// caja.js - CONTROL FINANCIERO PROFESIONAL CVSE V6.5
// Gestiona el balance de caja, ingresos y gastos mensuales

console.log('💰 Módulo caja.js cargado');

// ============================================
// FUNCIÓN PRINCIPAL DE RENDERIZADO
// ============================================
async function renderizarCaja() {
    console.log('🚀 renderizarCaja() ejecutándose...');
    
    // 1. VERIFICAR ELEMENTOS DEL DOM
    const lista = document.getElementById('listaFlujoMensual');
    const resumen = document.getElementById('resumenMensual');
    const balanceHeader = document.getElementById('balance_monto');
    
    console.log('📋 Verificando elementos del DOM:', {
        listaFlujoMensual: !!lista,
        resumenMensual: !!resumen,
        balance_monto: !!balanceHeader
    });

    // Validar que existan los elementos necesarios
    if (!lista || !resumen) {
        console.error('❌ ERROR CRÍTICO: Faltan elementos del DOM necesarios');
        console.error('  - listaFlujoMensual:', !!lista);
        console.error('  - resumenMensual:', !!resumen);
        
        // Mostrar error visual en pantalla
        const contenedor = document.querySelector('#seccion-caja') || document.body;
        contenedor.innerHTML = `
            <div class="p-8 bg-red-900/20 border border-red-500 rounded-xl m-4">
                <h3 class="text-red-400 font-bold text-lg mb-2">⚠️ Error de Renderizado</h3>
                <p class="text-white mb-2">No se encontraron los elementos necesarios en el HTML:</p>
                <ul class="text-gray-300 text-sm font-mono space-y-1">
                    <li>• listaFlujoMensual: ${!!lista ? '✅ OK' : '❌ NO ENCONTRADO'}</li>
                    <li>• resumenMensual: ${!!resumen ? '✅ OK' : '❌ NO ENCONTRADO'}</li>
                </ul>
                <p class="text-yellow-300 mt-4 text-xs">
                    💡 Verifica que el index.html contenga los elementos con estos IDs
                </p>
            </div>
        `;
        return;
    }

    // 2. CREAR/ACTUALIZAR PANEL DE DEBUG
    let debugPanel = document.getElementById('debug-caja');
    if (!debugPanel) {
        debugPanel = document.createElement('div');
        debugPanel.id = 'debug-caja';
        debugPanel.className = 'bg-yellow-900/20 border border-yellow-500/50 p-4 mb-4 rounded-xl text-[10px] font-mono text-yellow-200';
        resumen.parentNode.insertBefore(debugPanel, resumen);
    }

    debugPanel.innerHTML = "⏳ Conectando con Supabase...";

    // 3. VERIFICAR CONEXIÓN CON SUPABASE
    if (typeof _supabase === 'undefined') {
        debugPanel.innerHTML = "❌ ERROR: Supabase no está inicializado (_supabase no definido)";
        console.error('❌ _supabase no está definido. Verifica config.js');
        return;
    }

    console.log('✅ Supabase detectado, consultando tabla flujo_caja...');

    // 4. OBTENER DATOS DE SUPABASE
    const { data: flujo, error } = await _supabase
        .from('flujo_caja')
        .select('*')
        .order('fecha', { ascending: false });
    
    if (error) {
        debugPanel.innerHTML = `❌ ERROR SUPABASE: ${error.message}<br>
            <span class="text-xs">Código: ${error.code || 'N/A'}</span>`;
        console.error('❌ Error al consultar Supabase:', error);
        return;
    }

    console.log('📦 Datos recibidos de Supabase:', flujo);

    // 5. VALIDAR DATOS
    if (!flujo || flujo.length === 0) {
        debugPanel.innerHTML = `
            ⚠️ TABLA VACÍA<br>
            <span class="text-xs">No hay registros en 'flujo_caja'</span>
        `;
        
        lista.innerHTML = `
            <tr>
                <td colspan="3" class="p-8 text-center text-gray-400">
                    📭 No hay movimientos registrados
                    <p class="text-xs text-gray-500 mt-2">
                        Los movimientos aparecerán automáticamente cuando registres ventas o gastos
                    </p>
                </td>
            </tr>
        `;
        
        resumen.innerHTML = `
            <div class="bg-gray-800/50 border border-gray-700 p-6 rounded-3xl col-span-3 text-center">
                <span class="text-gray-400">⚠️ No hay datos para mostrar</span>
            </div>
        `;
        
        if (balanceHeader) balanceHeader.innerText = '$0.00';
        
        console.warn('⚠️ No hay datos en la tabla flujo_caja');
        return;
    }

    // 6. DEBUG: Mostrar información de los datos
    const columnas = Object.keys(flujo[0]).join(", ");
    debugPanel.innerHTML = `
        ✅ CONEXIÓN EXITOSA<br>
        📊 Registros totales: <strong>${flujo.length}</strong><br>
        📋 Columnas: <span class="text-xs">${columnas}</span><br>
        🔍 Primer registro: <span class="text-xs">${JSON.stringify(flujo[0]).substring(0, 100)}...</span>
    `;

    console.log('✅ Datos válidos recibidos:', {
        totalRegistros: flujo.length,
        columnas: columnas,
        primerRegistro: flujo[0]
    });

    // 7. CÁLCULOS DE FECHAS
    const hoy = new Date();
    const mesActual = hoy.getMonth(); // 0-11
    const añoActual = hoy.getFullYear();
    const nombreMes = new Date(añoActual, mesActual).toLocaleDateString('es-ES', { month: 'long' });

    console.log('📅 Fecha actual:', { 
        mes: mesActual + 1, 
        año: añoActual,
        nombreMes: nombreMes 
    });

    // 8. CALCULAR BALANCE TOTAL GLOBAL (Todo el historial)
    let saldoTotalGlobal = 0;
    
    flujo.forEach(f => {
        const monto = parseFloat(f.monto) || 0;
        if (f.tipo === 'ingreso') {
            saldoTotalGlobal += monto;
        } else if (f.tipo === 'gasto') {
            saldoTotalGlobal -= monto;
        }
    });
    
    console.log('💰 Saldo total global (histórico):', saldoTotalGlobal);
    
    // Actualizar el balance en el header
    if (balanceHeader) {
        balanceHeader.innerText = `$${saldoTotalGlobal.toFixed(2)}`;
        balanceHeader.className = saldoTotalGlobal >= 0 
            ? 'text-3xl font-mono text-green-400 font-bold' 
            : 'text-3xl font-mono text-red-400 font-bold';
    }

    // 9. FILTRAR MOVIMIENTOS DEL MES ACTUAL
    const movimientosMes = flujo.filter(f => {
        const fechaMov = new Date(f.fecha);
        return fechaMov.getMonth() === mesActual && 
               fechaMov.getFullYear() === añoActual;
    });

    console.log('📊 Movimientos del mes actual:', movimientosMes.length);

    debugPanel.innerHTML += `<br>💼 Movimientos de ${nombreMes} ${añoActual}: <strong>${movimientosMes.length}</strong>`;

    // 10. CALCULAR INGRESOS Y GASTOS DEL MES
    let ingresosMes = 0;
    let gastosMes = 0;

    movimientosMes.forEach(item => {
        const montoNum = parseFloat(item.monto) || 0;
        
        if (item.tipo === 'ingreso') {
            ingresosMes += montoNum;
        } else if (item.tipo === 'gasto') {
            gastosMes += montoNum;
        }
    });

    console.log('💵 Resumen del mes:', { 
        ingresos: ingresosMes, 
        gastos: gastosMes,
        diferencia: ingresosMes - gastosMes
    });

    // 11. RENDERIZAR TABLA DE MOVIMIENTOS
    lista.innerHTML = '';
    
    if (movimientosMes.length === 0) {
        lista.innerHTML = `
            <tr>
                <td colspan="3" class="p-8 text-center text-gray-400">
                    📭 No hay movimientos en ${nombreMes} ${añoActual}
                </td>
            </tr>
        `;
    } else {
        // Ya están ordenados por fecha descendente desde Supabase
        movimientosMes.forEach(item => {
            const esIngreso = item.tipo === 'ingreso';
            const montoNum = parseFloat(item.monto) || 0;
            
            // Formatear fecha
            const fechaLocal = new Date(item.fecha).toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: '2-digit',
                year: '2-digit'
            });
            
            // Crear fila
            lista.innerHTML += `
                <tr class="hover:bg-gray-700/30 border-b border-gray-800 transition">
                    <td class="p-4 text-[10px] font-mono text-gray-400">${fechaLocal}</td>
                    <td class="p-4 text-xs font-bold uppercase text-white">
                        ${item.descripcion || 'Sin descripción'}
                    </td>
                    <td class="p-4 text-right font-black font-mono ${esIngreso ? 'text-green-400' : 'text-red-400'}">
                        ${esIngreso ? '+' : '-'}$${montoNum.toFixed(2)}
                    </td>
                </tr>
            `;
        });
    }

    // 12. RENDERIZAR CUADROS DE RESUMEN
    const balanceMes = ingresosMes - gastosMes;
    
    resumen.innerHTML = `
        <!-- Caja Real Acumulada (Histórico Total) -->
        <div class="bg-blue-600/10 border border-blue-500/50 p-6 rounded-3xl shadow-2xl">
            <span class="text-[10px] text-blue-400 font-black uppercase block mb-1">
                💎 Caja Real Acumulada
            </span>
            <p class="text-3xl font-mono font-black ${saldoTotalGlobal >= 0 ? 'text-white' : 'text-red-400'}">
                $${saldoTotalGlobal.toFixed(2)}
            </p>
            <span class="text-[8px] text-gray-500 block mt-1">Total histórico</span>
        </div>
        
        <!-- Ventas del Mes -->
        <div class="bg-green-900/20 border border-green-500/50 p-6 rounded-3xl">
            <span class="text-[10px] text-green-500 font-black uppercase block mb-1">
                📈 Ventas ${nombreMes}
            </span>
            <p class="text-2xl font-mono text-white font-bold">
                +$${ingresosMes.toFixed(2)}
            </p>
        </div>
        
        <!-- Gastos del Mes -->
        <div class="bg-red-900/20 border border-red-500/50 p-6 rounded-3xl">
            <span class="text-[10px] text-red-500 font-black uppercase block mb-1">
                📉 Gastos ${nombreMes}
            </span>
            <p class="text-2xl font-mono text-white font-bold">
                -$${gastosMes.toFixed(2)}
            </p>
        </div>
        
        <!-- Balance del Mes (Opcional: 4to cuadro) -->
        <div class="bg-gray-800/50 border border-gray-700 p-6 rounded-3xl md:col-span-3">
            <span class="text-[10px] text-gray-400 font-black uppercase block mb-1">
                💰 Balance de ${nombreMes}
            </span>
            <p class="text-2xl font-mono font-bold ${balanceMes >= 0 ? 'text-green-400' : 'text-red-400'}">
                ${balanceMes >= 0 ? '+' : ''}$${balanceMes.toFixed(2)}
            </p>
            <span class="text-[8px] text-gray-500 block mt-1">
                ${balanceMes >= 0 ? '✅ Mes positivo' : '⚠️ Mes negativo'}
            </span>
        </div>
    `;

    console.log('✅ Renderizado de caja completado exitosamente');
}

// ============================================
// AUTO-EJECUTAR AL CARGAR (SOLO PARA DEBUG)
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🎯 DOM cargado - renderizarCaja() estará disponible');
    });
} else {
    console.log('🎯 DOM ya está listo - renderizarCaja() disponible');
}

console.log('✅ Módulo caja.js inicializado correctamente');
