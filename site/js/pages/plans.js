// plans.js
import { fetchWithAuth, logout, API_BASE, getToken} from '/js/utils/api.js';
import { enforceProfileGate } from '/js/utils/profile-gate.js';
import { enforceSessionGate } from '/js/utils/session-gate.js';
import { notify } from '/js/utils/notify.js';



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

function disableAnchorAsButton(el) {
  // aria + UX
  el.setAttribute('aria-disabled', 'true');
  el.setAttribute('tabindex', '-1');
  // sin interacción
  el.style.pointerEvents = 'none';
  el.removeAttribute('href');
  el.classList.add('is-disabled');
}

function setScheduledLabel(el, effectiveDate) {
  el.textContent = 'Cambio programado';
  const sub = document.createElement('div');
  sub.className = 'cta-subtext';
  sub.textContent = formatBillingDate(effectiveDate); // (07-jul-2025)
  el.appendChild(sub);
}

function toDate(dateLike){
  if (!dateLike) return null;
  if (typeof dateLike === 'number') {
    const ms = dateLike < 1e12 ? dateLike * 1000 : dateLike; // epoch s/ms
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }
  const d = new Date(dateLike);
  return isNaN(d) ? null : d;
}

function formatBillingDate(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d)) return '';
  const DD = String(d.getDate()).padStart(2, '0');
  const MMM = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()];
  const YYYY = d.getFullYear();
  return `(${DD}-${MMM}-${YYYY})`;
}

// Pone la fecha en todos los nodos con [data-billing-date]
function updatePopoverBillingDate(dateLike) {
  const els = document.querySelectorAll('[data-billing-date]');
  if (!els.length) return;
  const txt = formatBillingDate(dateLike);
  els.forEach(el => el.textContent = txt);
}

function initPlanHelpPopover() {
  const btn   = document.getElementById('planHelpBtn');
  const pop   = document.getElementById('planHelpPopover');

  if (!btn || !pop) return;

  // Accesibilidad básica
  btn.setAttribute('aria-controls', 'planHelpPopover');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  pop.hidden = true;

  const open = () => {
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    // foco al primer elemento interactivo si existe
    (pop.querySelector('[data-autofocus]') || pop).focus?.();
  };

  const closePop = () => {
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  // Toggle por click en el botón
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    pop.hidden ? open() : closePop();
  });

  // Cierre por click fuera
  document.addEventListener('click', (e) => {
    if (pop.hidden) return;
    const clickInside = pop.contains(e.target) || btn.contains(e.target);
    if (!clickInside) closePop();
  });

  // Cierre con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePop();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // 0) Primero: deja que config.js termine (token/appUser/cache)
  if (window.configReady) {
    try { await window.configReady; } catch (_) {}
  }

  // 1) Asegura token con un pequeño helper (tolerante, 10s de margen)
  const waitToken = async (timeoutMs = 10000) => {
    if (getToken()) return true;
    const start = Date.now();

    return await new Promise(resolve => {
      const onReady = () => { cleanup(); resolve(true); };
      const iv = setInterval(() => {
        if (getToken()) { cleanup(); resolve(true); }
        else if (Date.now() - start > timeoutMs) { cleanup(); resolve(false); }
      }, 250);

      const cleanup = () => {
        clearInterval(iv);
        window.removeEventListener('auth-token-ready', onReady);
      };

      window.addEventListener('auth-token-ready', onReady, { once: true });
    });
  };

  const hasToken = await waitToken();
  if (!hasToken) { window.location.replace("/index.html"); return; }

  // 2) Ahora sí, gates (en plans el profile gate no bloquea, pero no molesta)
  try { enforceSessionGate?.(); } catch {}
  try { await enforceProfileGate(); } catch {}

  // 3) Si existe, espera a appUserPromise (creada en config.js)
  if (window.appUserPromise) {
    try { await window.appUserPromise; } catch(_) {}
  }
    // Coge datos del usuario (del store cacheado o de window.appUser)
    let cached = localStorage.getItem("store");
    let data   = cached ? JSON.parse(cached) : (window.appUser || null);

    // Si no hay nada en caché, intentamos traerlo del backend
    if (!data) {
        const fetched = await fetchStoreFresh();
        if (fetched) data = fetched;
    }
    if (!data) { 
        notify.error("No pudimos cargar tus planes");
        return; 
    }
    const isActive  = data.active;   // true / false

    // 🔄 Si la tienda está activa, refrescamos SIEMPRE al entrar en planes
    if (isActive) {
        const fresh = await fetchStoreFresh();
        if (fresh) data = fresh; // si falla el fetch, seguimos con cacheado
    }

    const currentPlan = data.plan; // null, "free", "starter", "advanced", "professional"

    const usedFreeStarter     = data.used_free_trial_starter;
    const usedFreeAdvanced    = data.used_free_trial_advanced;
    const usedFreeProfessional= data.used_free_trial_professional;

    // ➊ — Ajustar botón de la derecha (“Cerrar sesión” → “Volver al perfil” o ocultar)
    const logoutLink = document.getElementById('logoutBtn');
    if (logoutLink) {
    logoutLink.removeAttribute('onclick');
    if (isActive) {
        logoutLink.textContent = 'Volver al perfil';
        logoutLink.addEventListener('click', () => { window.location.href = '/secciones/perfil.html'; });
    } else {
        logoutLink.textContent = 'Volver al inicio';
        logoutLink.addEventListener('click', () => { window.location.href = '/index.html'; });
    }
    }
    
    // ➋ — Hacer clic en el logo (“Respondize”) condicional
    const logo = document.querySelector('.logo-text');
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
  
    const loadingEl = document.getElementById("plans-loading");
    const gridEl    = document.getElementById("pricing-grid");
    const pricingEl = document.getElementById('pricing');

    const pendingPlan             = data.pendingPlan;            // puede ser undefined o "free"/"starter"/"advanced", "professional"
    const pendingPlanEffective    = data.pendingPlanEffective || data.period_end;
    const helpWrap = document.querySelector('.plan-change-help');


    if (isActive) {
        updatePopoverBillingDate(pendingPlanEffective);
        const cardToHide = document.querySelector(`.pricing-card.${currentPlan}`);
        if (cardToHide) cardToHide.classList.add('hidden');
    }
    
    
    // ocultamos todas las cards y el grid hasta decidir
    loadingEl.classList.remove("hidden");
    const freeBlockUntil = data.free_block_until;     // puede ser "", ISO o epoch
    const freeBlockDate  = toDate(freeBlockUntil);
    const freeBlocked    = !!freeBlockDate && freeBlockDate.getTime() > Date.now();

    // Si está bloqueado, ocultamos la card del plan Free
    if (freeBlocked) {
        const freeCard = document.querySelector('.pricing-card.free');
        if (freeCard) freeCard.classList.add('hidden');
    }
    // 5) Configurar botones
    const planButtons = {
        ...(freeBlocked ? {} : { freeBtn: "free" }),
        starterBtn: "starter",
        advancedBtn:"advanced",
        professionalBtn: "professional",
    };
    Object.entries(planButtons).forEach(([btnId, planKey]) => {
        console.log(planKey, currentPlan, pendingPlan);
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (isActive) {
            if (planKey === currentPlan) {
                btn.disabled    = true;
                btn.textContent = "Plan actual";
            } else if (pendingPlan === planKey) {
                btn.disabled = true; // inofensivo en <a>, pero mantenemos por consistencia
                setScheduledLabel(btn, pendingPlanEffective);
                disableAnchorAsButton(btn);

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancelar cambio';
                cancelBtn.className = 'cancel-change-btn';

                const card = btn.closest('.pricing-card');
                const buttonsHolder = card?.querySelector('.buttons-container') || btn.parentNode;
                buttonsHolder.appendChild(cancelBtn);

                cancelBtn.addEventListener('click', async () => {
                    cancelBtn.disabled = true;
                    try {
                    await fetchWithAuth('/billing/cancel-change-plan', { method: 'POST' });
                    // le mandamos al perfil
                    const text = encodeURIComponent('Cambio de plan cancelado');
                    window.location.href = `/secciones/perfil.html?msg=${text}`;

                    } catch {
                    notify.error('No se pudo cancelar el cambio');
                    cancelBtn.disabled = false;
                    }
                });
            } else {
                btn.disabled = false;
                btn.textContent = "Cambiar a este plan";
            }
        } else {
            let label;
            // → Usuario inactivo: lo mandamos a elegir un plan
            if (planKey === "free") {
                label = "Comienza Gratis!";
            } else {
                // ¿Ya usó el trial de este plan?
                const usedTrial = ({
                    starter:     usedFreeStarter,
                    advanced:    usedFreeAdvanced,
                    professional:usedFreeProfessional
                })[planKey];

                if (!usedTrial) {
                    label = "Empieza tu prueba gratuita";
                } else {
                    // ya gastó trial → sale “Contratar <Plan>”
                    const names = { starter: "Starter", advanced: "Avanzado", professional: "Profesional" };
                    label = `Contratar ${names[planKey]}`;
                }
            }
            
            btn.textContent = label;
            btn.disabled = false;
        }
        const isScheduled = isActive && pendingPlan === planKey;
        if (!isScheduled) {
            btn.addEventListener("click", async () => {
                btn.disabled    = true;
                btn.textContent = "Procesando...";
                
                try {
                    let res, data;

                    // 1) Usuario nuevo (isActive == null)
                    if (!isActive) {
                        if (planKey === "free") {
                            try{
                                const res =await fetchWithAuth("/billing/select-free-plan", { method: "POST" });
                                if (res.ok) {                       // ✅ Free plan creado
                                    window.location.href = "/secciones/perfil.html";
                                    return;
                                }
                        
                                if (res.status === 403) {           // ⛔ Ya tenía un ciclo Free activo
                                    const msg = encodeURIComponent("Ya disfrutaste de un periodo free este mes.");
                                    window.location.href = `/index.html?msg=${msg}`;
                                    return;
                                }
                            } catch (error) {
                                console.error(error);
                                notify.error("Error al seleccionar el plan gratuito");
                                btn.disabled    = false;
                                btn.textContent = "Comienza Gratis!";
                                return;
                            }
                        } else {
                            // Checkout inmediato para plan de pago
                            res = await fetchWithAuth("/billing/create-checkout-session", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ plan: planKey })
                            });
                            data = await res.json();
                            window.location.href = data.url;
                            return;
                        }
                    }
                    // 2) Upgrade de Free -> Paid (inmediato)
                    if (currentPlan === "free" && planKey !== "free") {
                        res = await fetchWithAuth("/billing/create-checkout-session", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ plan: planKey })
                        });
                        data = await res.json();
                        window.location.href = data.url;
                        return;
                    }
                    // 3) De Paid -> Paid o Paid -> Free (programado al fin de ciclo)
                    res = await fetchWithAuth("/billing/change-plan", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ plan: planKey })
                    });
                    data = await res.json();
                    
                    // Si el backend devuelve una URL, es un UPGRADE (toca pasar por Stripe Checkout)
                    if (data.url) {
                    window.location.href = data.url;
                    return;
                    }

                    const info = encodeURIComponent(`Cambio al plan ${planKey} programado con éxito`);
                    window.location.href = `/secciones/perfil.html?msg=${info}`;


                } catch (error) {
                    console.error(error);
                    const info = encodeURIComponent(`❌ Error al cambiar el plan`);
                    window.location.href = `/secciones/perfil.html?msg=${info}`;
                    btn.disabled    = false;
                    // Restauramos el texto original tras el fallo
                    if (!isActive) {
                        btn.textContent = planKey === "free"
                            ? "Comienza Gratis!"
                            : "Empieza tu prueba gratuita";
                    } else {
                        btn.textContent = "Cambiar a este plan";
                    }
                }
            });
        }
    });
    // 6) Pack extra (solo si ya tiene plan distinto de free)
    const trialEndDate = toDate(data.trial_end);
    const inTrial = !!trialEndDate && trialEndDate.getTime() > Date.now();
    if (isActive && currentPlan !== "free" && !inTrial) {
        const packCard   = document.getElementById("packCard");
        const buyPackBtn = document.getElementById("buyPackBtn");
        packCard.classList.remove("hidden");
        buyPackBtn.addEventListener("click", async () => {
            buyPackBtn.disabled = true;
            buyPackBtn.textContent = "Procesando…";
            try{
                const res = await fetchWithAuth("/billing/buy-pack", {
                    method: "POST",
                    headers: {"Content-Type":  "application/json"},
                    body: JSON.stringify({ packs: 1 })
                });
                const data = await res.json();
                window.location.href = data.url;
            }catch{
                const info = encodeURIComponent(`❌ Error al comprar el pack`);
                window.location.href = `/secciones/perfil.html?msg=${info}`;
                buyPackBtn.disabled = false;
                buyPackBtn.textContent = "Comprar pack";
            }
        });
    } else {
        // En trial o no cumple condiciones → ocultar por completo
        const packCard = document.getElementById("packCard");
        if (packCard) packCard.classList.add("hidden");
    }
    initPlanHelpPopover();
    // 7) Mostrar grid y ocultar spinner
    loadingEl.classList.add("hidden");
    gridEl.classList.remove("hidden");
    if (helpWrap) helpWrap.classList.toggle('hidden', !isActive);
});

