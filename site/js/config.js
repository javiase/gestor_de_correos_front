// config.js
import { API_BASE, getToken, setToken, logout, fetchWithAuth  } from '/js/utils/api.js';
export const LIMITS = { policies: 5000, faq_q: 200, faq_a: 1200, email_body: 2000, profile_field: 1000 };

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
  const pendingState = localStorage.getItem("login_state");
  if (pendingState && !getToken()) {
    for (let i = 0; i < 20; i++) {           // ~10s total
      try { if (await pollOnce(pendingState)) return; } catch {}
      await delay(500);
      if (getToken()) return;
    }
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
  const stored = localStorage.getItem("store");
  if (stored && !fetchNeeded) {
    window.appUser = JSON.parse(stored);
    window.appUserPromise = Promise.resolve(window.appUser);
  } else {
    window.appUserPromise = (async () => {
      const token = getToken();
      if (!token) return logout();

      const res = await fetchWithAuth(`/stores/me`);
      if (!res.ok) throw new Error("No autorizado");

      const data = await res.json();
      window.appUser = data;
      localStorage.setItem("store", JSON.stringify(data));
      return data;
    })()
    .then((data) => {
      try { window.dispatchEvent(new CustomEvent("app-user-ready", { detail: data })); } catch(_) {}
      return data;
    })
    .catch(err => {
      console.error("❌ fallo en stores/me:", err);
      logout();
    });
  }
})();
