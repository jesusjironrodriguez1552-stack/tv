// caja.js - CONTROL FINANCIERO PROFESIONAL CVSE V6.5

document.getElementById('gastoManualForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const motivo = document.getElementById('g_motivo').value;
    const monto = parseFloat(document.getElementById('g_monto').value);
    const fecha = document.getElementById('g_fecha').value || new Date().toISOString();

    const { error } = await _supabase.from('flujo_caja').insert([
        { 
            tipo: 'egreso', 
            monto: monto, 
            descripcion: `GASTO MANUAL: ${motivo.toUpperCase()}`, // Nombre corregido
            fecha: fecha 
        }
    ]);

    if (!error) {
        e.target.reset();
        if (typeof renderizarTodo === 'function') await renderizarTodo();
    }
});

async function renderizarCaja() {
    // 1. Traer datos
    const { data: flujo, error } = await _supabase.from('flujo_caja').select('*');
    
    const lista = document.getElementById('listaFlujoMensual');
    const resumen = document.getElementById('resumenMensual');
    const balanceHeader = document.getElementById('balance_monto');
    
    if (error) {
        console.error("Error de Supabase:", error);
        return;
    }
    if (!lista || !resumen) return;

    // 2. Cálculos de fechas para el mes actual
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    // 3. Balance Total (Header) - Suma todo lo de la tabla
    const saldoTotalGlobal = flujo?.reduce((acc, f) => 
        f.tipo === 'ingreso' ? acc + parseFloat(f.monto) : acc - parseFloat(f.monto), 0) || 0;
    
    if (balanceHeader) balanceHeader.innerText = `$${saldoTotalGlobal.toFixed(2)}`;

    // 4. Filtrar movimientos del mes
    const movimientosMes = flujo?.filter(f => {
        const d = new Date(f.fecha);
        return d.getMonth() === mesActual && d.getFullYear() === añoActual;
    }) || [];

    let ingresosMes = 0;
    let gastosMes = 0;

    // Limpiar tabla antes de llenar
    lista.innerHTML = '';

    // 5. Llenar tabla con nombres de columna exactos de tu Supabase
    movimientosMes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    movimientosMes.forEach(item => {
        const esIngreso = item.tipo === 'ingreso';
        const montoNum = parseFloat(item.monto);
        
        if (esIngreso) ingresosMes += montoNum;
        else gastosMes += montoNum;

        const fechaObj = new Date(item.fecha);
        const fechaFormateada = isNaN(fechaObj) ? "S/F" : fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        
        // IMPORTANTE: Aquí usamos item.descripcion (como en tu imagen)
        lista.innerHTML += `
            <tr class="hover:bg-gray-700/30 border-b border-gray-800 transition">
                <td class="p-4 text-[10px] font-mono text-gray-400 italic">${fechaFormateada}</td>
                <td class="p-4 text-xs font-bold uppercase tracking-tighter text-white">
                    ${item.descripcion || 'SIN DESCRIPCIÓN'} 
                </td>
                <td class="p-4 text-right font-black font-mono ${esIngreso ? 'text-green-400' : 'text-red-400'}">
                    ${esIngreso ? '+' : '-'}$${montoNum.toFixed(2)}
                </td>
            </tr>`;
    });

    // 6. Pintar cuadros de resumen
    resumen.innerHTML = `
        <div class="bg-blue-600/10 border border-blue-500/50 p-6 rounded-3xl shadow-2xl">
            <span class="text-[10px] text-blue-400 font-black uppercase block mb-1">Caja Real</span>
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
