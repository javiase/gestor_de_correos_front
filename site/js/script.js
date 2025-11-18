import { API_BASE } from '/js/utils/api.js';

// ============ GRADIENTE ANIMADO CON SCROLL ============
function updateGradientPosition() {
  const scrollY = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = scrollY / maxScroll;
  
  // Mueve el gradiente verticalmente basado en el scroll
  // El gradiente se mueve de arriba hacia abajo conforme scrolleas
  const translateY = -scrollPercent * 100; // Negativo para que se mueva hacia abajo
  
  const gradientElement = document.querySelector('.animated-gradient');
  if (gradientElement) {
    gradientElement.style.transform = `translateY(${translateY}vh)`;
  }
}

// Escuchar el scroll
window.addEventListener('scroll', updateGradientPosition, { passive: true });

// Inicializar posición
updateGradientPosition();

// ============ SECCIÓN BENEFICIOS ESTILO APPLE ============
const featuresSection = document.querySelector('.features-apple-section');
const featureItems = document.querySelectorAll('.feature-apple-item');
const featureDetails = document.querySelectorAll('.feature-apple-detail');
const progressDots = document.querySelectorAll('.progress-dot');
const progressLine = document.querySelector('.progress-line');

let currentFeature = 0;
const totalFeatures = featureItems.length;

function activateFeature(index) {
  if (index < 0 || index >= totalFeatures) return;
  
  // Desactivar todo
  featureItems.forEach(item => item.classList.remove('active'));
  featureDetails.forEach(detail => detail.classList.remove('active'));
  progressDots.forEach(dot => {
    dot.classList.remove('active');
    dot.classList.remove('passed');
  });
  
  // Activar el nuevo
  featureItems[index].classList.add('active');
  featureDetails[index].classList.add('active');
  progressDots[index].classList.add('active');
  
  // Marcar los anteriores como pasados
  for (let i = 0; i < index; i++) {
    progressDots[i].classList.add('passed');
  }
  
  // Actualizar la línea de progreso
  const progressPercent = (index / (totalFeatures - 1)) * 100;
  if (progressLine) {
    progressLine.style.setProperty('--progress-width', `${progressPercent}%`);
  }
  
  currentFeature = index;
}

// CSS para la línea de progreso
const progressStyle = document.createElement('style');
progressStyle.innerHTML = `
  .progress-line::after {
    width: var(--progress-width, 0%) !important;
  }
`;
document.head.appendChild(progressStyle);

// Clicks en los items de feature
featureItems.forEach((item, index) => {
  item.addEventListener('click', () => {
    activateFeature(index);
  });
});

// Clicks en los dots
progressDots.forEach((dot, index) => {
  dot.addEventListener('click', () => {
    activateFeature(index);
  });
});

// Auto-avanzar cada 10 segundos (opcional)
let autoAdvanceInterval = setInterval(() => {
  const nextFeature = (currentFeature + 1) % totalFeatures;
  activateFeature(nextFeature);
}, 10000);

// Pausar auto-avance cuando el usuario interactúa
featureItems.forEach((item, index) => {
  item.addEventListener('click', () => {
    clearInterval(autoAdvanceInterval);
    activateFeature(index);
    // Reiniciar auto-avance después de 8 segundos de inactividad
    autoAdvanceInterval = setInterval(() => {
      const nextFeature = (currentFeature + 1) % totalFeatures;
      activateFeature(nextFeature);
    }, 10000);
  });
});

progressDots.forEach((dot, index) => {
  dot.addEventListener('click', () => {
    clearInterval(autoAdvanceInterval);
    activateFeature(index);
    // Reiniciar auto-avance después de 8 segundos de inactividad
    autoAdvanceInterval = setInterval(() => {
      const nextFeature = (currentFeature + 1) % totalFeatures;
      activateFeature(nextFeature);
    }, 10000);
  });
});

// Inicializar primera feature
activateFeature(0);

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
document.querySelectorAll('.pricing-section, .cta-section, .video-section').forEach(section => {
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

document.querySelectorAll('.logo-text').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ——— 2) Modal de introducción (ya no se usa para OAuth, pero lo dejamos por si acaso) ———
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

// ============ SCROLL ANIMADO PARA "CÓMO FUNCIONA" ============
function setupScrollAnimation() {
  const stepCards = document.querySelectorAll('.step-card');
  const container = document.querySelector('.process-steps-vertical');
  const flowNodes = document.querySelectorAll('.flow-node');
  
  if (stepCards.length === 0 || !container) return;
  
  // Mapeo de pasos a nodos del diagrama (por clase CSS)
  const nodeMapping = {
    1: ['.store-node'],
    2: ['.customer-node'],
    3: ['.bot-node'],
    4: ['.user-node', '.response-node']
  };
  
  function checkStepCards() {
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    const scrollProgress = Math.max(0, -containerTop);
    
    // Cada tarjeta se activa después de cierto scroll
    const stepHeight = window.innerHeight * 0.8; // Cada step necesita 80vh de scroll
    
    // Determinar qué paso está actualmente en la parte superior (sticky position)
    let activeStep = 0;
    
    stepCards.forEach((card, index) => {
      const activationPoint = index * stepHeight;
      
      if (scrollProgress >= activationPoint) {
        card.classList.add('active');
        activeStep = index + 1; // Los pasos son 1-indexed
      } else {
        card.classList.remove('active');
      }
    });
    
    // Actualizar highlights de los nodos del diagrama
    flowNodes.forEach(node => {
      node.classList.remove('highlight');
    });
    
    // Activar los nodos correspondientes al paso actual
    if (activeStep > 0 && nodeMapping[activeStep]) {
      nodeMapping[activeStep].forEach(nodeClass => {
        const node = document.querySelector(nodeClass);
        if (node) {
          node.classList.add('highlight');
        }
      });
    }
  }
  
  // Escuchar scroll
  window.addEventListener('scroll', checkStepCards, { passive: true });
  
  // Ejecutar al cargar
  checkStepCards();
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupScrollAnimation);
} else {
  setupScrollAnimation();
}

// ============ TOOLTIP QUE SIGUE EL CURSOR ============
function setupCursorTooltip() {
  // Crear el elemento del tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'cursor-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    background: #0b0f1a;
    color: #e5e7eb;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    display: none;
  `;
  document.body.appendChild(tooltip);

  // Seleccionar todos los enlaces con data-tooltip
  const tooltipElements = document.querySelectorAll('[data-tooltip]');

  tooltipElements.forEach(element => {
    element.addEventListener('mouseenter', () => {
      const tooltipText = element.getAttribute('data-tooltip');
      tooltip.textContent = tooltipText;
      tooltip.style.display = 'block';
      setTimeout(() => {
        tooltip.style.opacity = '1';
      }, 10);
    });

    element.addEventListener('mousemove', (e) => {
      // Posicionar el tooltip cerca del cursor (un poco abajo y a la derecha)
      tooltip.style.left = `${e.clientX + 15}px`;
      tooltip.style.top = `${e.clientY + 15}px`;
    });

    element.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        tooltip.style.display = 'none';
      }, 200);
    });
  });
}

// Inicializar tooltip del cursor
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupCursorTooltip);
} else {
  setupCursorTooltip();
}
