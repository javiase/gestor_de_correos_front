// plans.js

document.addEventListener('DOMContentLoaded', async () => {
    const loadingEl = document.getElementById('plans-loading');
    const gridEl    = document.getElementById('pricing-grid');
    // 1) Recuperar token y tienda_id (desde querystring o localStorage)
    const params    = new URLSearchParams(window.location.search);
    const tokenQS   = params.get('token');
    const tiendaQS  = params.get('tienda_id');
    const token     = tokenQS || localStorage.getItem('token');
    const tiendaId  = tiendaQS || localStorage.getItem('tienda_id');
  
    // 2) Si no hay token, vamos al login
    if (!token || !tiendaId) {
      window.location.href = '/index.html';
      return;
    }
  
    // 3) Guardar en localStorage para futuras recargas
    if (tokenQS)  localStorage.setItem('token', token);
    if (tiendaQS) localStorage.setItem('tienda_id', tiendaId);
    
    // 2) Pedir al backend el store con su plan
    let store;
    try {
        const resp = await fetch(`https://sincere-musical-squid.ngrok-free.app/api/stores/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error();
        store = await resp.json();
    } catch {
        return alert('No hemos podido cargar tu plan. Intenta recargar.');
    }
    const currentPlan = store.plan;  // "free" | "starter" | "advanced" | "none"

    // 5) Mapeo de botones → plan key
    const planButtons = {
      freeBtn:     'free',
      starterBtn:  'starter',
      advancedBtn: 'advanced',
    };
  
    // 6) Añadir listeners a cada botón
    Object.entries(planButtons).forEach(([btnId, planKey]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
  
      if (planKey === currentPlan) {
        // deshabilito el botón del plan actual
        btn.disabled = true;
        btn.textContent = 'Plan actual';
        btn.classList.add('disabled'); // opcional, para estilos
      } else {
        if(currentPlan) {
            btn.textContent = 'Cambiar a este plan';
        }else if (planKey === 'free') {
            btn.textContent = 'Comienza Gratis!';
        } else {
            btn.textContent = 'Empieza tu prueba gratuita';
        }
        btn.addEventListener('click', async () => {
            try {
                btn.disabled = true;
                btn.textContent = 'Redirigiendo…';
                console.log("planKey", planKey)
                let res;
                if (planKey === 'free') {
                // suscripción free
                res = await fetch('https://sincere-musical-squid.ngrok-free.app/api/billing/select-free-plan', {
                    method: 'POST',
                    headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type':  'application/json'
                    }
                });
                if (!res.ok) throw new Error('Error al activar plan Free');
                // rediriges directo al perfil
                window.location.href = '/index.html';
                } else {
                    console.log("planKey", planKey),
                // flow con Checkout (starter, advanced…)
                res = await fetch('https://sincere-musical-squid.ngrok-free.app/api/billing/create-checkout-session', {
                    method: 'POST',
                    headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type':  'application/json'
                    },
                    
                    body: JSON.stringify({ plan: planKey })
                });
                }
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || res.statusText);
                }
                const { url } = await res.json();
                // Redirige al checkout
                window.location.href = url;
                // si era free, vamos directo al perfil; si no, redirigimos a Stripe
                if (planKey === 'free') {
                    window.location.href = '/perfil.html';
                    } else {
                    window.location.href = url;
                    }

            } catch (e) {
            console.error('Error creando sesión de pago:', e);
            alert('No hemos podido iniciar el pago. Por favor, inténtalo de nuevo.');
            btn.disabled = false;
            btn.textContent = 'Empieza tu prueba gratuita';
            }
        });
    }
    });
    console.log(store.plan);
    // 5) Pack: si el usuario tiene plan (no empty), mostramos la tarjeta
    const packCard = document.getElementById('packCard');
    const buyPackBtn = document.getElementById('buyPackBtn');
    if (store.plan && store.plan !== 'free') {
        packCard.classList.remove('hidden');

        buyPackBtn.addEventListener('click', async () => {
            buyPackBtn.disabled = true;
            buyPackBtn.textContent = 'Procesando…';
            try {
            const resp = await fetch(`https://sincere-musical-squid.ngrok-free.app/api/billing/buy-pack`, {
                method: 'POST',
                headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({ packs: 1 })
            });
            if (!resp.ok) throw await resp.json();
            const data = await resp.json();
            window.location.href = data.url;
            } catch (e) {
            console.error(e);
            alert('No se pudo comprar el pack. Vuelve a intentarlo.');
            buyPackBtn.disabled = false;
            buyPackBtn.textContent = 'Comprar pack';
            }
        });
    }
    // Paso 4: ya está todo listo → oculta spinner y muestra botones
    loadingEl.classList.add('hidden');
    gridEl.classList.remove('hidden');


  });
  