// app.js - LÓGICA CENTRAL CVSE (Usa la conexión de config.js)

// Variables globales para elementos del DOM
let tablaPerfiles, selectMadres, gridMadresDetalle, migrarMadreSelect;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Vincular elementos del DOM
    tablaPerfiles = document.getElementById('tablaPerfiles');
    selectMadres = document.getElementById('cuenta_madre_id');
    gridMadresDetalle = document.getElementById('gridMadresDetalle');
    migrarMadreSelect = document.getElementById('migrar_nueva_madre');

    // 2. Inicializar sistema
    init();
    configurarFormularios();
});

// --- SISTEMA DE PESTAÑAS ---
window.cambiarSeccion = function(idSeccion) {
    document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(idSeccion);
    if(target) target.classList.remove('hidden');
    
    // Actualizar estilo visual de los botones de navegación
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('tab-active', 'text-blue-400', 'border-b-2', 'border-blue-400');
        btn.classList.add('text-gray-500');
    });

    const btnActivo = document.querySelector(`button[onclick*="${idSeccion}"]`);
    if(btnActivo) {
        btnActivo.classList.add('tab-active', 'text-blue-400', 'border-b-2', 'border-blue-400');
        btnActivo.classList.remove('text-gray-500');
    }
};

// --- RENDERIZADO PRINCIPAL ---
async function renderizarTodo() {
    // Usamos _supabase que viene de config.js
    const { data: perfiles } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(*)');
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const { data: madres } = await _supabase.from('cuentas_madre').select('*');

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    
    // 1. TABLA CLIENTES
    if(tablaPerfiles) {
        tablaPerfiles.innerHTML = '';
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
                    <p class="text-[10px] text-green-500 font-mono">${p.whatsapp || 'Sin WP'}</p>
                </td>
                <td class="p-4 text-[10px]">
                    ${m ? `<b class="text-blue-400 uppercase">${m.plataforma}</b><br><span class="text-gray-400">${m.email_cuenta}</span><br><span class="text-yellow-500 font-bold">PIN: ${p.perfil_asignado}</span>` 
                    : '<span class="text-red-500 font-bold animate-pulse uppercase">Sin Cuenta Asignada</span>'}
                </td>
                <td class="p-4 text-center font-bold text-xs ${dif <= 0 ? 'text-red-500 animate-pulse' : 'text-green-400'}">
                    ${p.fecha_vencimiento}
                </td>
                <td class="p-4">
                    <div class="btn-group flex justify-end gap-2">
                        <div class="action-btn-container">
                            <button onclick="msgVencimiento('${p.nombre_cliente}', '${p.whatsapp}', '${m?.plataforma}', ${dif})" class="action-btn btn-wa">🔔</button>
                            <span class="btn-hint">Notificar</span>
                        </div>
                        <div class="action-btn-container">
                            <button onclick="copiarDatos('${m?.email_cuenta}', '${m?.plataforma}', '${m?.password_cuenta}', '${p.perfil_asignado}')" class="action-btn btn-datos">📋</button>
                            <span class="btn-hint">Datos</span>
                        </div>
                        <div class="action-btn-container">
                            <button onclick="abrirMigrar('${p.id}')" class="action-btn btn-migrar">⇄</button>
                            <span class="btn-hint">Cambiar</span>
                        </div>
                        <div class="action-btn-container">
                            <button onclick="borrarP('${p.id}')" class="action-btn btn-delete">✕</button>
                            <span class="btn-hint">Eliminar</span>
                        </div>
                    </div>
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
                <div class="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <h4 class="text-xl font-black text-yellow-500 mb-1 uppercase tracking-tight">${m.plataforma}</h4>
                    <p class="text-[10px] text-gray-400 font-mono mb-4 truncate">${m.email_cuenta}</p>
                    <div class="flex justify-between items-center border-t border-gray-700 pt-4">
                        <div>
                            <span class="text-[9px] uppercase text-gray-500 block mb-1">Capacidad</span>
                            <div class="flex gap-1">
                                ${Array.from({length: 5}, (_, i) => `
                                    <div class="w-3 h-3 rounded-sm ${i < ocupados ? 'bg-red-600' : 'bg-green-500'}"></div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-2xl font-black ${disponibles > 0 ? 'text-white' : 'text-red-500'}">${disponibles}</span>
                            <span class="text-[9px] uppercase text-gray-500 block leading-none">Libres</span>
                        </div>
                    </div>
                    <button onclick="eliminarMadre('${m.id}')" class="w-full mt-4 bg-red-900/10 hover:bg-red-600 text-[10px] font-bold py-2 rounded transition uppercase text-red-500 hover:text-white">Eliminar</button>
                </div>`;
        });
    }

    // 3. BALANCE
    let ingresos = flujo?.filter(f=>f.tipo==='ingreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    let egresos = flujo?.filter(f=>f.tipo==='egreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    const balanceEl = document.getElementById('balance_monto');
    if(balanceEl) balanceEl.innerText = `$${(ingresos - egresos).toFixed(2)}`;
}

// --- CONFIGURACIÓN DE FORMULARIOS Y ACCIONES ---
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

async function init() {
    const { data } = await _supabase.from('cuentas_madre').select('*');
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

// Funciones de ventana (window) para que el HTML las encuentre
window.copiarDatos = (email, plat, pass, perfil) => {
    const texto = `📺 *${plat.toUpperCase()}*\n📧 Correo: ${email}\n🔑 Clave: ${pass}\n👤 Perfil: ${perfil}`;
    navigator.clipboard.writeText(texto).then(() => alert("Copiado!"));
};
window.msgVencimiento = (n, wa, p, d) => {
    const msg = `Hola *${n}*, tu servicio de *${p}* vence ${d <= 0 ? 'HOY' : 'en '+d+' días'}. ¿Deseas renovar?`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};
window.filtrarTabla = () => {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    document.querySelectorAll('#tablaPerfiles tr').forEach(f => f.style.display = f.innerText.toLowerCase().includes(busqueda) ? '' : 'none');
};
window.borrarP = async (id) => { if(confirm("¿Eliminar?")) { await _supabase.from('perfiles_clientes').delete().eq('id', id); renderizarTodo(); } };
window.eliminarMadre = async (id) => { if(confirm("¿Eliminar cuenta?")) { await _supabase.from('cuentas_madre').delete().eq('id', id); init(); } };
window.abrirMigrar = (id) => { document.getElementById('migrar_perfil_id').value = id; document.getElementById('modalMigrar').classList.remove('hidden'); };
window.cerrarModal = () => document.getElementById('modalMigrar').classList.add('hidden');
window.confirmarMigracion = async () => {
    await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: migrarMadreSelect.value }).eq('id', document.getElementById('migrar_perfil_id').value);
    cerrarModal(); renderizarTodo();
};
