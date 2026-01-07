// caja.js - Manejo de Finanzas CVSE
document.addEventListener('DOMContentLoaded', () => {
    renderizarCaja();
    
    document.getElementById('gastoManualForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const motivo = document.getElementById('g_motivo').value;
        const monto = parseFloat(document.getElementById('g_monto').value);
        
        await _supabase.from('flujo_caja').insert([
            { tipo: 'egreso', monto: monto, descripcion: `GASTO: ${motivo}` }
        ]);
        
        e.target.reset();
        renderizarCaja();
        if(typeof renderizarTodo === 'function') renderizarTodo(); // Actualiza el saldo arriba
    });
});

async function renderizarCaja() {
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const lista = document.getElementById('listaFlujoMensual');
    const resumen = document.getElementById('resumenMensual');
    
    if(!lista || !resumen) return;

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    // FILTRAR SOLO EL MES ACTUAL
    const movimientosMes = flujo?.filter(f => {
        const fechaF = new Date(f.fecha_registro);
        return fechaF.getMonth() === mesActual && fechaF.getFullYear() === añoActual;
    }) || [];

    let bruto = 0; // Solo ingresos
    let gastos = 0; // Solo egresos (compras y gastos extra)

    lista.innerHTML = '';
    movimientosMes.sort((a,b) => new Date(b.fecha_registro) - new Date(a.fecha_registro)).forEach(item => {
        if(item.tipo === 'ingreso') bruto += item.monto;
        else gastos += item.monto;

        lista.innerHTML += `
            <tr class="hover:bg-gray-700/30 transition">
                <td class="p-4 text-[10px] text-gray-400">${new Date(item.fecha_registro).toLocaleDateString()}</td>
                <td class="p-4 font-bold text-xs uppercase">${item.descripcion}</td>
                <td class="p-4 italic text-[10px]">${item.tipo === 'ingreso' ? '💰 Venta' : '💸 Gasto'}</td>
                <td class="p-4 text-right font-mono ${item.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'}">
                    ${item.tipo === 'ingreso' ? '+' : '-'}$${item.monto.toFixed(2)}
                </td>
            </tr>`;
    });

    const neto = bruto - gastos;

    // RENDERIZAR TARJETAS DE RESUMEN
    resumen.innerHTML = `
        <div class="bg-black/40 p-5 rounded-3xl border border-gray-700">
            <span class="text-[9px] text-gray-500 font-black uppercase">Ingreso Bruto (Mes)</span>
            <p class="text-2xl font-mono text-green-500 font-black">$${bruto.toFixed(2)}</p>
        </div>
        <div class="bg-black/40 p-5 rounded-3xl border border-gray-700">
            <span class="text-[9px] text-gray-500 font-black uppercase">Gastos Totales</span>
            <p class="text-2xl font-mono text-red-500 font-black">$${gastos.toFixed(2)}</p>
        </div>
        <div class="bg-blue-900/20 p-5 rounded-3xl border border-blue-500/50">
            <span class="text-[9px] text-blue-400 font-black uppercase">Ganancia Neta (Lo que te queda)</span>
            <p class="text-3xl font-mono text-white font-black">$${neto.toFixed(2)}</p>
        </div>
    `;
}
