// caja.js - SISTEMA DE CONTABILIDAD CVSE V6.0
document.addEventListener('DOMContentLoaded', () => {
    renderizarCaja();
    
    document.getElementById('gastoManualForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const motivo = document.getElementById('g_motivo').value;
        const monto = parseFloat(document.getElementById('g_monto').value);
        
        await _supabase.from('flujo_caja').insert([
            { tipo: 'egreso', monto: monto, descripcion: `GASTO OPERATIVO: ${motivo.toUpperCase()}`, fecha_registro: new Date().toISOString() }
        ]);
        
        e.target.reset();
        renderizarCaja();
        if(typeof renderizarTodo === 'function') renderizarTodo();
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

    // 1. CALCULAR SALDO QUE VIENE DE MESES ANTERIORES (LO QUE SOBRÓ)
    const saldoAnterior = flujo?.filter(f => {
        const fechaF = new Date(f.fecha_registro);
        return fechaF < new Date(añoActual, mesActual, 1);
    }).reduce((acc, f) => f.tipo === 'ingreso' ? acc + f.monto : acc - f.monto, 0) || 0;

    // 2. FILTRAR MOVIMIENTOS DEL MES ACTUAL
    const movimientosMes = flujo?.filter(f => {
        const fechaF = new Date(f.fecha_registro);
        return fechaF.getMonth() === mesActual && fechaF.getFullYear() === añoActual;
    }) || [];

    let ingresosMes = 0;
    let gastosCuentas = 0; // Inversión en stock
    let gastosVarios = 0;  // Gastos de operación

    lista.innerHTML = '';
    movimientosMes.sort((a,b) => new Date(b.fecha_registro) - new Date(a.fecha_registro)).forEach(item => {
        if(item.tipo === 'ingreso') {
            ingresosMes += item.monto;
        } else {
            if(item.descripcion.includes("INVERSIÓN") || item.descripcion.includes("CUENTA")) {
                gastosCuentas += item.monto;
            } else {
                gastosVarios += item.monto;
            }
        }

        const fechaL = new Date(item.fecha_registro).toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'});
        lista.innerHTML += `
            <tr class="hover:bg-gray-700/30 border-b border-gray-700/50">
                <td class="p-4 text-[10px] font-mono text-gray-400">${fechaL}</td>
                <td class="p-4 text-xs font-bold uppercase">${item.descripcion}</td>
                <td class="p-4 text-right font-black ${item.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'}">
                    ${item.tipo === 'ingreso' ? '+' : '-'}$${item.monto.toFixed(2)}
                </td>
            </tr>`;
    });

    const totalGastos = gastosCuentas + gastosVarios;
    const gananciaNetaMes = ingresosMes - totalGastos;
    const disponibleReal = saldoAnterior + gananciaNetaMes;

    // 3. RENDERIZAR PANEL CONTABLE
    resumen.innerHTML = `
        <div class="bg-blue-600/20 p-6 rounded-[2rem] border-2 border-blue-500 shadow-2xl">
            <span class="text-[10px] text-blue-400 font-black uppercase block mb-1">Caja Real (Efectivo Total)</span>
            <p class="text-3xl font-mono text-white font-black">$${disponibleReal.toFixed(2)}</p>
            <p class="text-[9px] text-gray-400 mt-1 italic">Incluye lo que sobró el mes pasado</p>
        </div>

        <div class="bg-gray-850 p-6 rounded-[2rem] border border-gray-700">
            <span class="text-[10px] text-green-500 font-black uppercase block mb-1">Ganancia Neta Diciembre/Enero</span>
            <p class="text-2xl font-mono text-white font-black">$${gananciaNetaMes.toFixed(2)}</p>
            <p class="text-[9px] text-gray-500 mt-1">Ventas: $${ingresosMes.toFixed(2)} | Gastos: $${totalGastos.toFixed(2)}</p>
        </div>

        <div class="bg-gray-850 p-6 rounded-[2rem] border border-gray-700">
            <span class="text-[10px] text-red-400 font-black uppercase block mb-1">¿En qué se fue el dinero?</span>
            <div class="flex justify-between text-[11px] mt-2">
                <span class="text-gray-400 font-bold">Inversión Cuentas:</span>
                <span class="text-white font-mono">$${gastosCuentas.toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-[11px] mt-1">
                <span class="text-gray-400 font-bold">Gastos Operativos:</span>
                <span class="text-white font-mono">$${gastosVarios.toFixed(2)}</span>
            </div>
        </div>
    `;
}
