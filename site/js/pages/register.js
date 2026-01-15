// /js/pages/register.js
import { API_BASE, setToken } from '/js/utils/api.js';
import { t, initI18n } from '/js/utils/i18n.js';

// Inicializar i18n
initI18n();

// Escuchar cambios de idioma para actualizar la fortaleza de la contraseña
window.addEventListener('locale-changed', () => {
  updatePasswordStrength();
});

// Elementos del formulario
const registerForm = document.getElementById('registerForm');
const emailInput = document.getElementById('email');
const websiteInput = document.getElementById('website');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnSpinner = submitBtn.querySelector('.btn-spinner');

// Elementos de error
const emailError = document.getElementById('emailError');
const websiteError = document.getElementById('websiteError');
const passwordError = document.getElementById('passwordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

// Elementos de seguridad de contraseña
const passwordStrength = document.getElementById('passwordStrength');
const strengthText = passwordStrength.querySelector('.strength-text');

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

// Validación de email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validación y normalización de URL
function validateAndNormalizeUrl(url) {
  if (!url) return null;
  
  url = url.trim().toLowerCase();
  
  // Eliminar espacios en blanco
  url = url.replace(/\s+/g, '');
  
  // Si ya tiene protocolo, validar que sea http o https
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Ya tiene protocolo, solo validar formato
    try {
      const urlObj = new URL(url);
      // Verificar que tenga un dominio válido con TLD
      if (!urlObj.hostname.includes('.')) {
        return null; // No tiene TLD
      }
      return url;
    } catch {
      return null;
    }
  }
  
  // Si no tiene protocolo, añadir https://
  if (!url.startsWith('http')) {
    // Si empieza con www., añadir https://
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    } else {
      // Si no tiene www., añadir https://www.
      url = 'https://www.' + url;
    }
  }
  
  // Validar formato final
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Verificar que tenga al menos un punto (dominio + TLD)
    if (!hostname.includes('.')) {
      return null;
    }
    
    // Verificar que el TLD tenga al menos 2 caracteres
    const parts = hostname.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2) {
      return null;
    }
    
    // Verificar que el dominio no esté vacío
    const domain = parts[parts.length - 2];
    if (!domain || domain.length < 2) {
      return null;
    }
    
    return url;
  } catch {
    return null;
  }
}

// Validar formato de URL sin normalizar
function isValidWebsite(url) {
  const normalized = validateAndNormalizeUrl(url);
  return normalized !== null;
}

// Calcular fuerza de contraseña
function calculatePasswordStrength(password) {
  if (!password) return { strength: 'none', text: t('auth.enterYourPassword') };
  
  let score = 0;
  
  // Longitud
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Complejidad
  if (/[a-z]/.test(password)) score++; // minúsculas
  if (/[A-Z]/.test(password)) score++; // mayúsculas
  if (/[0-9]/.test(password)) score++; // números
  if (/[^A-Za-z0-9]/.test(password)) score++; // caracteres especiales
  
  // Determinar nivel
  if (score <= 2) return { strength: 'weak', text: t('auth.passwordStrengthWeak') };
  if (score <= 4) return { strength: 'fair', text: t('auth.passwordStrengthFair') };
  if (score <= 5) return { strength: 'good', text: t('auth.passwordStrengthGood') };
  return { strength: 'strong', text: t('auth.passwordStrengthStrong') };
}

// Actualizar indicador de seguridad
function updatePasswordStrength() {
  const password = passwordInput.value;
  const result = calculatePasswordStrength(password);
  
  passwordStrength.setAttribute('data-strength', result.strength);
  strengthText.textContent = result.text;
}

// Limpiar errores al escribir
emailInput.addEventListener('input', () => {
  emailError.innerHTML = '';
  emailInput.style.borderColor = '';
});

// Validar email al salir del campo (blur)
emailInput.addEventListener('blur', () => {
  const email = emailInput.value.trim();
  if (email && !isValidEmail(email)) {
    showFieldError(emailInput, emailError, 'Por favor ingresa un correo electrónico válido');
  }
});

websiteInput.addEventListener('input', () => {
  websiteError.innerHTML = '';
  websiteInput.style.borderColor = '';
});

// Validar website al salir del campo (blur)
websiteInput.addEventListener('blur', () => {
  const website = websiteInput.value.trim();
  if (website && !isValidWebsite(website)) {
    showFieldError(websiteInput, websiteError, 'Por favor ingresa una URL válida (ej: www.tupagina.com)');
  }
});

passwordInput.addEventListener('input', () => {
  passwordError.innerHTML = '';
  passwordInput.style.borderColor = '';
  updatePasswordStrength();
});

confirmPasswordInput.addEventListener('input', () => {
  confirmPasswordError.innerHTML = '';
  confirmPasswordInput.style.borderColor = '';
});

// Mostrar error en campo
function showFieldError(input, errorElement, message) {
  // Limpiar contenido previo (incluyendo elementos HTML como enlaces)
  errorElement.innerHTML = '';
  
  // Crear nodo de texto para el mensaje
  const textNode = document.createTextNode(message);
  errorElement.appendChild(textNode);
  
  input.style.borderColor = '#ef4444';
}

// Limpiar errores
function clearErrors() {
  emailError.innerHTML = '';
  websiteError.innerHTML = '';
  passwordError.innerHTML = '';
  confirmPasswordError.innerHTML = '';
  emailInput.style.borderColor = '';
  websiteInput.style.borderColor = '';
  passwordInput.style.borderColor = '';
  confirmPasswordInput.style.borderColor = '';
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

// Validar contraseña
function validatePassword(password) {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  
  if (!/[a-z]/.test(password)) {
    return 'La contraseña debe contener al menos una letra minúscula';
  }
  
  if (!/[A-Z]/.test(password)) {
    return 'La contraseña debe contener al menos una letra mayúscula';
  }
  
  if (!/[0-9]/.test(password)) {
    return 'La contraseña debe contener al menos un número';
  }
  
  return null; // Sin errores
}

// Manejar envío del formulario
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const email = emailInput.value.trim();
  const website = websiteInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Validaciones
  let hasError = false;

  if (!email) {
    showFieldError(emailInput, emailError, 'Por favor ingresa tu correo electrónico');
    hasError = true;
  } else if (!isValidEmail(email)) {
    showFieldError(emailInput, emailError, 'Por favor ingresa un correo electrónico válido');
    hasError = true;
  }

  if (!website) {
    showFieldError(websiteInput, websiteError, 'Por favor ingresa la URL de tu página web');
    hasError = true;
  } else {
    const normalizedUrl = validateAndNormalizeUrl(website);
    if (!normalizedUrl) {
      showFieldError(websiteInput, websiteError, 'Por favor ingresa una URL válida (ej: www.tupagina.com)');
      hasError = true;
    }
  }

  if (!password) {
    showFieldError(passwordInput, passwordError, 'Por favor crea una contraseña');
    hasError = true;
  } else {
    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      showFieldError(passwordInput, passwordError, passwordValidation);
      hasError = true;
    }
  }

  if (!confirmPassword) {
    showFieldError(confirmPasswordInput, confirmPasswordError, 'Por favor confirma tu contraseña');
    hasError = true;
  } else if (password !== confirmPassword) {
    showFieldError(confirmPasswordInput, confirmPasswordError, 'Las contraseñas no coinciden');
    hasError = true;
  }

  if (hasError) return;

  // Normalizar la URL antes de enviar
  const normalizedWebsite = validateAndNormalizeUrl(website);

  // Realizar registro
  setLoadingState(true);

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email, 
        password,
        website: normalizedWebsite 
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Manejar errores del servidor
      if (response.status === 409 || response.status === 400) {
        const detail = data.detail || '';
        
        // Si el email ya existe pero no está verificado
        if (detail.includes('no verificado') || detail.includes('resend-verification')) {
          showFieldError(emailInput, emailError, 'Este email ya está registrado pero no verificado.');
          
          // Crear un botón para ir a verificar
          const verifyLink = document.createElement('a');
          verifyLink.href = `/secciones/verify-email.html?email=${encodeURIComponent(email)}`;
          verifyLink.textContent = 'Ir a verificar email';
          verifyLink.style.cssText = 'display: inline-block; margin-top: 0.5rem; color: #6b64e6; font-weight: 600; text-decoration: underline;';
          
          emailError.appendChild(document.createElement('br'));
          emailError.appendChild(verifyLink);
          
          setLoadingState(false);
          return;
        }
        
        // Si el email ya existe y está verificado
        if (detail.toLowerCase().includes('ya registrado')) {
          showFieldError(emailInput, emailError, 'Ya existe una cuenta con este correo electrónico. ¿Quieres iniciar sesión?');
          
          // Crear un enlace para ir al login
          const loginLink = document.createElement('a');
          loginLink.href = '/secciones/login.html';
          loginLink.textContent = 'Ir a iniciar sesión';
          loginLink.style.cssText = 'display: inline-block; margin-top: 0.5rem; color: #6b64e6; font-weight: 600; text-decoration: underline;';
          
          emailError.appendChild(document.createElement('br'));
          emailError.appendChild(loginLink);
          
          setLoadingState(false);
          return;
        }
        
        // Otros errores específicos de 400
        if (detail.includes('email')) {
          showFieldError(emailInput, emailError, detail);
        } else if (detail.includes('password')) {
          showFieldError(passwordInput, passwordError, detail);
        } else if (detail.includes('website')) {
          showFieldError(websiteInput, websiteError, detail);
        } else {
          showFieldError(passwordInput, passwordError, detail || 'Error en los datos proporcionados');
        }
      } else {
        showFieldError(passwordInput, passwordError, data.detail || 'Error al crear la cuenta. Por favor, inténtalo de nuevo.');
      }
      setLoadingState(false);
      return;
    }

    // Registro exitoso - redirigir a verificación de email
    if (data.requires_verification && data.state) {
      // Redirigir a la página de verificación con el email y state
      window.location.href = `/secciones/verify-email.html?email=${encodeURIComponent(email)}&state=${data.state}`;
    } else if (data.access_token) {
      // Si por alguna razón ya viene el token (no debería pasar), guardarlo y redirigir
      setToken(data.access_token);
      window.dispatchEvent(new CustomEvent('auth-token-ready'));
      window.location.href = '/secciones/info.html';
    } else {
      throw new Error('Respuesta inesperada del servidor');
    }
  } catch (error) {
    console.error('Error en registro:', error);
    showFieldError(passwordInput, passwordError, 'Error de conexión. Por favor, inténtalo de nuevo.');
    setLoadingState(false);
  }
});

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
