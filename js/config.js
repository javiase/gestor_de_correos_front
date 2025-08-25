// config.js
import { API_BASE, setToken, logout } from '/js/utils/api.js';
export const LIMITS = { policies: 5000, faq_q: 200, faq_a: 1200, email_body: 2000, profile_field: 1000 };

// 1) Si vengo con ?token=XXX en la URL, guardarlo y limpiarlo:
(async function initConfig() {

  const params  = new URLSearchParams(window.location.search);
  const tk      = params.get("token");
  let fetchNeeded       = false;

  
  if (tk) {
    localStorage.setItem("token", tk);
    // Quitamos ?token=… de la URL
    params.delete("token");
    localStorage.removeItem("store");
    fetchNeeded = true;
  }

  const stripeSession = params.get("session_id");
  if (stripeSession) {
    params.delete("session_id");
    localStorage.removeItem("store");
    fetchNeeded = true;
  }
  const clean = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
  window.history.replaceState({}, document.title, clean);
  
  console.log("fetchNeeded:", fetchNeeded);
  // 3) Inicializar tienda: primero miro si ya la tengo en localStorage
  const stored = localStorage.getItem('store');
  if (stored && !fetchNeeded) {
    // ya la tengo: uso ese dato y creo una promesa resuelta
    window.appUser = JSON.parse(stored);
    window.appUserPromise = Promise.resolve(window.appUser);
  } else {
    // no la tengo: la pido al backend y luego la guardo
    window.appUserPromise = (async () => {
      const token = localStorage.getItem('token');
      if (!token) return logout();

      const res = await fetch(`${API_BASE}/stores/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('No autorizado');
      const data = await res.json();
      window.appUser = data;
      // la persisto para futuros reloads
      localStorage.setItem('store', JSON.stringify(data));
      return data;
    })().catch(err => {
      console.error('❌ fallo en stores/me:', err);
      logout();
    });
  }
})();
