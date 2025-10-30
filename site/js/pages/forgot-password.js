// /js/pages/forgot-password.js
import { API_BASE } from '/js/utils/api.js';
import { notify } from '/js/utils/notify.js';

// Elementos del formulario
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const emailInput = document.getElementById('email');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnSpinner = submitBtn.querySelector('.btn-spinner');

// Elementos de error
const emailError = document.getElementById('emailError');

// Limpiar errores al escribir
emailInput.addEventListener('input', () => {
  emailError.textContent = '';
  emailInput.style.borderColor = '';
});

// Validación de email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
forgotPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Limpiar errores previos
  emailError.textContent = '';
  emailInput.style.borderColor = '';
  
  const email = emailInput.value.trim();
  
  // Validar email
  if (!email) {
    showFieldError(emailInput, emailError, 'Por favor ingresa tu correo electrónico');
    return;
  }
  
  if (!isValidEmail(email)) {
    showFieldError(emailInput, emailError, 'Por favor ingresa un correo electrónico válido');
    return;
  }
  
  setLoadingState(true);
  
  try {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    if (response.ok) {
      // Mostrar mensaje de éxito
      notify.success('¡Correo enviado! Revisa tu bandeja de entrada');
      
      // Limpiar el formulario
      emailInput.value = '';
      
      // Opcional: redirigir después de unos segundos
      setTimeout(() => {
        window.location.href = '/secciones/login.html';
      }, 3000);
      
    } else if (response.status === 404 || response.status === 400) {
      // Backend devuelve 404 cuando no existe el email
      // También puede devolver 400 si la cuenta usa Google OAuth
      const data = await response.json().catch(() => ({}));
      const errorMsg = data.detail || 'No existe una cuenta con este correo electrónico';
      showFieldError(emailInput, emailError, errorMsg);
      setLoadingState(false);
      
    } else if (response.status === 429) {
      showFieldError(emailInput, emailError, 'Demasiados intentos. Por favor, espera unos minutos');
      setLoadingState(false);
      
    } else {
      throw new Error('Error al solicitar recuperación');
    }
    
  } catch (error) {
    console.error('Error:', error);
    notify.error('Error al enviar el correo de recuperación');
    setLoadingState(false);
  }
});
