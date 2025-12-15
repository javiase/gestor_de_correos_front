// /js/pages/verify-email.js
import { API_BASE, setToken } from '/js/utils/api.js';

// Obtener parámetros de URL
const urlParams = new URLSearchParams(window.location.search);
const email = urlParams.get('email');
const state = urlParams.get('state');

// SHOPIFY: Obtener query params de Shopify si existen
const shopifyState = urlParams.get('shopify_state');
const shopifyShop = urlParams.get('shop');

// Si no hay email o state, redirigir a login
if (!email || !state) {
  window.location.href = '/secciones/login.html';
}

// Elementos del DOM
const verifyForm = document.getElementById('verifyForm');
const codeInputs = document.querySelectorAll('.code-input');
const codeError = document.getElementById('codeError');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnSpinner = submitBtn.querySelector('.btn-spinner');
const resendBtn = document.getElementById('resendBtn');
const resendTextContent = resendBtn.querySelector('.resend-text-content');
const resendSpinner = resendBtn.querySelector('.resend-spinner');
const resendTimer = document.getElementById('resendTimer');
const timerSeconds = document.getElementById('timerSeconds');
const emailDisplay = document.getElementById('emailDisplay');

// Mostrar email en la página
emailDisplay.textContent = `Hemos enviado un código de 6 dígitos a ${email}`;

// Variables para el timer
let resendTimeout = 60;
let timerInterval = null;

// ═══════════════════════════════════════════════════════════
//  MANEJO DE INPUTS DE CÓDIGO
// ═══════════════════════════════════════════════════════════

// Auto-focus y navegación entre inputs
codeInputs.forEach((input, index) => {
  // Solo permitir números
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    
    // Solo permitir dígitos
    if (!/^\d*$/.test(value)) {
      e.target.value = '';
      return;
    }
    
    // Limpiar error al escribir
    codeError.textContent = '';
    input.style.borderColor = '';
    
    // Auto-focus al siguiente input
    if (value && index < codeInputs.length - 1) {
      codeInputs[index + 1].focus();
    }
  });
  
  // Navegación con teclas
  input.addEventListener('keydown', (e) => {
    // Backspace: ir al anterior si está vacío
    if (e.key === 'Backspace' && !input.value && index > 0) {
      codeInputs[index - 1].focus();
    }
    
    // Arrow left: ir al anterior
    if (e.key === 'ArrowLeft' && index > 0) {
      codeInputs[index - 1].focus();
    }
    
    // Arrow right: ir al siguiente
    if (e.key === 'ArrowRight' && index < codeInputs.length - 1) {
      codeInputs[index + 1].focus();
    }
  });
  
  // Pegar código completo
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    pastedData.split('').forEach((char, i) => {
      if (codeInputs[i]) {
        codeInputs[i].value = char;
      }
    });
    
    // Focus en el último input llenado
    const lastIndex = Math.min(pastedData.length, codeInputs.length) - 1;
    if (lastIndex >= 0) {
      codeInputs[lastIndex].focus();
    }
  });
});

// Focus inicial en el primer input
codeInputs[0].focus();

// ═══════════════════════════════════════════════════════════
//  FUNCIONES DE UI
// ═══════════════════════════════════════════════════════════

function setLoadingState(isLoading) {
  submitBtn.disabled = isLoading;
  codeInputs.forEach(input => input.disabled = isLoading);
  
  if (isLoading) {
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
  } else {
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }
}

function setResendLoadingState(isLoading) {
  resendBtn.disabled = isLoading;
  
  if (isLoading) {
    resendTextContent.style.display = 'none';
    resendSpinner.style.display = 'inline-block';
  } else {
    resendTextContent.style.display = 'inline';
    resendSpinner.style.display = 'none';
  }
}

function showError(message) {
  codeError.textContent = message;
  codeInputs.forEach(input => {
    input.style.borderColor = '#ef4444';
  });
}

function clearError() {
  codeError.textContent = '';
  codeInputs.forEach(input => {
    input.style.borderColor = '';
  });
}

function getCode() {
  return Array.from(codeInputs).map(input => input.value).join('');
}

function clearCode() {
  codeInputs.forEach(input => {
    input.value = '';
  });
  codeInputs[0].focus();
}

// ═══════════════════════════════════════════════════════════
//  TIMER DE REENVÍO
// ═══════════════════════════════════════════════════════════

function startResendTimer() {
  resendBtn.style.display = 'none';
  resendTimer.style.display = 'block';
  resendTimeout = 60;
  timerSeconds.textContent = resendTimeout;
  
  timerInterval = setInterval(() => {
    resendTimeout--;
    timerSeconds.textContent = resendTimeout;
    
    if (resendTimeout <= 0) {
      clearInterval(timerInterval);
      resendTimer.style.display = 'none';
      resendBtn.style.display = 'inline';
      resendBtn.disabled = false;
    }
  }, 1000);
}

// Iniciar timer al cargar la página
startResendTimer();

// ═══════════════════════════════════════════════════════════
//  VERIFICACIÓN DEL CÓDIGO
// ═══════════════════════════════════════════════════════════

verifyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  
  const code = getCode();
  
  // Validar que el código esté completo
  if (code.length !== 6) {
    showError('Por favor ingresa los 6 dígitos del código');
    return;
  }
  
  setLoadingState(true);
  
  try {
    const response = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email, 
        code 
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 400) {
        if (data.detail?.includes('expirado')) {
          showError('El código ha expirado. Por favor solicita uno nuevo.');
        } else if (data.detail?.includes('incorrecto')) {
          showError('Código incorrecto. Por favor verifica e intenta de nuevo.');
          clearCode();
        } else {
          showError(data.detail || 'Error al verificar el código');
        }
      } else if (response.status === 404) {
        showError('Usuario no encontrado');
      } else {
        showError('Error al verificar el código. Por favor, inténtalo de nuevo.');
      }
      setLoadingState(false);
      return;
    }
    
    // Verificación exitosa - iniciar polling con el state
    const verificationState = data.state || state;
    startPolling(verificationState);
    
  } catch (error) {
    console.error('Error en verificación:', error);
    showError('Error de conexión. Por favor, inténtalo de nuevo.');
    setLoadingState(false);
  }
});

// ═══════════════════════════════════════════════════════════
//  POLLING PARA OBTENER EL JWT
// ═══════════════════════════════════════════════════════════

async function startPolling(pollState) {
  const maxAttempts = 30; // 30 intentos = 30 segundos máximo
  let attempts = 0;
  
  const pollInterval = setInterval(async () => {
    attempts++;
    
    if (attempts > maxAttempts) {
      clearInterval(pollInterval);
      showError('Tiempo de espera agotado. Por favor, inicia sesión nuevamente.');
      setLoadingState(false);
      setTimeout(() => {
        window.location.href = '/secciones/login.html';
      }, 2000);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/auth/poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state: pollState })
      });
      
      // 204: No está listo, seguir intentando
      if (response.status === 204) {
        return;
      }
      
      // 401: Expirado
      if (response.status === 401) {
        clearInterval(pollInterval);
        showError('La sesión ha expirado. Por favor, regístrate nuevamente.');
        setLoadingState(false);
        setTimeout(() => {
          window.location.href = '/secciones/register.html';
        }, 2000);
        return;
      }
      
      // 200: Token disponible
      if (response.ok) {
        const data = await response.json();
        clearInterval(pollInterval);
        
        if (data.access_token) {
          setToken(data.access_token);
          
          // Disparar evento para que otros módulos sepan que hay token
          window.dispatchEvent(new CustomEvent('auth-token-ready'));
          
          // NUEVO FLUJO: Si venimos de Shopify (login) y tiene cuenta activa → inbox con mensaje
          if (shopifyState && shopifyShop && data.active_account) {
            window.location.href = '/secciones/inbox.html?msg=shopify_connected';
            return;
          }
          
          // Flujo normal según si la cuenta está activa o no
          if (data.active_account) {
            // Cuenta activa → ir al inbox (flujo normal) o perfil (flujo registro)
            window.location.href = '/secciones/inbox.html';
          } else {
            // Cuenta NO activa → ir a contratar plan primero
            window.location.href = '/secciones/plans.html';
          }
        } else {
          showError('Error al obtener el token de acceso');
          setLoadingState(false);
        }
        return;
      }
      
      // Otro error
      clearInterval(pollInterval);
      showError('Error al verificar la autenticación');
      setLoadingState(false);
      
    } catch (error) {
      console.error('Error en polling:', error);
      clearInterval(pollInterval);
      showError('Error de conexión');
      setLoadingState(false);
    }
  }, 1000); // Hacer polling cada segundo
}

// ═══════════════════════════════════════════════════════════
//  REENVIAR CÓDIGO
// ═══════════════════════════════════════════════════════════

resendBtn.addEventListener('click', async () => {
  clearError();
  clearCode();
  setResendLoadingState(true);
  
  try {
    const response = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 400 && data.detail?.includes('ya verificado')) {
        // Email ya verificado, redirigir a login
        alert('Tu email ya ha sido verificado. Puedes iniciar sesión.');
        window.location.href = '/secciones/login.html';
        return;
      }
      
      showError(data.detail || 'Error al reenviar el código');
      setResendLoadingState(false);
      return;
    }
    
    // Código reenviado exitosamente
    setResendLoadingState(false);
    startResendTimer();
    
    // Mostrar mensaje de éxito temporal
    const successMsg = document.createElement('span');
    successMsg.className = 'success-message';
    successMsg.textContent = '✓ Código reenviado correctamente';
    successMsg.style.color = '#10B981';
    successMsg.style.fontSize = '0.875rem';
    successMsg.style.display = 'block';
    successMsg.style.marginTop = '0.5rem';
    
    const resendSection = document.querySelector('.resend-section');
    resendSection.appendChild(successMsg);
    
    setTimeout(() => {
      successMsg.remove();
    }, 3000);
    
  } catch (error) {
    console.error('Error al reenviar código:', error);
    showError('Error de conexión. Por favor, inténtalo de nuevo.');
    setResendLoadingState(false);
  }
});
