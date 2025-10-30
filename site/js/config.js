// config.js
import { API_BASE, getToken, setToken, logout, fetchWithAuth  } from '/js/utils/api.js';
export const LIMITS = { policies: 5000, faq_q: 200, faq_a: 1200, email_body: 5000, profile_field: 1000 };

// Detectar si estamos en página de planes (acceso público permitido)
const IS_PUBLIC_PAGE = window.location.pathname.includes('/plans.html');

function delay(ms){ return new Promise(r => setTimeout(r, ms)); }

async function pollOnce(state) {
  const r = await fetch(`${API_BASE}/google/auth/poll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state })
  });
  if (r.status === 200) {
    const d = await r.json();
    if (d && d.access_token) {
      setToken(d.access_token);
      localStorage.removeItem("login_state");
      localStorage.removeItem("store");
      // 🔔 avisa a quien espere el token
      window.dispatchEvent(new CustomEvent("auth-token-ready"));
      return true;
    }
  }
  if (r.status === 401) {
    localStorage.removeItem("login_state");
  }
  return false; // 204 u otros
}

async function waitForTokenIfNeeded() {
  // CRÍTICO: Si estamos en página pública SIN callback de OAuth, NO hacer polling
  // PERO si venimos de OAuth callback (tiene login_state en localStorage), SÍ hacer polling
  const pendingState = localStorage.getItem("login_state");
  
  if (IS_PUBLIC_PAGE && !pendingState) {
    console.log('ℹ️ Página pública sin OAuth callback (sin login_state), omitiendo polling');
    return;
  }

  if (pendingState && !getToken()) {
    console.log('🔄 Polling de autenticación iniciado con state:', pendingState.substring(0, 10) + '...');
    for (let i = 0; i < 20; i++) {           // ~10s total
      try { 
        if (await pollOnce(pendingState)) {
          console.log('✅ Polling exitoso, token obtenido');
          return;
        }
      } catch (err) {
        console.warn('⚠️ Error en polling intento', i+1, ':', err);
      }
      await delay(500);
      if (getToken()) {
        console.log('✅ Token detectado durante espera');
        return;
      }
    }
    console.log('⏱️ Timeout de polling alcanzado después de 10s');
    // Solo limpiamos si realmente expiró
    localStorage.removeItem("login_state");
  }
}
window.tokenReadyPromise = (async () => {
  await waitForTokenIfNeeded();
  return !!getToken();
})();

window.configReady = (async function initConfig() {
  const params = new URLSearchParams(window.location.search);
  let fetchNeeded = false;

  // 1) Espera a que el callback deje el token listo (si aplica)
  await waitForTokenIfNeeded();

  // 2) Limpia parámetros sobrantes
  const removed = ["token", "session_id", "code", "state"];
  let touched = false;
  for (const k of removed) {
    if (params.has(k)) {
      params.delete(k);
      touched = true;
      if (k === "session_id") {
        localStorage.removeItem("store");
        fetchNeeded = true;
      }
    }
  }
  if (touched) {
    const clean = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, document.title, clean);
  }

  // 3) Inicializa perfil
  // CRÍTICO: En páginas públicas SIN login_state (sin OAuth pendiente), no inicializar perfil
  // PERO si hay login_state o ya hay token, SÍ inicializar perfil
  const hasLoginState = !!localStorage.getItem("login_state");
  const hasToken = !!getToken();
  
  if (IS_PUBLIC_PAGE && !hasLoginState && !hasToken) {
    console.log('ℹ️ Página pública sin OAuth ni token - Omitiendo inicialización de perfil');
    window.appUserPromise = Promise.resolve(null);
    return; // Salir de initConfig temprano
  }

  const stored = localStorage.getItem("store");
  if (stored && !fetchNeeded) {
    console.log('📦 Usando store cacheado');
    window.appUser = JSON.parse(stored);
    window.appUserPromise = Promise.resolve(window.appUser);
  } else {
    console.log('🔄 Iniciando carga de perfil...');
    window.appUserPromise = (async () => {
      const token = getToken();
      
      if (!token) {
        console.log('🚪 Sin token, ejecutando logout...');
        return logout();
      }

      console.log('✅ Token presente, cargando perfil...');
      const res = await fetchWithAuth(`/stores/me`);
      if (!res.ok) {
        console.error('❌ Error en /stores/me:', res.status);
        throw new Error("No autorizado");
      }

      const data = await res.json();
      console.log('✅ Perfil cargado:', data?.email || data?.id);
      window.appUser = data;
      localStorage.setItem("store", JSON.stringify(data));
      return data;
    })()
    .then((data) => {
      console.log('✅ appUserPromise resuelto');
      try { window.dispatchEvent(new CustomEvent("app-user-ready", { detail: data })); } catch(_) {}
      return data;
    })
    .catch(err => {
      console.error("❌ fallo en stores/me:", err);
      console.log('🚪 Ejecutando logout por error');
      logout();
    });
  }
})();
