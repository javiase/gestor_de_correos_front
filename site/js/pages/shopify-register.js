// /js/pages/shopify-register.js
// Versión especial de register.js para el onboarding de Shopify
// Preserva los query params (state, shop) durante todo el flujo

import { API_BASE, setToken } from '/js/utils/api.js';

// Obtener query params de Shopify
const urlParams = new URLSearchParams(window.location.search);
const shopifyState = urlParams.get('state');
const shopifyShop = urlParams.get('shop');

// Elementos del formulario (IDs específicos de shopify_onboarding.html)
const registerForm = document.getElementById('registerForm');
const emailInput = document.getElementById('registerEmail');
const websiteInput = document.getElementById('website');
const passwordInput = document.getElementById('registerPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('registerSubmitBtn');
const btnText = submitBtn?.querySelector('.btn-text');
const btnSpinner = submitBtn?.querySelector('.btn-spinner');

// Elementos de error
const emailError = document.getElementById('registerEmailError');
const websiteError = document.getElementById('websiteError');
const passwordError = document.getElementById('registerPasswordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

// Elementos de seguridad de contraseña
const passwordStrength = document.getElementById('passwordStrength');
const strengthText = passwordStrength?.querySelector('.strength-text');

// Toggle password visibility (ya está manejado en el HTML inline, pero por si acaso)
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
  url = url.replace(/\s+/g, '');
  
  // Si ya tiene protocolo, validar que sea http o https
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('.')) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }
  
  // Si no tiene protocolo, añadir https://
  if (!url.startsWith('http')) {
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    } else {
      url = 'https://www.' + url;
    }
  }
  
  // Validar formato final
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    if (!hostname.includes('.')) return null;
    
    const parts = hostname.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2) return null;
    
    const domain = parts[parts.length - 2];
    if (!domain || domain.length < 2) return null;
    
    return url;
  } catch {
    return null;
  }
}

// Validar contraseña
function validatePassword(password) {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  
  if (!/[A-Z]/.test(password)) {
    return 'La contraseña debe contener al menos una mayúscula';
  }
  
  if (!/[a-z]/.test(password)) {
    return 'La contraseña debe contener al menos una minúscula';
  }
  
  if (!/[0-9]/.test(password)) {
    return 'La contraseña debe contener al menos un número';
  }
  
  return null;
}

// Calcular fuerza de contraseña
function calculatePasswordStrength(password) {
  if (!password) return { strength: 'none', text: 'Ingresa tu contraseña' };
  
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 2) return { strength: 'weak', text: 'Contraseña débil' };
  if (score <= 4) return { strength: 'fair', text: 'Contraseña aceptable' };
  if (score <= 5) return { strength: 'good', text: 'Contraseña buena' };
  return { strength: 'strong', text: '¡Contraseña fuerte!' };
}

// Actualizar indicador de seguridad
function updatePasswordStrength() {
  const password = passwordInput.value;
  const result = calculatePasswordStrength(password);
  
  if (passwordStrength) {
    passwordStrength.setAttribute('data-strength', result.strength);
    if (strengthText) {
      strengthText.textContent = result.text;
    }
  }
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

// Estado de carga
function setLoadingState(loading) {
  if (submitBtn) {
    submitBtn.disabled = loading;
  }
  if (btnText) {
    btnText.style.display = loading ? 'none' : 'inline';
  }
  if (btnSpinner) {
    btnSpinner.style.display = loading ? 'inline' : 'none';
  }
}

// Event listeners para limpiar errores
if (emailInput) {
  emailInput.addEventListener('input', () => {
    clearFieldError(emailInput, emailError);
    updatePasswordStrength();
  });
}

if (websiteInput) {
  websiteInput.addEventListener('input', () => clearFieldError(websiteInput, websiteError));
}

if (passwordInput) {
  passwordInput.addEventListener('input', () => {
    clearFieldError(passwordInput, passwordError);
    updatePasswordStrength();
  });
}

if (confirmPasswordInput) {
  confirmPasswordInput.addEventListener('input', () => clearFieldError(confirmPasswordInput, confirmPasswordError));
}

// Manejo del formulario de registro
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

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
          website: normalizedWebsite,
          // aquí igual: conectar este registro con la sesión de Shopify
          shopify_state: shopifyState || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 || response.status === 400) {
          const detail = data.detail || '';
          
          // Si el email ya existe pero no está verificado
          if (detail.includes('no verificado') || detail.includes('resend-verification')) {
            showFieldError(emailInput, emailError, 'Este email ya está registrado pero no verificado.');
            
            // Crear enlace preservando query params de Shopify
            const verifyLink = document.createElement('a');
            let verifyUrl = `/secciones/verify-email.html?email=${encodeURIComponent(email)}`;
            if (shopifyState) verifyUrl += `&shopify_state=${encodeURIComponent(shopifyState)}`;
            if (shopifyShop) verifyUrl += `&shop=${encodeURIComponent(shopifyShop)}`;
            
            verifyLink.href = verifyUrl;
            verifyLink.textContent = 'Ir a verificar email';
            verifyLink.style.cssText = 'display: inline-block; margin-top: 0.5rem; color: #e879f9; font-weight: 600; text-decoration: underline;';
            
            emailError.appendChild(document.createElement('br'));
            emailError.appendChild(verifyLink);
            
            setLoadingState(false);
            return;
          }
          
          // Si el email ya existe y está verificado
          if (detail.toLowerCase().includes('ya registrado')) {
            showFieldError(emailInput, emailError, 'Ya existe una cuenta con este correo. Cambia a iniciar sesión.');
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

      // Registro exitoso - redirigir a verificación de email PRESERVANDO query params de Shopify
      if (data.requires_verification && data.state) {
        let verifyUrl = `/secciones/verify-email.html?email=${encodeURIComponent(email)}&state=${data.state}`;
        
        // CRÍTICO: Preservar los query params de Shopify
        if (shopifyState) verifyUrl += `&shopify_state=${encodeURIComponent(shopifyState)}`;
        if (shopifyShop) verifyUrl += `&shop=${encodeURIComponent(shopifyShop)}`;
        
        window.location.href = verifyUrl;
      } else if (data.access_token) {
        // Si viene el token directamente (caso raro), guardarlo
        setToken(data.access_token);
        window.dispatchEvent(new CustomEvent('auth-token-ready'));
        
        // NUEVO FLUJO: Registro siempre va al flujo normal (perfil → info → plans)
        // No importa si viene de Shopify, el nuevo usuario debe completar el onboarding
        window.location.href = '/secciones/perfil.html';
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }
    } catch (error) {
      console.error('Error en registro:', error);
      showFieldError(passwordInput, passwordError, 'Error de conexión. Por favor, inténtalo de nuevo.');
      setLoadingState(false);
    }
  });
}

// Inicializar indicador de contraseña
if (passwordInput) {
  updatePasswordStrength();
}
