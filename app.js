// app.js - LÓGICA CENTRAL CVSE V6.5
document.addEventListener('DOMContentLoaded', () => {
    configurarTabs();
    renderizarTodo();

    // Formulario de Registro de Ventas
    document.getElementById('perfilForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre_cliente').value;
        const whatsapp = document.getElementById('whatsapp').value;
        const madreId = document.getElementById('cuenta_madre_id').value;
        const perfil = document.getElementById('perfil_asignado').value;
        const vencimiento = document.getElementById('vencimiento_cliente').value;
        const monto = parseFloat(document.getElementById('monto').value);

        // 1. Guardar Venta en Perfiles
        const { error: errPerfil } = await _supabase.from('perfiles_clientes').insert([{
            nombre_cliente: nombre,
            whatsapp: whatsapp,
            cuenta_madre_id: madreId,
            perfil_asignado: perfil,
            vencimiento: vencimiento,
            monto: monto
        }]);

        if (errPerfil) return alert("Error al guardar venta");

        // 2. Registrar Ingreso en Flujo de Caja
        await _supabase.from('flujo_caja').insert([{
            tipo: 'ingreso',
            monto: monto,
            descripcion: `Venta Perfil: ${nombre} (${perfil})`,
            fecha: new Date().toISOString()
        }]);

        e.target.reset();
        renderizarTodo();
    });
});

// RENDERIZADO PRINCIPAL
async function renderizarTodo() {
    await cargarSelectMadres();
    await renderizarTablaClientes();
    if (typeof renderizarMadres === 'function') renderizarMadres();
    if (typeof renderizarCaja === 'function') renderizarCaja();
    actualizarBalanceGlobal();
}

async function renderizarTablaClientes() {
    const { data: perfiles } = await _supabase.from('perfiles_clientes').select('*, cuentas_madre(plataforma, email)');
    const tabla = document.getElementById('tablaPerfiles');
    if (!tabla) return;
    tabla.innerHTML = '';

    perfiles?.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-700/30 transition border-b border-gray-700/50";
        
        tr.innerHTML = `
            <td class="p-5">
                <p class="font-bold text-white uppercase">${item.nombre_cliente}</p>
                <p class="text-[10px] text-gray-500 font-mono">${item.whatsapp || 'Sin WP'}</p>
            </td>
            <td class="p-5 text-xs">
                <p class="text-blue-400 font-black italic uppercase">${item.cuentas_madre?.plataforma || 'S/N'}</p>
                <p class="text-gray-400 font-bold tracking-tighter uppercase">${item.perfil_asignado}</p>
            </td>
            <td class="p-5 text-center">
                <span class="bg-gray-900 px-4 py-2 rounded-xl text-[10px] font-black border border-gray-700 uppercase">
                    ${item.vencimiento}
                </span>
            </td>
            <td class="p-5">
                <div class="btn-group">
                    <div class="action-btn-container">
                        <button onclick="enviarWhatsApp('${item.whatsapp}', '${item.nombre_cliente}', '${item.vencimiento}')" class="action-btn btn-wa">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.319 1.592 5.548 0 10.061-4.512 10.063-10.058.002-2.709-1.046-5.245-2.953-7.153-1.907-1.906-4.447-2.956-7.143-2.957-5.55 0-10.061 4.512-10.063 10.058-.001 2.105.574 4.103 1.658 5.895l-1.087 3.979 4.09-1.071z"/></svg>
                        </button>
                        <span class="btn-hint">Notificar</span>
                    </div>

                    <div class="action-btn-container">
                        <button onclick="copiarDatos('${item.cuentas_madre?.email}', '${item.cuentas_madre?.plataforma}')" class="action-btn btn-datos">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                        </button>
                        <span class="btn-hint">Datos</span>
                    </div>

                    <div class="action-btn-container">
                        <button onclick="abrirModalMigrar('${item.id}')" class="action-btn btn-migrar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                        </button>
                        <span class="btn-hint">Cambiar</span>
                    </div>

                    <div class="action-btn-container">
                        <button onclick="eliminarPerfil('${item.id}')" class="action-btn btn-delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <span class="btn-hint">Eliminar</span>
                    </div>
                </div>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

// FUNCIONES DE APOYO
async function cargarSelectMadres() {
    const { data } = await _supabase.from('cuentas_madre').select('*');
    const select = document.getElementById('cuenta_madre_id');
    const selectMigrar = document.getElementById('migrar_nueva_madre');
    if (!select) return;

    const opciones = data?.map(m => `<option value="${m.id}">${m.plataforma} - ${m.email}</option>`).join('');
    select.innerHTML = `<option value="">Seleccionar Cuenta...</option>${opciones}`;
    if (selectMigrar) selectMigrar.innerHTML = opciones;
}

async function actualizarBalanceGlobal() {
    const { data } = await _supabase.from('flujo_caja').select('monto, tipo');
    const total = data?.reduce((acc, item) => item.tipo === 'ingreso' ? acc + item.monto : acc - item.monto, 0) || 0;
    const el = document.getElementById('balance_monto');
    if (el) el.innerText = `$${total.toFixed(2)}`;
}

// UTILIDADES
function cambiarSeccion(id) {
    document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('tab-active', 'text-blue-500'));
    event.target.classList.add('tab-active');
}

function filtrarTabla() {
    const filtro = document.getElementById('buscador').value.toUpperCase();
    const filas = document.getElementById('tablaPerfiles').getElementsByTagName('tr');
    for (let i = 0; i < filas.length; i++) {
        const texto = filas[i].innerText.toUpperCase();
        filas[i].style.display = texto.includes(filtro) ? "" : "none";
    }
}

async function eliminarPerfil(id) {
    if (confirm('¿Eliminar este cliente definitivamente?')) {
        await _supabase.from('perfiles_clientes').delete().eq('id', id);
        renderizarTodo();
    }
}

function copiarDatos(email, plataforma) {
    navigator.clipboard.writeText(`Cuenta: ${plataforma}\nCorreo: ${email}`);
    alert("Datos copiados al portapapeles");
}

function enviarWhatsApp(numero, cliente, vencimiento) {
    const msg = `Hola ${cliente}, te recordamos que tu cuenta vence el ${vencimiento}.`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');
}
