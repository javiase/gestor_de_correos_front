import { API_BASE } from '/js/utils/api.js';
// Animation observer for sections and elements
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.15
}; 

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      entry.target.classList.add('animate');
    }
  });
}, observerOptions);

// Observe sections
document.querySelectorAll('.features-section, .pricing-section, .cta-section, .video-section').forEach(section => {
  observer.observe(section);
});

// Observe individual elements
document.querySelectorAll('.feature-card, .step, .pricing-card').forEach(el => {
  observer.observe(el);
});

// Navbar functionality
const navbar = document.querySelector('.navbar');
const navbarContent = document.querySelector('.navbar-content');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navbarCenter = document.querySelector('.navbar-center');



// Mobile menu functionality
mobileMenuBtn.addEventListener('click', () => {
  navbarCenter.classList.toggle('active');
  mobileMenuBtn.classList.toggle('active');
});

// FAQ accordion functionality
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
  const question = item.querySelector('.faq-question');
  
  question.addEventListener('click', () => {
    // Close all other items
    faqItems.forEach(otherItem => {
      if (otherItem !== item) {
        otherItem.classList.remove('active');
      }
    });
    
    // Toggle current item
    item.classList.toggle('active');
  });
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const selector = this.getAttribute('href');

    // Evita errores si el href es solo "#"
    if (selector.length > 1) {
      const target = document.querySelector(selector);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }

    navbarCenter.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
  });
});

// Add scroll-based navbar background
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  
  if (currentScroll <= 0) {
    navbar.classList.remove('scroll-up');
    return;
  }
  
  if (currentScroll > lastScroll && !navbar.classList.contains('scroll-down')) {
    // Scroll down
    navbar.classList.remove('scroll-up');
    navbar.classList.add('scroll-down');
  } else if (currentScroll < lastScroll && navbar.classList.contains('scroll-down')) {
    // Scroll up
    navbar.classList.remove('scroll-down');
    navbar.classList.add('scroll-up');
  }
  
  lastScroll = currentScroll;
});

// Animación CSS para visibilidad
const style = document.createElement('style');
style.innerHTML = `
  .features-section, .pricing-section, .cta-section, .video-section {
    opacity: 0;
    transform: translateY(60px);
    transition: opacity 0.8s cubic-bezier(.4,2,.3,1), transform 0.8s cubic-bezier(.4,2,.3,1);
  }
  .features-section.visible, .pricing-section.visible, .cta-section.visible, .video-section.visible {
    opacity: 1;
    transform: none;
  }
`;
document.head.appendChild(style); 

// --- Botón “Iniciar sesión” (lanza el flujo de Google OAuth) ---
async function iniciarOAuth() {
  try {
    const response = await fetch(`${API_BASE}/google/auth/start`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Error al iniciar la conexión con Google (status ${response.status})`);
    }

    const { auth_url, state } = await response.json();
    if (!auth_url || !state) {
      throw new Error("Respuesta inválida: falta auth_url o state");
    }

    // 👇👇 PUNTO 1: guardar el handle de login de un solo uso
    localStorage.setItem("login_state", state);
    localStorage.removeItem("store");

    // Redirigir a Google
    window.location.href = auth_url;
  } catch (err) {
    console.error("Error al solicitar flujo de Google:", err);
    alert("No se pudo iniciar sesión con Google. Por favor, inténtalo de nuevo.");
  }
}
// Solo el botón de navbar con id="loginBtn" va directo
const loginBtnEl = document.querySelector("#loginBtn");
if (loginBtnEl) {
  loginBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    iniciarOAuth();
  });
}

// ——— 1) Scroll arriba al pulsar cualquier "Respondize" ———
document.querySelectorAll('.logo-text').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ——— 2) Modal de introducción previo al login ———
const introModal = document.getElementById('introModal');
const introContinueBtn = document.getElementById('introContinue');

function openIntroModal() {
  if (!introModal) return;
  introModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  // foco al modal para accesibilidad
  const dialog = introModal.querySelector('.modal-dialog');
  if (dialog) dialog.focus();
}

function closeIntroModal() {
  if (!introModal) return;
  introModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

// Abrir modal desde todos los botones marcados como trigger-intro
document.querySelectorAll('.trigger-intro').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openIntroModal();
  });
});

// Continuar => cerrar modal y lanzar OAuth
if (introContinueBtn) {
  introContinueBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeIntroModal();
    iniciarOAuth();
  });
}

// Cerrar con backdrop o con la X
if (introModal) {
  introModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-close')) {
      closeIntroModal();
    }
  });
}

// Cerrar con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeIntroModal();
});
