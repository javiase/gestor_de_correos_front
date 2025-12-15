// /js/utils/flow-gate.js
// Unifica: SESSION → PERFIL → ONBOARDING (info)
// -------------------------------------------------
// - Exporta utilidades de perfil (isProfileComplete, getStoreCached)
// - Exporta utilidades de onboarding (seedOnboardingFromServer, markOnboardingStep, isOnboardingComplete, resetOnboardingProgress)
// - Exporta enforceFlowGate(): aplica el flujo completo con redirecciones configurables
// - Exporta enforceSessionGate(): atajo opcional de solo sesión (compat)

import { fetchWithAuth, getToken } from '/js/utils/api.js';

/* ──────────────────────────────────────────────────────────────
 * PARTE COMÚN (helpers compartidos por todos los gates)
 * ────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────
 * OWNER / STORAGE KEYS
 * ────────────────────────────────────────────────────────────── */
function getStoreSync() {
  try { return JSON.parse(localStorage.getItem('store') || 'null'); } catch { return null; }
}
function ownerId(store = getStoreSync()) {
  return store?.id || store?._id || store?.userId || store?.owner_id || 'anon';
}
function obKey(store = getStoreSync()) {
  return `onboarding_progress_v1:${ownerId(store)}`;
}
function readOB(store = getStoreSync()) {
  try { return JSON.parse(localStorage.getItem(obKey(store)) || '{}'); } catch { return {}; }
}
function writeOB(st, store = getStoreSync()) {
  localStorage.setItem(obKey(store), JSON.stringify(st || {}));
}
export function resetOnboardingProgress(store = getStoreSync()) {
  localStorage.removeItem(obKey(store));
}
export function resetOnboardingIfOwnerChanged(store = getStoreSync()) {
  const K = 'onboarding_progress_owner';
  const cur = String(ownerId(store));
  const prev = localStorage.getItem(K);
  if (prev !== cur) {
    // Limpia legado y cualquier estado previo
    localStorage.removeItem('onboarding_progress_v1'); // legacy (sin namespace)
    resetOnboardingProgress(store);
    localStorage.setItem(K, cur);
  }
}

/**
 * Obtiene el contexto actual del usuario basado en sesión y estado activo.
 * @returns {'guest'|'inactive'|'active'}
 * - 'guest': No hay token (usuario sin sesión)
 * - 'inactive': Hay token pero active=false (usuario registrado sin plan activo)
 * - 'active': Hay token y active=true (usuario con plan activo)
 */
export function getUserContext() {
  if (!getToken()) return 'guest';
  const store = getStoreSync();
  return store?.active ? 'active' : 'inactive';
}

function norm(p) {
  // normaliza rutas: quita / final, a minúsculas; garantiza "/" para raíz
  const v = (p || '/').replace(/\/+$/, '').toLowerCase();
  return v || '/';
}

/**
 * Espera brevemente a que exista un auth token en caso de flujos OAuth
 * (escucha el evento global "auth-token-ready" que dispara tu login).
 */
async function waitForAuthToken(timeoutMs = 3000) {
  if (getToken()) return true;
  await new Promise(resolve => {
    const to = setTimeout(resolve, timeoutMs);
    window.addEventListener('auth-token-ready', () => { clearTimeout(to); resolve(); }, { once: true });
  });
  return !!getToken();
}

/* ──────────────────────────────────────────────────────────────
 * PARTE PERFIL (perfil gate + utilidades)
 * ────────────────────────────────────────────────────────────── */

/**
 * Criterio de "perfil completo". Ajusta requisitos si cambian.
 */
export function isProfileComplete(s) {
  if (!s) return false;
  
  // 🆕 Si el backend ya marcó el perfil como completo, confiar en eso
  if (s.profile_completed === true) return true;
  
  // Fallback: validación manual (para cuando se acaba de completar y aún no se guardó)
  const req = [ s.storeName, s.firstName, s.lastName, s.personalEmail ];
  if (s.hasPhysicalLocation) req.push(s.storeAddress, s.storeCity, s.storeState, s.storeCountry);
  return req.every(v => (typeof v === 'string' ? v.trim().length > 0 : !!v));
}

/**
 * Lee la tienda desde cache local; si falta, la pide a /stores/me y cachea.
 */
export async function getStoreCached() {
  console.log('[getStoreCached] 🔍 Leyendo store...');
  let s = null;
  try { 
    s = JSON.parse(localStorage.getItem('store') || 'null'); 
    console.log('[getStoreCached] - Store desde localStorage:', s);
    console.log('[getStoreCached] - active:', s?.active);
  } catch (e) {
    console.warn('[getStoreCached] ⚠️ Error parseando localStorage:', e);
  }
  
  if (!s) {
    console.log('[getStoreCached] ⚠️ No hay store en cache, haciendo fetch...');
    try {
      const r = await fetchWithAuth('/stores/me');
      if (r.ok) {
        s = await r.json();
        localStorage.setItem('store', JSON.stringify(s));
        console.log('[getStoreCached] ✅ Store obtenido del servidor:', s);
        console.log('[getStoreCached] - active:', s?.active);
      } else {
        console.warn('[getStoreCached] ⚠️ Fetch failed, status:', r.status);
      }
    } catch (e) {
      console.warn('[getStoreCached] ⚠️ Error en fetch:', e);
    }
  }
  
  console.log('[getStoreCached] 📤 Retornando store con active =', s?.active);
  return s;
}

/* ──────────────────────────────────────────────────────────────
 * PARTE INFO / ONBOARDING (progreso local + seed desde servidor)
 * ────────────────────────────────────────────────────────────── */

// Ids canónicos (usa SIEMPRE estos textos internamente)
export const STEP_ID = {
  info:     'Información de la tienda',
  shipping: 'Política de envíos',
  returns:  'Política de devoluciones',
};
const DEFAULT_STEPS = [STEP_ID.info, STEP_ID.shipping, STEP_ID.returns];

// Aliases aceptados para seed (por si el backend tiene otro título)
const STEP_ALIASES = {
  [STEP_ID.info]:     ['Información de la tienda', 'Información general de la tienda', 'Store Info'],
  [STEP_ID.shipping]: ['Política de envíos', 'Política de Envíos', 'Envíos', 'Shipping'],
  [STEP_ID.returns]:  ['Política de devoluciones', 'Política de Devoluciones', 'Devoluciones', 'Returns'],
};

function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export function resolveStepKey(title) {
  const t = normalizeKey(title);
  if (!t) return '';
  if (t.includes('informacion') && t.includes('tienda')) return STEP_ID.info;
  if (t.includes('envio') || t.includes('shipping'))    return STEP_ID.shipping;
  if (t.includes('devolucion') || t.includes('return')) return STEP_ID.returns;
  return '';
}

/** Marca un paso como hecho en localStorage (se usa para el gate). */
export function markOnboardingStep(name, done = true) {
  if (!name) return;
  const st = readOB();
  st[name] = !!done;
  writeOB(st);
  // broadcast para el sidebar
  const complete = isOnboardingComplete();
  window.dispatchEvent(new CustomEvent('onboarding-complete-changed', { detail: { complete } }));
}

/** Comprueba si TODOS los pasos requeridos están hechos. */
export function isOnboardingComplete({ required = DEFAULT_STEPS, store = null } = {}) {
  // 🆕 Si el backend ya marcó el onboarding como completo, confiar en eso
  const s = store || getStoreSync();
  if (s && s.onboarding_completed === true) return true;
  
  // Fallback: validación manual con localStorage
  const st = readOB();
  return (required || []).every(k => !!st[k]);
}

/**
 * Seed desde backend: para cada paso requerido, pregunta /policies/get
 * y marca como hecho si hay contenido “completo” en servidor.
 * Llama a esta función al entrar en info.html (y/o tras login).
 */
export async function seedOnboardingFromServer({ required = DEFAULT_STEPS } = {}) {
  // 🆕 OPTIMIZACIÓN: Si el store ya tiene onboarding_completed, no hacer llamadas
  const s = getStoreSync();
  if (s && s.onboarding_completed === true) {
    console.log('[seedOnboarding] Store ya tiene onboarding_completed=true, skip API calls');
    // Marcar todos los pasos como completos en localStorage para coherencia
    required.forEach(canonical => markOnboardingStep(canonical, true));
    return;
  }

  console.log('[seedOnboarding] Consultando políticas desde el backend...');
  for (const canonical of required) {
    try {
      // prueba con aliases hasta que una devuelva contenido
      const aliases = STEP_ALIASES[canonical] || [canonical];
      let complete = false;
      for (const alias of aliases) {
        const res = await fetchWithAuth('/policies/get?policy_name=' + encodeURIComponent(alias));
        if (!res.ok) continue;
        const data = await res.json();
        const c = data?.content;
        if (
          (typeof c === 'string' && c.trim() !== '') ||
          (Array.isArray(c) && c.length > 0) ||
          (c && typeof c === 'object' && Object.keys(c).length > 0)
        ) {
          complete = true; break;
        }
      }
      if (complete) markOnboardingStep(canonical, true);
    } catch {}
  }
}

/* ──────────────────────────────────────────────────────────────
 * MARCAR COMPLETADO EN BACKEND (para evitar validaciones futuras)
 * ────────────────────────────────────────────────────────────── */

/**
 * Marca un área como completada en el backend (perfil u onboarding).
 * @param {string} areaCompleted - 'profile' o 'onboarding'
 * 
 * Ejemplos:
 *   await markCompletionInBackend('profile');
 *   await markCompletionInBackend('onboarding');
 */
export async function markCompletionInBackend(areaCompleted) {
  console.log(`🔥 [markCompletion] LLAMADA INICIADA para: ${areaCompleted}`);
  
  if (!areaCompleted || !['profile', 'onboarding'].includes(areaCompleted)) {
    console.error('[markCompletion] Parámetro inválido. Debe ser "profile" o "onboarding"');
    return;
  }

  try {
    console.log(`📡 [markCompletion] Haciendo POST a /stores/mark-completion con body:`, { completed: areaCompleted });
    
    const response = await fetchWithAuth('/stores/mark-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: areaCompleted })
    });
    
    console.log(`✅ [markCompletion] Response status:`, response.status);
    
    // Actualizar el cache local
    const store = getStoreSync();
    if (store) {
      if (areaCompleted === 'profile') {
        store.profile_completed = true;
        console.log('[markCompletion] Perfil marcado como completado en backend');
      } else if (areaCompleted === 'onboarding') {
        store.onboarding_completed = true;
        console.log('[markCompletion] Onboarding marcado como completado en backend');
      }
      localStorage.setItem('store', JSON.stringify(store));
    }
  } catch (e) {
    console.error(`❌ [markCompletion] Error al marcar ${areaCompleted} completado:`, e);
  }
}

/* ──────────────────────────────────────────────────────────────
 * PARTE SESIÓN (session gate "básico", opcional / compat)
 * ────────────────────────────────────────────────────────────── */
/**
 * Atajo de solo sesión (similar a tu antiguo /js/utils/session-gate.js).
 * Útil si alguna página quiere *solo* verificar sesión sin perfil/onboarding.
 */
export async function enforceSessionGate({
  allow = [
    '/', '/index.html',
    '/secciones/perfil.html', '/secciones/plans.html',
    '/secciones/info.html',
    '/secciones/login.html', '/secciones/register.html',
    // rutas públicas/externas (ajusta a tu app):
    '/auth/callback', '/oauth/callback'
  ],
  redirectTo = '/secciones/login.html',
  waitMs = 3000,
  message = 'Inicia sesión para continuar.'
} = {}) {
  const here = norm(location.pathname);
  const allowSet = new Set(allow.map(norm));
  if (allowSet.has(here)) return;

  if (getToken()) return;

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
    url.searchParams.set('msg', message);
    location.replace(url.toString());
  }
}

/* ──────────────────────────────────────────────────────────────
 * GATE UNIFICADO (SESSION → PERFIL → ONBOARDING/INFO)
 * ────────────────────────────────────────────────────────────── */
/**
 * Enforce del flujo completo:
 *  1) Sin sesión → /index.html
 *  2) Sin plan activo → /secciones/plans.html
 *  3) Perfil incompleto → /secciones/perfil.html
 *  4) Onboarding (info) incompleto → /secciones/info.html
 *  5) Todo OK → deja pasar
 *
 * Configúralo con las listas allow* para permitir páginas de destino
 * (p. ej. permitir permanecer en /secciones/perfil.html al completar perfil).
 */
export async function enforceFlowGate({
  /* RUTAS PERMITIDAS SIEMPRE (públicas o landing) */
  allowAlways      = ['/', '/index.html', '/auth/callback', '/oauth/callback', '/secciones/login.html', '/secciones/register.html'],

  /* RUTAS donde se permite estar mientras el PERFIL esté incompleto */
  allowProfile     = ['/secciones/perfil.html', '/secciones/plans.html'],

  /* RUTAS donde se permite estar mientras el ONBOARDING esté incompleto */
  allowOnboarding  = ['/secciones/info.html', '/secciones/perfil.html'],

  /* PASOS requeridos para considerar el onboarding completo */
  requiredSteps    = DEFAULT_STEPS,

  /* Redirecciones por defecto del flujo */
  redirects        = {
    noSession:     '/secciones/login.html',
    needPlan:      '/secciones/plans.html',
    needProfile:   '/secciones/perfil.html',
    needOnboarding:'/secciones/info.html',
  },

  /* Mensajes (como query ?msg=) que puedes leer y mostrar en la página destino */
  messages         = {
    noSession:     'Tu sesión ha expirado. Inicia sesión.',
    needPlan:      'Selecciona un plan para continuar.',
    needProfile:   'Completa tu perfil para continuar.',
    needOnboarding:'Completa esta sección antes de continuar.',
  },

  /* Tiempo máximo a esperar por un token recién emitido (OAuth) */
  waitTokenMs      = 3000,
} = {}) {
  const here = norm(location.pathname);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔒 [enforceFlowGate] INICIO');
  console.log('[enforceFlowGate] - Página actual:', here);
  console.log('[enforceFlowGate] - localStorage store:', localStorage.getItem('store'));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Construye el set de rutas explícitamente permitidas (normalizadas)
  const allowSet = new Set([
    ...allowAlways,
    ...allowProfile,
    ...allowOnboarding,
    // Soporta rutas sin ".html" por si el servidor las sirve así
    '/secciones/perfil', '/secciones/plans', '/secciones/info'
  ].map(norm));

  // Si estoy en una ruta pública (p.ej. index) → no hago nada
  if (allowSet.has(here) && (here === norm(redirects.noSession))) return;

  /* ➊ ─────────────────────────────────────────────
   *  SESIÓN (parte de sesión)
   *  - Si no hay token (ni llega en el breve margen), redirige a index
   *  - Añade ?msg= para UX
   *  ───────────────────────────────────────────── */
  const hasToken = await waitForAuthToken(waitTokenMs);
  if (!hasToken) {
    const url = new URL(redirects.noSession, location.origin);
    url.searchParams.set('msg', messages.noSession);
    return location.replace(url.toString());
  }

  /* ➋ ─────────────────────────────────────────────
   *  PLAN ACTIVO (verificar active) - PRIORIDAD MÁXIMA
   *  - Si el usuario NO tiene active: true, redirige a /secciones/plans.html
   *  - ANTES de validar perfil/onboarding
   *  ───────────────────────────────────────────── */
  const store = await getStoreCached();
  resetOnboardingIfOwnerChanged(store);
  
  console.log('[enforceFlowGate] ➋ Verificando plan activo...');
  console.log('[enforceFlowGate] - store:', store);
  console.log('[enforceFlowGate] - store.active:', store?.active);
  console.log('[enforceFlowGate] - Página actual (here):', here);
  
  const allowWithoutPlan = ['/secciones/plans.html'].map(norm);
  console.log('[enforceFlowGate] - allowWithoutPlan:', allowWithoutPlan);
  console.log('[enforceFlowGate] - ¿Estoy en allowWithoutPlan?:', allowWithoutPlan.includes(here));
  
  if (!store?.active && !allowWithoutPlan.includes(here)) {
    console.log('🚨 [enforceFlowGate] ❌ REDIRIGIENDO A PLANS - Usuario sin plan activo');
    console.log('🚨 [enforceFlowGate] - Razón: store.active =', store?.active);
    console.log('🚨 [enforceFlowGate] - Desde página:', here);
    const url = new URL(redirects.needPlan, location.origin);
    url.searchParams.set('msg', messages.needPlan);
    return location.replace(url.toString());
  }
  
  console.log('[enforceFlowGate] ✅ Plan activo OK, continuando al siguiente gate...');

  /* ➌ ─────────────────────────────────────────────
   *  PERFIL (parte de perfil)
   *  - Si perfil incompleto y NO estamos ya en una ruta permitida para completarlo,
   *    redirige a /secciones/perfil.html con ?msg=
   *  ───────────────────────────────────────────── */
  if (!store || !isProfileComplete(store)) {
    if (!allowProfile.map(norm).includes(here)) {
      const url = new URL(redirects.needProfile, location.origin);
      url.searchParams.set('msg', messages.needProfile);
      return location.replace(url.toString());
    }
    return; // ya estamos en una ruta "perfil" → permitir continuar allí
  }

  /* ➍ ─────────────────────────────────────────────
   *  ONBOARDING / INFO (parte de info)
   *  - Si los pasos requeridos no están completos y NO estamos ya en info,
   *    redirige a /secciones/info.html con ?msg=
   *  ───────────────────────────────────────────── */
  if (!isOnboardingComplete(requiredSteps)) {
    if (!allowOnboarding.map(norm).includes(here)) {
      const url = new URL(redirects.needOnboarding, location.origin);
      url.searchParams.set('msg', messages.needOnboarding);
      return location.replace(url.toString());
    }
    return; // ya estamos en una ruta "info" → permitir continuar allí
  }

  /* ➎ ─────────────────────────────────────────────
   *  TODO OK (parte común final)
   *  - No hace nada: se deja pasar a la página actual.
   *  ───────────────────────────────────────────── */
}
