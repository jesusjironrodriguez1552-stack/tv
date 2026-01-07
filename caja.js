// caja.js - CONTROL FINANCIERO PROFESIONAL CVSE V6.5 + DEBUG

async function renderizarCaja() {
    const lista = document.getElementById('listaFlujoMensual');
    const resumen = document.getElementById('resumenMensual');
    const balanceHeader = document.getElementById('balance_monto');
    
    // CREAR PANEL DE DEBUG (Solo si no existe)
    let debugPanel = document.getElementById('debug-caja');
    if (!debugPanel) {
        debugPanel = document.createElement('div');
        debugPanel.id = 'debug-caja';
        debugPanel.className = 'bg-yellow-900/20 border border-yellow-500/50 p-4 mb-4 rounded-xl text-[10px] font-mono text-yellow-200';
        resumen.parentNode.insertBefore(debugPanel, resumen);
    }

    debugPanel.innerHTML = "buscando datos en Supabase...";

    // 1. Obtener datos
    const { data: flujo, error } = await _supabase.from('flujo_caja').select('*');
    
    if (error) {
        debugPanel.innerHTML = `❌ ERROR SUPABASE: ${error.message}`;
        return;
    }

    if (!flujo || flujo.length === 0) {
        debugPanel.innerHTML = "⚠️ TABLA VACÍA: No hay datos en 'flujo_caja'";
        return;
    }

    // DEBUG: Mostrar qué columnas detectó
    const columnas = Object.keys(flujo[0]).join(", ");
    debugPanel.innerHTML = `✅ CONEXIÓN EXITOSA<br>Registros totales: ${flujo.length}<br>Columnas detectadas: ${columnas}`;

    // 2. Cálculos de Fechas
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    // 3. Balance Total (Header)
    const saldoTotalGlobal = flujo.reduce((acc, f) => {
        const monto = parseFloat(f.monto) || 0;
        return f.tipo === 'ingreso' ? acc + monto : acc - monto;
    }, 0);
    
    if (balanceHeader) balanceHeader.innerText = `$${saldoTotalGlobal.toFixed(2)}`;

    // 4. Filtrar Mes
    const movimientosMes = flujo.filter(f => {
        const d = new Date(f.fecha);
        return d.getMonth() === mesActual && d.getFullYear() === añoActual;
    });

    debugPanel.innerHTML += `<br>Movimientos de este mes (${mesActual + 1}): ${movimientosMes.length}`;

    let ingresosMes = 0;
    let gastosMes = 0;

    lista.innerHTML = '';
    movimientosMes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    movimientosMes.forEach(item => {
        const esIngreso = item.tipo === 'ingreso';
        const montoNum = parseFloat(item.monto) || 0;
        
        if (esIngreso) ingresosMes += montoNum;
        else gastosMes += montoNum;

        const fechaLocal = new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        
        lista.innerHTML += `
            <tr class="hover:bg-gray-700/30 border-b border-gray-800 transition">
                <td class="p-4 text-[10px] font-mono text-gray-400">${fechaLocal}</td>
                <td class="p-4 text-xs font-bold uppercase text-white">${item.descripcion || 'Sin desc.'}</td>
                <td class="p-4 text-right font-black font-mono ${esIngreso ? 'text-green-400' : 'text-red-400'}">
                    ${esIngreso ? '+' : '-'}$${montoNum.toFixed(2)}
                </td>
            </tr>`;
    });

    // 5. Cuadros de Resumen
    resumen.innerHTML = `
        <div class="bg-blue-600/10 border border-blue-500/50 p-6 rounded-3xl shadow-2xl">
            <span class="text-[10px] text-blue-400 font-black uppercase block mb-1">Caja Real Acumulada</span>
            <p class="text-3xl font-mono text-white font-black">$${saldoTotalGlobal.toFixed(2)}</p>
        </div>
        <div class="bg-gray-800/50 border border-gray-700 p-6 rounded-3xl">
            <span class="text-[10px] text-green-500 font-black uppercase block mb-1">Ventas Mes</span>
            <p class="text-2xl font-mono text-white font-bold">$${ingresosMes.toFixed(2)}</p>
        </div>
        <div class="bg-gray-800/50 border border-gray-700 p-6 rounded-3xl">
            <span class="text-[10px] text-red-500 font-black uppercase block mb-1">Gastos Mes</span>
            <p class="text-2xl font-mono text-white font-bold">$${gastosMes.toFixed(2)}</p>
        </div>
    `;
}
