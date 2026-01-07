// madres.js - GESTIÓN MANUAL DE CAPACIDAD POR CUENTA
document.addEventListener('DOMContentLoaded', () => {
    renderizarMadres();

    document.getElementById('madreForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // LEER EL DATO MANUAL QUE TÚ PUSISTE
        const cantidadManual = parseInt(document.getElementById('m_perfiles_manual').value);

        const nuevaCuenta = {
            plataforma: document.getElementById('m_plataforma').value.toUpperCase(),
            email: document.getElementById('m_email').value,
            password: document.getElementById('m_password').value,
            fecha_vencimiento: document.getElementById('m_vencimiento').value,
            // AQUÍ SE GUARDA TU DATO MANUAL
            perfiles_oficiales: cantidadManual, 
            costo_compra: parseFloat(document.getElementById('m_costo').value),
            fecha_compra: new Date().toISOString().split('T')[0]
        };

        const { error } = await _supabase.from('cuentas_madre').insert([nuevaCuenta]);

        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            // Registrar el gasto en la caja con la misma fecha
            await _supabase.from('flujo_caja').insert([{
                tipo: 'egreso',
                monto: nuevaCuenta.costo_compra,
                descripcion: `INVERSIÓN: ${nuevaCuenta.plataforma}`,
                fecha: new Date().toISOString()
            }]);

            e.target.reset();
            renderizarMadres();
        }
    });
});

async function renderizarMadres() {
    const { data: madres } = await _supabase.from('cuentas_madre').select('*');
    const { data: perfiles } = await _supabase.from('perfiles_clientes').select('*');
    const grid = document.getElementById('gridMadresDetalle');

    if (!grid) return;
    grid.innerHTML = '';

    madres?.forEach(madre => {
        const ocupados = perfiles?.filter(p => p.cuenta_madre_id === madre.id).length || 0;
        
        // EL SISTEMA USA EL DATO QUE TÚ PUSISTE MANUALMENTE EN LA BASE DE DATOS
        const limiteReal = madre.perfiles_oficiales; 
        
        const disponible = limiteReal - ocupados;
        const colorCupos = disponible < 0 ? 'text-red-500' : (disponible === 0 ? 'text-orange-500' : 'text-green-500');

        grid.innerHTML += `
            <div class="bg-gray-800 p-5 rounded-[2rem] border border-gray-700 shadow-lg">
                <h3 class="text-lg font-black text-yellow-500 italic uppercase">${madre.plataforma}</h3>
                <p class="text-[10px] text-gray-500 font-mono mb-3">${madre.email}</p>
                
                <div class="flex justify-between items-center bg-black/30 p-4 rounded-2xl">
                    <div class="text-center">
                        <p class="text-[9px] text-gray-500 uppercase font-black">Cupos Ocupados</p>
                        <p class="text-xl font-black text-white">${ocupados}</p>
                    </div>
                    <div class="text-center border-l border-gray-700 pl-4">
                        <p class="text-[9px] text-gray-500 uppercase font-black">Tu Límite Manual</p>
                        <p class="text-xl font-black ${colorCupos}">${limiteReal}</p>
                    </div>
                </div>
                
                <p class="text-[9px] text-center mt-3 text-gray-400 uppercase font-bold italic">
                    ${disponible <= 0 ? '⚠️ CUENTA LLENA' : `Quedan ${disponible} perfiles libres`}
                </p>
            </div>
        `;
    });
}
