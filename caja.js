// caja.js - CONTROL FINANCIERO PROFESIONAL CVSE V6.0
document.addEventListener('DOMContentLoaded', () => {
    renderizarCaja();
    
    // Formulario para Gastos Manuales (Rembolsos, comisiones, etc)
    document.getElementById('gastoManualForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const motivo = document.getElementById('g_motivo').value;
        const monto = parseFloat(document.getElementById('g_monto').value);

        // Insertamos usando los nombres exactos de tu tabla en la imagen
        await _supabase.from('flujo_caja').insert([
            { 
                tipo: 'egreso', 
                monto: monto, 
                descripcion: `GASTO MANUAL: ${motivo.toUpperCase()}`,
                fecha: new Date().toISOString() 
            }
        ]);
        
        e.target.reset();
        renderizarCaja();
        if(typeof renderizarTodo === 'function') renderizarTodo();
    });
});

async function renderizarCaja() {
    // Consultamos la tabla flujo_caja que mostraste en la imagen
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const lista = document.getElementById('listaFlujoMensual');
    const resumen = document.getElementById('resumenMensual');
    
    if(!lista || !resumen) return;

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    // 1. CAPITAL DE ARRASTRE (Lo que sobró antes del 1 de este mes)
    const saldoAnterior = flujo?.filter(f => {
        const fechaMov = new Date(f.fecha);
        return fechaMov < new Date(añoActual, mesActual, 1);
    }).reduce((acc, f) => f.tipo === 'ingreso' ? acc + f.monto : acc - f.monto, 0) || 0;

    // 2. MOVIMIENTOS DEL MES ACTUAL (Diciembre o Enero según la fecha)
    const movimientosMes = flujo?.filter(f => {
        const fechaMov = new Date(f.fecha);
        return fechaMov.getMonth() === mesActual && fechaMov.getFullYear() === añoActual;
    }) || [];

    let ingresosMes = 0;
    let gastosStock = 0;    // Inversión en Cuentas Madre
    let gastosOperativos = 0; // Gastos manuales (como el 'rembolso' de tu imagen)

    lista.innerHTML = '';
    
    // Ordenamos para que lo más nuevo (hoy) salga primero
    movimientosMes.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).reverse();

    movimientosMes.forEach(item => {
        const esIngreso = item.tipo === 'ingreso';
        if(esIngreso) {
            ingresosMes += item.monto;
        } else {
            // Clasificación contable basada en tu descripción
            if(item.descripcion.includes("GASTO MANUAL")) gastosOperativos += item.monto;
            else gastosStock += item.monto;
        }

        const fechaLocal = new Date(item.fecha).toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'});
        
        lista.innerHTML += `
            <tr class="hover:bg-gray-700/30 border-b border-gray-700/50 transition">
                <td class="p-4 text-[10px] font-mono text-gray-400 italic">${fechaLocal}</td>
                <td class="p-4 text-xs font-bold uppercase tracking-tighter">${item.descripcion}</td>
                <td class="p-4 text-right font-black font-mono ${esIngreso ? 'text-green-400' : 'text-red-400'}">
                    ${esIngreso ? '+' : '-'}$${item.monto.toFixed(2)}
                </td>
            </tr>`;
    });

    const totalEgresos = gastosStock + gastosOperativos;
    const gananciaNetaMes = ingresosMes - totalEgresos;
    const dineroTotalEnMano = saldoAnterior + gananciaNetaMes;

    // 3. INTERFAZ DE RESULTADOS (Lo que necesitas para formalizar)
    resumen.innerHTML = `
        <div class="bg-blue-600/10 border-2 border-blue-500 p-6 rounded-[2rem] shadow-2xl">
            <span class="text-[10px] text-blue-400 font-black uppercase block">Caja Total Disponible</span>
            <p class="text-3xl font-mono text-white font-black">$${dineroTotalEnMano.toFixed(2)}</p>
            <p class="text-[9px] text-gray-500 mt-1">Saldo mes anterior: $${saldoAnterior.toFixed(2)}</p>
        </div>

        <div class="bg-gray-850 border border-gray-700 p-6 rounded-[2rem]">
            <span class="text-[10px] text-green-500 font-black uppercase block">Ganancia Neta (Este Mes)</span>
            <p class="text-3xl font-mono text-white font-black">$${gananciaNetaMes.toFixed(2)}</p>
            <div class="flex justify-between text-[9px] mt-2 border-t border-gray-800 pt-2">
                <span class="text-gray-400 uppercase">Ventas: $${ingresosMes.toFixed(2)}</span>
                <span class="text-gray-400 uppercase">Egresos: $${totalEgresos.toFixed(2)}</span>
            </div>
        </div>

        <div class="bg-gray-850 border border-gray-700 p-6 rounded-[2rem]">
            <span class="text-[10px] text-red-400 font-black uppercase block mb-2 italic">¿En qué gastaste?</span>
            <div class="space-y-2">
                <div class="flex justify-between text-[11px]">
                    <span class="text-gray-400 uppercase">Inversión Stock:</span>
                    <span class="font-mono text-red-400">-$${gastosStock.toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-[11px]">
                    <span class="text-gray-400 uppercase">Gastos Manuales:</span>
                    <span class="font-mono text-red-400">-$${gastosOperativos.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}
