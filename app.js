// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://mdetlqvfdgtfatufdkht.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_TV9x9pfZw_vYR3-lF7NCIQ_ybSLs5Fh'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales para elementos del DOM
let tablaPerfiles, selectMadres, gridMadresDetalle, migrarMadreSelect;

// --- INICIALIZACIÓN AL CARGAR EL DOM ---
document.addEventListener('DOMContentLoaded', () => {
    tablaPerfiles = document.getElementById('tablaPerfiles');
    selectMadres = document.getElementById('cuenta_madre_id');
    gridMadresDetalle = document.getElementById('gridMadresDetalle');
    migrarMadreSelect = document.getElementById('migrar_nueva_madre');

    if (!tablaPerfiles || !gridMadresDetalle) {
        console.error("Error: Elementos del HTML no encontrados. Revisa los IDs.");
    }

    init();
});

// --- SISTEMA DE PESTAÑAS (GLOBAL) ---
window.cambiarSeccion = function(idSeccion) {
    document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(idSeccion);
    if(target) target.classList.remove('hidden');
    
    const btnClientes = document.getElementById('btn-tab-clientes');
    const btnMadres = document.getElementById('btn-tab-madres');

    if(idSeccion === 'seccion-clientes') {
        btnClientes.className = 'tab-active pb-3 text-sm uppercase tracking-wider text-blue-400 border-b-2 border-blue-400';
        btnMadres.className = 'pb-3 text-sm text-gray-500 uppercase tracking-wider hover:text-white transition';
    } else {
        btnMadres.className = 'tab-active pb-3 text-sm uppercase tracking-wider text-blue-400 border-b-2 border-blue-400';
        btnClientes.className = 'pb-3 text-sm text-gray-500 uppercase tracking-wider hover:text-white transition';
    }
};

// --- RENDERIZADO PRINCIPAL ---
async function renderizarTodo() {
    const { data: perfiles } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(*)');
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const { data: madres } = await _supabase.from('cuentas_madre').select('*');

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    
    // 1. RENDER TABLA CLIENTES
    if(tablaPerfiles) {
        tablaPerfiles.innerHTML = '';
        perfiles?.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
        
        perfiles?.forEach(p => {
            const vence = new Date(p.fecha_vencimiento);
            const dif = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
            const m = p.cuentas_madre;

            tablaPerfiles.innerHTML += `
                <tr class="fila-cliente border-b border-gray-800 transition hover:bg-gray-850 ${dif <= 0 ? 'bg-red-900/10' : ''}">
                    <td class="p-4 text-xs"><b>${p.nombre_cliente}</b><br><span class="text-green-500">${p.whatsapp || ''}</span></td>
                    <td class="p-4 text-[10px]">
                        ${m ? `<b class="text-blue-400 font-bold uppercase">${m.plataforma}</b><br>${m.email_cuenta}<br><span class="text-yellow-500 font-bold">Pass: ${m.password_cuenta} | ${p.perfil_asignado}</span>` 
                        : '<span class="text-red-500 font-bold animate-pulse">REUBICAR YA</span>'}
                    </td>
                    <td class="p-4 text-center font-bold ${dif <= 0 ? 'text-red-500 animate-pulse' : 'text-green-400'}">${p.fecha_vencimiento}</td>
                    <td class="p-4 text-right flex gap-1 justify-end">
                        <button onclick="msgVencimiento('${p.nombre_cliente}', '${p.whatsapp}', '${m?.plataforma}', ${dif})" class="bg-green-700 hover:bg-green-600 p-2 rounded text-xs transition">🔔</button>
                        <button onclick="abrirMigrar('${p.id}')" class="bg-purple-600 hover:bg-purple-500 p-2 rounded text-xs transition">⇄</button>
                        <button onclick="borrarP('${p.id}')" class="bg-red-900/40 hover:bg-red-600 p-2 rounded text-xs transition">✕</button>
                    </td>
                </tr>`;
        });
    }

    // 2. RENDER GRID CUENTAS MADRE
    if(gridMadresDetalle) {
        gridMadresDetalle.innerHTML = '';
        madres?.forEach(m => {
            const vMadre = new Date(m.fecha_vencimiento);
            const difM = Math.ceil((vMadre - hoy) / (1000 * 60 * 60 * 24));
            const ocupados = perfiles?.filter(p => p.cuenta_madre_id === m.id).length || 0;
            const disponibles = 5 - ocupados;

            gridMadresDetalle.innerHTML += `
                <div class="bg-gray-850 border border-gray-700 rounded-2xl p-5 shadow-lg relative overflow-hidden transition hover:border-blue-500/50">
                    <div class="absolute top-0 right-0 p-2 ${difM <= 3 ? 'bg-red-600 animate-pulse' : 'bg-green-600'} text-[9px] font-black uppercase rounded-bl-lg">
                        ${difM <= 0 ? 'Vencida' : 'Vence en '+difM+'d'}
                    </div>
                    <h4 class="text-xl font-black text-yellow-500 mb-1 uppercase tracking-tight">${m.plataforma}</h4>
                    <div class="space-y-1 mb-4">
                        <div class="bg-black/40 p-2 rounded border border-gray-700">
                            <p class="text-[9px] text-gray-500 font-bold">CUENTA:</p>
                            <p class="text-xs font-mono text-gray-200 truncate">${m.email_cuenta}</p>
                        </div>
                        <div class="bg-black/40 p-2 rounded border border-gray-700">
                            <p class="text-[9px] text-gray-500 font-bold">PASS:</p>
                            <p class="text-xs font-mono text-blue-400 font-bold">${m.password_cuenta}</p>
                        </div>
                    </div>
                    <div class="flex justify-between items-center border-t border-gray-700 pt-4">
                        <div>
                            <span class="text-[9px] uppercase text-gray-500 block mb-1">Capacidad</span>
                            <div class="flex gap-1">
                                ${Array.from({length: 5}, (_, i) => `
                                    <div class="w-3 h-3 rounded-sm ${i < ocupados ? 'bg-red-600 shadow-[0_0_5px_red]' : 'bg-green-500 shadow-[0_0_5px_green]'}"></div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-2xl font-black ${disponibles > 0 ? 'text-white' : 'text-red-500'}">${disponibles}</span>
                            <span class="text-[9px] uppercase text-gray-500 block leading-none">Libres</span>
                        </div>
                    </div>
                    <button onclick="eliminarMadre('${m.id}')" class="w-full mt-4 bg-red-900/20 hover:bg-red-600 text-[10px] font-bold py-2 rounded transition uppercase text-red-500 hover:text-white">Eliminar Inventario</button>
                </div>`;
        });
    }

    // 3. ACTUALIZAR ESTADÍSTICAS
    let ingresos = flujo?.filter(f=>f.tipo==='ingreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    let egresos = flujo?.filter(f=>f.tipo==='egreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    
    document.getElementById('stat_activos').innerText = perfiles?.length || 0;
    document.getElementById('stat_cobrar_hoy').innerText = perfiles?.filter(p => (new Date(p.fecha_vencimiento) - hoy) <= 0).length || 0;
    document.getElementById('stat_madres_alerta').innerText = madres?.filter(m => (new Date(m.fecha_vencimiento) - hoy) <= 3000 * 60 * 60 * 24).length || 0; // Ejemplo 3 días
    document.getElementById('balance_monto').innerText = `$${(ingresos - egresos).toFixed(2)}`;
    document.getElementById('stat_ganancia').innerText = `$${(ingresos - egresos).toFixed(2)}`;
}

// --- BUSCADOR ---
window.filtrarTabla = function() {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    const filas = document.querySelectorAll('.fila-cliente');
    filas.forEach(f => {
        f.style.display = f.innerText.toLowerCase().includes(busqueda) ? '' : 'none';
    });
};

window.aplicarFiltro = function(tipo) {
    if(tipo === 'cobrar') {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const filas = document.querySelectorAll('.fila-cliente');
        filas.forEach(f => {
            const fechaTxt = f.cells[2].innerText;
            const vence = new Date(fechaTxt);
            f.style.display = (vence <= hoy) ? '' : 'none';
        });
    }
};

// --- BACKUP EXCEL (CSV) ---
window.descargarBackup = async function() {
    const { data } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(plataforma, email_cuenta)');
    let csv = "Cliente,WhatsApp,Plataforma,Correo,Vencimiento,Precio\n";
    data.forEach(p => {
        csv += `${p.nombre_cliente},${p.whatsapp},${p.cuentas_madre?.plataforma},${p.cuentas_madre?.email_cuenta},${p.fecha_vencimiento},${p.precio_venta}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_cvse_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
};

// --- MENSAJERÍA ---
window.msgVentaNueva = (nombre, wa, plataforma, email, pass, perfil, vence) => {
    const msg = `📺 *${plataforma.toUpperCase()}*\n📧 Correo: ${email}\n🔑 Clave: ${pass}\n👤 Perfil: ${perfil}\n🗓️ Vence: ${vence}\n\n*Gracias por tu preferencia.*`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.msgVencimiento = (nombre, wa, plataforma, dias) => {
    const t = dias <= 0 ? "HOY" : `en ${dias} días`;
    const msg = `Hola *${nombre}*, tu servicio de *${plataforma}* vence ${t}. ¿Deseas renovar para no perder tu perfil?`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

// --- EVENTOS DE FORMULARIOS ---
document.getElementById('perfilForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idM = document.getElementById('cuenta_madre_id').value;
    const m = parseFloat(document.getElementById('monto').value);
    const n = document.getElementById('nombre_cliente').value;
    const wa = document.getElementById('whatsapp').value;
    const p = document.getElementById('perfil_asignado').value;
    const v = document.getElementById('vencimiento_cliente').value;

    const { data: mad } = await _supabase.from('cuentas_madre').select('*').eq('id', idM).single();

    await _supabase.from('perfiles_clientes').insert([{
        nombre_cliente: n, whatsapp: wa, cuenta_madre_id: idM,
        perfil_asignado: p, fecha_vencimiento: v, precio_venta: m
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo:'ingreso', monto:m, descripcion:`Venta ${mad.plataforma}` }]);
    
    if(confirm("¿Venta registrada! ¿Enviar datos por WhatsApp?")) {
        window.msgVentaNueva(n, wa, mad.plataforma, mad.email_cuenta, mad.password_cuenta, p, v);
    }
    
    renderizarTodo(); e.target.reset();
});

document.getElementById('madreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = parseFloat(document.getElementById('m_gasto').value);
    const plat = document.getElementById('m_plataforma').value;
    await _supabase.from('cuentas_madre').insert([{
        plataforma: plat, email_cuenta: document.getElementById('m_email').value,
        password_cuenta: document.getElementById('m_password').value, 
        fecha_vencimiento: document.getElementById('m_vencimiento').value,
        costo_compra: g
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo:'egreso', monto:g, descripcion:`Inversión ${plat}` }]);
    init(); e.target.reset();
});

document.getElementById('gastoManualForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = parseFloat(document.getElementById('g_monto').value);
    const mot = document.getElementById('g_motivo').value;
    await _supabase.from('flujo_caja').insert([{ tipo:'egreso', monto:m, descripcion: `GASTO: ${mot}` }]);
    renderizarTodo(); e.target.reset();
});

// --- MIGRACIÓN Y BORRADO ---
window.borrarP = async (id) => { if(confirm("¿Eliminar cliente permanentemente?")) { await _supabase.from('perfiles_clientes').delete().eq('id', id); renderizarTodo(); } };
window.eliminarMadre = async (id) => { if(confirm("¿Eliminar esta cuenta? Los perfiles asociados se quedarán sin acceso.")) { await _supabase.from('cuentas_madre').delete().eq('id', id); init(); } };

window.abrirMigrar = (id) => { 
    document.getElementById('migrar_perfil_id').value = id; 
    document.getElementById('modalMigrar').classList.remove('hidden'); 
};
window.cerrarModal = () => document.getElementById('modalMigrar').classList.add('hidden');
window.confirmarMigracion = async () => {
    const nuevaId = migrarMadreSelect.value;
    await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: nuevaId }).eq('id', document.getElementById('migrar_perfil_id').value);
    cerrarModal(); renderizarTodo();
};

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
