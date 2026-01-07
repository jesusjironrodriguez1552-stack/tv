// caja.js - CONTROL FINANCIERO PROFESIONAL CVSE V6.5
// Gestiona el balance de caja, ingresos y gastos mensuales

console.log('💰 Módulo caja.js cargado');

// ============================================
// VARIABLES GLOBALES PARA NAVEGACIÓN DE MESES
// ============================================
let mesVistaActual = new Date().getMonth(); // 0-11
let añoVistaActual = new Date().getFullYear();

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
        const contenedor = document.querySelector('#seccion-caja') || document.body;
        contenedor.innerHTML = `
            <div class="p-8 bg-red-900/20 border border-red-500 rounded-xl m-4">
                <h3 class="text-red-400 font-bold text-lg mb-2">⚠️ Error de Renderizado</h3>
                <p class="text-white mb-2">No se encontraron los elementos necesarios en el HTML</p>
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
        debugPanel.innerHTML = "❌ ERROR: Supabase no está inicializado";
        console.error('❌ _supabase no está definido. Verifica config.js');
        return;
    }

    console.log('✅ Supabase detectado, consultando tabla flujo_caja...');

    // 4. OBTENER DATOS DE SUPABASE - ORDENADOS POR FECHA DESCENDENTE
    const { data: flujo, error } = await _supabase
        .from('flujo_caja')
        .select('*')
        .order('fecha', { ascending: false });
    
    if (error) {
        debugPanel.innerHTML = `❌ ERROR SUPABASE: ${error.message}`;
        console.error('❌ Error al consultar Supabase:', error);
        return;
    }

    console.log('📦 Datos recibidos de Supabase:', flujo);
    console.log('📊 Total de registros:', flujo?.length || 0);

    // 5. VALIDAR DATOS
    if (!flujo || flujo.length === 0) {
        debugPanel.innerHTML = `⚠️ TABLA VACÍA<br><span class="text-xs">No hay registros en 'flujo_caja'</span>`;
        lista.innerHTML = `
            <tr>
                <td colspan="3" class="p-8 text-center text-gray-400">
                    📭 No hay movimientos registrados
                </td>
            </tr>
        `;
        resumen.innerHTML = `
            <div class="bg-gray-800/50 border border-gray-700 p-6 rounded-3xl col-span-3 text-center">
                <span class="text-gray-400">⚠️ No hay datos para mostrar</span>
            </div>
        `;
        if (balanceHeader) balanceHeader.innerText = '$0.00';
        return;
    }

    // 6. DEBUG: Mostrar información de los datos
    const columnas = Object.keys(flujo[0]).join(", ");
    debugPanel.innerHTML = `
        ✅ CONEXIÓN EXITOSA<br>
        📊 Registros totales: <strong>${flujo.length}</strong><br>
        📋 Columnas: <span class="text-xs">${columnas}</span>
    `;

    console.log('✅ Datos válidos recibidos');

    // 7. CÁLCULOS DE FECHAS - USAR LAS VARIABLES GLOBALES
    const hoy = new Date();
    const mesActual = mesVistaActual;
    const añoActual = añoVistaActual;
    const nombreMes = new Date(añoActual, mesActual).toLocaleDateString('es-ES', { month: 'long' });
    
    // Actualizar el label del mes
    const mesLabel = document.getElementById('mesActualLabel');
    if (mesLabel) {
        const esHoy = mesActual === new Date().getMonth() && añoActual === new Date().getFullYear();
        mesLabel.innerHTML = `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${añoActual}`;
        if (esHoy) {
            mesLabel.innerHTML += ' <span class="text-[8px] text-green-400">● HOY</span>';
        }
    }

    console.log('📅 Visualizando:', { mes: mesActual + 1, año: añoActual, nombreMes: nombreMes });

    // 8. CALCULAR BALANCE TOTAL GLOBAL (Todo el historial)
    let saldoTotalGlobal = 0;
    
    flujo.forEach(f => {
        const monto = parseFloat(f.monto) || 0;
        if (f.tipo === 'ingreso') {
            saldoTotalGlobal += monto;
        } else if (f.tipo === 'egreso' || f.tipo === 'gasto') {
            saldoTotalGlobal -= monto;
        }
    });
    
    console.log('💰 Saldo total global (histórico):', saldoTotalGlobal.toFixed(2));
    
    // Actualizar el balance en el header
    if (balanceHeader) {
        balanceHeader.innerText = `$${saldoTotalGlobal.toFixed(2)}`;
        balanceHeader.className = saldoTotalGlobal >= 0 
            ? 'text-3xl font-mono text-green-400 font-bold' 
            : 'text-3xl font-mono text-red-400 font-bold';
    }

    // 9. FILTRAR MOVIMIENTOS DEL MES ACTUAL
    const movimientosMes = flujo.filter(f => {
        // Extraer solo la parte de fecha (YYYY-MM-DD)
        const fechaStr = f.fecha.toString().split('T')[0];
        const [año, mes, dia] = fechaStr.split('-').map(Number);
        
        // Crear fecha local sin conversión UTC
        const fechaLocal = new Date(año, mes - 1, dia);
        const mesMovimiento = fechaLocal.getMonth();
        const añoMovimiento = fechaLocal.getFullYear();
        
        return mesMovimiento === mesActual && añoMovimiento === añoActual;
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
        } else if (item.tipo === 'egreso' || item.tipo === 'gasto') {
            gastosMes += montoNum;
        }
    });

    console.log('💵 Resumen del mes:', { ingresos: ingresosMes, gastos: gastosMes });

    // 11. RENDERIZAR TABLA DE MOVIMIENTOS - SIN CONVERSIONES
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
        console.log(`📝 Renderizando ${movimientosMes.length} movimientos...`);
        
        // IMPORTANTE: Ordenar por fecha descendente
        const movimientosOrdenados = [...movimientosMes].sort((a, b) => {
            const fechaA = a.fecha.split('T')[0];
            const fechaB = b.fecha.split('T')[0];
            return fechaB.localeCompare(fechaA);
        });
        
        // Crear todas las filas
        const filasHTML = movimientosOrdenados.map((item, index) => {
            const esIngreso = item.tipo === 'ingreso';
            const montoNum = parseFloat(item.monto) || 0;
            
            // SIMPLE: Extraer solo la fecha sin conversión
            const fechaDB = item.fecha.split('T')[0]; // "2026-01-07"
            const [año, mes, dia] = fechaDB.split('-'); // ["2026", "01", "07"]
            const fechaMostrar = `${dia}/${mes}/${año.slice(2)}`; // "07/01/26"
            
            console.log(`  📅 Fila ${index + 1}: "${item.fecha}" → "${fechaMostrar}"`);
            
            return `
                <tr class="hover:bg-gray-700/30 border-b border-gray-800 transition">
                    <td class="p-4 text-[10px] font-mono text-gray-400">${fechaMostrar}</td>
                    <td class="p-4 text-xs font-bold uppercase text-white">
                        ${item.descripcion || 'Sin descripción'}
                    </td>
                    <td class="p-4 text-right font-black font-mono ${esIngreso ? 'text-green-400' : 'text-red-400'}">
                        ${esIngreso ? '+' : '-'}${montoNum.toFixed(2)}
                    </td>
                </tr>
            `;
        }).join('');
        
        // Insertar todas las filas de una vez
        lista.innerHTML = filasHTML;
        
        console.log(`✅ Tabla completada con ${movimientosOrdenados.length} filas`);
    }

    // 12. RENDERIZAR CUADROS DE RESUMEN
    const balanceMes = ingresosMes - gastosMes;
    
    resumen.innerHTML = `
        <!-- GANANCIA NETA DEL MES -->
        <div class="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-2 border-purple-500/50 p-6 rounded-3xl shadow-2xl md:col-span-3">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] text-purple-400 font-black uppercase">
                    💰 Ganancia Neta de ${nombreMes} ${añoActual}
                </span>
                <span class="text-[8px] px-2 py-1 rounded-full ${balanceMes >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                    ${balanceMes >= 0 ? '✅ Positivo' : '⚠️ Negativo'}
                </span>
            </div>
            <p class="text-4xl font-mono font-black ${balanceMes >= 0 ? 'text-green-400' : 'text-red-400'}">
                ${balanceMes >= 0 ? '+' : ''}$${balanceMes.toFixed(2)}
            </p>
            <p class="text-[9px] text-gray-400 mt-2">
                Este es tu beneficio real del mes (Ventas - Gastos)
            </p>
        </div>

        <!-- Ventas del Mes -->
        <div class="bg-green-900/20 border border-green-500/50 p-6 rounded-3xl">
            <span class="text-[10px] text-green-500 font-black uppercase block mb-1">
                📈 Ventas ${nombreMes}
            </span>
            <p class="text-2xl font-mono text-white font-bold">
                +$${ingresosMes.toFixed(2)}
            </p>
            <p class="text-[8px] text-gray-500 mt-1">Ingresos del mes</p>
        </div>
        
        <!-- Gastos del Mes -->
        <div class="bg-red-900/20 border border-red-500/50 p-6 rounded-3xl">
            <span class="text-[10px] text-red-500 font-black uppercase block mb-1">
                📉 Gastos ${nombreMes}
            </span>
            <p class="text-2xl font-mono text-white font-bold">
                -$${gastosMes.toFixed(2)}
            </p>
            <p class="text-[8px] text-gray-500 mt-1">Egresos del mes</p>
        </div>
        
        <!-- Capital Total Acumulado -->
        <div class="bg-blue-600/10 border border-blue-500/50 p-6 rounded-3xl shadow-xl">
            <span class="text-[10px] text-blue-400 font-black uppercase block mb-1">
                💎 Capital Total Acumulado
            </span>
            <p class="text-3xl font-mono font-black ${saldoTotalGlobal >= 0 ? 'text-white' : 'text-red-400'}">
                $${saldoTotalGlobal.toFixed(2)}
            </p>
            <span class="text-[8px] text-gray-500 block mt-1">Suma histórica de todo</span>
        </div>
    `;

    console.log('✅ Renderizado de caja completado exitosamente');
}

// ============================================
// FORMULARIO DE REGISTRO DE GASTOS
// ============================================
const formGasto = document.getElementById('gastoForm');
if (formGasto) {
    const inputFecha = document.getElementById('gasto_fecha');
    if (inputFecha && !inputFecha.value) {
        inputFecha.value = new Date().toISOString().split('T')[0];
    }

    formGasto.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📝 Procesando nuevo gasto...');
        
        const descripcion = document.getElementById('gasto_descripcion').value.trim();
        const categoria = document.getElementById('gasto_categoria').value;
        const fecha = document.getElementById('gasto_fecha').value;
        const montoInput = document.getElementById('gasto_monto').value;

        if (!descripcion || !fecha || !montoInput) {
            alert('⚠️ Por favor completa todos los campos');
            return;
        }

        const monto = parseFloat(montoInput);
        if (isNaN(monto) || monto <= 0) {
            alert('⚠️ El monto debe ser un número mayor a 0');
            return;
        }

        try {
            const nuevoGasto = {
                tipo: 'egreso',
                monto: monto,
                descripcion: `${categoria}: ${descripcion}`,
                fecha: fecha
            };

            console.log('📤 Enviando a Supabase:', nuevoGasto);

            const { data, error } = await _supabase
                .from('flujo_caja')
                .insert([nuevoGasto])
                .select();

            if (error) {
                console.error('❌ Error de Supabase:', error);
                alert(`❌ Error al registrar gasto:\n\n${error.message}`);
                return;
            }

            console.log('✅ Gasto registrado exitosamente:', data);

            document.getElementById('gasto_descripcion').value = '';
            document.getElementById('gasto_monto').value = '';
            document.getElementById('gasto_categoria').value = 'Operativo';
            
            if (inputFecha) {
                inputFecha.value = new Date().toISOString().split('T')[0];
            }
            
            alert(`✅ ¡Gasto registrado exitosamente!\n\nDescripción: ${descripcion}\nMonto: $${monto.toFixed(2)}`);
            
            console.log('🔄 Esperando actualización...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (typeof renderizarTodo === 'function') {
                await renderizarTodo();
            } else if (typeof renderizarCaja === 'function') {
                await renderizarCaja();
            }

            console.log('✅ Interfaz actualizada');

        } catch (err) {
            console.error('❌ Error inesperado:', err);
            alert('❌ Ocurrió un error inesperado. Revisa la consola (F12).');
        }
    });
    
    console.log('✅ Formulario de gastos configurado');
}

// ============================================
// NAVEGACIÓN ENTRE MESES
// ============================================
window.cambiarMesVista = async (direccion) => {
    console.log(`🔄 Cambiando mes: ${direccion > 0 ? 'siguiente' : 'anterior'}`);
    
    mesVistaActual += direccion;
    
    if (mesVistaActual > 11) {
        mesVistaActual = 0;
        añoVistaActual++;
    } else if (mesVistaActual < 0) {
        mesVistaActual = 11;
        añoVistaActual--;
    }
    
    await renderizarCaja();
};

window.volverMesActual = async () => {
    console.log('🏠 Volviendo al mes actual');
    const hoy = new Date();
    mesVistaActual = hoy.getMonth();
    añoVistaActual = hoy.getFullYear();
    await renderizarCaja();
};

console.log('✅ Módulo caja.js inicializado correctamente');
