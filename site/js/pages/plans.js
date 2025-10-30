// plans.js
import { fetchWithAuth, getToken, API_BASE } from '/js/utils/api.js';
import { enforceFlowGate } from '/js/utils/flow-gate.js';
import { notify } from '/js/utils/notify.js';

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
  
  if (freeBtn) {
    freeBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = '/secciones/register.html';
    };
  }
  
  if (starterBtn) {
    starterBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = '/secciones/register.html';
    };
  }
}
// Funciones auxiliares para fechas
function toDate(dateLike) {
  if (!dateLike) return null;

  // ➜ Soporta Mongo Extended JSON: { $date: "2025-11-24T20:21:57.000Z" }
  if (typeof dateLike === 'object' && dateLike.$date) {
    return toDate(dateLike.$date);
  }

  if (typeof dateLike === 'number') {
    const ms = dateLike < 1e12 ? dateLike * 1000 : dateLike; // epoch s/ms
    const d = new Date(ms);
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
  const btn = document.getElementById('planHelpBtn');
  const pop = document.getElementById('planHelpPopover');

  if (!btn || !pop) return;

  btn.setAttribute('aria-controls', 'planHelpPopover');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  pop.hidden = true;

  const open = () => {
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    pop.focus?.();
  };

  const closePop = () => {
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    pop.hidden ? open() : closePop();
  });

  document.addEventListener('click', (e) => {
    if (pop.hidden) return;
    if (!pop.contains(e.target) && !btn.contains(e.target)) {
      closePop();
    }
  });
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
let selectedConversations = 50;
let selectedPackConversations = 50; // Para el selector de packs

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
    totalPriceLabelEl.textContent = isPendingChange ? 'Total mensual previsto:' : 'Total mensual:';
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
    packPricePerConvEl.textContent = `${pricePerConversation.toFixed(2)}€ por conversación`;
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
    
    // Calcular inicial
    updateCenteredOption('conversationsScroller', false);
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
      logoutBtn.textContent = 'Iniciar sesión';
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/secciones/login.html';
      });
    }

    if (logo) {
      logo.style.cursor = 'pointer';
      logo.addEventListener('click', () => {
        window.location.href = '/index.html';
      });
    }

    // Configurar botones para usuarios sin sesión - Redirigir a registro
    const freeBtn = document.getElementById('freeBtn');
    const starterBtn = document.getElementById('starterBtn');

    if (freeBtn) {
      freeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/secciones/register.html';
      });
    }

    if (starterBtn) {
      starterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/secciones/register.html';
      });
    }
    
    return; // Salimos aquí si no hay token - NO llamamos enforceFlowGate()
  }

  // 5) Si HAY token, continuamos con la lógica normal
  // IMPORTANTE: Solo llamamos enforceFlowGate() cuando SÍ hay token
  try { 
    await enforceFlowGate({
      // Permitimos estar en /secciones/plans.html incluso si perfil u onboarding están incompletos
      allowProfile: ['/secciones/perfil.html', '/secciones/plans.html'],
      allowOnboarding: ['/secciones/info.html', '/secciones/perfil.html', '/secciones/plans.html']
    }); 
  } catch {}

  // 6) Cargar datos del usuario
  if (window.appUserPromise) {
    try { await window.appUserPromise; } catch(_) {}
  }

  let cached = localStorage.getItem("store");
  let data = cached ? JSON.parse(cached) : (window.appUser || null);

  if (!data) {
    const fetched = await fetchStoreFresh();
    if (fetched) data = fetched;
  }

  if (!data) {
    notify.error("No pudimos cargar tus planes");
    return;
  }

  const isActive = data.active;
  const currentPlan = data.plan; // "free" | "starter" | …
  const usedFreeStarter = data.used_free_trial_starter;

  // Datos de trial (usados en varios lugares)
  const trialEndDate = toDate(data.trial_end);
  const inTrial = !!trialEndDate && trialEndDate.getTime() > Date.now();

  // 🔄 Si la tienda está activa, refrescamos
  if (isActive) {
    const fresh = await fetchStoreFresh();
    if (fresh) data = fresh;
  }

  // ➊ Ajustar navbar
  if (logoutBtn) {
    logoutBtn.removeAttribute('onclick');
    if (isActive) {
      logoutBtn.textContent = 'Volver al perfil';
      logoutBtn.addEventListener('click', () => {
        window.location.href = '/secciones/perfil.html';
      });
    } else {
      logoutBtn.textContent = 'Volver al inicio';
      logoutBtn.addEventListener('click', () => {
        window.location.href = '/index.html';
      });
    }
  }

  if (logo) {
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', () => {
      if (isActive) {
        window.location.href = '/secciones/perfil.html';
      } else {
        window.location.href = '/index.html';
      }
    });
  }

  // ➋ Bloqueo de plan Free
  const freeBlockUntil = data.free_block_until;
  const freeBlockDate = toDate(freeBlockUntil);
  const freeBlocked = !!freeBlockDate && freeBlockDate.getTime() > Date.now();

  // Selecciona la tarjeta Free por id o por el atributo data-plan (por si falta la clase 'free')
  // (freeCard ya declarado al inicio del scope)
  
  // Ocultar Free si está bloqueado O si tiene plan de pago y no está en trial
  const shouldHideFree = freeBlocked || (isActive && currentPlan === "starter" && !inTrial);
  
  if (shouldHideFree && freeCard) {
    freeCard.classList.add('hidden');
  }

  // 🆕 Mostrar las cards con transición suave después de determinar cuáles ocultar
  requestAnimationFrame(() => {
    // Ocultar el loader
    if (plansLoading) plansLoading.classList.add('hidden');
    
    // Quitar la clase preload-hidden y aplicar transiciones
    if (freeCard) {
      freeCard.classList.remove('preload-hidden');
      freeCard.style.transition = 'opacity 0.3s ease';
    }
    if (starterCard) {
      starterCard.classList.remove('preload-hidden');
      starterCard.style.transition = 'opacity 0.3s ease';
    }
    if (packCard) {
      packCard.classList.remove('preload-hidden');
      packCard.style.transition = 'opacity 0.3s ease';
    }
    
    // Mostrar cards apropiadas
    if (freeCard && !shouldHideFree) freeCard.style.opacity = '1';
    if (starterCard) starterCard.style.opacity = '1';
    if (packCard) packCard.style.opacity = '1';
  });

  // Datos de cambio pendiente - el backend los devuelve directamente en data
  const pendingPlan = data.pending_plan_change;
  const pendingEffectiveDate = data.pending_change_effective;
  
  // Verificar si hay cambio pendiente (usado globalmente)
  const hasPendingChange = (pendingPlan || data.pending_monthly_cap_change) && pendingEffectiveDate;

  // ➌ Configurar botón Plan Free
  const freeBtn = document.getElementById('freeBtn');
  if (freeBtn && !shouldHideFree) {
    // Deshabilitar si hay cambio pendiente
    if (hasPendingChange) {
      freeBtn.disabled = true;
      freeBtn.textContent = "Cambio pendiente en otro plan";
    } else if (isActive && currentPlan === "free") {
      // Ya tiene plan Free activo
      freeBtn.disabled = true;
      freeBtn.textContent = "Plan actual";
    } else if (isActive && currentPlan === "starter") {
      // Verificar si hay cambio pendiente a Free
      if (pendingPlan === "free" && pendingEffectiveDate && !hasPendingChange) {
        // Mostrar que el cambio está programado
        freeBtn.disabled = true;
        freeBtn.textContent = "Cambio programado";
        const subtext = document.createElement('div');
        subtext.className = 'cta-subtext';
        subtext.textContent = formatBillingDate(pendingEffectiveDate);
        freeBtn.appendChild(subtext);
      } else {
        // Permitir downgrade de Starter → Free
        freeBtn.textContent = "Cambiar a Free";
        freeBtn.addEventListener('click', async () => {
          if (!confirm("¿Cambiar a plan Free? El cambio se aplicará al finalizar tu período de facturación actual.")) {
            return;
          }

          freeBtn.disabled = true;
          freeBtn.textContent = "Procesando...";

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
              const text = encodeURIComponent("Cambio a plan Free programado para fin de ciclo");
              window.location.href = `/secciones/perfil.html?msg=${text}`;
              return;
            } else {
              throw new Error('Error en la respuesta');
            }
          } catch (error) {
            console.error(error);
            notify.error("Error al programar el cambio de plan");
            freeBtn.disabled = false;
            freeBtn.textContent = "Cambiar a Free";
          }
        });
      }
    } else {
      // Usuario nuevo sin plan activo
      freeBtn.textContent = "Comenzar gratis";
      freeBtn.addEventListener('click', async () => {
        freeBtn.disabled = true;
        freeBtn.textContent = "Procesando...";

        try {
          const res = await fetchWithAuth("/billing/select-free-plan", { method: "POST" });
          if (res.ok) {
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
          notify.error("Error al seleccionar el plan gratuito");
          freeBtn.disabled = false;
          freeBtn.textContent = "Comenzar gratis";
        }
      });
    }
  }

  // ➎ Configurar botón Plan Starter y cambios de conversaciones
  const starterBtn = document.getElementById('starterBtn');
  
  // Datos adicionales para el cambio de conversaciones - el backend los devuelve directamente
  const pendingConversations = data.pending_monthly_cap_change;
  const currentConversations = data.limit || 50; // El backend devuelve 'limit' con el valor actual
  const billingPeriodEnd = data.period_end;

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
      
      if (hasPendingChange) {
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
            changeMessage = `📅 Cambio programado a plan ${pendingPlan} con ${pendingConversations} conversaciones`;
          } else if (pendingPlan) {
            changeMessage = `📅 Cambio programado a plan ${pendingPlan}`;
          } else if (pendingConversations) {
            changeMessage = `📅 Cambio programado a ${pendingConversations} conversaciones`;
          }
          
          pendingInfo.innerHTML = `
            <p>${changeMessage}</p>
            <small>Efectivo el ${formatBillingDate(pendingEffectiveDate)}</small>
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
        starterBtn.textContent = "Cambio programado";
        const subtext = document.createElement('div');
        subtext.className = 'cta-subtext';
        subtext.textContent = formatBillingDate(pendingEffectiveDate);
        starterBtn.appendChild(subtext);

        // Botón cancelar - insertar después del botón principal
        let cancelBtn = starterCard.querySelector('.cancel-change-btn');
        console.log('Botón cancelar:', { cancelBtn: !!cancelBtn, starterBtn: !!starterBtn });
        
        if (!cancelBtn) {
          cancelBtn = document.createElement('button');
          cancelBtn.className = 'cancel-change-btn';
          cancelBtn.textContent = 'Cancelar cambio';
          
          // Insertar después del botón principal
          starterBtn.insertAdjacentElement('afterend', cancelBtn);
          
          console.log('✅ Botón cancelar creado e insertado');

          cancelBtn.addEventListener('click', async () => {
            cancelBtn.disabled = true;
            try {
              await fetchWithAuth('/billing/cancel-change-plan', { method: 'POST' });
              const text = encodeURIComponent('Cambio de plan/conversaciones cancelado');
              window.location.href = `/secciones/perfil.html?msg=${text}`;
            } catch {
              notify.error('No se pudo cancelar el cambio');
              cancelBtn.disabled = false;
            }
          });
        }
      } else {
        // No hay cambio pendiente, detectar si cambia las conversaciones
        starterBtn.textContent = "Plan actual";
        starterBtn.disabled = true;

        // Actualizar botón cuando cambie el scroll
        const conversationsScroller = document.getElementById('conversationsScroller');
        if (conversationsScroller) {
          const updateButtonState = () => {
            if (selectedConversations !== currentConversations) {
              starterBtn.disabled = false;
              starterBtn.textContent = "Programar cambio para próximo ciclo";
              starterBtn.classList.add('secondary');
              starterBtn.classList.remove('primary');
            } else {
              starterBtn.disabled = true;
              starterBtn.textContent = "Plan actual";
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
                // Si no, es un cambio programado
                const text = encodeURIComponent(`Cambio a ${selectedConversations} conversaciones programado`);
                window.location.href = `/secciones/perfil.html?msg=${text}`;
              } else {
                throw new Error('Error en la respuesta');
              }
            } catch (error) {
              console.error(error);
              notify.error("Error al programar el cambio");
              starterBtn.disabled = false;
              starterBtn.textContent = "Programar cambio para próximo ciclo";
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
        starterBtn.textContent = "Cambio pendiente en otro plan";
      } else {
        starterBtn.textContent = hasUsedTrial ? "Contratar plan" : "Prueba gratuita";

        starterBtn.addEventListener('click', async () => {
          starterBtn.disabled = true;
          starterBtn.textContent = "Procesando...";

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

            const data = await res.json();
            window.location.href = data.url;

          } catch (error) {
            console.error(error);
            notify.error("Error al procesar el plan");
            starterBtn.disabled = false;
            starterBtn.textContent = hasUsedTrial ? "Contratar plan" : "Prueba gratuita";
          }
        });
      }
    }
  }

  // ➏ Pack extra (solo si tiene Starter activo y NO está en trial)
  console.log('Pack debug:', { 
    isActive, 
    currentPlan, 
    trial_end: data.trial_end, 
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
          const info = encodeURIComponent(`❌ Error al comprar el pack`);
          window.location.href = `/secciones/perfil.html?msg=${info}`;
          buyPackBtn.disabled = false;
          buyPackBtn.textContent = "Comprar pack";
        }
    });
  } else if (packCard) {
    packCard.classList.add("hidden");
  }
});
