// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://mdetlqvfdgtfatufdkht.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_TV9x9pfZw_vYR3-lF7NCIQ_ybSLs5Fh'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tablaPerfiles, selectMadres, gridMadresDetalle, migrarMadreSelect;

// INICIO SEGURO
document.addEventListener('DOMContentLoaded', () => {
    tablaPerfiles = document.getElementById('tablaPerfiles');
    selectMadres = document.getElementById('cuenta_madre_id');
    gridMadresDetalle = document.getElementById('gridMadresDetalle');
    migrarMadreSelect = document.getElementById('migrar_nueva_madre');
    init();
});

// PESTAÑAS GLOBALES
window.cambiarSeccion = function(idSeccion) {
    document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(idSeccion);
    if(target) target.classList.remove('hidden');
    
    const btnClientes = document.getElementById('btn-tab-clientes');
    const btnMadres = document.getElementById('btn-tab-madres');

    if(idSeccion === 'seccion-clientes') {
        btnClientes.className = 'tab-active pb-2 text-xs uppercase';
        btnMadres.className = 'pb-2 text-xs text-gray-500 uppercase hover:text-white transition';
    } else {
        btnMadres.className = 'tab-active pb-2 text-xs uppercase';
        btnClientes.className = 'pb-2 text-xs text-gray-500 uppercase hover:text-white transition';
    }
};

// --- FUNCIÓN RECORDAR DATOS (PEDIDA) ---
window.msgRecordarDatos = (nombre, wa, plataforma, email, pass, perfil, vence) => {
    const hoy = new Date();
    const fVence = new Date(vence);
    const dias = Math.ceil((fVence - hoy) / (1000 * 60 * 60 * 24));
    const tDias = dias <= 0 ? "⚠️ Vencido" : `${dias} días`;

    const msg = `*HOLA ${nombre.toUpperCase()}, AQUÍ TIENES TUS DATOS:* 📺\n\n` +
                `*SERVICIO:* ${plataforma.toUpperCase()}\n` +
                `*CORREO:* ${email}\n` +
                `*CONTRASEÑA:* ${pass}\n` +
                `*PERFIL:* ${perfil}\n\n` +
                `*ESTADO:* Te quedan *${tDias}* de servicio.`;

    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

// RENDERIZADO
async function renderizarTodo() {
    const { data: perfiles } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(*)');
    const { data: flujo } = await _supabase.from('flujo_caja').select('*');
    const { data: madres } = await _supabase.from('cuentas_madre').select('*');
    const hoy = new Date(); hoy.setHours(0,0,0,0);

    if(tablaPerfiles) {
        tablaPerfiles.innerHTML = '';
        perfiles?.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
        perfiles?.forEach(p => {
            const v = new Date(p.fecha_vencimiento);
            const dif = Math.ceil((v - hoy) / (1000 * 60 * 60 * 24));
            const m = p.cuentas_madre;

            tablaPerfiles.innerHTML += `
                <tr class="fila-cliente border-b border-gray-800 hover:bg-gray-850">
                    <td class="p-3 text-xs"><b>${p.nombre_cliente}</b><br><span class="text-green-500 text-[10px]">${p.whatsapp}</span></td>
                    <td class="p-3 text-[10px]">
                        ${m ? `<b class="text-blue-400 uppercase">${m.plataforma}</b><br><span class="text-gray-400 italic">${p.perfil_asignado}</span>` : '⚠️ Sin Cuenta'}
                    </td>
                    <td class="p-3 text-center font-bold text-xs ${dif <= 0 ? 'text-red-500' : 'text-green-400'}">${p.fecha_vencimiento}</td>
                    <td class="p-3 text-right">
                        <div class="flex gap-1 justify-end">
                            <button onclick="msgRecordarDatos('${p.nombre_cliente}','${p.whatsapp}','${m?.plataforma}','${m?.email_cuenta}','${m?.password_cuenta}','${p.perfil_asignado}','${p.fecha_vencimiento}')" class="bg-blue-600 p-2 rounded text-xs" title="Recordar Datos">📩</button>
                            <button onclick="msgVencimiento('${p.nombre_cliente}','${p.whatsapp}','${m?.plataforma}',${dif})" class="bg-green-700 p-2 rounded text-xs">🔔</button>
                            <button onclick="abrirMigrar('${p.id}')" class="bg-purple-600 p-2 rounded text-xs">⇄</button>
                            <button onclick="borrarP('${p.id}')" class="bg-red-900/40 p-2 rounded text-xs">✕</button>
                        </div>
                    </td>
                </tr>`;
        });
    }

    if(gridMadresDetalle) {
        gridMadresDetalle.innerHTML = '';
        madres?.forEach(m => {
            const ocupados = perfiles?.filter(p => p.cuenta_madre_id === m.id).length || 0;
            gridMadresDetalle.innerHTML += `
                <div class="bg-gray-850 border border-gray-700 rounded-xl p-4 shadow-lg">
                    <h4 class="text-yellow-500 font-black uppercase text-sm mb-2">${m.plataforma}</h4>
                    <div class="text-[10px] font-mono text-gray-400 bg-black/30 p-2 rounded break-all mb-3">
                        E: ${m.email_cuenta}<br>P: ${m.password_cuenta}
                    </div>
                    <div class="flex justify-between items-center text-[10px] uppercase font-bold">
                        <span>Cupos: ${ocupados}/5</span>
                        <button onclick="eliminarMadre('${m.id}')" class="text-red-500">Eliminar</button>
                    </div>
                </div>`;
        });
    }

    const ingresos = flujo?.filter(f=>f.tipo==='ingreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    const egresos = flujo?.filter(f=>f.tipo==='egreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    document.getElementById('balance_monto').innerText = `$${(ingresos - egresos).toFixed(2)}`;
}

// FUNCIONES WHATSAPP COMUNES
window.msgVencimiento = (n, wa, plat, dias) => {
    const t = dias <= 0 ? "HOY" : `en ${dias} días`;
    const msg = `Hola *${n}*, tu servicio de *${plat}* vence ${t}. ¿Deseas renovar?`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

// CRUD
window.borrarP = async (id) => { if(confirm("¿Borrar?")) { await _supabase.from('perfiles_clientes').delete().eq('id', id); renderizarTodo(); } };
window.eliminarMadre = async (id) => { if(confirm("¿Borrar cuenta?")) { await _supabase.from('cuentas_madre').delete().eq('id', id); init(); } };

// FORMULARIOS
document.getElementById('perfilForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = parseFloat(document.getElementById('monto').value);
    await _supabase.from('perfiles_clientes').insert([{
        nombre_cliente: document.getElementById('nombre_cliente').value,
        whatsapp: document.getElementById('whatsapp').value,
        cuenta_madre_id: document.getElementById('cuenta_madre_id').value,
        perfil_asignado: document.getElementById('perfil_asignado').value,
        fecha_vencimiento: document.getElementById('vencimiento_cliente').value,
        precio_venta: m
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo:'ingreso', monto:m, descripcion:'Venta' }]);
    renderizarTodo(); e.target.reset();
});

document.getElementById('madreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = parseFloat(document.getElementById('m_gasto').value);
    await _supabase.from('cuentas_madre').insert([{
        plataforma: document.getElementById('m_plataforma').value,
        email_cuenta: document.getElementById('m_email').value,
        password_cuenta: document.getElementById('m_password').value,
        fecha_vencimiento: document.getElementById('m_vencimiento').value,
        costo_compra: g
    }]);
    await _supabase.from('flujo_caja').insert([{ tipo:'egreso', monto:g, descripcion:'Inversión' }]);
    init(); e.target.reset();
});

// BUSCADOR
window.filtrarTabla = () => {
    const b = document.getElementById('buscador').value.toLowerCase();
    document.querySelectorAll('.fila-cliente').forEach(f => {
        f.style.display = f.innerText.toLowerCase().includes(b) ? '' : 'none';
    });
};

// MODAL
window.abrirMigrar = (id) => { document.getElementById('migrar_perfil_id').value = id; document.getElementById('modalMigrar').classList.remove('hidden'); };
window.cerrarModal = () => document.getElementById('modalMigrar').classList.add('hidden');
window.confirmarMigracion = async () => {
    await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: migrarMadreSelect.value }).eq('id', document.getElementById('migrar_perfil_id').value);
    cerrarModal(); renderizarTodo();
};

async function init() {
    const { data } = await _supabase.from('cuentas_madre').select('*');
    if(selectMadres) {
        selectMadres.innerHTML = '<option value="">Seleccionar Cuenta</option>';
        migrarMadreSelect.innerHTML = '<option value="">Dejar Libre</option>';
        data?.forEach(m => {
            const opt = `<option value="${m.id}">${m.plataforma} (${m.email_cuenta})</option>`;
            selectMadres.innerHTML += opt;
            migrarMadreSelect.innerHTML += opt;
        });
    }
    renderizarTodo();
}
