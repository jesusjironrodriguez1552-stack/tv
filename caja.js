// caja.js - CONTROL FINANCIERO PROFESIONAL CVSE V6.5

// 1. Escuchador para el formulario de Gastos Manuales
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
        // El cerebro (app.js) se encarga de refrescar todo
        if (typeof renderizarTodo === 'function') await renderizarTodo();
    } else {
        alert("Error al registrar el gasto");
    }
});

async function renderizarCaja() {
    const { data: flujo, error } = await _supabase.from('flujo_caja').select('*');
    const lista = document.getElementById('listaFlujoMensual');
    const resumen = document.getElementById('resumenMensual');
    const balanceHeader = document.getElementById('balance_monto'); // El cuadro negro del index
    
    if (!lista || !resumen || error) return;

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    // 1. CÁLCULO DE SALDO TOTAL (Para el Header)
    const saldoTotalGlobal = flujo?.reduce((acc, f) => f.tipo === 'ingreso' ? acc + f.monto : acc - f.monto, 0) || 0;
    
    // Actualizar el header inmediatamente
    if (balanceHeader) {
        balanceHeader.innerText = `$${saldoTotalGlobal.toFixed(2)}`;
    }

    // 2. CAPITAL DE ARRASTRE (Saldo antes del mes actual)
    const saldoAnterior = flujo?.filter(f => {
        const fechaMov = new Date(f.fecha);
        return fechaMov < new Date(añoActual, mesActual, 1);
    }).reduce((acc, f) => f.tipo === 'ingreso' ? acc + f.monto : acc - f.monto, 0) || 0;

    // 3. MOVIMIENTOS DEL MES ACTUAL
    const movimientosMes = flujo?.filter(f => {
        const fechaMov = new Date(f.fecha);
        return fechaMov.getMonth() === mesActual && fechaMov.getFullYear() === añoActual;
    }) || [];

    let ingresosMes = 0;
    let gastosMes = 0;

    lista.innerHTML = '';
    // Ordenar: Más reciente primero
    movimientosMes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    movimientosMes.forEach(item => {
        const esIngreso = item.tipo === 'ingreso';
        if (esIngreso) ingresosMes += item.monto;
        else gastosMes += item.monto;

        const fechaLocal = new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        
        lista.innerHTML += `
            <tr class="hover:bg-gray-700/30 border-b border-gray-700/50 transition">
                <td class="p-4 text-[10px] font-mono text-gray-400 italic">${fechaLocal}</td>
                <td class="p-4 text-xs font-bold uppercase tracking-tighter">${item.descripcion}</td>
                <td class="p-4 text-right font-black font-mono ${esIngreso ? 'text-green-400' : 'text-red-400'}">
                    ${esIngreso ? '+' : '-'}$${item.monto.toFixed(2)}
                </td>
            </tr>`;
    });

    const gananciaNetaMes = ingresosMes - gastosMes;

    // 4. INTERFAZ DE RESULTADOS (Sección Caja)
    resumen.innerHTML = `
        <div class="bg-blue-600/10 border-2 border-blue-500 p-6 rounded-[2rem] shadow-2xl">
            <span class="text-[10px] text-blue-400 font-black uppercase block">Caja Total Real</span>
            <p class="text-3xl font-mono text-white font-black">$${saldoTotalGlobal.toFixed(2)}</p>
            <p class="text-[9px] text-gray-500 mt-1 uppercase">Sobra de meses anteriores: $${saldoAnterior.toFixed(2)}</p>
        </div>

        <div class="bg-gray-800 border border-gray-700 p-6 rounded-[2rem]">
            <span class="text-[10px] text-green-500 font-black uppercase block">Ingresos del Mes</span>
            <p class="text-3xl font-mono text-white font-black">$${ingresosMes.toFixed(2)}</p>
            <p class="text-[9px] text-gray-400 mt-1 uppercase">Ventas brutas</p>
        </div>

        <div class="bg-gray-800 border border-gray-700 p-6 rounded-[2rem]">
            <span class="text-[10px] text-red-500 font-black uppercase block">Gastos del Mes</span>
            <p class="text-3xl font-mono text-white font-black">$${gastosMes.toFixed(2)}</p>
            <p class="text-[9px] text-gray-400 mt-1 uppercase">Inversión y manuales</p>
        </div>
    `;
}
