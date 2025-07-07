// plans.js
import { fetchWithAuth, logout, API_BASE } from '/js/utils/api.js';

document.addEventListener("DOMContentLoaded", async () => {
    const user = window.appUserPromise;
    if (!user) return;

    const token = localStorage.getItem("token");
    const loadingEl = document.getElementById("plans-loading");
    const gridEl    = document.getElementById("pricing-grid");

    const plan = user.plan; // null, "free", "starter", "advanced"

    // ocultamos todas las cards y el grid hasta decidir
    loadingEl.classList.remove("hidden");
    
    // 5) Configurar botones
    const planButtons = {
        freeBtn:    "free",
        starterBtn: "starter",
        advancedBtn:"advanced"
    };
    Object.entries(planButtons).forEach(([btnId, planKey]) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        if (planKey === plan) {
            btn.disabled    = true;
            btn.textContent = "Plan actual";
        } else {
            btn.textContent = plan
                ? "Cambiar a este plan"
                : planKey === "free"
                ? "Comienza Gratis!"
                : "Empieza tu prueba gratuita";

            btn.addEventListener("click", async () => {
                btn.disabled    = true;
                btn.textContent = "Redirigiendo…";
                const url = planKey === "free"
                ? "/index.html"  // free → perfil directamente
                : null;

                if (planKey === "free") {
                    try{
                        await fetchWithAuth("/billing/select-free-plan", {method: "POST"});
                        window.location.href = "/secciones/inbox.html"
                    }catch{
                        alert("Error al activar el plan Free");
                    }
                } else {
                    try{
                        const res = await fetchWithAuth("/billing/create-checkout-session", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ plan: key })
                        });
                        const {url} = await res.json();
                        window.location.href = url;
                    }catch{
                        alert("Error al iniciar checkout");
                        btn.disabled = false;
                        btn.textContent = 'Empieza tu prueba gratuita';
                    }
                }
            });
        }
    });
    // 6) Pack extra (solo si ya tiene plan distinto de free)
    if (plan && plan !== "free") {
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
                const {url} = await res.json();
                window.location,href = url;
            }catch{
                alert("No se pudo comprar el pack");
                buyPackBtn.disabled = false;
                buyPackBtn.textContent = "Comprar pack";
            }
        });
    }
    // 7) Mostrar grid y ocultar spinner
    loadingEl.classList.add("hidden");
    gridEl.classList.remove("hidden");
});

