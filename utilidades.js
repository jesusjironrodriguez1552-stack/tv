// utilidades.js - FUNCIONES COMUNES Y RELOJ EN TIEMPO REAL
// Este archivo debe cargarse ANTES de los demás módulos

console.log('🛠️ Módulo utilidades.js cargado');

// ============================================
// FUNCIÓN GLOBAL: OBTENER FECHA LOCAL
// ============================================
window.obtenerFechaLocal = function() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
};

// ============================================
// FUNCIÓN GLOBAL: OBTENER FECHA Y HORA LOCAL COMPLETA
// ============================================
window.obtenerFechaHoraLocal = function() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const hora = String(ahora.getHours()).padStart(2, '0');
    const minuto = String(ahora.getMinutes()).padStart(2, '0');
    const segundo = String(ahora.getSeconds()).padStart(2, '0');
    return `${año}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
};

// ============================================
// RELOJ EN TIEMPO REAL
// ============================================
function actualizarReloj() {
    const ahora = new Date();
    
    // Formatear fecha
    const opciones = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const fechaTexto = ahora.toLocaleDateString('es-ES', opciones);
    
    // Formatear hora
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    const horaTexto = `${horas}:${minutos}:${segundos}`;
    
    // Actualizar en el DOM
    const elementoFecha = document.getElementById('reloj-fecha');
    const elementoHora = document.getElementById('reloj-hora');
    
    if (elementoFecha) {
        elementoFecha.textContent = fechaTexto;
    }
    
    if (elementoHora) {
        elementoHora.textContent = horaTexto;
    }
}

// Iniciar el reloj cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('⏰ Iniciando reloj en tiempo real...');
        actualizarReloj(); // Actualizar inmediatamente
        setInterval(actualizarReloj, 1000); // Actualizar cada segundo
        console.log('✅ Reloj activado');
    });
} else {
    console.log('⏰ Iniciando reloj en tiempo real...');
    actualizarReloj();
    setInterval(actualizarReloj, 1000);
    console.log('✅ Reloj activado');
}

// ============================================
// FUNCIÓN GLOBAL: FORMATEAR MONEDA
// ============================================
window.formatearMoneda = function(monto) {
    return `$${parseFloat(monto).toFixed(2)}`;
};

// ============================================
// FUNCIÓN GLOBAL: CALCULAR DÍAS ENTRE FECHAS
// ============================================
window.calcularDiasRestantes = function(fechaVencimiento) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vence = new Date(fechaVencimiento);
    vence.setHours(0, 0, 0, 0);
    return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
};

// ============================================
// LOGS DE DEBUGGING
// ============================================
console.log('📅 Fecha actual del sistema:', obtenerFechaLocal());
console.log('🕐 Fecha y hora actual:', obtenerFechaHoraLocal());
console.log('✅ Módulo utilidades.js inicializado correctamente');
console.log('🌍 Zona horaria del navegador:', Intl.DateTimeFormat().resolvedOptions().timeZone);
