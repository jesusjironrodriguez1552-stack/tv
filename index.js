// ============================================================
//  index.js — Lógica del Login
//  Usa supabase.js como punto central de conexión
// ============================================================

import { supabase, getSession } from './supabase.js';

// ── Redirigir si ya hay sesión activa ────────────────────────
(async () => {
  const session = await getSession();
  if (session) window.location.href = 'menu.html';
})();

// ── Partículas de fondo ──────────────────────────────────────
function spawnParticles() {
  const container = document.getElementById('particles');
  const count = 35;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random() * 100}vw;
      bottom: ${Math.random() * -20}vh;
      --dur: ${6 + Math.random() * 10}s;
      --delay: ${Math.random() * 8}s;
      width: ${1 + Math.random() * 2}px;
      height: ${1 + Math.random() * 2}px;
      opacity: 0;
      background: ${Math.random() > 0.5 ? '#3b9eff' : '#00e5c3'};
    `;
    container.appendChild(p);
  }
}
spawnParticles();

// ── Referencias DOM ──────────────────────────────────────────
const form      = document.getElementById('loginForm');
const emailEl   = document.getElementById('email');
const passEl    = document.getElementById('password');
const btnLogin  = document.getElementById('btnLogin');
const btnLoader = document.getElementById('btnLoader');
const errorBox  = document.getElementById('errorBox');
const toggleBtn = document.getElementById('togglePass');
const eyeIcon   = document.getElementById('eyeIcon');

// ── Toggle contraseña ────────────────────────────────────────
const eyeOpen = `
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>`;
const eyeClosed = `
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
  <line x1="1" y1="1" x2="23" y2="23"/>`;

toggleBtn.addEventListener('click', () => {
  const isPass = passEl.type === 'password';
  passEl.type = isPass ? 'text' : 'password';
  eyeIcon.innerHTML = isPass ? eyeClosed : eyeOpen;
});

// ── Mostrar / ocultar error ──────────────────────────────────
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add('visible');
  // Re-trigger animation
  errorBox.style.animation = 'none';
  requestAnimationFrame(() => {
    errorBox.style.animation = '';
  });
}
function clearError() {
  errorBox.classList.remove('visible');
}

// ── Estado de carga ──────────────────────────────────────────
function setLoading(state) {
  btnLogin.disabled = state;
  document.querySelector('.btn-text').style.visibility = state ? 'hidden' : 'visible';
  btnLoader.hidden = !state;
}

// ── Submit login ─────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email    = emailEl.value.trim();
  const password = passEl.value;

  // Validación básica cliente
  if (!email || !password) {
    showError('Por favor ingresa tu correo y contraseña.');
    return;
  }

  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Mensajes amigables en español
      const map = {
        'Invalid login credentials': 'Correo o contraseña incorrectos.',
        'Email not confirmed':        'Debes confirmar tu correo antes de ingresar.',
        'Too many requests':          'Demasiados intentos. Espera unos minutos.',
      };
      showError(map[error.message] || `Error: ${error.message}`);
      setLoading(false);
      return;
    }

    // Login exitoso → redirigir al menú
    window.location.href = 'menu.html';

  } catch (err) {
    showError('Error de conexión. Verifica tu internet.');
    setLoading(false);
  }
});

// ── Limpiar error al escribir ────────────────────────────────
[emailEl, passEl].forEach(el => el.addEventListener('input', clearError));
