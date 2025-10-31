// /js/pages/integrations.js
import { API_BASE, fetchWithAuth } from '/js/utils/api.js';
import { enforceFlowGate } from '/js/utils/flow-gate.js';
import { notify } from '/js/utils/notify.js';
import { initSidebar } from '/js/components/sidebar.js';

// Estado de conexión de Gmail
let gmailConnected = false;

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
      connectedBadge.innerHTML = '<i class="fas fa-check-circle"></i> Conectado';
      card.appendChild(connectedBadge);
    }
    
    // Cambiar botón a "Desconectar"
    btn.className = 'integration-btn disconnect-btn';
    btn.innerHTML = '<i class="fas fa-unlink"></i> Desconectar';
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
    btn.innerHTML = '<i class="fas fa-plug"></i> Conectar Gmail';
    btn.onclick = initiateGmailOAuth;
  }
}

// Iniciar flujo OAuth de Gmail
async function initiateGmailOAuth() {
  const gmailBtn = document.getElementById('gmailConnectBtn');
  
  try {
    gmailBtn.disabled = true;
    gmailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
    
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
    notify.error('Error al conectar con Gmail. Por favor, inténtalo de nuevo.');
    
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
    gmailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Desconectando...';
    
    const response = await fetchWithAuth(`/google/gmail/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Si el endpoint no existe (404), mostrar mensaje
    if (response.status === 404) {
      notify.warning('Funcionalidad de desconexión aún no disponible en el servidor');
      updateGmailCardUI(true);
      gmailBtn.disabled = false;
      return;
    }
    
    if (!response.ok) {
      throw new Error('Error al desconectar Gmail');
    }
    
    notify.success('Gmail desconectado correctamente');
    updateGmailCardUI(false);
    
  } catch (error) {
    console.error('Error al desconectar Gmail:', error);
    notify.error('Error al desconectar Gmail. Por favor, inténtalo de nuevo.');
    
    // Restaurar estado anterior
    updateGmailCardUI(true);
  } finally {
    gmailBtn.disabled = false;
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
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
  
  // 4. Verificar estado de conexión de Gmail PRIMERO
  const connected = await checkGmailConnection();
  updateGmailCardUI(connected);
  
  // 5. DESPUÉS verificar si venimos del callback de Gmail y mostrar mensajes
  const urlParams = new URLSearchParams(window.location.search);
  const gmailConnected = urlParams.get('gmail_connected');
  const error = urlParams.get('error');
  
  if (gmailConnected === 'success') {
    notify.success('¡Gmail conectado correctamente! Ya puedes recibir correos.');
    // Limpiar URL
    window.history.replaceState({}, document.title, '/secciones/integrations.html');
  } else if (error) {
    // Mensaje genérico y amigable para cualquier error
    notify.error('Ha ocurrido un error al integrar tu cuenta de Gmail. Por favor, inténtalo de nuevo.');
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
      notify.info(`${productName} estará disponible próximamente`);
    });
  });
});
