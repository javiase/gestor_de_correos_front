// /js/pages/reset-password.js
import { API_BASE } from '/js/utils/api.js';
import { notify } from '/js/utils/notify.js';

// Elementos del formulario
const resetPasswordForm = document.getElementById('resetPasswordForm');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnSpinner = submitBtn.querySelector('.btn-spinner');

// Elementos de error
const passwordError = document.getElementById('passwordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

// Elementos de fortaleza de contraseña
const passwordStrength = document.getElementById('passwordStrength');
const strengthBars = passwordStrength.querySelectorAll('.strength-bar');
const strengthText = passwordStrength.querySelector('.strength-text');

// Obtener token de la URL
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token');

// Si no hay token, redirigir
if (!resetToken) {
  notify.error('Enlace de recuperación inválido');
  setTimeout(() => {
    window.location.href = '/secciones/login.html';
  }, 2000);
}

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
passwordInput.addEventListener('input', () => {
  passwordError.textContent = '';
  passwordInput.style.borderColor = '';
  updatePasswordStrength();
});

confirmPasswordInput.addEventListener('input', () => {
  confirmPasswordError.textContent = '';
  confirmPasswordInput.style.borderColor = '';
});

// Calcular fortaleza de la contraseña
function calculatePasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  return Math.min(strength, 4);
}

// Actualizar indicador visual de fortaleza
function updatePasswordStrength() {
  const password = passwordInput.value;
  
  if (!password) {
    passwordStrength.style.display = 'none';
    return;
  }
  
  passwordStrength.style.display = 'block';
  const strength = calculatePasswordStrength(password);
  
  // Aplicar data-strength al contenedor (para que funcione con el CSS)
  const strengthLevels = ['weak', 'fair', 'good', 'strong'];
  const strengthTexts = ['Débil', 'Regular', 'Buena', 'Fuerte'];
  
  if (strength > 0) {
    passwordStrength.setAttribute('data-strength', strengthLevels[strength - 1]);
    strengthText.textContent = strengthTexts[strength - 1];
  } else {
    passwordStrength.removeAttribute('data-strength');
    strengthText.textContent = '';
  }
}

// Validar contraseña
function validatePassword(password) {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  
  if (!/[A-Z]/.test(password)) {
    return 'Debe contener al menos una mayúscula';
  }
  
  if (!/[a-z]/.test(password)) {
    return 'Debe contener al menos una minúscula';
  }
  
  if (!/\d/.test(password)) {
    return 'Debe contener al menos un número';
  }
  
  return null;
}

// Mostrar error en campo específico
function showFieldError(input, errorElement, message) {
  errorElement.textContent = message;
  input.style.borderColor = 'var(--error)';
}

// Estado de carga
function setLoadingState(loading) {
  submitBtn.disabled = loading;
  if (loading) {
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
  } else {
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }
}

// Manejar el envío del formulario
resetPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Limpiar errores previos
  passwordError.textContent = '';
  confirmPasswordError.textContent = '';
  passwordInput.style.borderColor = '';
  confirmPasswordInput.style.borderColor = '';
  
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  // Validar contraseña
  const passwordValidation = validatePassword(password);
  if (passwordValidation) {
    showFieldError(passwordInput, passwordError, passwordValidation);
    return;
  }
  
  // Validar que las contraseñas coincidan
  if (password !== confirmPassword) {
    showFieldError(confirmPasswordInput, confirmPasswordError, 'Las contraseñas no coinciden');
    return;
  }
  
  setLoadingState(true);
  
  try {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        token: resetToken,
        new_password: password 
      })
    });
    
    if (response.ok) {
      // Mostrar mensaje de éxito
      notify.success('¡Contraseña restablecida correctamente!');
      
      // Redirigir al login
      setTimeout(() => {
        window.location.href = '/secciones/login.html';
      }, 2000);
      
    } else if (response.status === 400 || response.status === 401) {
      // 400 = token inválido para reset (tipo incorrecto)
      // 401 = token expirado o inválido
      const data = await response.json().catch(() => ({}));
      const errorMsg = data.detail || 'El enlace de recuperación ha expirado o es inválido';
      notify.error(errorMsg);
      setLoadingState(false);
      
      // Redirigir a forgot-password después de 2 segundos
      setTimeout(() => {
        window.location.href = '/secciones/forgot-password.html';
      }, 2000);
      
    } else if (response.status === 404) {
      notify.error('Usuario no encontrado');
      setLoadingState(false);
      
      setTimeout(() => {
        window.location.href = '/secciones/forgot-password.html';
      }, 2000);
      
    } else {
      throw new Error('Error al restablecer contraseña');
    }
    
  } catch (error) {
    console.error('Error:', error);
    notify.error('Error al restablecer la contraseña');
    setLoadingState(false);
  }
});
