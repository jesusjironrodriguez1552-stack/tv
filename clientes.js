// clientes.js - ESPECIALISTA EN GESTIÓN DE CLIENTES Y VENTAS

async function renderizarClientes() {
    // 1. Obtener datos con la unión de la cuenta madre
    const { data: perfiles, error } = await _supabase
        .from('perfiles_clientes')
        .select('*, cuentas_madre(*)');

    const tabla = document.getElementById('tablaPerfiles');
    if (!tabla) return;
    if (error) {
        console.error("Error en clientes:", error);
        return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    tabla.innerHTML = '';

    // Ordenar por fecha de vencimiento (más próximos primero)
    perfiles?.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));

    perfiles?.forEach(p => {
        const vence = new Date(p.fecha_vencimiento);
        const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        const m = p.cuentas_madre;

        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-800 transition hover:bg-gray-800/40 ${dif <= 0 ? 'bg-red-900/10' : ''}`;
        
        tr.innerHTML = `
            <td class="p-4">
                <p class="font-bold text-white uppercase text-xs">${p.nombre_cliente}</p>
                <p class="text-[10px] text-green-500 font-mono">${p.whatsapp || 'Sin WhatsApp'}</p>
            </td>
            <td class="p-4 text-[10px]">
                ${m ? 
                    `<b class="text-blue-400 uppercase">${m.plataforma}</b><br>
                     <span class="text-gray-400">${m.email_cuenta}</span><br>
                     <span class="text-yellow-500 font-bold italic">PERFIL: ${p.perfil_asignado}</span>` 
                    : '<span class="text-red-500 font-bold animate-pulse uppercase">⚠️ REUBICAR</span>'
                }
            </td>
            <td class="p-4 text-center">
                <span class="px-3 py-1 rounded-full text-[10px] font-black ${dif <= 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-900 text-green-400 border border-green-900/50'}">
                    ${p.fecha_vencimiento}
                </span>
                <p class="text-[8px] mt-1 text-gray-500 uppercase">${dif <= 0 ? 'Vencido' : 'Faltan ' + dif + ' días'}</p>
            </td>
            <td class="p-4">
                <div class="flex justify-end gap-2">
                    <div class="action-btn-container">
                        <button onclick="enviarRecordatorio('${p.nombre_cliente}', '${p.whatsapp}', '${m?.plataforma}', ${dif})" class="p-2 bg-green-600/20 hover:bg-green-600 text-white rounded-lg transition">🔔</button>
                    </div>
                    <div class="action-btn-container">
                        <button onclick="abrirMigrar('${p.id}')" class="p-2 bg-blue-600/20 hover:bg-blue-600 text-white rounded-lg transition">⇄</button>
                    </div>
                    <div class="action-btn-container">
                        <button onclick="borrarCliente('${p.id}')" class="p-2 bg-red-600/20 hover:bg-red-600 text-white rounded-lg transition">✕</button>
                    </div>
                </div>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

// --- FORMULARIO DE REGISTRO DE VENTAS ---
document.getElementById('perfilForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const montoVenta = parseFloat(document.getElementById('monto').value);
    const nombreC = document.getElementById('nombre_cliente').value;
    const plataformaID = document.getElementById('cuenta_madre_id').value;

    const { error: errP } = await _supabase.from('perfiles_clientes').insert([{
        nombre_cliente: nombreC,
        whatsapp: document.getElementById('whatsapp').value,
        cuenta_madre_id: plataformaID,
        perfil_asignado: document.getElementById('perfil_asignado').value,
        fecha_vencimiento: document.getElementById('vencimiento_cliente').value,
        precio_venta: montoVenta
    }]);

    if (!errP) {
        // Registrar el ingreso en la caja
        await _supabase.from('flujo_caja').insert([{
            tipo: 'ingreso',
            monto: montoVenta,
            descripcion: `Venta Perfil: ${nombreC}`,
            fecha: new Date().toISOString()
        }]);

        alert("✅ Venta registrada con éxito");
        e.target.reset();
        if (typeof renderizarTodo === 'function') renderizarTodo();
    } else {
        alert("Error al guardar cliente");
    }
});

// --- FUNCIONES DE VENTANA ---

window.enviarRecordatorio = (nombre, wa, plataforma, dias) => {
    if(!wa || wa === 'undefined') return alert("No hay número de WhatsApp registrado");
    
    const saludo = dias <= 0 ? "ha vencido HOY" : `vence en ${dias} días`;
    const msg = `Hola *${nombre}*, te saluda Streaming Store. Te recordamos que tu servicio de *${plataforma}* ${saludo}. ¿Deseas renovar para mantener tu mismo perfil?`;
    
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.borrarCliente = async (id) => {
    if (confirm("¿Eliminar este cliente permanentemente?")) {
        const { error } = await _supabase.from('perfiles_clientes').delete().eq('id', id);
        if (!error) if (typeof renderizarTodo === 'function') renderizarTodo();
    }
};

window.abrirMigrar = (id) => {
    document.getElementById('migrar_perfil_id').value = id;
    document.getElementById('modalMigrar').classList.remove('hidden');
};
