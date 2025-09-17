// js/utils/api.js

// 1) Base URL de tu API
export const API_BASE = window.location.hostname.includes("localhost")
  ? "http://localhost:8085/api"
  : "/api";

// ──────────────────────────────────────────────────────────────
// 2) Token en MEMORIA + sessionStorage (NO localStorage)
// ──────────────────────────────────────────────────────────────
const SS_KEY = "auth_token_v1";
let memToken = null;
let refreshPromise = null;
let isLoggingOut = false;

// Rehidrata desde sessionStorage al cargar el módulo
try {
  memToken = sessionStorage.getItem(SS_KEY) || null;
} catch (_) {
  memToken = null;
}

export function getToken() {
  return memToken;
}

export function setToken(t) {
  memToken = t || null;
  try {
    if (t) sessionStorage.setItem(SS_KEY, t);
    else sessionStorage.removeItem(SS_KEY);
  } catch (_) {}
}

export function clearToken() {
  memToken = null;
  try { sessionStorage.removeItem(SS_KEY); } catch (_) {}
}

// Broadcast logout entre pestañas (por si en el futuro lo necesitas)
const bc = ("BroadcastChannel" in window) ? new BroadcastChannel("auth") : null;
if (bc) {
  bc.onmessage = (ev) => {
    if (ev?.data === "logout") {
      clearToken();
      mostrarModalSesionCaducada();
    }
  };
}

// ──────────────────────────────────────────────────────────────
// 3) Logout
// ──────────────────────────────────────────────────────────────
export async function logout(opts = {}) {
  const {
    showModal = false,            // ← si true, enseña modal; si false, redirige
    redirectTo = "/index.html",   // ← destino al salir
    broadcast = true              // ← avisa a otras pestañas
  } = opts;

  if (isLoggingOut) return;
  isLoggingOut = true;

  const tk = getToken();
  try {
    if (tk) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tk}` }
      });
    }
  } catch (_) {
    // si falla, cortamos client-side igualmente
  }
  clearToken();
  if (bc && broadcast) bc.postMessage("logout");
  if (showModal) {
    mostrarModalSesionCaducada();
  } else {
    window.location.href = redirectTo;
  }
  setTimeout(() => { isLoggingOut = false; }, 3000); // por si no navega
}

// --- helpers base64url + JWT seguro ---
function b64urlDecode(input) {
  if (!input || typeof input !== "string") return null;
  // base64url -> base64
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad !== 0) s += "==="; // por si acaso
  try { return atob(s); } catch { return null; }
}

function parseJwt(token) {
  try {
    const part = token.split(".")[1];
    const json = b64urlDecode(part);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers de token (renovación y modal)
// ──────────────────────────────────────────────────────────────
// Reemplaza tokenExpiraEnMenosDe() por estas dos funciones:
function tokenEstaVencido() {
  const token = getToken();
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return (payload.exp * 1000) <= Date.now();
}

function tokenExpiraEnMenosDe(minutos = 10) {
  const token = getToken();
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload?.exp) return true; // si no podemos leerlo, nos ponemos conservadores
  const expMs = payload.exp * 1000;
  return (expMs - Date.now()) < minutos * 60 * 1000;
}

async function renovarToken() {
  if (refreshPromise) return refreshPromise;     // ⟵ evita carreras
  refreshPromise = (async () => {
    const oldToken = getToken();
    if (!oldToken) throw new Error("No hay token para renovar");
    const res = await fetch(`${API_BASE}/auth/refresh_token`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${oldToken}` }
    });
    if (!res.ok) throw new Error("No se pudo renovar el token");
    const { access_token } = await res.json();
    setToken(access_token);
    console.log("🔁 Token renovado");
  })();
  try { await refreshPromise; } finally { refreshPromise = null; }
}

function mostrarModalSesionCaducada() {
  const existing = document.getElementById("modal-sesion-caducada");
  if (existing) return existing.style.display = "flex";
  const modal = document.createElement("div");
  modal.id = "modal-sesion-caducada";
  Object.assign(modal.style, {
    position: "fixed", top:0, left:0, width:"100%", height:"100%",
    background:"rgba(0,0,0,0.5)", display:"flex",
    justifyContent:"center", alignItems:"center", zIndex:9999
  });
  modal.innerHTML = `
    <div style="background: #2a2a2a; padding: 2rem; border-radius: 8px; text-align: center; max-width: 400px; box-shadow: 0 0 20px rgba(0,0,0,0.3);">
      <h2 style="color: #fff;">Sesión caducada</h2>
      <p style="color: #ddd;">Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.</p>
      <button id="cerrar-modal-sesion" style="margin-top: 1rem; padding: 0.5rem 1rem; border: none; background: #20ab7a; color: white; border-radius: 5px; cursor: pointer;">
        Entendido
      </button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("cerrar-modal-sesion").onclick = () => {
    clearToken();
    window.location.href = "/index.html";
  };
}

// ──────────────────────────────────────────────────────────────
// 4) fetch con auth + refresh automático
// ──────────────────────────────────────────────────────────────
// Sustituye fetchWithAuth() completo por esta versión más robusta:
export async function fetchWithAuth(path, opts = {}) {
  // Construye headers sin romper FormData
  const buildHeaders = (baseHeaders, tk, body) => {
    const headers = new Headers(baseHeaders || {});
    headers.set("Authorization", `Bearer ${tk}`);
    if (body && !(body instanceof FormData)) {
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    }
    return headers;
  };

  // 1) Preflight: refresh si toca
  const expired = tokenEstaVencido();
  const stale   = !expired && tokenExpiraEnMenosDe(10); // ajusta umbral si quieres (p. ej. 5)

  if (expired || stale) {
    try {
      await renovarToken();
    } catch (err) {
      if (expired) {
        // si estaba vencido y no pudimos refrescar -> fuera
        logout({ showModal: true });
        return Promise.reject(err);
      }
      // si solo estaba "stale", seguimos con el token viejo
      console.warn("No se pudo refrescar (stale). Continúo con el token actual.");
    }
  }

  // 2) Haz la petición con el (posible) token nuevo
  let token = getToken();
  if (!token) {
    logout();
    return Promise.reject(new Error("No autenticado"));
  }

  let headers = buildHeaders(opts.headers, token, opts.body);
  let res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  // 3) Si da 401, intenta 1 refresh + 1 reintento
  if (res.status === 401) {
    try {
      await renovarToken();
      token = getToken();
      if (!token) throw new Error("No token after refresh");
      headers = buildHeaders(opts.headers, token, opts.body);
      res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    } catch (_) {
      // ignoramos, evaluamos status abajo
    }

    if (res.status === 401) {
      logout({ showModal: true });
      return Promise.reject(new Error("No autenticado"));
    }
  }

  return res;
}

