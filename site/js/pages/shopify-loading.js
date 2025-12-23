// site/js/pages/shopify-loading.js

import { fetchPublic } from '../utils/api.js';
import { notify } from '../utils/notify.js';

/**
 * Página de carga para confirmación de suscripción Shopify
 * Hace polling cada 2s al endpoint /billing/shopify/status
 */


class ShopifyLoadingPage {
  constructor() {
    this.token = null;
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

    // Obtener token de la URL
    this.token = this.getTokenFromUrl();
    
    if (!this.token) {
      console.error('❌ No se encontró el token en la URL');
      this.showError('No se encontró el token de confirmación');
      setTimeout(() => {
        window.location.href = '/secciones/plans.html?shopify_billing=error';
      }, 3000);
      return;
    }

    console.log('✅ Token encontrado:', this.token);

    // Obtener elementos del DOM
    this.statusMessageEl = document.getElementById('statusMessage');
    this.dots = document.querySelectorAll('.progress-dots .dot');

    // Iniciar polling
    this.startPolling();
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
  startPolling() {
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
        this.showError('Error al verificar el estado de la suscripción');
      }
      // Si no, seguir intentando (el error puede ser temporal)
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
        this.showSuccess('¡Suscripción confirmada!');
        this.stopPolling();
        
        setTimeout(() => {
          window.location.href = redirect_url || '/secciones/perfil.html';
        }, 1500);
        break;

      case 'FAILED':
        console.error('❌ La suscripción falló');
        this.showError('La suscripción no pudo ser procesada');
        this.stopPolling();
        
        setTimeout(() => {
          window.location.href = redirect_url || '/secciones/plans.html?shopify_billing=failed';
        }, 3000);
        break;

      case 'EXPIRED':
        console.error('⏱️ El token de confirmación expiró');
        this.showError('El tiempo de confirmación ha expirado');
        this.stopPolling();
        
        setTimeout(() => {
          window.location.href = redirect_url || '/secciones/plans.html?shopify_billing=expired';
        }, 3000);
        break;

      case 'NOT_FOUND':
        console.error('🔍 No se encontró la solicitud de suscripción');
        this.showError('No se encontró la solicitud de suscripción');
        this.stopPolling();
        
        setTimeout(() => {
          window.location.href = '/secciones/plans.html?shopify_billing=not_found';
        }, 3000);
        break;

      case 'PENDING':
      default:
        console.log('⏳ Suscripción pendiente, continuando polling...');
        // Continuar con el polling
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
      this.statusMessageEl.className = 'status-message success';
      this.statusMessageEl.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
      `;
    }
  }

  /**
   * Muestra mensaje de error
   */
  showError(message) {
    if (this.statusMessageEl) {
      this.statusMessageEl.className = 'status-message error';
      this.statusMessageEl.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
      `;
    }

    notify.error(message);
  }

  /**
   * Muestra mensaje de timeout
   */
  showTimeout() {
    const message = 'La confirmación está tardando más de lo esperado';
    
    if (this.statusMessageEl) {
      this.statusMessageEl.className = 'status-message error';
      this.statusMessageEl.innerHTML = `
        <i class="fas fa-clock"></i>
        <span>${message}</span>
      `;
    }

    notify.error(message);

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
