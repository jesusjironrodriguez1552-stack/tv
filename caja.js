// caja.js - CONTROL FINANCIERO CVSE V6.5

// 1. Escuchador para el formulario de Gastos
document.getElementById('gastoManualForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const motivo = document.getElementById('g_motivo').value;
    const monto = parseFloat(document.getElementById('g_monto').value);
    const fecha = document.getElementById('g_fecha').value || new Date().toISOString();

    const { error } = await _supabase.from('flujo_caja').insert([
        { 
            tipo: 'egreso', 
            monto: monto, 
            descripcion: `GASTO MANUAL: ${motivo.toUpperCase()}`,
            fecha: fecha 
        }
    ]);

    if (!error) {
        e.target.reset();
        if (typeof renderizarTodo === 'function') await renderizarTodo();
    }
});

async function renderizarCaja() {
    // Consultamos la tabla flujo_caja
    const { data: flujo, error } = await _supabase.from('flujo_caja').select('*');
    
    const lista = document.getElementById('listaFlujoMensual');
    const resumen = document.getElementById('resumenMensual');
    const balanceHeader = document.getElementById('balance_monto');
    
    if (error) {
        console.error("Error cargando flujo_caja:", error);
        return;
    }
    if (!lista || !resumen) return;

    // Fechas para filtrar el mes actual (Enero 2026)
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    // 1. CÁLCULO DEL BALANCE TOTAL (Lo que sale en el cuadro negro)
    const saldoTotalGlobal = flujo?.reduce((acc, f) => {
        const val = parseFloat(f.monto) || 0;
        return f.tipo === 'ingreso' ? acc + val : acc - val;
    }, 0) || 0;
    
    // Inyectar en el Header
    if (balanceHeader) {
        balanceHeader.innerText = `$${saldoTotalGlobal.toFixed(2)}`;
    }

    // 2. FILTRAR MOVIMIENTOS DEL MES ACTUAL
    const movimientosMes = flujo?.filter(f => {
        const d = new Date(f.fecha);
        return d.getMonth() === mesActual && d.getFullYear() === añoActual;
    }) || [];

    let ingresosMes = 0;
    let gastosMes = 0;

    lista.innerHTML = '';
    
    // Ordenar por fecha (más nuevos arriba)
    movimientosMes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    movimientosMes.forEach(item => {
        const esIngreso = item.tipo === 'ingreso';
        const montoNum = parseFloat(item.monto) || 0;
        
        if (esIngreso) ingresosMes += montoNum;
        else gastosMes += montoNum;

        const fechaObj = new Date(item.fecha);
        const fechaTxt = isNaN(fechaObj) ? "---" : fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        
        // CORRECCIÓN: Usamos item.descripcion (exacto como en tu imagen de Supabase)
        lista.innerHTML += `
            <tr class="hover:bg-gray-700/30 border-b border-gray-800 transition">
                <td class="p-4 text-[10px] font-mono text-gray-400 italic">${fechaTxt}</td>
                <td class="p-4 text-xs font-bold uppercase tracking-tighter">
                    ${item.descripcion || 'Sin descripción'}
                </td>
                <td class="p-4 text-right font-black font-mono ${esIngreso ? 'text-green-400' : 'text-red-400'}">
                    ${esIngreso ? '+' : '-'}$${montoNum.toFixed(2)}
                </td>
            </tr>`;
    });

    // 3. PINTAR CUADROS DE RESUMEN
    resumen.innerHTML = `
        <div class="bg-blue-600/10 border border-blue-500/50 p-6 rounded-3xl shadow-2xl">
            <span class="text-[10px] text-blue-400 font-black uppercase block mb-1">Caja Total Real</span>
            <p class="text-3xl font-mono text-white font-black">$${saldoTotalGlobal.toFixed(2)}</p>
        </div>
        <div class="bg-gray-800/50 border border-gray-700 p-6 rounded-3xl">
            <span class="text-[10px] text-green-500 font-black uppercase block mb-1">Ventas Enero</span>
            <p class="text-2xl font-mono text-white font-bold">$${ingresosMes.toFixed(2)}</p>
        </div>
        <div class="bg-gray-800/50 border border-gray-700 p-6 rounded-3xl">
            <span class="text-[10px] text-red-500 font-black uppercase block mb-1">Gastos Enero</span>
            <p class="text-2xl font-mono text-white font-bold">$${gastosMes.toFixed(2)}</p>
        </div>
    `;
}
