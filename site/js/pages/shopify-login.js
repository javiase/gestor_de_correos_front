// /js/pages/shopify-login.js
// Versión especial de login.js para el onboarding de Shopify
// Preserva los query params (state, shop) durante todo el flujo

import { API_BASE, setToken } from '/js/utils/api.js';
import { t, initI18n } from '/js/utils/i18n.js';

// Inicializar i18n
initI18n();

// Obtener query params de Shopify
const urlParams = new URLSearchParams(window.location.search);
const shopifyState = urlParams.get('state');
const shopifyShop = urlParams.get('shop');

// Elementos del formulario (IDs específicos de shopify_onboarding.html)
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('loginEmail');
const passwordInput = document.getElementById('loginPassword');
const submitBtn = document.getElementById('loginSubmitBtn');
const btnText = submitBtn?.querySelector('.btn-text');
const btnSpinner = submitBtn?.querySelector('.btn-spinner');

// Elementos de error
const emailError = document.getElementById('loginEmailError');
const passwordError = document.getElementById('loginPasswordError');

// Toggle password visibility (ya está manejado en el HTML inline)
document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('input');
    const icon = btn.querySelector('i');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });
});

// Validación de email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Mostrar error en campo
function showFieldError(input, errorElement, message) {
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
  if (input) {
    input.style.borderColor = '#ef4444';
  }
}

// Limpiar error de campo
function clearFieldError(input, errorElement) {
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }
  if (input) {
    input.style.borderColor = '';
  }
}

// Limpiar todos los errores
function clearErrors() {
  clearFieldError(emailInput, emailError);
  clearFieldError(passwordInput, passwordError);
}

// Estado de carga del botón
function setLoadingState(isLoading) {
  if (submitBtn) {
    submitBtn.disabled = isLoading;
  }
  if (btnText) {
    btnText.style.display = isLoading ? 'none' : 'inline';
  }
  if (btnSpinner) {
    btnSpinner.style.display = isLoading ? 'inline-block' : 'none';
  }
}

// Event listeners para limpiar errores
if (emailInput) {
  emailInput.addEventListener('input', () => clearFieldError(emailInput, emailError));
  
  emailInput.addEventListener('blur', () => {
    const email = emailInput.value.trim();
    if (email && !isValidEmail(email)) {
      showFieldError(emailInput, emailError, 'Por favor ingresa un correo electrónico válido');
    }
  });
}

if (passwordInput) {
  passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError));
}

// Manejar envío del formulario de login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validaciones
    let hasError = false;

    if (!email) {
      showFieldError(emailInput, emailError, 'Por favor ingresa tu correo electrónico');
      hasError = true;
    } else if (!isValidEmail(email)) {
      showFieldError(emailInput, emailError, 'Por favor ingresa un correo electrónico válido');
      hasError = true;
    }

    if (!password) {
      showFieldError(passwordInput, passwordError, 'Por favor ingresa tu contraseña');
      hasError = true;
    }

    if (hasError) return;

    // Realizar login
    setLoadingState(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          // muy importante: mandamos el state de Shopify al backend
          shopify_state: shopifyState || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          showFieldError(emailInput, emailError, data.detail || 'No existe ninguna cuenta con ese correo electrónico');
        } else if (response.status === 401) {
          showFieldError(passwordInput, passwordError, data.detail || 'Contraseña incorrecta');
        } else if (response.status === 400) {
          const errorMsg = data.detail || 'Error al iniciar sesión';
          
          if (errorMsg.includes('Google OAuth') || errorMsg.includes('Google')) {
            showFieldError(passwordInput, passwordError, errorMsg);
          } else {
            showFieldError(passwordInput, passwordError, errorMsg);
          }
        } else {
          showFieldError(passwordInput, passwordError, data.detail || 'Error al iniciar sesión. Por favor, inténtalo de nuevo.');
        }
        setLoadingState(false);
        return;
      }

      // Verificar si requiere verificación de email
      if (data.requires_verification && data.state) {
        // CRÍTICO: Redirigir a verificación preservando query params de Shopify
        let verifyUrl = `/secciones/verify-email.html?email=${encodeURIComponent(email)}&state=${data.state}`;
        
        if (shopifyState) verifyUrl += `&shopify_state=${encodeURIComponent(shopifyState)}`;
        if (shopifyShop) verifyUrl += `&shop=${encodeURIComponent(shopifyShop)}`;
        
        window.location.href = verifyUrl;
        return;
      }

      // Si hay state pero no requiere verificación, hacer polling
      if (data.state && !data.access_token) {
        startPolling(data.state, email);
        return;
      }

      // Login directo con token (email ya verificado)
      if (data.access_token) {
        setToken(data.access_token);
        
        window.dispatchEvent(new CustomEvent('auth-token-ready'));
        
        // Verificar si la cuenta está activa
        try {
          const storeResponse = await fetch(`${API_BASE}/stores/me`, {
            headers: {
              'Authorization': `Bearer ${data.access_token}`
            }
          });
          
          if (storeResponse.ok) {
            const storeData = await storeResponse.json();
            localStorage.setItem('store', JSON.stringify(storeData));
            
            // NUEVO FLUJO: Si venimos de Shopify y tiene cuenta activa → inbox con mensaje
            if (shopifyState && shopifyShop) {
              if (storeData.active) {
                window.location.href = '/secciones/inbox.html?msg=shopify_connected';
              } else {
                // Sin cuenta activa → flujo normal (plans)
                window.location.href = '/secciones/plans.html';
              }
            } else if (storeData.active) {
              window.location.href = '/secciones/inbox.html';
            } else {
              window.location.href = '/secciones/plans.html';
            }
          } else {
            // Si falla, ir a planes
            window.location.href = '/secciones/plans.html';
          }
        } catch (err) {
          console.error('Error obteniendo store:', err);
          // En caso de error, ir a planes
          window.location.href = '/secciones/plans.html';
        }
        return;
      }
    } catch (error) {
      console.error('Error en login:', error);
      showFieldError(passwordInput, passwordError, 'Error de conexión. Por favor, inténtalo de nuevo.');
      setLoadingState(false);
    }
  });
}

// Función de polling para obtener el JWT (preservando Shopify params)
async function startPolling(state, email) {
  const maxAttempts = 30;
  let attempts = 0;
  
  const pollInterval = setInterval(async () => {
    attempts++;
    
    if (attempts > maxAttempts) {
      clearInterval(pollInterval);
      showFieldError(passwordInput, passwordError, 'Tiempo de espera agotado. Por favor, inténtalo de nuevo.');
      setLoadingState(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/auth/poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state })
      });
      
      if (response.status === 204) {
        return;
      }
      
      if (response.status === 401) {
        clearInterval(pollInterval);
        showFieldError(passwordInput, passwordError, 'La sesión ha expirado. Por favor, inicia sesión nuevamente.');
        setLoadingState(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        clearInterval(pollInterval);
        
        if (data.access_token) {
          setToken(data.access_token);
          window.dispatchEvent(new CustomEvent('auth-token-ready'));
          
          // Verificar store y redirigir apropiadamente
          try {
            const storeResponse = await fetch(`${API_BASE}/stores/me`, {
              headers: {
                'Authorization': `Bearer ${data.access_token}`
              }
            });
            
            if (storeResponse.ok) {
              const storeData = await storeResponse.json();
              localStorage.setItem('store', JSON.stringify(storeData));
              
              // NUEVO FLUJO: Si venimos de Shopify y tiene cuenta activa → inbox con mensaje
              if (shopifyState && shopifyShop) {
                if (storeData.active) {
                  window.location.href = '/secciones/inbox.html?msg=shopify_connected';
                } else {
                  // Sin cuenta activa → flujo normal (plans)
                  window.location.href = '/secciones/plans.html';
                }
              } else if (storeData.active) {
                window.location.href = '/secciones/inbox.html';
              } else {
                window.location.href = '/secciones/plans.html';
              }
            } else {
              window.location.href = '/secciones/plans.html';
            }
          } catch (err) {
            console.error('Error obteniendo store:', err);
            window.location.href = '/secciones/plans.html';
          }
        }
      } else {
        clearInterval(pollInterval);
        showFieldError(passwordInput, passwordError, 'Error al verificar. Por favor, inténtalo de nuevo.');
        setLoadingState(false);
      }
    } catch (err) {
      console.error('Error en polling:', err);
      clearInterval(pollInterval);
      showFieldError(passwordInput, passwordError, 'Error de conexión. Por favor, inténtalo de nuevo.');
      setLoadingState(false);
    }
  }, 1000);
}
