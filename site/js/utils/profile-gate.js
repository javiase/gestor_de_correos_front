// /js/utils/profile-gate.js
import { fetchWithAuth, getToken } from '/js/utils/api.js';

export function isProfileComplete(s) {
  if (!s) return false;
  // Requisitos mínimos (ajústalos si quieres)
  const req = [
    s.storeName,
    s.firstName,
    s.lastName,
    s.personalEmail,
  ];
  // Si marcó que tiene local físico → exige su dirección completa
  if (s.hasPhysicalLocation) {
    req.push(s.storeAddress, s.storeCity, s.storeState, s.storeCountry);
  }
  return req.every(v => (typeof v === 'string' ? v.trim().length > 0 : !!v));
}

export async function getStoreCached() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('store') || 'null'); } catch {}
  if (!s) {
    try {
      const r = await fetchWithAuth('/stores/me');
      if (r.ok) {
        s = await r.json();
        localStorage.setItem('store', JSON.stringify(s));
      }
    } catch {}
  }
  return s;
}

/**
 * Redirige a /secciones/perfil.html si el perfil NO está completo, salvo que ya estés en Perfil.
 * Úsalo en TODAS las páginas (secciones) al cargar.
 */
function norm(p){ return p.replace(/\/+$/,'').toLowerCase(); }

async function waitForAuthToken(timeoutMs = 3000) {
  if (getToken()) return true;
  await new Promise(resolve => {
    const to = setTimeout(resolve, timeoutMs);
    window.addEventListener('auth-token-ready', () => { clearTimeout(to); resolve(); }, { once:true });
  });
  return !!getToken();
}

export async function enforceProfileGate({
  allow = ['/index.html','/secciones/perfil.html','/secciones/plans.html'],
  redirectTo = '/secciones/perfil.html',
  message = 'Completa tu perfil para continuar.'
} = {}) {
  const here = norm(location.pathname);
  const allowSet = new Set([...allow, '/secciones/perfil','/secciones/plans','/'].map(norm));
  if (allowSet.has(here)) return;

  // 1) Espera token si hace falta
  const hasToken = await waitForAuthToken(3000);
  if (!hasToken) {
    const url = new URL('/index.html', location.origin);
    url.searchParams.set('msg','Tu sesión ha expirado. Inicia sesión.');
    return location.replace(url.toString());
  }

  // 2) Carga store (cache o API)
  let store = null;
  try {
    store = await getStoreCached(); // tu función ya usa fetchWithAuth
  } catch (_) {}
  if (!store) {
    const url = new URL('/index.html', location.origin);
    url.searchParams.set('msg','Tu sesión ha expirado. Inicia sesión.');
    return location.replace(url.toString());
  }

  // 3) Gate de perfil
  if (!isProfileComplete(store)) {
    const url = new URL(redirectTo, location.origin);
    url.searchParams.set('msg', message);
    return location.replace(url.toString());
  }
}