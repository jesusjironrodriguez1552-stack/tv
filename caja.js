// caja.js - SISTEMA DE CONTROL FINANCIERO CVSE V6.0
document.addEventListener('DOMContentLoaded', () => {
    renderizarCaja();
    
    // Captura de Gastos Manuales (Operativos)
    document.getElementById('gastoManualForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const motivo = document.getElementById('g_motivo').value;
        const monto = parseFloat(document.getElementById('g_monto').value);
        const fechaExacta = new Date().toISOString();

        // Registro de Gasto con categoría "GASTO OPERATIVO"
        await _supabase.from('flujo_caja').insert([
            { 
                tipo: 'egreso', 
                monto: monto, 
                descripcion: `GASTO OPERATIVO: ${motivo.toUpperCase()}`,
                fecha_registro: fechaExacta 
            }
        ]);
        
        e.target.reset();
        renderizarCaja();
        if(typeof renderizarTodo === 'function') renderizarTodo(); // Actualiza saldo global en header
    });
});

async function renderizarCaja() {
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const lista = document.getElementById('listaFlujoMensual');
    const resumen = document.getElementById('resumenMensual');
    
    if(!lista || !resumen) return;

    // Obtener fechas para el filtro mensual
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    // 1. SALDO QUE TRAE COLA (LO QUE SOBRÓ DE MESES ANTERIORES)
    const saldoMesAnterior = flujo?.filter(f => {
        const fechaF = new Date(f.fecha_registro);
        return fechaF < new Date(añoActual, mesActual, 1);
    }).reduce((acc, f) => f.tipo === 'ingreso' ? acc + f.monto : acc - f.monto, 0) || 0;

    // 2. MOVIMIENTOS EXCLUSIVOS DEL MES ACTUAL
    const movimientosMes = flujo?.filter(f => {
        const fechaF = new Date(f.fecha_registro);
        return fechaF.getMonth() === mesActual && fechaF.getFullYear() === añoActual;
    }) || [];

    let ingresosMes = 0;
    let inversionCuentas = 0; // Gastos en "INVERSIÓN" (Cuentas Madre)
    let gastosOperativos = 0; // Gastos manuales (Luz, publicidad, etc)

    lista.innerHTML = '';
    
    // Ordenar por fecha (más reciente arriba)
    movimientosMes.sort((a,b) => new Date(b.fecha_registro) - new Date(a.fecha_registro));

    movimientosMes.forEach(item => {
        const esIngreso = item.tipo === 'ingreso';
        
        if(esIngreso) {
            ingresosMes += item.monto;
        } else {
            // Clasificar gasto por palabra clave
            if(item.descripcion.includes("INVERSIÓN") || item.descripcion.includes("COMPRA")) {
                inversionCuentas += item.monto;
            } else {
                gastosOperativos += item.monto;
            }
        }

        const fechaL = new Date(item.fecha_registro).toLocaleDateString('es-ES', {
            day: '2-digit', 
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        lista.innerHTML += `
            <tr class="hover:bg-gray-700/30 border-b border-gray-700/40 transition">
                <td class="p-4 text-[10px] font-mono text-gray-500">${fechaL}</td>
                <td class="p-4 text-xs font-bold uppercase tracking-tighter">${item.descripcion}</td>
                <td class="p-4 text-[10px] italic ${esIngreso ? 'text-green-500' : 'text-red-400'}">
                    ${esIngreso ? 'Venta' : 'Gasto'}
                </td>
                <td class="p-4 text-right font-black font-mono ${esIngreso ? 'text-green-400' : 'text-red-400'}">
                    ${esIngreso ? '+' : '-'}$${item.monto.toFixed(2)}
                </td>
            </tr>`;
    });

    const totalGastosMes = inversionCuentas + gastosOperativos;
    const gananciaNetaMes = ingresosMes - totalGastosMes;
    const saldoTotalDisponible = saldoMesAnterior + gananciaNetaMes;

    // 3. ACTUALIZAR PANEL DE RESUMEN CONTABLE
    resumen.innerHTML = `
        <div class="bg-blue-600/10 border-2 border-blue-500 p-6 rounded-[2.5rem] shadow-2xl">
            <span class="text-[10px] text-blue-400 font-black uppercase block mb-1">Caja Real (Efectivo Total)</span>
            <p class="text-3xl font-mono text-white font-black">$${saldoTotalDisponible.toFixed(2)}</p>
            <p class="text-[9px] text-gray-500 mt-1 uppercase">Saldo arrastrado: $${saldoMesAnterior.toFixed(2)}</p>
        </div>

        <div class="bg-gray-850 border border-gray-700 p-6 rounded-[2.5rem] shadow-xl">
            <span class="text-[10px] text-green-500 font-black uppercase block mb-1">Ganancia Neta del Mes</span>
            <p class="text-3xl font-mono text-white font-black">$${gananciaNetaMes.toFixed(2)}</p>
            <div class="flex justify-between text-[9px] mt-2 border-t border-gray-800 pt-2">
                <span class="text-gray-400 uppercase font-bold">Ventas: $${ingresosMes.toFixed(2)}</span>
                <span class="text-gray-400 uppercase font-bold">Egresos: $${totalGastosMes.toFixed(2)}</span>
            </div>
        </div>

        <div class="bg-gray-850 border border-gray-700 p-6 rounded-[2.5rem] shadow-xl">
            <span class="text-[10px] text-red-400 font-black uppercase block mb-2 italic">Distribución de Gastos</span>
            <div class="space-y-2">
                <div class="flex justify-between items-center text-[11px]">
                    <span class="text-gray-400 font-bold uppercase">Stock (Inversión):</span>
                    <span class="font-mono text-red-400">-$${inversionCuentas.toFixed(2)}</span>
                </div>
                <div class="flex justify-between items-center text-[11px]">
                    <span class="text-gray-400 font-bold uppercase">Costos Operativos:</span>
                    <span class="font-mono text-red-400">-$${gastosOperativos.toFixed(2)}</span>
                </div>
            </div>
            <p class="text-[9px] text-gray-600 mt-4 text-center font-black uppercase">Seguimiento de Flujo de Caja</p>
        </div>
    `;
}
