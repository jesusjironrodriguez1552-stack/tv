// madres.js - GESTIÓN ESPECIALIZADA DE CUENTAS MADRE (INVENTARIO)

async function renderizarMadres() {
    // 1. Obtener datos de Supabase usando los nombres reales de tus columnas
    const { data: madres, error } = await _supabase
        .from('cuentas_madre')
        .select('*')
        .order('fecha_vencimiento', { ascending: true });

    const { data: perfiles } = await _supabase
        .from('perfiles_clientes')
        .select('cuenta_madre_id');

    const grid = document.getElementById('gridMadresDetalle');
    if (!grid) return;
    if (error) {
        console.error("Error al cargar madres:", error);
        grid.innerHTML = '<p class="text-red-500">Error al conectar con el inventario.</p>';
        return;
    }

    grid.innerHTML = '';

    madres.forEach(m => {
        // Cálculo de capacidad
        const ocupados = perfiles?.filter(p => p.cuenta_madre_id === m.id).length || 0;
        const limite = 5; // O usa m.perfiles_oficiales si lo tienes en la tabla
        const disponibles = limite - ocupados;
        
        // Formatear fecha para alerta visual
        const hoy = new Date();
        const vence = new Date(m.fecha_vencimiento);
        const diasRestantes = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));

        grid.innerHTML += `
            <div class="bg-gray-800/50 border ${diasRestantes <= 5 ? 'border-red-500/50' : 'border-gray-700'} rounded-[2rem] p-6 shadow-xl relative overflow-hidden transition hover:bg-gray-800">
                
                <div class="absolute top-0 right-0 px-4 py-1 ${diasRestantes <= 5 ? 'bg-red-600' : 'bg-blue-600'} text-[9px] font-black uppercase rounded-bl-xl text-white">
                    ${diasRestantes <= 0 ? 'Vencida' : 'Vence en ' + diasRestantes + 'd'}
                </div>

                <h4 class="text-2xl font-black text-yellow-500 mb-4 uppercase italic tracking-tighter">${m.plataforma}</h4>
                
                <div class="space-y-2 mb-6">
                    <div class="flex items-center justify-between bg-black/30 p-2 rounded-lg border border-gray-700/50 group">
                        <div class="truncate">
                            <p class="text-[8px] text-gray-500 font-bold uppercase">Correo</p>
                            <p class="text-xs font-mono text-gray-300 truncate">${m.email_cuenta}</p>
                        </div>
                        <button onclick="copiarTexto('${m.email_cuenta}', 'Correo')" class="p-2 hover:text-blue-400 transition">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                        </button>
                    </div>

                    <div class="flex items-center justify-between bg-black/30 p-2 rounded-lg border border-gray-700/50 group">
                        <div class="truncate">
                            <p class="text-[8px] text-gray-500 font-bold uppercase">Contraseña</p>
                            <p class="text-xs font-mono text-blue-400 font-bold tracking-widest">${m.password_cuenta}</p>
                        </div>
                        <button onclick="copiarTexto('${m.password_cuenta}', 'Pass')" class="p-2 hover:text-blue-400 transition">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                        </button>
                    </div>
                </div>

                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-[9px] text-gray-500 uppercase font-black mb-1">Cupos ocupados</p>
                        <div class="flex gap-1">
                            ${Array.from({ length: limite }, (_, i) => `
                                <div class="w-4 h-2 rounded-full ${i < ocupados ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500/20'}"></div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-3xl font-black leading-none ${disponibles > 0 ? 'text-white' : 'text-red-500'}">${disponibles}</span>
                        <p class="text-[8px] text-gray-500 uppercase font-bold">Libres</p>
                    </div>
                </div>

                <button onclick="eliminarMadre('${m.id}')" class="w-full mt-6 py-2 bg-red-900/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white text-[10px] font-black uppercase rounded-xl transition-all duration-300">
                    Eliminar Inventario
                </button>
            </div>
        `;
    });
}

// --- UTILIDADES ESPECÍFICAS ---

window.copiarTexto = (texto, tipo) => {
    navigator.clipboard.writeText(texto);
    // Notificación minimalista opcional o simple alert
    console.log(`${tipo} copiado: ${texto}`);
};

window.eliminarMadre = async (id) => {
    if (confirm("⚠️ ¿Estás seguro? Se perderá el rastro de esta cuenta madre y sus perfiles quedarán huérfanos.")) {
        const { error } = await _supabase.from('cuentas_madre').delete().eq('id', id);
        if (!error) {
            // Avisamos al cerebro que debe refrescar todo
            if (typeof renderizarTodo === 'function') renderizarTodo();
            // Refrescamos selectores si existen
            if (typeof actualizarSelectores === 'function') actualizarSelectores();
        }
    }
};

// Formulario de Nueva Madre
document.getElementById('madreForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const costo = parseFloat(document.getElementById('m_costo').value);
    const plat = document.getElementById('m_plataforma').value;

    const { error } = await _supabase.from('cuentas_madre').insert([{
        plataforma: plat.toUpperCase(),
        email_cuenta: document.getElementById('m_email').value,
        password_cuenta: document.getElementById('m_password').value,
        fecha_vencimiento: document.getElementById('m_vencimiento').value,
        costo_compra: costo
    }]);

    if (!error) {
        // Registrar gasto automático
        await _supabase.from('flujo_caja').insert([{
            tipo: 'egreso',
            monto: costo,
            descripcion: `Inversión: ${plat}`,
            fecha: new Date().toISOString()
        }]);

        e.target.reset();
        if (typeof renderizarTodo === 'function') renderizarTodo();
    }
});
