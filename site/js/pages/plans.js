// plans.js
import { fetchWithAuth, logout, API_BASE, getToken} from '/js/utils/api.js';

// justo después de imports, antes de DOMContentLoaded:
let notification;
function initNotification() {
    notification = document.getElementById('notification') || document.createElement('div');
    notification.id = 'notification';
    Object.assign(notification.style, {
        position: 'fixed', bottom: '20px', right: '20px',
        background: '#333', color: '#fff',
        padding: '10px 20px', borderRadius: '5px',
        display: 'none', zIndex: '1000'
    });
    document.body.appendChild(notification);
}
function showNotification(msg, type = 'success', duration = 2000) {
    if (!notification) initNotification();
    notification.textContent = msg;
    notification.style.background = type === 'error' ? '#b91c1c' : '#333';
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', duration);
}



initNotification();
document.addEventListener("DOMContentLoaded", async () => {
    // Espera a que config acabe su setup
    if (window.configReady) {
        try { await window.configReady; } catch(_) {}
    }

    // Si no hay token, espera breve al evento del login
    let tk = getToken();
    if (!tk) {
        await new Promise(resolve => {
            const to = setTimeout(resolve, 3000); // hasta 3s
            const onReady = () => { clearTimeout(to); resolve(); };
            window.addEventListener("auth-token-ready", onReady, { once: true });
        });
        tk = getToken();
    }
    if (!tk) { window.location.replace("/index.html"); return; }

    // Ya con token, espera a appUser
    if (window.appUserPromise) {
        try { await window.appUserPromise; } catch(_) {}
    }

    // Coge datos del usuario (del store cacheado o de window.appUser)
    const store = localStorage.getItem("store");
    const data  = store ? JSON.parse(store) : (window.appUser || null);
    if (!data) { 
    showNotification("No pudimos cargar tus planes", "error", 4000); 
    return; 
    }

    const isActive  = data.active;   // true / false
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
            window.location.href = '/secciones/inbox.html';
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
    console.log("acive:", isActive)
    if (isActive && currentPlan !== 'free') {
        const notice = document.createElement('div');
        notice.className = 'plan-notice';
        notice.textContent = `⚠️ Los cambios de plan se harán efectivos al final del ciclo de facturación, el ${new Date(pendingPlanEffective).toLocaleDateString()} ⚠️`;
        // Inserta antes del grid
        if (pricingEl) pricingEl.prepend(notice);
    }
    if (isActive) {
        const cardToHide = document.querySelector(`.pricing-card.${currentPlan}`);
        if (cardToHide) cardToHide.classList.add('hidden');
    }
    
    
    // ocultamos todas las cards y el grid hasta decidir
    loadingEl.classList.remove("hidden");
    
    // 5) Configurar botones
    const planButtons = {
        freeBtn:    "free",
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
                btn.disabled    = true;
                const date = new Date(pendingPlanEffective);
                btn.textContent = `Cambio programado`;

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
                    showNotification('No se pudo cancelar el cambio', 'error');
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
                                window.location.href = "/secciones/inbox.html";
                                return;
                            }
                    
                            if (res.status === 403) {           // ⛔ Ya tenía un ciclo Free activo
                                const msg = encodeURIComponent("Ya disfrutaste de un periodo free este mes.");
                                window.location.href = `/index.html?msg=${msg}`;
                                return;
                            }
                        } catch (error) {
                            console.error(error);
                            showNotification("Error al seleccionar el plan gratuito", "error");
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
    });
    // 6) Pack extra (solo si ya tiene plan distinto de free)
    if (isActive && currentPlan !== "free") {
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
    }
    // 7) Mostrar grid y ocultar spinner
    loadingEl.classList.add("hidden");
    gridEl.classList.remove("hidden");
});

