// /js/pages/integrations.js
import { API_BASE, fetchWithAuth } from '/js/utils/api.js';
import { enforceFlowGate } from '/js/utils/flow-gate.js';
import { notify } from '/js/utils/notify.js';
import { initSidebar } from '/js/components/sidebar.js';
import { t, initI18n } from '/js/utils/i18n.js';

// Estado de conexión de Gmail y Shopify
let gmailConnected = false;
let shopifyConnected = false;

// Verificar estado de conexión de Gmail
async function checkGmailConnection() {
  try {
    const response = await fetchWithAuth(`/google/gmail/status`, {
      method: 'GET'
    });
    
    // Si el endpoint no existe (404), asumimos que no está conectado
    if (response.status === 404) {
      console.log('Endpoint de status no implementado aún, asumiendo no conectado');
      return false;
    }
    
    if (!response.ok) {
      console.error('Error al verificar estado de Gmail:', response.status);
      return false;
    }
    
    const data = await response.json();
    return data.connected || false;
    
  } catch (error) {
    console.error('Error al verificar conexión de Gmail:', error);
    return false;
  }
}

// Actualizar UI de la tarjeta de Gmail según estado de conexión
function updateGmailCardUI(connected) {
  gmailConnected = connected;
  
  const card = document.querySelector('.integration-card.gmail-card');
  const btn = document.getElementById('gmailConnectBtn');
  
  if (!card || !btn) return;
  
  if (connected) {
    // Estado: Conectado
    card.classList.remove('available');
    card.classList.add('connected');
    
    // Agregar badge de "Conectado"
    let connectedBadge = card.querySelector('.connected-badge');
    if (!connectedBadge) {
      connectedBadge = document.createElement('div');
      connectedBadge.className = 'connected-badge';
      connectedBadge.innerHTML = `<i class="fas fa-check-circle"></i> <span data-i18n="integrations.connected">${t('integrations.connected')}</span>`;
      card.appendChild(connectedBadge);
    }
    
    // Cambiar botón a "Desconectar"
    btn.className = 'integration-btn disconnect-btn';
    btn.innerHTML = `<i class="fas fa-unlink"></i> <span data-i18n="integrations.disconnect">${t('integrations.disconnect')}</span>`;
    btn.onclick = disconnectGmail;
    
  } else {
    // Estado: Desconectado
    card.classList.remove('connected');
    card.classList.add('available');
    
    // Remover badge de "Conectado"
    const connectedBadge = card.querySelector('.connected-badge');
    if (connectedBadge) {
      connectedBadge.remove();
    }
    
    // Cambiar botón a "Conectar"
    btn.className = 'integration-btn primary';
    btn.innerHTML = `<i class="fas fa-plug"></i> <span data-i18n="integrations.connectGmail">${t('integrations.connectGmail')}</span>`;
    btn.onclick = initiateGmailOAuth;
  }
}

// Iniciar flujo OAuth de Gmail
async function initiateGmailOAuth() {
  const gmailBtn = document.getElementById('gmailConnectBtn');
  
  try {
    gmailBtn.disabled = true;
    gmailBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-i18n="integrations.connecting">${t('integrations.connecting')}</span>`;
    
    // Solicitar URL de OAuth al backend
    const response = await fetchWithAuth(`/google/gmail/connect`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error('Error al iniciar OAuth');
    }
    
    const data = await response.json();
    
    if (data.auth_url) {
      // Guardar el state en localStorage para referencia
      if (data.state) {
        localStorage.setItem('gmail_integration_state', data.state);
      }
      
      // Redirigir a la URL de OAuth de Google
      window.location.href = data.auth_url;
    } else {
      throw new Error('No se recibió URL de OAuth');
    }
    
  } catch (error) {
    console.error('Error al conectar Gmail:', error);
    notify.error(t('integrations.errorConnectingGmail'));
    
    // Restaurar botón
    gmailBtn.disabled = false;
    updateGmailCardUI(false);
  }
}

// Desconectar Gmail
async function disconnectGmail() {
  // Mostrar modal de confirmación
  showDisconnectModal();
}

// Mostrar modal de confirmación
function showDisconnectModal() {
  const modal = document.getElementById('disconnectModal');
  modal.style.display = 'flex';
  
  // Agregar event listeners
  const cancelBtn = document.getElementById('cancelDisconnectBtn');
  const confirmBtn = document.getElementById('confirmDisconnectBtn');
  const overlay = modal.querySelector('.confirm-modal-overlay');
  
  const closeModal = () => {
    modal.style.display = 'none';
    cancelBtn.removeEventListener('click', closeModal);
    confirmBtn.removeEventListener('click', confirmDisconnect);
    overlay.removeEventListener('click', closeModal);
  };
  
  const confirmDisconnect = async () => {
    closeModal();
    await executeDisconnect();
  };
  
  cancelBtn.addEventListener('click', closeModal);
  confirmBtn.addEventListener('click', confirmDisconnect);
  overlay.addEventListener('click', closeModal);
}

// Ejecutar desconexión de Gmail
async function executeDisconnect() {
  const gmailBtn = document.getElementById('gmailConnectBtn');
  
  try {
    gmailBtn.disabled = true;
    gmailBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-i18n="integrations.disconnecting">${t('integrations.disconnecting')}</span>`;
    
    const response = await fetchWithAuth(`/google/gmail/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Si el endpoint no existe (404), mostrar mensaje
    if (response.status === 404) {
      notify.warning(t('integrations.comingSoon'));
      updateGmailCardUI(true);
      gmailBtn.disabled = false;
      return;
    }
    
    if (!response.ok) {
      throw new Error('Error al desconectar Gmail');
    }
    
    notify.success(t('integrations.gmailDisconnected'));
    updateGmailCardUI(false);
    
  } catch (error) {
    console.error('Error al desconectar Gmail:', error);
    notify.error(t('integrations.errorDisconnectingGmail'));
    
    // Restaurar estado anterior
    updateGmailCardUI(true);
  } finally {
    gmailBtn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SHOPIFY INTEGRATION
// ═══════════════════════════════════════════════════════════════════

// Verificar estado de conexión de Shopify
async function checkShopifyConnection() {
  try {
    const response = await fetchWithAuth(`/shopify/status`, {
      method: 'GET'
    });
    
    if (response.status === 404) {
      console.log('Endpoint de Shopify status no implementado aún');
      return false;
    }
    
    if (!response.ok) {
      console.error('Error al verificar estado de Shopify:', response.status);
      return false;
    }
    
    const data = await response.json();
    return data.connected || false;
    
  } catch (error) {
    console.error('Error al verificar conexión de Shopify:', error);
    return false;
  }
}

// Actualizar UI de la tarjeta de Shopify según estado de conexión
function updateShopifyCardUI(connected) {
  shopifyConnected = connected;
  
  const card = document.querySelector('.integration-card.shopify-card');
  const btn = document.getElementById('shopifyConnectBtn');
  
  if (!card || !btn) return;
  
  if (connected) {
    // Estado: Conectado
    card.classList.remove('available');
    card.classList.add('connected');
    
    // Agregar badge de "Conectado"
    let connectedBadge = card.querySelector('.connected-badge');
    if (!connectedBadge) {
      connectedBadge = document.createElement('div');
      connectedBadge.className = 'connected-badge';
      connectedBadge.innerHTML = `<i class="fas fa-check-circle"></i> <span data-i18n="integrations.connected">${t('integrations.connected')}</span>`;
      card.appendChild(connectedBadge);
    }
    
    // Deshabilitar botón y mostrar que la integración está activa
    btn.className = 'integration-btn disabled';
    btn.innerHTML = `<i class="fas fa-check"></i> <span data-i18n="integrations.activeIntegration">${t('integrations.activeIntegration')}</span>`;
    btn.disabled = true;
    btn.onclick = null;
    
  } else {
    // Estado: Desconectado
    card.classList.remove('connected');
    card.classList.add('available');
    
    // Remover badge de "Conectado"
    const connectedBadge = card.querySelector('.connected-badge');
    if (connectedBadge) {
      connectedBadge.remove();
    }
    
    // Cambiar botón a "Conectar"
    btn.className = 'integration-btn primary';
    btn.innerHTML = `<i class="fas fa-plug"></i> <span data-i18n="integrations.connectShopify">${t('integrations.connectShopify')}</span>`;
    btn.disabled = false;
    btn.onclick = initiateShopifyOAuth;
  }
}

// Mostrar modal para pedir el dominio de la tienda Shopify
function initiateShopifyOAuth() {
  const modal = document.getElementById('shopifyDomainModal');
  const input = document.getElementById('shopifyDomainInput');
  
  modal.style.display = 'flex';
  input.value = '';
  input.focus();
  
  // Event listeners
  const cancelBtn = document.getElementById('cancelShopifyBtn');
  const confirmBtn = document.getElementById('confirmShopifyBtn');
  const overlay = modal.querySelector('.confirm-modal-overlay');
  
  const closeModal = () => {
    modal.style.display = 'none';
    cancelBtn.removeEventListener('click', closeModal);
    confirmBtn.removeEventListener('click', confirmShopify);
    overlay.removeEventListener('click', closeModal);
    input.removeEventListener('keypress', handleEnter);
  };
  
  const confirmShopify = async () => {
    const shopDomain = input.value.trim();
    
    if (!shopDomain) {
      notify.error(t('integrations.shopifyDomainRequired'));
      input.focus();
      return;
    }
    
    closeModal();
    await connectShopify(shopDomain);
  };
  
  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      confirmShopify();
    }
  };
  
  cancelBtn.addEventListener('click', closeModal);
  confirmBtn.addEventListener('click', confirmShopify);
  overlay.addEventListener('click', closeModal);
  input.addEventListener('keypress', handleEnter);
}

// Conectar con Shopify
async function connectShopify(shopDomain) {
  const shopifyBtn = document.getElementById('shopifyConnectBtn');
  
  try {
    shopifyBtn.disabled = true;
    shopifyBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-i18n="integrations.connecting">${t('integrations.connecting')}</span>`;
    
    // Solicitar URL de la app (App Store) al backend
    const response = await fetchWithAuth(`/shopify/connect?shop=${encodeURIComponent(shopDomain)}`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al conectar' }));
      throw new Error(error.detail || 'Error al iniciar conexión con Shopify');
    }
    
    const data = await response.json().catch(() => null);
    console.log('shopify connect data:', data);
    
    // Backend devuelve app_store_url (y opcionalmente podríamos soportar auth_url por compatibilidad)
    const targetUrl = data?.app_store_url || data?.auth_url;
    
    if (targetUrl) {
      window.location.href = targetUrl;
      return;
    }
    
    throw new Error('No se recibió ninguna URL para continuar la conexión con Shopify');
    
  } catch (error) {
    console.error('Error al conectar Shopify:', error);
    notify.error(error.message || t('integrations.errorConnectingShopify'));
    
    // Restaurar botón
    shopifyBtn.disabled = false;
    updateShopifyCardUI(false);
  }
}

// Desconectar Shopify
async function disconnectShopify() {
  showDisconnectShopifyModal();
}

// Mostrar modal de confirmación para desconectar Shopify
function showDisconnectShopifyModal() {
  const modal = document.getElementById('disconnectShopifyModal');
  modal.style.display = 'flex';
  
  // Event listeners
  const cancelBtn = document.getElementById('cancelDisconnectShopifyBtn');
  const confirmBtn = document.getElementById('confirmDisconnectShopifyBtn');
  const overlay = modal.querySelector('.confirm-modal-overlay');
  
  const closeModal = () => {
    modal.style.display = 'none';
    cancelBtn.removeEventListener('click', closeModal);
    confirmBtn.removeEventListener('click', confirmDisconnect);
    overlay.removeEventListener('click', closeModal);
  };
  
  const confirmDisconnect = async () => {
    closeModal();
    await executeShopifyDisconnect();
  };
  
  cancelBtn.addEventListener('click', closeModal);
  confirmBtn.addEventListener('click', confirmDisconnect);
  overlay.addEventListener('click', closeModal);
}

// Ejecutar desconexión de Shopify
async function executeShopifyDisconnect() {
  const shopifyBtn = document.getElementById('shopifyConnectBtn');
  
  try {
    shopifyBtn.disabled = true;
    shopifyBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-i18n="integrations.disconnecting">${t('integrations.disconnecting')}</span>`;
    
    const response = await fetchWithAuth(`/shopify/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      notify.warning(t('integrations.comingSoon'));
      updateShopifyCardUI(true);
      shopifyBtn.disabled = false;
      return;
    }
    
    if (!response.ok) {
      throw new Error(t('integrations.errorDisconnectingShopify'));
    }
    
    notify.success(t('integrations.shopifyDisconnected'));
    updateShopifyCardUI(false);
    
  } catch (error) {
    console.error('Error al desconectar Shopify:', error);
    notify.error(t('integrations.errorDisconnectingShopify'));
    
    // Restaurar estado anterior
    updateShopifyCardUI(true);
  } finally {
    shopifyBtn.disabled = false;
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar i18n
  initI18n();
  
  // 1. Esperar configuración
  if (window.configReady) {
    try {
      await window.configReady;
    } catch (error) {
      console.error('Error en config:', error);
    }
  }
  
  // 2. Aplicar flow gate (asegurar que usuario esté autenticado)
  try {
    await enforceFlowGate();
  } catch (error) {
    console.error('Error en flow gate:', error);
    return;
  }
  
  // 3. Cargar sidebar usando la función estándar
  await initSidebar('#sidebarContainer');
  
  // 4. Verificar estado de conexión de Gmail y Shopify PRIMERO
  const gmailStatus = await checkGmailConnection();
  updateGmailCardUI(gmailStatus);
  
  const shopifyStatus = await checkShopifyConnection();
  updateShopifyCardUI(shopifyStatus);
  
  // 5. DESPUÉS verificar si venimos del callback y mostrar mensajes
  const urlParams = new URLSearchParams(window.location.search);
  const gmailConnected = urlParams.get('gmail_connected');
  const msg = urlParams.get('msg');
  const error = urlParams.get('error');
  
  if (gmailConnected === 'success') {
    notify.success(t('integrations.gmailConnectedSuccess'));
    // Limpiar URL
    window.history.replaceState({}, document.title, '/secciones/integrations.html');
  } else if (msg === 'shopify_connected') {
    notify.success(t('integrations.shopifyConnectedSuccess'));
    // Limpiar URL
    window.history.replaceState({}, document.title, '/secciones/integrations.html');
  } else if (error) {
    // Mensajes específicos según el error
    const errorMessages = {
      'access_denied': t('integrations.errorAccessDenied'),
      'invalid_session': t('integrations.errorInvalidSession'),
      'session_expired': t('integrations.errorSessionExpired'),
      'connection_failed': t('integrations.errorConnectionFailed'),
      'no_code': t('integrations.errorNoCode')
    };
    
    const errorMsg = errorMessages[error] || t('integrations.errorGeneric');
    notify.error(errorMsg);
    // Limpiar URL
    window.history.replaceState({}, document.title, '/secciones/integrations.html');
  }
  
  // 6. Event listener para botones deshabilitados (click, no hover)
  const disabledButtons = document.querySelectorAll('.integration-btn:disabled');
  disabledButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.integration-card');
      const productName = card.querySelector('h3').textContent;
      notify.info(t('integrations.comingSoonInfo').replace('{product}', productName));
    });
  });
});
