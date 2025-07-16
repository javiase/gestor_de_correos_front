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
    // Llamada a tu endpoint que devuelve { auth_url: "..." }
    const response = await fetch(`${API_BASE}/google/auth/start`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Error al iniciar la conexión con Google (status ${response.status})`);
    }

    const data = await response.json();
    if (!data.auth_url) {
      throw new Error("No se recibió auth_url en la respuesta");
    }

    // Redirige al usuario al URL proporcionado por Google
    window.location.href = data.auth_url;
  } catch (err) {
    console.error("Error al solicitar flujo de Google:", err);
    alert("No se pudo iniciar sesión con Google. Por favor, inténtalo de nuevo.");
  }
}
document.querySelectorAll(".auth-google").forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    iniciarOAuth();
  });
});

