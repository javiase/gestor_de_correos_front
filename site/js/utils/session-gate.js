// /js/utils/session-gate.js
import { getToken } from '/js/utils/api.js';

const norm = p => p.replace(/\/+$/, '').toLowerCase();

/**
 * Redirige al index si no hay token en este navegador.
 * Espera un poquito por si el token está “a punto de llegar” (OAuth).
 */
export async function enforceSessionGate({
  allow = [
    '/', '/index.html',
    '/secciones/perfil.html', '/secciones/plans.html',
    // añade aquí rutas públicas (p.ej. callback OAuth si la tienes):
    '/auth/callback', '/oauth/callback'
  ],
  redirectTo = '/index.html',
  waitMs = 3000
} = {}) {
  const here = norm(location.pathname);
  const allowSet = new Set(allow.map(norm));
  if (allowSet.has(here)) return;

  // 1) ¿ya hay token?
  if (getToken()) return;

  // 2) Espera breve por si el token entra justo ahora (evento global de tu login)
  const got = await new Promise(resolve => {
    if (getToken()) return resolve(true);
    const t = setTimeout(() => resolve(false), waitMs);
    window.addEventListener('auth-token-ready', () => {
      clearTimeout(t);
      resolve(!!getToken());
    }, { once: true });
  });

  if (!got) {
    const url = new URL(redirectTo, location.origin);
    url.searchParams.set('msg', 'Inicia sesión para continuar.');
    location.replace(url.toString());
  }
}
