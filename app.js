// app.js - LÓGICA CENTRAL Y GESTIÓN DE CLIENTES

// 1. Definimos la función de pestañas PRIMERO para que esté lista al cargar
function configurarTabs() {
    const botones = document.querySelectorAll('nav button');
    botones.forEach(boton => {
        boton.onclick = (e) => {
            // Buscamos el ID de sección basándonos en el ID del botón
            const idCompleto = e.currentTarget.id; 
            const seccionId = idCompleto.replace('btn-tab-', 'seccion-');
            cambiarSeccion(seccionId);
        };
    });
}

// 2. Ejecución principal al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    configurarTabs(); // Ahora ya existe y no dará "ReferenceError"
    renderizarTodo();

    // FORMULARIO DE REGISTRO DE VENTAS
    const perfilForm = document.getElementById('perfilForm');
    if (perfilForm) {
        perfilForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre = document.getElementById('nombre_cliente').value;
            const whatsapp = document.getElementById('whatsapp').value;
            const madreId = document.getElementById('cuenta_madre_id').value;
            const perfil = document.getElementById('perfil_asignado').value;
            const vencimiento = document.getElementById('vencimiento_cliente').value;
            const monto = parseFloat(document.getElementById('monto').value);

            const { error: errPerfil } = await _supabase.from('perfiles_clientes').insert([{
                nombre_cliente: nombre,
                whatsapp: whatsapp,
                cuenta_madre_id: madreId,
                perfil_asignado: perfil,
                vencimiento: vencimiento,
                monto: monto
            }]);

            if (errPerfil) return alert("Error al guardar venta.");

            await _supabase.from('flujo_caja').insert([{
                tipo: 'ingreso',
                monto: monto,
                descripcion: `Venta Perfil: ${nombre} (${perfil})`,
                fecha: new Date().toISOString()
            }]);

            e.target.reset();
            renderizarTodo();
            alert("✅ Venta registrada");
        });
    }
});

// --- RENDERIZADO Y UTILIDADES ---

async function renderizarTodo() {
    await cargarSelectMadres();
    await renderizarTablaClientes();
    actualizarBalanceGlobal();
    
    // Verificamos si los otros archivos ya cargaron sus funciones
    if (typeof renderizarMadres === 'function') renderizarMadres();
    if (typeof renderizarCaja === 'function') renderizarCaja();
}

async function renderizarTablaClientes() {
    const { data: perfiles } = await _supabase
        .from('perfiles_clientes')
        .select('*, cuentas_madre(plataforma, email)');
    
    const tabla = document.getElementById('tablaPerfiles');
    if (!tabla) return;
    tabla.innerHTML = '';

    perfiles?.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-700/30 transition border-b border-gray-700/50";
        tr.innerHTML = `
            <td class="p-5">
                <p class="font-bold text-white uppercase">${item.nombre_cliente}</p>
                <p class="text-[10px] text-gray-500 font-mono">${item.whatsapp || 'Sin WhatsApp'}</p>
            </td>
            <td class="p-5 text-xs">
                <p class="text-blue-400 font-black italic uppercase">${item.cuentas_madre?.plataforma || 'Sin Cuenta'}</p>
                <p class="text-gray-400 font-bold uppercase tracking-tighter">${item.perfil_asignado}</p>
            </td>
            <td class="p-5 text-center">
                <span class="bg-gray-900 px-4 py-2 rounded-xl text-[10px] font-black border border-gray-700 uppercase">
                    ${item.vencimiento}
                </span>
            </td>
            <td class="p-5">
                <div class="btn-group">
                    <div class="action-btn-container">
                        <button onclick="enviarWhatsApp('${item.whatsapp}', '${item.nombre_cliente}', '${item.vencimiento}')" class="action-btn btn-wa">WP</button>
                        <span class="btn-hint">Notificar</span>
                    </div>
                    <div class="action-btn-container">
                        <button onclick="copiarDatos('${item.cuentas_madre?.email}', '${item.cuentas_madre?.plataforma}')" class="action-btn btn-datos">COPY</button>
                        <span class="btn-hint">Datos</span>
                    </div>
                    <div class="action-btn-container">
                        <button onclick="abrirModalMigrar('${item.id}')" class="action-btn btn-migrar">MOD</button>
                        <span class="btn-hint">Cambiar</span>
                    </div>
                    <div class="action-btn-container">
                        <button onclick="eliminarPerfil('${item.id}')" class="action-btn btn-delete">DEL</button>
                        <span class="btn-hint">Eliminar</span>
                    </div>
                </div>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

// Las demás funciones (cambiarSeccion, cargarSelectMadres, etc.) se mantienen igual
function cambiarSeccion(id) {
    document.querySelectorAll('.seccion-contenido').forEach(s => s.classList.add('hidden'));
    const seccion = document.getElementById(id);
    if (seccion) seccion.classList.remove('hidden');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('tab-active'));
    const btnId = id.replace('seccion-', 'btn-tab-');
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('tab-active');
}

async function cargarSelectMadres() {
    const { data } = await _supabase.from('cuentas_madre').select('id, plataforma, email');
    const select = document.getElementById('cuenta_madre_id');
    const selectMigrar = document.getElementById('migrar_nueva_madre');
    if (!select) return;

    const opciones = data?.map(m => `<option value="${m.id}">${m.plataforma} (${m.email})</option>`).join('');
    select.innerHTML = `<option value="">Seleccionar Cuenta...</option>${opciones}`;
    if (selectMigrar) selectMigrar.innerHTML = opciones;
}

async function actualizarBalanceGlobal() {
    const { data } = await _supabase.from('flujo_caja').select('monto, tipo');
    const total = data?.reduce((acc, item) => item.tipo === 'ingreso' ? acc + item.monto : acc - item.monto, 0) || 0;
    const el = document.getElementById('balance_monto');
    if (el) el.innerText = `$${total.toFixed(2)}`;
}

// Funciones de utilidad para botones
function enviarWhatsApp(n, c, v) { window.open(`https://wa.me/${n}?text=Hola ${c}, tu cuenta vence el ${v}`, '_blank'); }
function copiarDatos(e, p) { navigator.clipboard.writeText(`Cuenta: ${p}\nCorreo: ${e}`); alert("Copiado"); }
function abrirModalMigrar(id) { document.getElementById('migrar_perfil_id').value = id; document.getElementById('modalMigrar').classList.remove('hidden'); }
function cerrarModal() { document.getElementById('modalMigrar').classList.add('hidden'); }
async function eliminarPerfil(id) { if(confirm('¿Eliminar?')) { await _supabase.from('perfiles_clientes').delete().eq('id', id); renderizarTodo(); } }
