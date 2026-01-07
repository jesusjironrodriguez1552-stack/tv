const SUPABASE_URL = 'https://mdetlqvfdgtfatufdkht.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_TV9x9pfZw_vYR3-lF7NCIQ_ybSLs5Fh'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let tablaPerfiles, selectMadres, gridMadresDetalle, migrarMadreSelect;

document.addEventListener('DOMContentLoaded', () => {
    tablaPerfiles = document.getElementById('tablaPerfiles');
    selectMadres = document.getElementById('cuenta_madre_id');
    gridMadresDetalle = document.getElementById('gridMadresDetalle');
    migrarMadreSelect = document.getElementById('migrar_nueva_madre');
    init();
});

window.cambiarSeccion = function(idSeccion) {
    document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
    document.getElementById(idSeccion).classList.remove('hidden');
    const btnC = document.getElementById('btn-tab-clientes');
    const btnM = document.getElementById('btn-tab-madres');
    if(idSeccion === 'seccion-clientes') {
        btnC.className = 'tab-active pb-4 text-sm uppercase tracking-widest whitespace-nowrap';
        btnM.className = 'pb-4 text-sm text-gray-500 uppercase tracking-widest hover:text-white transition whitespace-nowrap';
    } else {
        btnM.className = 'tab-active pb-4 text-sm uppercase tracking-widest whitespace-nowrap';
        btnC.className = 'pb-4 text-sm text-gray-500 uppercase tracking-widest hover:text-white transition whitespace-nowrap';
    }
};

window.msgRecordarDatos = (nombre, wa, plataforma, email, pass, perfil, vence) => {
    const hoy = new Date();
    const fVence = new Date(vence);
    const dias = Math.ceil((fVence - hoy) / (1000 * 60 * 60 * 24));
    const tDias = dias <= 0 ? "⚠️ Vencido" : `${dias} días`;
    const msg = `*HOLA ${nombre.toUpperCase()}, TUS DATOS DE ACCESO:* 📺\n\n*SERVICIO:* ${plataforma.toUpperCase()}\n*CORREO:* ${email}\n*CONTRASEÑA:* ${pass}\n*PERFIL:* ${perfil}\n\n*ESTADO:* Te quedan *${tDias}* de servicio.`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

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
                <tr class="fila-cliente border-b border-gray-700/50 hover:bg-gray-850 transition">
                    <td class="p-4 text-xs"><b>${p.nombre_cliente.toUpperCase()}</b><br><span class="text-green-500">${p.whatsapp}</span></td>
                    <td class="p-4 text-[10px]">${m ? `<b class="text-blue-400 uppercase text-xs">${m.plataforma}</b><br>${p.perfil_asignado}` : '<span class="text-red-500 font-bold">SIN CUENTA</span>'}</td>
                    <td class="p-4 text-center font-black ${dif <= 3 ? 'text-red-500' : 'text-green-400'} text-xs">${p.fecha_vencimiento}<br><span class="text-[9px] uppercase">${dif <= 0 ? 'Expiró' : dif + ' días'}</span></td>
                    <td class="p-4 text-right flex gap-1 justify-end">
                        <button onclick="msgRecordarDatos('${p.nombre_cliente}','${p.whatsapp}','${m?.plataforma}','${m?.email_cuenta}','${m?.password_cuenta}','${p.perfil_asignado}','${p.fecha_vencimiento}')" class="bg-blue-600 p-2 rounded-lg">📩</button>
                        <button onclick="msgVencimiento('${p.nombre_cliente}','${p.whatsapp}','${m?.plataforma}',${dif})" class="bg-green-600 p-2 rounded-lg">🔔</button>
                        <button onclick="abrirMigrar('${p.id}')" class="bg-gray-700 p-2 rounded-lg">⇄</button>
                        <button onclick="borrarP('${p.id}')" class="bg-gray-700 p-2 rounded-lg text-red-500">✕</button>
                    </td>
                </tr>`;
        });
    }

    if(gridMadresDetalle) {
        gridMadresDetalle.innerHTML = '';
        madres?.forEach(m => {
            const vMadre = new Date(m.fecha_vencimiento);
            const difM = Math.ceil((vMadre - hoy) / (1000 * 60 * 60 * 24));
            const ocupados = perfiles?.filter(p => p.cuenta_madre_id === m.id).length || 0;
            gridMadresDetalle.innerHTML += `
                <div class="bg-gray-850 border border-gray-700 rounded-3xl p-6 shadow-2xl relative card-madre transition hover:border-blue-500/50">
                    <div class="absolute top-0 right-0 px-4 py-2 ${difM <= 5 ? 'bg-red-600 animate-pulse' : 'bg-green-600'} text-[10px] font-black uppercase rounded-bl-2xl">VENCE EN: ${difM} DÍAS</div>
                    <div>
                        <h4 class="text-2xl font-black text-blue-500 uppercase mb-4 tracking-tighter">${m.plataforma}</h4>
                        <div class="space-y-3 mb-6">
                            <div class="bg-black/40 p-3 rounded-xl border border-gray-700 select-all cursor-pointer">
                                <p class="text-[9px] text-gray-500 font-black uppercase mb-1">E-mail Acceso:</p>
                                <p class="text-xs font-mono text-gray-200 truncate">${m.email_cuenta}</p>
                            </div>
                            <div class="bg-black/40 p-3 rounded-xl border border-gray-700 select-all cursor-pointer">
                                <p class="text-[9px] text-gray-500 font-black uppercase mb-1">Contraseña:</p>
                                <p class="text-xs font-mono text-blue-400 font-black tracking-widest">${m.password_cuenta}</p>
                            </div>
                        </div>
                    </div>
                    <div class="border-t border-gray-800 pt-5 flex justify-between items-end">
                        <div>
                            <span class="text-[9px] uppercase text-gray-500 font-black block mb-2">Cupos</span>
                            <div class="flex gap-2">
                                ${Array.from({length: 5}, (_, i) => `<div class="w-4 h-4 rounded-sm ${i < ocupados ? 'bg-red-600 shadow-[0_0_8px_red]' : 'bg-green-500 shadow-[0_0_8px_green]'}"></div>`).join('')}
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] text-gray-500 block uppercase font-bold">Pagar el:</span>
                            <span class="text-sm font-black text-white">${m.fecha_vencimiento}</span>
                        </div>
                    </div>
                    <button onclick="eliminarMadre('${m.id}')" class="mt-4 w-full bg-red-900/10 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-bold py-3 rounded-xl transition uppercase border border-red-900/40">Eliminar</button>
                </div>`;
        });
    }

    const ingresos = flujo?.filter(f=>f.tipo==='ingreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    const egresos = flujo?.filter(f=>f.tipo==='egreso').reduce((acc, f)=>acc+f.monto, 0) || 0;
    document.getElementById('balance_monto').innerText = `$${(ingresos - egresos).toFixed(2)}`;
}

window.msgVencimiento = (n, wa, plat, dias) => {
    const t = dias <= 0 ? "HOY" : `en ${dias} días`;
    const msg = `Hola *${n}*, tu servicio de *${plat}* vence ${t}. ¿Deseas renovar?`;
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.borrarP = async (id) => { if(confirm("¿Eliminar?")) { await _supabase.from('perfiles_clientes').delete().eq('id', id); renderizarTodo(); } };
window.eliminarMadre = async (id) => { if(confirm("¿Eliminar Cuenta Madre?")) { await _supabase.from('cuentas_madre').delete().eq('id', id); init(); } };

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

window.filtrarTabla = () => {
    const b = document.getElementById('buscador').value.toLowerCase();
    document.querySelectorAll('.fila-cliente').forEach(f => {
        f.style.display = f.innerText.toLowerCase().includes(b) ? '' : 'none';
    });
};

window.descargarBackup = async () => {
    const { data } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(plataforma, email_cuenta)');
    let csv = "Cliente,WhatsApp,Plataforma,Vencimiento\n";
    data.forEach(p => csv += `${p.nombre_cliente},${p.whatsapp},${p.cuentas_madre?.plataforma},${p.fecha_vencimiento}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'backup.csv'; a.click();
};

window.abrirMigrar = (id) => { document.getElementById('migrar_perfil_id').value = id; document.getElementById('modalMigrar').classList.remove('hidden'); };
window.cerrarModal = () => document.getElementById('modalMigrar').classList.add('hidden');
window.confirmarMigracion = async () => {
    await _supabase.from('perfiles_clientes').update({ cuenta_madre_id: migrarMadreSelect.value }).eq('id', document.getElementById('migrar_perfil_id').value);
    cerrarModal(); renderizarTodo();
};

async function init() {
    const { data } = await _supabase.from('cuentas_madre').select('*');
    if(selectMadres) {
        selectMadres.innerHTML = '<option value="">ELEGIR CUENTA MADRE</option>';
        migrarMadreSelect.innerHTML = '<option value="">DEJAR LIBRE</option>';
        data?.forEach(m => {
            const opt = `<option value="${m.id}">${m.plataforma.toUpperCase()} (${m.email_cuenta})</option>`;
            selectMadres.innerHTML += opt;
            migrarMadreSelect.innerHTML += opt;
        });
    }
    renderizarTodo();
}
