// /js/pages/login.js
import { API_BASE, setToken } from '/js/utils/api.js';

// Elementos del formulario
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnSpinner = submitBtn.querySelector('.btn-spinner');

// Elementos de error
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');

// Toggle password visibility
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

// Limpiar errores al escribir
emailInput.addEventListener('input', () => {
  emailError.textContent = '';
  emailInput.style.borderColor = '';
});

// Validación en tiempo real del email cuando pierde el foco
emailInput.addEventListener('blur', () => {
  const email = emailInput.value.trim();
  if (email && !isValidEmail(email)) {
    showFieldError(emailInput, emailError, 'Por favor ingresa un correo electrónico válido');
  }
});

passwordInput.addEventListener('input', () => {
  passwordError.textContent = '';
  passwordInput.style.borderColor = '';
});

// Validación de email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Mostrar error en campo
function showFieldError(input, errorElement, message) {
  errorElement.textContent = message;
  input.style.borderColor = '#ef4444';
}

// Limpiar errores
function clearErrors() {
  emailError.textContent = '';
  passwordError.textContent = '';
  emailInput.style.borderColor = '';
  passwordInput.style.borderColor = '';
}

// Estado de carga del botón
function setLoadingState(isLoading) {
  submitBtn.disabled = isLoading;
  if (isLoading) {
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
  } else {
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }
}

// Manejar envío del formulario
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
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      // Manejar errores del servidor
      if (response.status === 401) {
        showFieldError(passwordInput, passwordError, 'Correo o contraseña incorrectos');
      } else if (response.status === 404) {
        showFieldError(emailInput, emailError, 'No existe una cuenta con este correo');
      } else if (response.status === 400) {
        // Posible cuenta de Google OAuth
        showFieldError(passwordInput, passwordError, data.detail || 'Error al iniciar sesión');
      } else {
        showFieldError(passwordInput, passwordError, data.detail || 'Error al iniciar sesión. Por favor, inténtalo de nuevo.');
      }
      setLoadingState(false);
      return;
    }

    // Verificar si requiere verificación de email
    if (data.requires_verification && data.state) {
      // Redirigir a la página de verificación
      window.location.href = `/secciones/verify-email.html?email=${encodeURIComponent(email)}&state=${data.state}`;
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
      
      // Disparar evento para que otros módulos sepan que hay token
      window.dispatchEvent(new CustomEvent('auth-token-ready'));
      
      // Verificar si la cuenta está activa consultando /stores/me
      try {
        const storeResponse = await fetch(`${API_BASE}/stores/me`, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });
        
        if (storeResponse.ok) {
          const storeData = await storeResponse.json();
          
          // Guardar en localStorage para uso posterior
          localStorage.setItem('store', JSON.stringify(storeData));
          
          // Redirigir según si la cuenta está activa
          if (storeData.active) {
            window.location.href = '/secciones/inbox.html';
          } else {
            window.location.href = '/secciones/plans.html';
          }
        } else {
          // Si falla, asumir que no está activo y enviar a planes
          window.location.href = '/secciones/plans.html';
        }
      } catch (err) {
        console.error('Error obteniendo store:', err);
        // En caso de error, enviar a planes por seguridad
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

// Función de polling para obtener el JWT
async function startPolling(state, email) {
  const maxAttempts = 30; // 30 intentos = 30 segundos máximo
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
      
      // 204: No está listo, seguir intentando
      if (response.status === 204) {
        return;
      }
      
      // 401: Expirado
      if (response.status === 401) {
        clearInterval(pollInterval);
        showFieldError(passwordInput, passwordError, 'La sesión ha expirado. Por favor, inicia sesión nuevamente.');
        setLoadingState(false);
        return;
      }
      
      // 200: Token disponible
      if (response.ok) {
        const data = await response.json();
        clearInterval(pollInterval);
        
        if (data.access_token) {
          setToken(data.access_token);
          window.dispatchEvent(new CustomEvent('auth-token-ready'));
          
          // Redirigir según si la cuenta está activa o no
          if (data.active_account) {
            // Cuenta activa → ir al inbox
            window.location.href = '/secciones/inbox.html';
          } else {
            // Cuenta NO activa → ir a seleccionar plan
            window.location.href = '/secciones/plans.html';
          }
        } else {
          showFieldError(passwordInput, passwordError, 'Error al obtener el token de acceso');
          setLoadingState(false);
        }
        return;
      }
      
      // Otro error
      clearInterval(pollInterval);
      showFieldError(passwordInput, passwordError, 'Error al verificar la autenticación');
      setLoadingState(false);
      
    } catch (error) {
      console.error('Error en polling:', error);
      clearInterval(pollInterval);
      showFieldError(passwordInput, passwordError, 'Error de conexión');
      setLoadingState(false);
    }
  }, 1000);
}

// Verificar si ya hay sesión activa
async function checkExistingSession() {
  const token = sessionStorage.getItem('auth_token_v1');
  if (token) {
    // Ya hay sesión, verificar si la cuenta está activa
    try {
      const response = await fetch(`${API_BASE}/stores/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const storeData = await response.json();
        
        // Guardar datos en localStorage
        localStorage.setItem('store', JSON.stringify(storeData));
        
        // Redirigir según el estado de activación
        if (storeData.active) {
          window.location.href = '/secciones/inbox.html';
        } else {
          window.location.href = '/secciones/plans.html';
        }
      }
    } catch (error) {
      console.error('Error al verificar sesión:', error);
      // Si hay error, redirigir a plans por seguridad
      window.location.href = '/secciones/plans.html';
    }
  }
}

checkExistingSession();
