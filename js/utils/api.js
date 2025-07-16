// js/utils/api.js

// 1) Base URL de tu API
export const API_BASE = window.location.hostname.includes("localhost")
  ? "http://localhost:8080/api"
  : "http://localhost:8080/api";

// 2) Guardar / leer / borrar token
const TOKEN_KEY = "token";
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// 3) Logout
export function logout() {
  clearToken();
  // Si prefieres usar un modal:
  mostrarModalSesionCaducada();
}

// ─── Helpers de token ───

// Comprueba si el JWT expira en menos de `minutos`
function tokenExpiraEnMenosDe(minutos = 10) {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expMs = payload.exp * 1000;
    return expMs - Date.now() < minutos * 60 * 1000;
  } catch {
    return true; // token corrupto → forzar renovación
  }
}

// Pide al backend un refresh y guarda el nuevo token
async function renovarToken() {
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
}

// Muestra un modal bonito cuando la sesión caduque
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

// 4) Wrapper para peticiones autenticadas con renovación automática
export async function fetchWithAuth(path, opts = {}) {
  // 1) Si el token expira pronto, renovarlo
  if (tokenExpiraEnMenosDe(10)) {
    try {
      await renovarToken();
    } catch (err) {
      logout();
      return Promise.reject(err);
    }
  }

  // 2) Recuperar token (ya renovado si tocaba)
  const token = getToken();
  if (!token) {
    logout();
    return Promise.reject(new Error("No autenticado"));
  }

  // 3) Inyectar cabecera y hacer fetch
  opts.headers = {
    ...(opts.headers || {}),
    "Authorization": `Bearer ${token}`,
  };
  const res = await fetch(`${API_BASE}${path}`, opts);

  // 4) Si el backend devuelve 401, forzar logout/renewal
  if (res.status === 401) {
    logout();
    return Promise.reject(new Error("No autenticado"));
  }

  return res;
}
