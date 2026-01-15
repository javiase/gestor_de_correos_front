// site/js/pages/shopify-loading.js

import { fetchPublic, API_BASE, setToken } from '../utils/api.js';
import { notify } from '../utils/notify.js';
import { t, initI18n, setLocale } from '../utils/i18n.js';

/**
 * Página de carga para confirmación de suscripción Shopify
 * Hace polling cada 2s al endpoint /billing/shopify/status
 */


class ShopifyLoadingPage {
  constructor() {
    this.token = null;
    this.state = null;  // state auth poll
    this.pollInterval = null;
    this.maxAttempts = 30; // 1 minuto máximo (30 intentos × 2s)
    this.currentAttempt = 0;
    this.statusMessageEl = null;
    this.dots = [];
  }

  /**
   * Inicializa la página
   */
  async init() {
    console.log('🔄 Inicializando página de carga Shopify...');
    initI18n();
    // Leer params
    const urlParams = new URLSearchParams(window.location.search);

    // Flujo AUTH (Shopify login): state
    this.state = urlParams.get('state');
    const _lang = urlParams.get('lang');
    if (_lang) {
      setLocale(_lang); // normaliza y guarda (es/en)
    }
    // Flujo BILLING confirm: token
    this.token = urlParams.get('token');

    // Obtener elementos del DOM (antes de hacer redirects/mensajes)
    this.statusMessageEl = document.getElementById('statusMessage');
    this.dots = document.querySelectorAll('.progress-dots .dot');

    // ✅ 1) Si viene state → AUTH polling (login)
    if (this.state) {
      console.log('✅ State encontrado (auth):', this.state);
      this.startAuthPolling();
      return;
    }

    // ✅ 2) Si viene token → BILLING polling (tu flow actual)
    if (this.token) {
      console.log('✅ Token encontrado (billing):', this.token);
      this.startBillingPolling();
      return;
    }

    // ✅ 3) Si viene con params Shopify entry → rebotar al backend /shopify/app
    const shop = urlParams.get('shop');
    const host = urlParams.get('host');
    const hmac = urlParams.get('hmac');
    const timestamp = urlParams.get('timestamp');

    if (shop && host && hmac && timestamp) {
      console.warn('ℹ️ Loading abierto con params de Shopify entry. Redirigiendo a /shopify/app...');
      const backendUrl = `${API_BASE}/shopify/app?${urlParams.toString()}`;
      window.location.replace(backendUrl);
      return;
    }

    // ✅ 4) Nada útil: redirige SILENCIOSO (sin notify.error)
    console.warn('ℹ️ Loading abierto sin token/state. Redirigiendo…');
    this.showPending(t('shopify.redirecting') || 'Redirigiendo…');
    setTimeout(() => {
      window.location.href = '/secciones/plans.html';
    }, 800);
    return;
  }

  /**
   * Obtiene el token de la URL
   */
  getTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
  }

  /**
   * Inicia el polling cada 2 segundos
   */
  startBillingPolling() {
    console.log('🔄 Iniciando polling (cada 2s)...');

    // Primera verificación inmediata
    this.checkStatus();

    // Polling cada 2 segundos
    this.pollInterval = setInterval(() => {
      this.currentAttempt++;
      
      if (this.currentAttempt >= this.maxAttempts) {
        console.warn('⏱️ Tiempo máximo de espera alcanzado');
        this.stopPolling();
        this.showTimeout();
        return;
      }

      this.checkStatus();
    }, 2000);
  }
  startAuthPolling() {
    console.log('🔄 Iniciando polling AUTH (cada 1s)...');

    // Primera comprobación inmediata
    this.checkAuth();

    this.pollInterval = setInterval(() => {
      this.currentAttempt++;

      if (this.currentAttempt >= this.maxAttempts) {
        console.warn('⏱️ Timeout auth');
        this.stopPolling();
        this.showError(t('shopify.takingTooLong') || 'Está tardando más de lo normal…');
        setTimeout(() => {
          // Importante: no mandar a landing si quieres forzar reintento desde Shopify
          window.location.href = '/secciones/error.html?from=shopify_auth_timeout';
        }, 1200);
        return;
      }

      this.checkAuth();
    }, 1000);
  }

  async checkAuth() {
    try {
      this.updateDots();
      this.showPending(t('shopify.loggingIn') || 'Iniciando sesión…');

      const resp = await fetchPublic('/auth/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: this.state })
      });

      // 204 = aún no está listo
      if (resp.status === 204) return;

      if (resp.status === 401) {
        // state expirado
        this.stopPolling();
        this.showError(t('shopify.sessionExpired') || 'Sesión expirada. Abre la app desde Shopify de nuevo.');
        return;
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const jwt = data?.access_token;

      if (!jwt) throw new Error('missing_access_token');

      this.stopPolling();

      // ✅ Guardar JWT
      setToken(jwt);

      // ✅ Ya tenemos sesión
      this.showSuccess(t('shopify.ready') || 'Listo');

      // ✅ Cargar store y decidir destino
      const storeResp = await fetch(`${API_BASE}/stores/me`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      if (!storeResp.ok) {
        // Si algo falla, manda a planes INTERNOS (no landing)
        window.location.href = '/secciones/app-plans.html';
        return;
      }

      const store = await storeResp.json();
      localStorage.setItem('store', JSON.stringify(store));

      // ✅ 2 flujos:
      // - active => perfil/inbox
      // - no active => planes internos
      window.location.href = store.active ? '/secciones/perfil.html' : '/secciones/plans.html';

    } catch (e) {
      console.error('❌ Error auth poll:', e);
      // No spamees: deja que reintente hasta timeout
    }
  }
  /**
   * Detiene el polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('⏹️ Polling detenido');
    }
  }

  /**
   * Verifica el estado de la suscripción
   */
  async checkStatus() {
    try {
      console.log(`🔍 Verificando estado (intento ${this.currentAttempt + 1}/${this.maxAttempts})...`);

      const response = await fetchPublic(
        `/billing/shopify/status?token=${encodeURIComponent(this.token)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Respuesta del servidor:', data);

      this.handleStatusResponse(data);

    } catch (error) {
      console.error('❌ Error al verificar estado:', error);
      
      // Si es el último intento, mostrar error
      if (this.currentAttempt >= this.maxAttempts - 1) {
        this.stopPolling();
        this.showError(t('shopify.errorVerifying'));
      }
      // Si no, seguir intentando (el error puede ser temporal)
    }
  }
  showPending(message) {
    if (this.statusMessageEl) {
      // Asegurar que el mensaje no sea una clave i18n sin traducir
      const displayMessage = (message && !message.startsWith('shopify.')) 
        ? message 
        : 'Conectando con tu tienda...';
      
      this.statusMessageEl.className = 'status-message pending';
      this.statusMessageEl.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <span>${displayMessage}</span>
      `;
    }
  }
  /**
   * Maneja la respuesta del estado
   */
  handleStatusResponse(data) {
    const { ok, status, redirect_url } = data;

    // Actualizar animación de dots
    this.updateDots();

    switch (status) {
      case 'SUCCESS':
        console.log('✅ Suscripción confirmada exitosamente');
        this.showSuccess(t('shopify.subscriptionConfirmed'));
        this.stopPolling();
        
        setTimeout(() => {
          window.location.href = redirect_url || '/secciones/perfil.html';
        }, 1500);
        break;

      case 'FAILED':
        console.error('❌ La suscripción falló');
        this.showError(t('shopify.subscriptionFailed'));
        this.stopPolling();
        
        setTimeout(() => {
          window.location.href = redirect_url || '/secciones/plans.html?shopify_billing=failed';
        }, 3000);
        break;

      case 'EXPIRED':
        console.error('⏱️ El token de confirmación expiró');
        this.showError(t('shopify.subscriptionExpired'));
        this.stopPolling();
        
        setTimeout(() => {
          window.location.href = redirect_url || '/secciones/plans.html?shopify_billing=expired';
        }, 3000);
        break;

      case 'NOT_FOUND':
        // ✅ Nuevo comportamiento: NO es error.
        // Puede ser que:
        // - todavía no se haya creado el store,
        // - o el backend aún no haya persistido la petición,
        // - o haya latencia entre pasos del flujo.
        console.log('🛠️ Aún no hay registro (cuenta/petición). Seguimos esperando...');
        this.showPending(t('shopify.preparingAccount') || 'Estamos preparando tu cuenta…');
        break;

      case 'PENDING':
      default:
        console.log('⏳ Suscripción pendiente, continuando polling...');
        this.showPending(t('shopify.waitingConfirmation') || 'Esperando confirmación de Shopify…');
        break;
    }
  }

  /**
   * Actualiza la animación de los dots de progreso
   */
  updateDots() {
    // Rotar el dot activo
    const activeDotIndex = this.currentAttempt % this.dots.length;
    
    this.dots.forEach((dot, index) => {
      if (index === activeDotIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  /**
   * Muestra mensaje de éxito
   */
  showSuccess(message) {
    if (this.statusMessageEl) {
      // Asegurar que el mensaje no sea una clave i18n sin traducir
      const displayMessage = (message && !message.startsWith('shopify.')) 
        ? message 
        : '¡Todo listo! ✨';
      
      this.statusMessageEl.className = 'status-message success';
      this.statusMessageEl.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${displayMessage}</span>
      `;
    }
  }

  /**
   * Muestra mensaje de error
   */
  showError(message) {
    if (this.statusMessageEl) {
      // Asegurar que el mensaje no sea una clave i18n sin traducir
      const displayMessage = (message && !message.startsWith('shopify.')) 
        ? message 
        : 'Hubo un problema. Por favor, intenta nuevamente.';
      
      this.statusMessageEl.className = 'status-message error';
      this.statusMessageEl.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${displayMessage}</span>
      `;
    }

    notify.error(message);
  }

  /**
   * Muestra mensaje de timeout
   */
  showTimeout() {
    const message = t('shopify.takingTooLong') || 'Esto está tardando más de lo normal...';
    
    // Asegurar que el mensaje no sea una clave i18n sin traducir
    const displayMessage = (message && !message.startsWith('shopify.')) 
      ? message 
      : 'Esto está tardando más de lo normal...';
    
    if (this.statusMessageEl) {
      this.statusMessageEl.className = 'status-message error';
      this.statusMessageEl.innerHTML = `
        <i class="fas fa-clock"></i>
        <span>${displayMessage}</span>
      `;
    }

    notify.error(displayMessage);

    setTimeout(() => {
      window.location.href = '/secciones/plans.html?shopify_billing=timeout';
    }, 3000);
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const page = new ShopifyLoadingPage();
    page.init();
  });
} else {
  const page = new ShopifyLoadingPage();
  page.init();
}
