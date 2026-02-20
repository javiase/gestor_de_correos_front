// plans.js
import { fetchWithAuth, getToken, API_BASE } from '/js/utils/api.js';
import { enforceFlowGate, getUserContext } from '/js/utils/flow-gate.js';
import { notify } from '/js/utils/notify.js';
import { t, initI18n } from '/js/utils/i18n.js';

// ============ MENÚ MÓVIL HAMBURGUESA ============
function setupMobileMenu() {
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navbarCenter = document.querySelector('.navbar-center');

  if (!mobileMenuBtn || !navbarCenter) {
    console.log('Menu elements not found in plans page');
    return;
  }

  function openMenu() {
    mobileMenuBtn.classList.add('active');
    navbarCenter.classList.add('active');
    navbarCenter.style.maxHeight = '20rem';
    navbarCenter.style.opacity = '1';
    navbarCenter.style.visibility = 'visible';
    navbarCenter.style.padding = '0.5rem 0';
  }

  function closeMenu() {
    mobileMenuBtn.classList.remove('active');
    navbarCenter.classList.remove('active');
    navbarCenter.style.maxHeight = '0';
    navbarCenter.style.opacity = '0';
    navbarCenter.style.visibility = 'hidden';
    navbarCenter.style.padding = '0';
  }

  let isTogglingMenu = false;
  
  mobileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isTogglingMenu) return;
    isTogglingMenu = true;
    
    const isActive = mobileMenuBtn.classList.contains('active');
    
    if (isActive) {
      closeMenu();
    } else {
      openMenu();
    }
    
    setTimeout(() => {
      isTogglingMenu = false;
    }, 100);
  });

  // Cerrar menú al hacer clic en un enlace
  const navLinks = navbarCenter.querySelectorAll('a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Cerrar menú al hacer clic fuera
  setTimeout(() => {
    document.addEventListener('click', (e) => {
      if (isTogglingMenu) return;
      
      if (!mobileMenuBtn.contains(e.target) && !navbarCenter.contains(e.target)) {
        const isActive = navbarCenter.classList.contains('active');
        if (isActive) {
          closeMenu();
        }
      }
    });
  }, 500);
}

// Inicializar menú móvil
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMobileMenu);
} else {
  setupMobileMenu();
}

// ============ TOOLTIP QUE SIGUE EL CURSOR ============
function setupCursorTooltip() {
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
    border: 1px solid #1f2937;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 10000;
  `;
  document.body.appendChild(tooltip);

  let currentElement = null;

  document.addEventListener('mousemove', (e) => {
    const target = e.target.closest('[data-tooltip]');
    
    if (target) {
      if (currentElement !== target) {
        currentElement = target;
        tooltip.textContent = target.getAttribute('data-tooltip');
        tooltip.style.opacity = '1';
      }
      
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY + 12) + 'px';
    } else {
      if (currentElement) {
        tooltip.style.opacity = '0';
        currentElement = null;
      }
    }
  });

  document.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
    currentElement = null;
  });
}

// Inicializar tooltip
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupCursorTooltip);
} else {
  setupCursorTooltip();
}

// 🆕 EARLY CHECK: Si no hay token inmediatamente, muestra las cards sin esperar
// Esto previene el flash de "sin contenido" en la landing page
if (!getToken() && !localStorage.getItem("login_state")) {
  // Ejecuta cuando el DOM esté listo, pero sin esperar otros checks
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showCardsForPublic);
  } else {
    showCardsForPublic();
  }
}

function showCardsForPublic() {
  const freeCard = document.getElementById('freeCard');
  const starterCard = document.getElementById('starterCard');
  const packCard = document.getElementById('packCard');
  const plansLoading = document.getElementById('plans-loading');
  
  if (freeCard) {
    freeCard.classList.remove('preload-hidden');
    freeCard.style.opacity = '1';
  }
  if (starterCard) {
    starterCard.classList.remove('preload-hidden');
    starterCard.style.opacity = '1';
  }
  if (packCard) {
    packCard.classList.remove('preload-hidden');
    packCard.style.opacity = '1';
  }
  if (plansLoading) plansLoading.classList.add('hidden');
  
  // 🆕 Redirigir botones de planes a registro cuando no hay sesión
  setupPublicButtons();
}

// 🆕 Configurar botones para usuarios no autenticados
function setupPublicButtons() {
  const freeBtn = document.getElementById('freeBtn');
  const starterBtn = document.getElementById('starterBtn');
  
  // Los botones están deshabilitados con data-tooltip="Próximamente"
  // No añadimos ningún onclick para que permanezcan deshabilitados
  if (freeBtn) {
    freeBtn.onclick = (e) => {
      e.preventDefault();
      // No hacer nada - botón deshabilitado
    };
  }
  
  if (starterBtn) {
    starterBtn.onclick = (e) => {
      e.preventDefault();
      // No hacer nada - botón deshabilitado
    };
  }
}

// Funciones auxiliares para fechas
function toDate(dateLike) {
  if (!dateLike) return null;

  // ➜ Soporta Mongo Extended JSON: { $date: "..." }
  if (typeof dateLike === 'object' && dateLike.$date) {
    return toDate(dateLike.$date);
  }

  if (typeof dateLike === 'number') {
    const ms = dateLike < 1e12 ? dateLike * 1000 : dateLike; // epoch s/ms
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }

  // ✅ Normaliza strings tipo Python: "2026-01-22T11:33:21.269000" → "2026-01-22T11:33:21.269Z"
  if (typeof dateLike === 'string') {
    let s = dateLike.trim();

    // Caso: microsegundos 6 dígitos y sin timezone
    const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d{6})(Z|[+-]\d{2}:\d{2})?$/);
    if (m) {
      const base = m[1];
      const ms = m[2].slice(0, 3);
      const tz = m[3] || 'Z';
      s = `${base}.${ms}${tz}`;
    } else {
      // Caso: ISO sin Z ni offset → asumimos UTC
      const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(s);
      if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !hasTz) s += 'Z';
    }

    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  const d = new Date(dateLike);
  return isNaN(d) ? null : d;
}

function formatBillingDate(dateLike) {
  const d = toDate(dateLike);
  if (!d) return '';
  const DD = String(d.getDate()).padStart(2, '0');
  const MMM = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()];
  const YYYY = d.getFullYear();
  return `${DD}-${MMM}-${YYYY}`;
}

// Pone la fecha en todos los nodos con [data-billing-date]
function updatePopoverBillingDate(dateLike) {
  const els = document.querySelectorAll('[data-billing-date]');
  if (!els.length) return;
  const txt = `(${formatBillingDate(dateLike)})`;
  els.forEach(el => el.textContent = txt);
}

// Inicializar popover de ayuda
function initPlanHelpPopover() {
  console.log('🔧 [POPOVER] Inicializando popover...');
  
  const btn = document.getElementById('planHelpBtn');
  const pop = document.getElementById('planHelpPopover');

  console.log('🔧 [POPOVER] Botón encontrado:', btn);
  console.log('🔧 [POPOVER] Popover encontrado:', pop);

  if (!btn || !pop) {
    console.error('❌ [POPOVER] No se encontró el botón o el popover');
    return;
  }

  btn.setAttribute('aria-controls', 'planHelpPopover');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  pop.hidden = true;

  // Crear backdrop para mobile
  let backdrop = document.querySelector('.plan-popover-backdrop');
  if (!backdrop) {
    console.log('🔧 [POPOVER] Creando backdrop...');
    backdrop = document.createElement('div');
    backdrop.className = 'plan-popover-backdrop';
    document.body.appendChild(backdrop);
    console.log('✅ [POPOVER] Backdrop creado y añadido al body');
  } else {
    console.log('✅ [POPOVER] Backdrop ya existía');
  }

  const open = () => {
    console.log('🔓 [POPOVER] Abriendo popover...');
    console.log('🔧 [POPOVER] Estilos computados del popover:', window.getComputedStyle(pop).position);
    console.log('🔧 [POPOVER] Ancho del viewport:', window.innerWidth);
    
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    backdrop.classList.add('active');
    
    console.log('✅ [POPOVER] Popover visible:', !pop.hidden);
    console.log('✅ [POPOVER] Backdrop activo:', backdrop.classList.contains('active'));
    console.log('🔧 [POPOVER] Position del popover:', window.getComputedStyle(pop).position);
    console.log('🔧 [POPOVER] Left del popover:', window.getComputedStyle(pop).left);
    console.log('🔧 [POPOVER] Top del popover:', window.getComputedStyle(pop).top);
    console.log('🔧 [POPOVER] Transform del popover:', window.getComputedStyle(pop).transform);
    
    pop.focus?.();
  };

  const closePop = () => {
    console.log('🔒 [POPOVER] Cerrando popover...');
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    backdrop.classList.remove('active');
    console.log('✅ [POPOVER] Popover cerrado');
  };

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('👆 [POPOVER] Click en botón, estado actual:', pop.hidden ? 'cerrado' : 'abierto');
    pop.hidden ? open() : closePop();
  });

  // Cerrar al hacer click en el backdrop
  backdrop.addEventListener('click', () => {
    console.log('👆 [POPOVER] Click en backdrop');
    closePop();
  });

  // Cerrar al hacer click fuera (desktop)
  document.addEventListener('click', (e) => {
    if (pop.hidden) return;
    if (!pop.contains(e.target) && !btn.contains(e.target)) {
      console.log('👆 [POPOVER] Click fuera del popover');
      closePop();
    }
  });
  
  console.log('✅ [POPOVER] Popover completamente inicializado');
}

// ===== TOOLTIPS MOBILE CON BACKDROP =====
function initMobileTooltips() {
  console.log('🔧 [TOOLTIPS] Inicializando tooltips mobile...');
  
  // Solo en mobile
  if (window.innerWidth > 768) {
    console.log('⏭️ [TOOLTIPS] Desktop detectado, saltando inicialización');
    return;
  }

  // Crear backdrop si no existe
  let backdrop = document.querySelector('.tooltip-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'tooltip-backdrop';
    document.body.appendChild(backdrop);
    console.log('✅ [TOOLTIPS] Backdrop creado');
  }

  let currentTooltip = null;

  const showTooltip = (tooltip) => {
    console.log('🔓 [TOOLTIPS] Mostrando tooltip');
    currentTooltip = tooltip;
    tooltip.style.opacity = '1';
    tooltip.style.visibility = 'visible';
    backdrop.classList.add('active');
  };

  const hideTooltip = () => {
    if (currentTooltip) {
      console.log('🔒 [TOOLTIPS] Ocultando tooltip');
      currentTooltip.style.opacity = '0';
      currentTooltip.style.visibility = 'hidden';
      currentTooltip = null;
    }
    backdrop.classList.remove('active');
  };

  // Cerrar al tocar el backdrop
  backdrop.addEventListener('click', (e) => {
    console.log('👆 [TOOLTIPS] Click en backdrop');
    e.preventDefault();
    e.stopPropagation();
    hideTooltip();
  });

  // Manejar .info-icon-wrapper (label tooltips)
  document.querySelectorAll('.info-icon-wrapper').forEach(wrapper => {
    const icon = wrapper.querySelector('.info-icon');
    const tooltip = wrapper.querySelector('.info-tooltip');
    
    if (icon && tooltip) {
      console.log('✅ [TOOLTIPS] Configurando info-icon-wrapper');
      
      wrapper.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('👆 [TOOLTIPS] Click en info-icon-wrapper');
        
        if (currentTooltip === tooltip) {
          hideTooltip();
        } else {
          hideTooltip();
          showTooltip(tooltip);
        }
      });
    }
  });

  // Manejar .has-tooltip (features list)
  document.querySelectorAll('.features-list li.has-tooltip').forEach(item => {
    const tooltip = item.querySelector('.tooltip');
    
    if (tooltip) {
      console.log('✅ [TOOLTIPS] Configurando has-tooltip');
      
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('👆 [TOOLTIPS] Click en has-tooltip');
        
        if (currentTooltip === tooltip) {
          hideTooltip();
        } else {
          hideTooltip();
          showTooltip(tooltip);
        }
      });
    }
  });

  // Manejar .info-icon (Pack Extra button)
  document.querySelectorAll('.info-icon').forEach(icon => {
    const tooltip = icon.querySelector('.info-tooltip');
    
    if (tooltip) {
      console.log('✅ [TOOLTIPS] Configurando info-icon');
      
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('👆 [TOOLTIPS] Click en info-icon');
        
        if (currentTooltip === tooltip) {
          hideTooltip();
        } else {
          hideTooltip();
          showTooltip(tooltip);
        }
      });
    }
  });

  console.log('✅ [TOOLTIPS] Tooltips mobile completamente inicializados');
}

async function fetchStoreFresh() {
  try {
    const res = await fetchWithAuth('/stores/me');
    if (!res.ok) throw new Error('status ' + res.status);
    const fresh = await res.json();
    localStorage.setItem('store', JSON.stringify(fresh));
    window.appUser = fresh;
    return fresh;
  } catch (e) {
    console.warn('No se pudo refrescar la tienda:', e);
    return null;
  }
}

// Variable global para mantener el valor seleccionado
let selectedConversations = 100;
let selectedPackConversations = 20; // Para el selector de packs

// Calcular precio total dinámicamente
function updateTotalPrice(isPendingChange = false, pendingConvs = null) {
  const totalPriceEl = document.getElementById('totalPrice');
  const totalPriceLabelEl = document.querySelector('.total-price-label');
  
  if (!totalPriceEl) return;
  
  const basePrice = 9;
  const pricePerConversation = 0.40;
  
  // Si hay cambio pendiente, usar esas conversaciones
  const conversationsToUse = isPendingChange && pendingConvs ? pendingConvs : selectedConversations;
  const total = basePrice + (conversationsToUse * pricePerConversation);
  
  totalPriceEl.textContent = `${total.toFixed(2)}€`;
  
  // Cambiar el label si hay cambio pendiente
  if (totalPriceLabelEl) {
    totalPriceLabelEl.textContent = isPendingChange ? t('plans.totalMonthlyExpected') : t('plans.totalMonthly');
  }
}

// Calcular precio del pack dinámicamente
function updatePackPrice() {
  const packPriceEl = document.getElementById('packPrice');
  const packPricePerConvEl = document.getElementById('packPricePerConv');
  
  if (!packPriceEl) return;
  
  const pricePerConversation = 0.45;
  const total = selectedPackConversations * pricePerConversation;
  
  packPriceEl.textContent = `${total.toFixed(2)}€`;
  
  if (packPricePerConvEl) {
    packPricePerConvEl.textContent = `${pricePerConversation.toFixed(2)}€ ${t('plans.conversations')}`;
  }
}

// Detectar elemento centrado en el scroll
function updateCenteredOption(scrollerId = 'conversationsScroller', isPackSelector = false) {
  const scroller = document.getElementById(scrollerId);
  if (!scroller) return;

  const options = scroller.querySelectorAll('.conversation-option');
  const scrollerRect = scroller.getBoundingClientRect();
  const scrollerCenter = scrollerRect.top + scrollerRect.height / 2;

  let closestOption = null;
  let closestDistance = Infinity;

  options.forEach(option => {
    const rect = option.getBoundingClientRect();
    const optionCenter = rect.top + rect.height / 2;
    const distance = Math.abs(scrollerCenter - optionCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestOption = option;
    }
  });

  // Actualizar clases y valor seleccionado
  options.forEach(opt => opt.classList.remove('centered'));
  if (closestOption) {
    closestOption.classList.add('centered');
    const value = parseInt(closestOption.dataset.value);
    
    if (isPackSelector) {
      selectedPackConversations = value;
      updatePackPrice();
    } else {
      selectedConversations = value;
      updateTotalPrice();
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Inicializar i18n
  initI18n();
  
  // Traducir las opciones del scroller dinámicamente
  function translateConversationOptions() {
    document.querySelectorAll('.conversation-option').forEach(option => {
      const value = option.getAttribute('data-value');
      option.textContent = `${value} ${t('plans.conversationsCount')}`;
    });
  }
  
  // Traducir inicialmente
  translateConversationOptions();
  
  // Re-traducir cuando cambie el idioma
  window.addEventListener('locale-changed', translateConversationOptions);
  
  // 🆕 Referencias a las cards - declaradas una sola vez al principio
  const freeCard = document.getElementById('freeCard');
  const starterCard = document.getElementById('starterCard');
  const packCard = document.getElementById('packCard');

  // 1) Esperar a config.js si estamos en modo autenticado
  if (window.configReady) {
    try { await window.configReady; } catch (_) {}
  }

  // 2) Verificar token con timeout adaptativo
  // Si venimos de OAuth callback, esperamos más tiempo para el polling
  const urlParams = new URLSearchParams(window.location.search);
  const hasLoginState = !!localStorage.getItem("login_state");
  const isOAuthCallback = urlParams.has('code') || urlParams.has('state') || hasLoginState;
  
  const waitToken = async (timeoutMs = isOAuthCallback ? 10000 : 1000) => {
    if (getToken()) return true;
    const start = Date.now();

    return await new Promise(resolve => {
      const onReady = () => { cleanup(); resolve(true); };
      const iv = setInterval(() => {
        if (getToken()) { cleanup(); resolve(true); }
        else if (Date.now() - start > timeoutMs) { cleanup(); resolve(false); }
      }, 100);

      const cleanup = () => {
        clearInterval(iv);
        window.removeEventListener('auth-token-ready', onReady);
      };

      window.addEventListener('auth-token-ready', onReady, { once: true });
    });
  };

  const hasToken = await waitToken();
  
  // 🆕 Referencia al loader
  const plansLoading = document.getElementById('plans-loading');
  
  // 🆕 Si NO hay token, mostrar cards inmediatamente (modo público)
  // Si hay token, ocultar cards y mostrar loader hasta cargar datos
  if (!hasToken) {
    // Modo público: mostrar todo inmediatamente
    if (freeCard) {
      freeCard.classList.remove('preload-hidden');
      freeCard.style.opacity = '1';
    }
    if (starterCard) {
      starterCard.classList.remove('preload-hidden');
      starterCard.style.opacity = '1';
    }
    if (packCard) {
      packCard.classList.remove('preload-hidden');
      packCard.style.opacity = '1';
    }
    if (plansLoading) plansLoading.classList.add('hidden');
  } else {
    // Modo autenticado: mantener cards ocultas y mostrar loader
    if (plansLoading) plansLoading.classList.remove('hidden');
  }
  
  // 3) Configurar selector de conversaciones SIEMPRE (público y privado)
  const conversationsScroller = document.getElementById('conversationsScroller');
  if (conversationsScroller) {
    // Centrar inicialmente en 100 conversaciones
    const defaultOption = conversationsScroller.querySelector('[data-value="100"]');
    if (defaultOption) {
      defaultOption.scrollIntoView({ block: 'center', behavior: 'instant' });
      defaultOption.classList.add('centered');
      selectedConversations = 100;
      updateTotalPrice();
    }
    
    // Scroll listener con debounce
    let scrollTimeout;
    conversationsScroller.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => updateCenteredOption('conversationsScroller', false), 50);
    });
    
    // Click directo en opciones
    conversationsScroller.querySelectorAll('.conversation-option').forEach(option => {
      option.addEventListener('click', () => {
        // Scroll suave hacia la opción clickeada
        option.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  // Configurar selector de pack extra SIEMPRE
  const packConversationsScroller = document.getElementById('packConversationsScroller');
  if (packConversationsScroller) {
    let scrollTimeout;
    packConversationsScroller.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => updateCenteredOption('packConversationsScroller', true), 50);
    });
    
    packConversationsScroller.querySelectorAll('.conversation-option').forEach(option => {
      option.addEventListener('click', () => {
        option.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    
    updateCenteredOption('packConversationsScroller', true);
  }

  const logoutBtn = document.getElementById('logoutBtn');
  const logo = document.querySelector('.logo-text');

  // 4) Si NO hay token, mostramos planes pero sin datos de usuario
  if (!hasToken) {
    console.log('ℹ️ Modo público - Sin token detectado');

    // Navbar para usuarios sin sesión
    if (logoutBtn) {
      logoutBtn.textContent = t('navbar.login');
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Si tiene la clase disabled-link, no navegar
        if (!logoutBtn.classList.contains('disabled-link')) {
          window.location.href = '/secciones/login.html';
        }
      });
    }

    if (logo) {
      logo.style.cursor = 'pointer';
      logo.addEventListener('click', (e) => {
        e.preventDefault(); // Prevenir navegación por defecto del href
        window.location.href = '/index.html';
      });
    }

    // Los botones están deshabilitados con data-tooltip="Próximamente"
    // La configuración de los botones se hace en setupPublicButtons() 
    // que se llama desde showCardsForPublic()
    
    // Mostrar calculadora para usuarios sin sesión
    const calculator = document.getElementById('conversationsCalculator');
    if (calculator) {
      calculator.classList.remove('hidden');
      initConversationsCalculator();
    }
    
    return; // Salimos aquí si no hay token - NO llamamos enforceFlowGate()
  }

  // 5) Si HAY token, refrescar cache ANTES de enforceFlowGate
  // Esto asegura que el gate use datos actualizados del backend
  let data = null;
  
  if (window.appUserPromise) {
    try { await window.appUserPromise; } catch(_) {}
  }

  let cached = localStorage.getItem("store");
  data = cached ? JSON.parse(cached) : (window.appUser || null);

  if (!data) {
    const fetched = await fetchStoreFresh();
    if (fetched) data = fetched;
  }

  // 🔄 SIEMPRE refrescamos el cache cuando hay token (para capturar cambios recientes)
  const fresh = await fetchStoreFresh();
  if (fresh) data = fresh;

  if (!data) {
    notify.error(t('plans.errorLoadingPlans'));
    return;
  }

  // 6) Ahora sí, aplicar enforceFlowGate con datos actualizados
  // IMPORTANTE: Solo llamamos enforceFlowGate() cuando SÍ hay token
  try { 
    await enforceFlowGate({
      // Permitimos estar en /secciones/plans.html incluso si perfil u onboarding están incompletos
      allowProfile: ['/secciones/perfil.html', '/secciones/plans.html'],
      allowOnboarding: ['/secciones/info.html', '/secciones/perfil.html', '/secciones/plans.html']
    }); 
  } catch {}


  // 7) Extraer datos del usuario (payments.* + fallback legacy)
  const payments = data.payments || {};

  const billingSource = String(
    data.billing_source || payments.billing_source || "stripe"
  ).toLowerCase();

  const providerFromPayments =
    (billingSource === "shopify" ? payments.shopify : payments.stripe) || {};

  const providerLegacy =
    (billingSource === "shopify" ? data.shopify : data.stripe) || {};

  const provider = Object.keys(providerFromPayments).length
    ? providerFromPayments
    : providerLegacy;

  const isActive = !!(payments.active ?? data.active);

  const currentPlan = String(
    provider.plan || data.plan || "none"
  ).toLowerCase();

  const isPaid = isActive && currentPlan !== "free";
  
  console.log('🔍 [PLANS DEBUG] Datos extraídos:', {
    isActive,
    currentPlan,
    billingSource,
    provider,
    dataRoot: { plan: data.plan, active: data.active, free_block_until: data.free_block_until }
  });

  // En la estructura nueva, el trial-used está por proveedor
  // 🔄 FALLBACK: También revisar en la raíz del documento
  const usedFreeStarter = !!provider.free_trial_starter || !!data.used_free_trial_starter;

  // Trial (estructura nueva)
  // 🔄 FALLBACK: También revisar en la raíz
  const trialEndDate = toDate(provider.trial_end || data.trial_end);
  const inTrial = !!trialEndDate && trialEndDate.getTime() > Date.now();

  // ➊ Ajustar navbar según contexto del usuario
  const userContext = getUserContext(); // 'guest' | 'inactive' | 'active'
  
  // 🎯 Ocultar/mostrar elementos del navbar según el contexto
  const navbarLinks = document.getElementById('navbarLinks');
  const navbarRight = document.querySelector('.navbar-right');
  const joinFreeBtn = navbarRight?.querySelector('[data-i18n="navbar.joinFree"]');
  
  if (userContext === 'active') {
    // Usuario con plan activo: NO mostrar links centrales ni botón "Únete gratis"
    // (ya están ocultos por CSS, no hacemos nada)
    if (navbarLinks) {
      navbarLinks.style.display = 'none';
    }
    if (joinFreeBtn) {
      joinFreeBtn.style.display = 'none';
    }
  } else {
    // Usuario sin plan o sin sesión: mostrar navegación normal
    if (navbarLinks) {
      navbarLinks.style.display = 'flex';
      navbarLinks.classList.add('show'); // Trigger transición de opacidad
    }
    if (joinFreeBtn) {
      joinFreeBtn.classList.add('show'); // Trigger transición de opacidad
    }
  }
  
  if (logoutBtn) {
    logoutBtn.removeAttribute('onclick');
    logoutBtn.style.display = ''; // Asegurar que siempre sea visible
    
    switch (userContext) {
      case 'guest':
        // Usuario sin sesión
        logoutBtn.textContent = t('navbar.login');
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (!logoutBtn.classList.contains('disabled-link')) {
            window.location.href = '/secciones/login.html';
          }
        });
        break;
        
      case 'inactive':
        // Usuario registrado pero sin plan activo
        logoutBtn.textContent = t('navbar.backToHome');
        logoutBtn.addEventListener('click', () => {
          window.location.href = '/index.html';
        });
        break;
        
      case 'active':
        // Usuario con plan activo
        logoutBtn.textContent = t('navbar.backToProfile');
        logoutBtn.addEventListener('click', () => {
          window.location.href = '/secciones/perfil.html';
        });
        break;
    }
  }

  if (logo) {
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', (e) => {
      e.preventDefault(); // Prevenir navegación por defecto del href
      if (userContext === 'active') {
        window.location.href = '/secciones/inbox.html';
      } else {
        window.location.href = '/index.html';
      }
    });
  }

  // ➋ Bloqueo de plan Free (estructura NUEVA)
  const freeBlockDate = toDate(
    provider.free_block_until || payments.free_block_until || data.free_block_until
  );
  const freeBlocked = !!freeBlockDate && freeBlockDate.getTime() > Date.now();

  // 🆕 Mostrar las cards con transición suave después de determinar cuáles ocultar
  requestAnimationFrame(() => {
    // Ocultar el loader
    if (plansLoading) plansLoading.classList.add('hidden');
    
    // Quitar la clase preload-hidden y aplicar transiciones
    if (freeCard) {
      freeCard.classList.remove('preload-hidden');
      freeCard.style.transition = 'opacity 0.3s ease';
      freeCard.style.opacity = '1';
    }
    if (starterCard) {
      starterCard.classList.remove('preload-hidden');
      starterCard.style.transition = 'opacity 0.3s ease';
      starterCard.style.opacity = '1';
    }
    if (packCard) {
      packCard.classList.remove('preload-hidden');
      packCard.style.transition = 'opacity 0.3s ease';
      packCard.style.opacity = '1';
    }
  });

  // Pending (estructura NUEVA): payments.<provider>.pending
  let pendingPlan = null;
  let pendingConversations = null;
  let pendingEffectiveDate = null;

  const p = provider.pending;
  if (p) {
    const kind = String(p.kind || "").trim();

    pendingPlan = (kind === "downgrade_to_free_next_cycle") ? "free" : (p.plan ?? null);

    pendingConversations = (p.monthly_cap ?? null);
    pendingEffectiveDate = (p.effective_at ?? null);
  }

  const hasPendingChange = !!(pendingEffectiveDate && (pendingPlan || pendingConversations));

  // 📅 Fecha de fin del período de facturación actual (para downgrades)
  const currentConversations = data.limit || provider.monthly_cap || 50;
  const billingPeriodEnd = provider.current_period_end || provider.period_end || data.period_end || null;

  // ➌ Configurar botón Plan Free
  const freeBtn = document.getElementById('freeBtn');
  if (freeBtn) {
    freeBtn.disabled = false;
    freeBtn.removeAttribute('data-tooltip');
    freeBtn.removeAttribute('aria-disabled');
    freeBtn.textContent = '';
    // Si el cambio pendiente ES a Free, lo mostramos como "Cambio programado"
    if (pendingPlan === "free" && pendingEffectiveDate) {
      freeBtn.disabled = true;
      freeBtn.innerHTML = `
        ${t('plans.scheduledPlan')}
        <div class="cta-subtext">${t('plans.effectiveOn')} ${formatBillingDate(pendingEffectiveDate)}</div>
      `;
      
      // 📋 Agregar mensaje informativo en la tarjeta de Free
      const existingInfo = freeCard?.querySelector('.pending-change-info');
      if (freeCard && !existingInfo) {
        const pendingInfo = document.createElement('div');
        pendingInfo.className = 'pending-change-info';
        pendingInfo.innerHTML = `
          <p>📅 ${t('plans.scheduledChangeToFree')}</p>
          <small>${t('plans.effectiveOn')} ${formatBillingDate(pendingEffectiveDate)}</small>
        `;
        
        // Insertar después del card-header
        const cardHeader = freeCard.querySelector('.card-header');
        if (cardHeader) {
          cardHeader.insertAdjacentElement('afterend', pendingInfo);
        } else {
          // Fallback: insertar al inicio de la card
          freeCard.insertAdjacentElement('afterbegin', pendingInfo);
        }
      }
      
      // 🔴 Agregar botón "Cancelar cambio" en la tarjeta de Free
      let cancelBtn = freeCard?.querySelector('.cancel-change-btn');
      if (freeCard && !cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-change-btn';
        cancelBtn.textContent = t('plans.cancelChange');
        
        // Insertar después del botón principal
        freeBtn.insertAdjacentElement('afterend', cancelBtn);
        
        cancelBtn.addEventListener('click', async () => {
          cancelBtn.disabled = true;
          try {
            await fetchWithAuth('/billing/cancel-change-plan', { method: 'POST' });
            const text = encodeURIComponent(t('plans.planChangeCancelled'));
            window.location.href = `/secciones/perfil.html?msg=${text}`;
          } catch {
            notify.error(t('plans.errorCancellingChange'));
            cancelBtn.disabled = false;
          }
        });
      }
    } else if (hasPendingChange) {
      freeBtn.disabled = true;
      freeBtn.textContent = t('plans.pendingChange');
    } else if (isActive && currentPlan === "free") {
      // Ya tiene plan Free activo
      freeBtn.disabled = true;
      freeBtn.textContent = t('plans.currentPlan');
    } else if (isActive && currentPlan === "starter") {
      // Permitir downgrade de Starter → Free (solo si NO hay cambio pendiente a Free)
      if (pendingPlan !== "free") {
        // Permitir downgrade de Starter → Free
        freeBtn.textContent = t('plans.changeToFree');
        freeBtn.addEventListener('click', async () => {
          freeBtn.disabled = true;
          freeBtn.textContent = t('plans.processing');

          try {
            const res = await fetchWithAuth("/billing/change-plan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                plan: "free",
                monthly_cap: null
              })
            });

            if (res.ok) {
              const dateMsg = billingPeriodEnd ? ` ${t('plans.effectiveOnDate', { date: formatBillingDate(billingPeriodEnd) })}` : ` ${t('plans.effectiveEndOfCycle')}`;
              const text = encodeURIComponent(`${t('plans.changeToFreePlanScheduled')}${dateMsg}`);
              window.location.href = `/secciones/perfil.html?msg=${text}`;
              return;
            } else {
              throw new Error('Error en la respuesta');
            }
          } catch (error) {
            console.error(error);
            notify.error(t('plans.errorSchedulingPlanChange'));
            freeBtn.disabled = false;
            freeBtn.textContent = t('plans.changeToFree');
          }
        });
      }
    } else if (!isActive && freeBlocked) {
      // Usuario SIN plan activo pero con Free bloqueado (ya usó el free este ciclo)
      // OJO: no usamos disabled para que el tooltip funcione en hover
      freeBtn.textContent = "No disponible";
      freeBtn.disabled = true;
      freeBtn.setAttribute('aria-disabled', 'true');

      const whenTxt = freeBlockDate ? formatBillingDate(freeBlockDate) : "próximo ciclo";
      freeBtn.setAttribute(
        'data-tooltip',
        `No disponible porque ya has usado el plan gratis este mes. Disponible el ${whenTxt}.`
      );

      freeBtn.addEventListener('click', (e) => {
        e.preventDefault();
      });

    } else {
      // Usuario nuevo sin plan activo y NO bloqueado → puede activar Free
      freeBtn.textContent = t('plans.startFree');
      freeBtn.addEventListener('click', async () => {
        freeBtn.disabled = true;
        freeBtn.textContent = t('plans.processing');

        try {
          const res = await fetchWithAuth("/billing/select-free-plan", { method: "POST" });
          if (res.ok) {
            await fetchStoreFresh();
            window.location.href = "/secciones/perfil.html";
            return;
          }

          if (res.status === 403) {
            const msg = encodeURIComponent("Ya disfrutaste de un periodo free este mes.");
            window.location.href = `/index.html?msg=${msg}`;
            return;
          }
        } catch (error) {
          console.error(error);
          notify.error(t('plans.errorSelectingFreePlan'));
          freeBtn.disabled = false;
          freeBtn.textContent = t('plans.startFree');
        }
      });
    }
  }

  // ➎ Configurar botón Plan Starter y cambios de conversaciones
  const starterBtn = document.getElementById('starterBtn');
  
  console.log('🔍 [STARTER DEBUG] Condición:', {
    isActive,
    currentPlan,
    condition: isActive && currentPlan === "starter"
  });

  // Mostrar ayuda de cambios si está activo
  const planChangeHelp = document.querySelector('.plan-change-help');
  if (isActive && currentPlan === "starter" && planChangeHelp) {
    planChangeHelp.classList.remove('hidden');
    updatePopoverBillingDate(billingPeriodEnd);
    initPlanHelpPopover();
  }

  if (starterBtn && starterCard) {
    if (isActive && currentPlan === "starter") {
      // Usuario tiene plan Starter activo
      
      // Mostrar info de cambio pendiente si existe
      console.log('Cambio pendiente:', { pendingPlan, pendingConversations, pendingEffectiveDate });
      
      // 🔒 Solo mostrar cambio pendiente en Starter si NO es un downgrade a Free
      // (el downgrade a Free se muestra en la tarjeta de Free)
      const isDowngradeToFree = pendingPlan === "free";
      const hasPendingChangeInStarter = hasPendingChange && !isDowngradeToFree;
      
      if (hasPendingChangeInStarter) {
        // Deshabilitar selector de conversaciones
        const conversationsSelector = starterCard.querySelector('.conversations-selector');
        if (conversationsSelector) {
          conversationsSelector.classList.add('disabled');
        }
        
        // Actualizar precio con las conversaciones pendientes
        if (pendingConversations) {
          updateTotalPrice(true, pendingConversations);
        }
        
        const existingInfo = starterCard.querySelector('.pending-change-info');
        
        if (!existingInfo) {
          const pendingInfo = document.createElement('div');
          pendingInfo.className = 'pending-change-info';
          
          // Determinar el mensaje según qué está cambiando
          let changeMessage = '';
          if (pendingPlan && pendingConversations) {
            changeMessage = `📅 ${t('plans.scheduledChangeToPlan', { plan: pendingPlan, conversations: pendingConversations })}`;
          } else if (pendingPlan) {
            changeMessage = `📅 ${t('plans.scheduledChangeTo')} ${pendingPlan}`;
          } else if (pendingConversations) {
            changeMessage = `📅 ${t('plans.scheduledChangeToConversations', { conversations: pendingConversations })}`;
          }
          
          pendingInfo.innerHTML = `
            <p>${changeMessage}</p>
            <small>${t('plans.effectiveOn')} ${formatBillingDate(pendingEffectiveDate)}</small>
          `;
          
          // Insertar después del card-header
          const cardHeader = starterCard.querySelector('.card-header');
          
          if (cardHeader) {
            cardHeader.insertAdjacentElement('afterend', pendingInfo);
          } else {
            // Fallback: insertar al inicio de la card
            starterCard.insertAdjacentElement('afterbegin', pendingInfo);
          }
        }

        // Botón principal deshabilitado con info
        starterBtn.disabled = true;
        starterBtn.innerHTML = `
          ${t('plans.scheduledPlan')}
          <div class="cta-subtext">${t('plans.effectiveOn')} ${formatBillingDate(pendingEffectiveDate)}</div>
        `;

        // Botón cancelar - insertar después del botón principal
        let cancelBtn = starterCard.querySelector('.cancel-change-btn');
        console.log('Botón cancelar:', { cancelBtn: !!cancelBtn, starterBtn: !!starterBtn });
        
        if (!cancelBtn) {
          cancelBtn = document.createElement('button');
          cancelBtn.className = 'cancel-change-btn';
          cancelBtn.textContent = t('plans.cancelChange');
          
          // Insertar después del botón principal
          starterBtn.insertAdjacentElement('afterend', cancelBtn);
          
          console.log('✅ Botón cancelar creado e insertado');

          cancelBtn.addEventListener('click', async () => {
            cancelBtn.disabled = true;
            try {
              await fetchWithAuth('/billing/cancel-change-plan', { method: 'POST' });
              const text = encodeURIComponent(t('plans.planConversationsChangeCancelled'));
              window.location.href = `/secciones/perfil.html?msg=${text}`;
            } catch {
              notify.error(t('plans.errorCancellingChange'));
              cancelBtn.disabled = false;
            }
          });
        }
      } else {
        // No hay cambio pendiente en Starter (puede haber downgrade a Free pero eso se muestra en tarjeta Free)
        // Permitir cambiar conversaciones normalmente
        starterBtn.textContent = t('plans.currentPlan');
        starterBtn.disabled = true;

        // Actualizar botón cuando cambie el scroll
        const conversationsScroller = document.getElementById('conversationsScroller');
        if (conversationsScroller) {
          const updateButtonState = () => {
            if (selectedConversations !== currentConversations) {
              starterBtn.disabled = false;
              starterBtn.textContent = t('plans.scheduleChangeNextCycle');
              starterBtn.classList.add('secondary');
              starterBtn.classList.remove('primary');
            } else {
              starterBtn.disabled = true;
              starterBtn.textContent = t('plans.currentPlan');
              starterBtn.classList.remove('secondary');
              starterBtn.classList.add('primary');
            }
          };

          // Listener para detectar cambios
          let scrollTimeout;
          conversationsScroller.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(updateButtonState, 100);
          });

          // Configurar el valor inicial del scroller
          selectedConversations = currentConversations;
          const options = conversationsScroller.querySelectorAll('.conversation-option');
          
          // Remover todas las clases centered primero
          options.forEach(opt => opt.classList.remove('centered'));
          
          // Encontrar y centrar la opción actual
          const currentOption = Array.from(options).find(opt => parseInt(opt.dataset.value) === currentConversations);
          if (currentOption) {
            currentOption.scrollIntoView({ block: 'center', behavior: 'instant' });
            currentOption.classList.add('centered');
          }
          updateTotalPrice();
          updateButtonState(); // Actualizar estado inicial del botón

          // Evento click del botón
          starterBtn.addEventListener('click', async () => {
            if (selectedConversations === currentConversations) return;
            
            starterBtn.disabled = true;
            starterBtn.textContent = "Procesando...";

            try {
              const res = await fetchWithAuth("/billing/change-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  plan: "starter", // Mantener plan actual
                  monthly_cap: selectedConversations // Cambiar solo conversaciones
                })
              });

              if (res.ok) {
                const responseData = await res.json();
                // Si el backend devuelve URL, es un upgrade (ir a checkout)
                if (responseData.url) {
                  window.location.href = responseData.url;
                  return;
                }
                // Si no, es un cambio programado (downgrade)
                const dateMsg = billingPeriodEnd ? ` ${t('plans.effectiveOnDate', { date: formatBillingDate(billingPeriodEnd) })}` : '';
                const text = encodeURIComponent(`${t('plans.changeToConversationsScheduled', { conversations: selectedConversations })}${dateMsg}`);
                window.location.href = `/secciones/perfil.html?msg=${text}`;
              } else {
                throw new Error('Error en la respuesta');
              }
            } catch (error) {
              console.error(error);
              notify.error(t('plans.errorSchedulingChange'));
              starterBtn.disabled = false;
              starterBtn.textContent = t('plans.scheduleChangeNextCycle');
            }
          });
        }
      }
    } else {
      // Usuario NO tiene plan Starter o no está activo
      const hasUsedTrial = usedFreeStarter;
      
      // Deshabilitar si hay cambio pendiente
      if (hasPendingChange) {
        starterBtn.disabled = true;
        starterBtn.textContent = t('plans.pendingChange');
      } else {
        starterBtn.textContent = hasUsedTrial ? t('plans.hirePlan') : t('plans.freeTrial');

        starterBtn.addEventListener('click', async () => {
          starterBtn.disabled = true;
          starterBtn.textContent = t('plans.processing');

          try {
            const conversations = selectedConversations;

            const res = await fetchWithAuth("/billing/create-checkout-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                plan: "starter",
                monthly_cap: conversations
              })
            });

            // ✅ Lee el body siempre, pero no redirijas si no es OK
            let data = null;
            try { data = await res.json(); } catch (_) {}

            if (!res.ok) {
              const msg = (data && (data.detail || data.message)) || `Error creando la sesión (${res.status})`;
              notify.error(msg);
              starterBtn.disabled = false;
              starterBtn.textContent = hasUsedTrial ? t('plans.hirePlan') : t('plans.freeTrial');
              return;
            }

            if (!data?.url) {
              notify.error(t('plans.errorNoCheckoutUrl'));
              starterBtn.disabled = false;
              starterBtn.textContent = hasUsedTrial ? t('plans.hirePlan') : t('plans.freeTrial');
              return;
            }

            window.location.href = data.url;

          } catch (error) {
            console.error(error);
            notify.error(t('plans.errorProcessingPlan'));
            starterBtn.disabled = false;
            starterBtn.textContent = hasUsedTrial ? t('plans.hirePlan') : t('plans.freeTrial');
          }
        });
      }
    }
  }

  // ➏ Pack extra (solo si tiene Starter activo y NO está en trial)
  console.log('Pack debug:', { 
    isActive, 
    currentPlan, 
    trial_end: provider.trial_end, 
    inTrial, 
    packCardExists: !!document.getElementById("packCard")
  });

  const buyPackBtn = document.getElementById("buyPackBtn");

  if (isActive && currentPlan === "starter" && !inTrial && packCard && buyPackBtn) {
    packCard.classList.remove("hidden");
    buyPackBtn.addEventListener("click", async () => {
      buyPackBtn.disabled = true;
      buyPackBtn.textContent = "Procesando…";

        try {
          // Se le pasa al back el número de conversaciones contratadas en el pack
          
          const res = await fetchWithAuth("/billing/buy-pack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packConversations: selectedPackConversations })
          });
          const data = await res.json();
          window.location.href = data.url;
        } catch {
          const info = encodeURIComponent(t('plans.errorBuyingPack'));
          window.location.href = `/secciones/perfil.html?msg=${info}`;
          buyPackBtn.disabled = false;
          buyPackBtn.textContent = "Comprar pack";
        }
    });
  } else if (packCard) {
    packCard.classList.add("hidden");
  }

  // ➐ Calculadora de conversaciones (solo mostrar si NO tiene plan activo)
  const calculator = document.getElementById('conversationsCalculator');
  if (calculator && !isActive) {
    calculator.classList.remove('hidden');
    
    // Inicializar funcionalidad de la calculadora
    initConversationsCalculator();
  }

  // ➑ Inicializar tooltips mobile con backdrop
  console.log('🚀 [INIT] Inicializando tooltips mobile...');
  initMobileTooltips();
});

// ============ CALCULADORA DE CONVERSACIONES ============
function initConversationsCalculator() {
  const weeklyEmailsInput = document.getElementById('weeklyEmails');
  const monthlyEmailsEl = document.getElementById('monthlyEmails');
  const conversationsNeededEl = document.getElementById('conversationsNeeded');

  if (!weeklyEmailsInput || !monthlyEmailsEl || !conversationsNeededEl) {
    console.warn('Elementos de calculadora no encontrados');
    return;
  }

  function calculateConversations() {
    const weeklyEmails = parseInt(weeklyEmailsInput.value) || 0;
    
    // Calcular correos mensuales (4 semanas aproximadamente)
    const monthlyEmails = weeklyEmails * 4;
    
    // Calcular conversaciones necesarias (1 conversación = 3 correos)
    const conversationsNeeded = Math.ceil(monthlyEmails / 3);
    
    // Actualizar UI
    monthlyEmailsEl.textContent = `~${monthlyEmails}`;
    conversationsNeededEl.textContent = `~${conversationsNeeded}`;
  }

  // Calcular inicialmente
  calculateConversations();

  // Recalcular cuando cambie el input
  weeklyEmailsInput.addEventListener('input', calculateConversations);
}
