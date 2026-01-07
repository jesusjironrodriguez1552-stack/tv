// app.js - LÓGICA CENTRAL CVSE (Usa la conexión de config.js)

let tablaPerfiles, selectMadres, gridMadresDetalle, migrarMadreSelect;

document.addEventListener('DOMContentLoaded', () => {
    tablaPerfiles = document.getElementById('tablaPerfiles');
    selectMadres = document.getElementById('cuenta_madre_id');
    gridMadresDetalle = document.getElementById('gridMadresDetalle');
    migrarMadreSelect = document.getElementById('migrar_nueva_madre');

    init();
    configurarFormularios();
});

// --- RENDERIZADO PRINCIPAL ---
async function renderizarTodo() {
    // CORRECCIÓN: Usamos nombres exactos de tus tablas
    const { data: perfiles, error: errP } = await _supabase
        .from('perfiles_clientes')
        .select('*, cuentas_madre(*)');
    
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const { data: madres } = await _supabase.from('cuentas_madre').select('*');

    if (errP) console.error("Error en perfiles:", errP);

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    
    // 1. TABLA CLIENTES
    if(tablaPerfiles) {
        tablaPerfiles.innerHTML = '';
        perfiles?.forEach(p => {
            const vence = new Date(p.fecha_vencimiento);
            const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
            const m = p.cuentas_madre;

            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-800 transition hover:bg-gray-800/40 ${dif <= 0 ? 'bg-red-900/10' : ''}`;
            
            tr.innerHTML = `
                <td class="p-4">
                    <p class="font-bold text-white uppercase text-xs">${p.nombre_cliente}</p>
                    <p class="text-[10px] text-green-500 font-mono">${p.whatsapp || 'S/W'}</p>
                </td>
                <td class="p-4 text-[10px]">
                    ${m ? `<b class="text-blue-400 uppercase">${m.plataforma}</b><br><span class="text-gray-400">${m.email_cuenta}</span>` 
                    : '<span class="text-red-500 font-bold uppercase text-[8px]">Sin Cuenta</span>'}
                </td>
                <td class="p-4 text-center font-bold text-xs ${dif <= 0 ? 'text-red-500' : 'text-green-400'}">
                    ${p.fecha_vencimiento}
                </td>
                <td class="p-4 flex justify-end gap-2">
                    <button onclick="msgVencimiento('${p.nombre_cliente}', '${p.whatsapp}', '${m?.plataforma}', ${dif})" class="p-2 bg-green-600/20 hover:bg-green-600 text-white rounded">🔔</button>
                    <button onclick="abrirMigrar('${p.id}')" class="p-2 bg-blue-600/20 hover:bg-blue-600 text-white rounded">⇄</button>
                    <button onclick="borrarP('${p.id}')" class="p-2 bg-red-600/20 hover:bg-red-600 text-white rounded">✕</button>
                </td>
            `;
            tablaPerfiles.appendChild(tr);
        });
    }

    // 2. GRID CUENTAS MADRE
    if(gridMadresDetalle) {
        gridMadresDetalle.innerHTML = '';
        madres?.forEach(m => {
            const ocupados = perfiles?.filter(p => p.cuenta_madre_id === m.id).length || 0;
            const disponibles = 5 - ocupados;

            gridMadresDetalle.innerHTML += `
                <div class="bg-gray-800 border border-gray-700 rounded-2xl p-5">
                    <h4 class="text-xl font-black text-yellow-500 uppercase">${m.plataforma}</h4>
                    <p class="text-[10px] text-gray-400 font-mono truncate">${m.email_cuenta}</p>
                    <div class="flex justify-between items-center mt-4 border-t border-gray-700 pt-2">
                        <span class="text-2xl font-black">${disponibles} <small class="text-[9px] text-gray-500 uppercase">Libres</small></span>
                        <button onclick="eliminarMadre('${m.id}')" class="text-red-500 text-[10px] uppercase font-bold">Borrar</button>
                    </div>
                </div>`;
        });
    }

    // 3. BALANCE
    let ingresos = flujo?.filter(f=>f.tipo==='ingreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    let egresos = flujo?.filter(f=>f.tipo==='egreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    const balanceEl = document.getElementById('balance_monto');
    if(balanceEl) balanceEl.innerText = `$${(ingresos - egresos).toFixed(2)}`;
}

// --- UTILIDADES DE CARGA ---
async function init() {
    // CORRECCIÓN: Seleccionamos los nombres exactos de tus columnas
    const { data, error } = await _supabase
        .from('cuentas_madre')
        .select('id, plataforma, email_cuenta');

    if (error) {
        console.error("Error al cargar madres:", error);
        return;
    }

    if(selectMadres) {
        selectMadres.innerHTML = '<option value="">Seleccionar Cuenta</option>';
        migrarMadreSelect.innerHTML = '<option value="">Dejar sin cuenta</option>';
        data?.forEach(m => {
            const opt = `<option value="${m.id}">${m.plataforma} (${m.email_cuenta})</option>`;
            selectMadres.innerHTML += opt;
            migrarMadreSelect.innerHTML += opt;
        });
    }
    renderizarTodo();
}

// --- FORMULARIOS ---
function configurarFormularios() {
    document.getElementById('perfilForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const m = parseFloat(document.getElementById('monto').value);
        const { error } = await _supabase.from('perfiles_clientes').insert([{
            nombre_cliente: document.getElementById('nombre_cliente').value,
            whatsapp: document.getElementById('whatsapp').value,
            cuenta_madre_id: document.getElementById('cuenta_madre_id').value,
            perfil_asignado: document.getElementById('perfil_asignado').value,
            fecha_vencimiento: document.getElementById('vencimiento_cliente').value,
            precio_venta: m
        }]);
        if(!error) {
            await _supabase.from('flujo_caja').insert([{ tipo:'ingreso', monto:m, descripcion:`Venta` }]);
            renderizarTodo(); e.target.reset();
        }
    });
}

// --- WINDOW FUNCTIONS ---
window.msgVencimiento = (n, wa, p, d) => {
    const msg = `Hola *${n}*, tu servicio de *${p}* vence ${d <= 0 ? 'HOY' : 'en '+d+' días'}.`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};
window.cambiarSeccion = (id) => {
    document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
    document.getElementById(id)?.classList.remove('hidden');
};
window.borrarP = async (id) => { if(confirm("¿Eliminar?")) { await _supabase.from('perfiles_clientes').delete().eq('id', id); renderizarTodo(); } };
window.eliminarMadre = async (id) => { if(confirm("¿Eliminar cuenta?")) { await _supabase.from('cuentas_madre').delete().eq('id', id); init(); } };
window.abrirMigrar = (id) => { document.getElementById('migrar_perfil_id').value = id; document.getElementById('modalMigrar').classList.remove('hidden'); };
window.cerrarModal = () => document.getElementById('modalMigrar').classList.add('hidden');
window.confirmarMigracion = async () => {
    await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: migrarMadreSelect.value }).eq('id', document.getElementById('migrar_perfil_id').value);
    cerrarModal(); renderizarTodo();
};
