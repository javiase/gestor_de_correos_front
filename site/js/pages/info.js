// js/pages/info.js

import { fetchWithAuth } from '/js/utils/api.js';
import { initSidebar } from '/js/components/sidebar.js';
import { seedOnboardingFromServer, markOnboardingStep, isOnboardingComplete, enforceFlowGate, resolveStepKey, markCompletionInBackend } from '/js/utils/flow-gate.js';
import { notify } from '/js/utils/notify.js';
import { renderHtmlEmail } from '/js/utils/render-email.js';
import { LIMITS } from '/js/config.js';
import { t, initI18n } from '/js/utils/i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  initI18n();

  await enforceFlowGate({
    allowOnboarding: ['/secciones/info.html', '/secciones/perfil.html']
  })
  await seedOnboardingFromServer();

  initSidebar('#sidebarContainer', { skipSeed: true });
  applyPendingDotFromCache();
  setupCards();
  await loadPastEmailsSidebar();
});

/* ──────────────────────────────────────────────────────────────
 * Helpers de UI
 * ────────────────────────────────────────────────────────────── */

// Mapeo de data-policy-type a nombres de políticas en ESPAÑOL (para guardar/buscar en DB)
const POLICY_TYPE_TO_SPANISH = {
  'devoluciones': 'Política de Devoluciones',
  'envios': 'Política de Envíos',
  'info': 'Información General de la Tienda',
  'faq': 'Preguntas Frecuentes'
};

const POLICY_CACHE = new Map();         // key: título normalizado → {state, ts}
const FAQ_CACHE = { items: null, ts: 0 };
const CACHE_TTL_MS = 60_000;            // 60s; sube a 5 min si quieres
const normKey = (s) => String(s||'').toLowerCase().trim();

function setupCards() {
  const cardsGrid   = document.getElementById('cardsGrid');
  const mainHeading = document.getElementById('mainHeading');

  document.querySelectorAll('.card').forEach((card) => {
    const arrow = card.querySelector('.arrow-collapse');

    // Expandir al click en card (ignorando la flecha)
     card.addEventListener('click', async (e) => {
      if (e.target.closest('.arrow-collapse')) return;

      const wasExpanded = card.classList.contains('expanded');
      expandCard(card, cardsGrid, mainHeading);

      // Inicializa una sola vez por card (handlers/UI)
      if (!card.dataset.inited) {
        await initCard(card);
        card.dataset.inited = 'true';
      }

      // Solo cuando se abre (de colapsada → expandida)
      if (!wasExpanded) {
        resetPolicyView(card);           // ⬅️ Muestra form, oculta mensaje “Felicidades…”
        await maybeLoadPolicyFromDB(card);
      }
    });

    // Colapsar con flecha
    if (arrow) {
      arrow.addEventListener('click', (e) => {
        e.stopPropagation();
        collapseCard(card, cardsGrid, mainHeading);
      });
    }
  });
}

function expandCard(card, grid, heading) {
  document.querySelectorAll('.card.expanded').forEach(c => c.classList.remove('expanded'));
  card.classList.add('expanded');
  grid?.classList.add('expanded');
  heading?.classList.add('hidden-heading');
}
function collapseCard(card, grid, heading) {
  card.classList.remove('expanded');
  if (!document.querySelector('.card.expanded')) {
    grid?.classList.remove('expanded');
    heading?.classList.remove('hidden-heading');
  }
}

function applyPendingDotFromCache() {
  try {
    const cached = JSON.parse(localStorage.getItem('store') || '{}');
    const has = !!cached.has_pending_ideas;   // ← leemos el flag guardado por perfil.js
    document.body.classList.toggle('has-pending-ideas', has); // ← pinta/quita el puntito
  } catch {}
}
function announceOnboardingProgress(wasIncompleteBeforeSaving = false) {
  const complete = isOnboardingComplete();
  
  console.log('🔍 [announceOnboardingProgress] complete:', complete);
  console.log('🔍 [announceOnboardingProgress] wasIncompleteBeforeSaving:', wasIncompleteBeforeSaving);
  
  window.dispatchEvent(new CustomEvent('onboarding-complete-changed', {
    detail: { complete }
  }));
  
  // 🆕 Si se completó el onboarding, marcarlo en backend para evitar validaciones futuras
  if (complete) {
    markCompletionInBackend('onboarding').catch(e => {
      console.warn('[info] No se pudo marcar onboarding_completed en backend:', e);
    });
    
    // 🎊 Mostrar modal de felicitación si acabamos de completar el onboarding
    if (wasIncompleteBeforeSaving) {
      console.log('🎊 [info] ¡Onboarding recién completado! Mostrando modal...');
      setTimeout(async () => {
        // Verificar que notify.modal existe
        if (typeof notify.modal === 'function') {
          // Obtener traducciones (con fallback por si hay problemas de cache)
          const title = t('info.onboardingCompletedTitle') || '¡Enhorabsssuena! 🎊';
          const message = t('info.onboardingCompletedMessage') || 'Has completado el onboarding de Respondize. Ahora estás listo para empezar a gestionar tus correos de forma más eficiente. ¡Esperamos que la app te sea de mucha utilidad!';
          const btnInbox = t('info.goToInbox') || 'Ir a la bandeja de entrada';
          const btnStay = t('info.startUsing') || 'Seguir añadiendo información';
          
          console.log('🔍 [info] Traducciones del modal:', { title, message, btnInbox, btnStay });
          
          const action = await notify.modal({
            title: title,
            message: message,
            buttons: [
              { text: btnInbox, style: 'primary', value: 'inbox' },
              { text: btnStay, style: 'secondary', value: 'stay' }
            ]
          });
          
          if (action === 'inbox') {
            window.location.href = '/secciones/inbox.html';
          }
        } else {
          // Fallback: mostrar notificación simple
          console.warn('[info] notify.modal no disponible, usando fallback');
          const title = t('info.onboardingCompletedTitle') || '¡Enhorabuena! 🎊';
          notify.success(title);
          setTimeout(() => {
            const message = t('info.onboardingCompletedMessage') || 'Has completado el onboarding';
            const question = t('info.goToInbox') || 'Ir a la bandeja de entrada';
            if (confirm(message + '\n\n' + question + '?')) {
              window.location.href = '/secciones/inbox.html';
            }
          }, 1000);
        }
      }, 800); // Pequeño delay para que se vea el mensaje de "Felicidades" primero
    } else {
      console.log('ℹ️ [info] Onboarding ya estaba completo, no se muestra modal');
    }
  }
}

// Solo reflejo local/UI (sin red)
function reflectPendingIdeasUI(has) {
  const cached = JSON.parse(localStorage.getItem('store') || '{}');
  cached.has_pending_ideas = !!has;
  localStorage.setItem('store', JSON.stringify(cached));
  document.body.classList.toggle('has-pending-ideas', !!has);
}

/* ──────────────────────────────────────────────────────────────
 * Contadores de caracteres (inputs/textarea/contenteditable)
 * ────────────────────────────────────────────────────────────── */

function attachCounter(el, max) {
  if (!el || !max) return;
  // evita duplicar
  if (el._charCounter) return;

  const counter = document.createElement('div');
  counter.className = 'char-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.style.marginTop = '0.5rem';
  counter.style.fontSize  = '0.85rem';
  counter.style.textAlign = 'right';
  counter.style.color     = '#9CA3AF';

  const update = () => {
    const val = (el.value || '').length;
    counter.textContent = `${val}/${max} ${t('info.characters')}`;
    if (val > max) counter.classList.add('over'); else counter.classList.remove('over');
  };

  // colocar después del elemento
  el.insertAdjacentElement('afterend', counter);
  el.addEventListener('input', update);
  update();

  el._charCounter = counter;
}


function attachCounterForContentEditable(el, max) {
  if (!el || !max) return;
  if (el._charCounter) return;

  const counter = document.createElement('div');
  counter.className = 'char-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.style.marginTop = '0.5rem';
  counter.style.fontSize  = '0.85rem';
  counter.style.textAlign = 'right';
  counter.style.color     = '#9CA3AF';

  const update = () => {
    const val = (el.textContent || '').length;
    counter.textContent = `${val}/${max} ${t('info.characters')}`;
    if (val > max) counter.classList.add('over'); else counter.classList.remove('over');
  };

  el.insertAdjacentElement('afterend', counter);
  el.addEventListener('input', update);
  update();

  el._charCounter = counter;
}

function initCharCounters(scope) {
  const root = scope || document;

  // Políticas: textarea pegada por el usuario
  const policyTA = root.querySelector('textarea[name="policy_pasted"]');
  if (policyTA) attachCounter(policyTA, LIMITS.policies);

  // FAQs: respuestas
  root.querySelectorAll('.faq-answer').forEach(ta => attachCounter(ta, LIMITS.faq_a));

  // FAQs: preguntas (contenteditable)
  root.querySelectorAll('.faq-question-text[contenteditable="true"]').forEach(p =>
    attachCounterForContentEditable(p, LIMITS.faq_q)
  );
}

function resetPolicyView(card) {
  const form    = card.querySelector('form.policy-form');
  const result  = card.querySelector('.result-container');
  const spinner = form?.querySelector('.loading-spinner');
  const sendBtn = form?.querySelector('.pf-submit');
  const announce = card.querySelector('.pf-announcement');
  const userBox  = card.querySelector('.user-policy-box');
  const tip      = card.querySelector('.policy-tip');

  if (form) {
    form.classList.remove('hidden');
    // ⬅️ clave: reactivar inputs/textarea/select (incluye el textarea de política pegada)
    disableForm(form, false);
  }
  if (sendBtn) sendBtn.classList.remove('hidden');
  if (spinner) spinner.classList.add('hidden');
  if (result) result.innerHTML = '';

  // Mostrar de nuevo aviso y caja de política al reabrir
  announce?.classList.remove('hidden');
  userBox?.classList.remove('hidden');
  tip?.classList.remove('hidden');
}
/* ──────────────────────────────────────────────────────────────
 * Inicialización por tipo de card
 * ────────────────────────────────────────────────────────────── */

async function initCard(card) {
  const policyType = card.dataset.policyType; // Usar data-policy-type en lugar del título traducido
  
  // FAQ
  if (policyType === 'faq') {
    initFAQ(card);
    await prefillFAQ(card);
    return;
  }
  // Formularios de políticas
  const form = card.querySelector('form.policy-form');
  if (!form) return;

  initChipGroups(form);
  initDependents(form);
  initRateTable(form);
  initNAToggles(form);
  initPolicySubmit(card, form, policyType); // Pasar policyType en lugar de title
  initCharCounters(card);
}

/* ──────────────────────────────────────────────────────────────
 * Chips (single/multi + “Otro +” con input)
 * ────────────────────────────────────────────────────────────── */

function initChipGroups(scope) {
  scope.querySelectorAll('[data-chip-group]').forEach(group => {
    const form   = group.closest('form');
    const name   = group.dataset.name;
    const hidden = form?.querySelector(`input[name="${name}"]`);
    const single = group.hasAttribute('data-single');
    const otherBtn   = group.querySelector('.chip-other');
    const otherInput = group.querySelector('.chip-other-input');

    const getSelected = () =>
      [...group.querySelectorAll('.chip.selected:not(.chip-other)')].map(b => b.dataset.value);

    const writeHidden = () => {
      const sel = getSelected();
      if (!hidden) return;
      hidden.value = single ? (sel[0] || '') : JSON.stringify(sel);
      // actualizar dependientes si procede
      updateDependents(form);
    };

    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;

      // “Otro +” (toggle visible + estado seleccionado)
      if (btn.classList.contains('chip-other')) {
        if (!otherInput) return;

        const isActive = btn.classList.contains('selected');

        if (isActive) {
          // Desactivar: ocultar input y limpiar valor
          btn.classList.remove('selected');
          group.classList.remove('has-other');
          otherInput.value = '';
          // No tocamos chips personalizados ya creados; solo escondemos el campo
          writeHidden();
        } else {
          // Activar: en single, deselecciona otros; muestra input y enfoca
          if (single) group.querySelectorAll('.chip').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          group.classList.add('has-other');
          otherInput.value = '';
          otherInput.focus();
          writeHidden();
        }
        return;
      }

      // selección normal
      if (single) {
        group.querySelectorAll('.chip').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      } else {
        btn.classList.toggle('selected');
      }
      writeHidden();
    });

    if (otherInput) {
      const commitOther = () => {
        const val = (otherInput.value || '').trim();
        if (!val) return;

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip selected';
        chip.dataset.value = val;
        chip.textContent = val;

        // Inserta antes del input para mantener orden visual
        otherInput.before(chip);

        // Limpiar y cerrar input “Otro”
        otherInput.value = '';
        group.classList.remove('has-other');

        // Si el botón “Otro +” estaba activo, lo des-seleccionamos
        if (otherBtn) otherBtn.classList.remove('selected');

        writeHidden();
      };
      otherInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitOther();
        }
      });
      otherInput.addEventListener('blur', commitOther);
    }

    // estado inicial
    writeHidden();
  });
}

/* ──────────────────────────────────────────────────────────────
 * Dependientes (muestra/oculta por data-show-when="nombre=valor;...")
 * ────────────────────────────────────────────────────────────── */

function initDependents(form) {
  // Evaluar una vez
  updateDependents(form);
}

function updateDependents(form) {
  form.querySelectorAll('.pf-dependent').forEach(dep => {
    const cond = dep.dataset.showWhen || '';
    const ors  = cond.split(';').map(s => s.trim()).filter(Boolean);
    let show = false;
    for (const unit of ors) {
      const [name, val] = unit.split('=').map(s => (s || '').trim());
      if (!name || !val) continue;
      const input = form.querySelector(`input[name="${CSS.escape(name)}"]`);
      if (!input) continue;
      if (input.value === val) { show = true; break; }
    }
    dep.classList.toggle('show', show);
    // deshabilita/habilita inputs internos
    dep.querySelectorAll('input,textarea,select').forEach(el => { el.disabled = !show; });
  });
}

/* ──────────────────────────────────────────────────────────────
 * “No aplicable” en formularios (mueve campo a sección NA)
 * ────────────────────────────────────────────────────────────── */

function initNAToggles(form) {
  const naSection = form.querySelector('[data-na-section]');
  const naList    = form.querySelector('[data-na-list]');
  const active    = form.querySelector('[data-active-list]');
  if (!naSection || !naList || !active) return;

  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-na-toggle]');
    if (!btn) return;

    const placeholder = btn.closest('.pf-field-na');
    if (placeholder) {
      // Volver a activos
      const key   = placeholder.dataset.originalKey;
      const field = form.querySelector(`.pf-field[data-key="${CSS.escape(key)}"]`);
      if (!field) return;

      field.dataset.na = 'false';
      field.style.display = '';
      field.querySelectorAll('input,textarea,select').forEach(el => el.disabled = false);

      // Resetear botón original
      const orig = field.querySelector('[data-na-toggle]');
      if (orig) {
        orig.setAttribute('aria-pressed', 'false');
        orig.classList.remove('active');
        orig.textContent = 'N/A';
      }

      // ➊ Recolocar en su posición original usando los “anclajes” guardados
      const nextKey = placeholder.dataset.returnNextKey || '';
      const prevKey = placeholder.dataset.returnPrevKey || '';
      const beforeEl = nextKey ? active.querySelector(`.pf-field[data-key="${CSS.escape(nextKey)}"]`) : null;

      if (beforeEl && beforeEl.parentElement === active) {
        active.insertBefore(field, beforeEl);
      } else if (prevKey) {
        const prevEl = active.querySelector(`.pf-field[data-key="${CSS.escape(prevKey)}"]`);
        if (prevEl && prevEl.parentElement === active) {
          active.insertBefore(field, prevEl.nextSibling);
        } else {
          active.appendChild(field);
        }
      } else {
        active.appendChild(field);
      }

      placeholder.remove();
      if (!naList.children.length) naSection.classList.add('hidden');
      return;
    }

    // Pasar a NA
    const field = btn.closest('.pf-field');
    if (!field) return;

    btn.setAttribute('aria-pressed', 'true');
    btn.classList.add('active');
    btn.textContent = 'N/A ';

    field.dataset.na = 'true';
    field.style.display = 'none';
    field.querySelectorAll('input,textarea,select').forEach(el => el.disabled = true);

    // Clon visual para la lista de “No aplican”
    const row = field.querySelector('.pf-label-row')?.cloneNode(true) || document.createElement('div');
    const ph  = document.createElement('div');
    ph.className = 'pf-field-na';
    ph.dataset.originalKey = field.dataset.key || '';

    // ➋ Guardar anclajes de posición (siguiente y anterior pf-field dentro de la lista activa)
    const findSiblingPf = (el, dir) => {
      let n = el?.[dir];
      while (n && !(n.classList && n.classList.contains('pf-field'))) n = n[dir];
      return n;
    };
    const nextField = findSiblingPf(field, 'nextElementSibling');
    const prevField = findSiblingPf(field, 'previousElementSibling');

    ph.dataset.returnNextKey = nextField?.dataset.key || '';
    ph.dataset.returnPrevKey = prevField?.dataset.key || '';

    ph.appendChild(row);

    // Asegura que el botón dentro del clon siga funcionando (lleva data-na-toggle)
    naList.appendChild(ph);
    naSection.classList.remove('hidden');
  });
}

/* ──────────────────────────────────────────────────────────────
 * Rate table (Zona, Precio, Tiempo, Notas)
 * ────────────────────────────────────────────────────────────── */

function initRateTable(form) {
  const wrap = form.querySelector('[data-rate-table]');
  if (!wrap) return;

  const body  = wrap.querySelector('[data-rate-body]');
  const addBt = wrap.querySelector('[data-add-row]');

  const addRow = (zona = '', precio = '', tiempo = '', nota = '') => {
    const row = document.createElement('div');
    row.className = 'rate-row';
    row.innerHTML = `
      <input type="text" placeholder="Zona"   value="${escapeAttr(zona)}">
      <input type="text" placeholder="Precio" value="${escapeAttr(precio)}">
      <input type="text" placeholder="Tiempo" value="${escapeAttr(tiempo)}">
      <input type="text" placeholder="Notas"  value="${escapeAttr(nota)}">
      <button type="button" aria-label="Eliminar fila">&times;</button>
    `;
    row.querySelector('button').addEventListener('click', () => row.remove());
    body.appendChild(row);
  };

  if (!body.children.length) addRow();
  addBt?.addEventListener('click', () => addRow());
}

function collectRateTableJSON(form) {
  const wrap = form.querySelector('[data-rate-table]');
  if (!wrap) return '[]';
  const rows = [...wrap.querySelectorAll('.rate-row')].map(r => {
    const [zona, precio, tiempo, nota] = r.querySelectorAll('input');
    return {
      zona: (zona?.value || '').trim(),
      precio: (precio?.value || '').trim(),
      tiempo: (tiempo?.value || '').trim(),
      nota: (nota?.value || '').trim(),
    };
  }).filter(r => r.zona || r.precio || r.tiempo || r.nota);
  return JSON.stringify(rows);
}

/* ──────────────────────────────────────────────────────────────
 * Submit de políticas (devoluciones, envíos, info)
 * ────────────────────────────────────────────────────────────── */

function initPolicySubmit(card, form, policyType) {
  const sendBtn = form.querySelector('.pf-submit');
  const spinner = form.querySelector('.loading-spinner');
  const arrow   = card.querySelector('.arrow-collapse');
  
  // Convertir policyType a nombre en español para guardar en DB
  const policyName = POLICY_TYPE_TO_SPANISH[policyType] || policyType;

  // contenedor de feedback
  let result = card.querySelector('.result-container');
  if (!result) {
    result = document.createElement('div');
    result.className = 'result-container';
  }
  // Asegura que SIEMPRE esté visible: al final del expand-content
  const host = card.querySelector('.expand-content') || card;
  host.appendChild(result);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Sincroniza tabla → hidden
    const tarifasHidden = form.querySelector('input[name="tarifas_json"]');
    if (tarifasHidden) tarifasHidden.value = collectRateTableJSON(form);

    // ✅ Validación: cada bloque activo debe estar COMPLETO o en “No aplicable”
    const wholeCheck = validateAllOrNA(form);
    if (!wholeCheck.ok) {
      notify.error(wholeCheck.message);
      wholeCheck.el?.focus?.();
      return;
    }

    // Política pegada por el usuario (opcional, pero con límite)
    const pastedEl = form.querySelector('textarea[name="policy_pasted"]');
    const pastedPolicy = (pastedEl?.value || '').trim();
    if (pastedPolicy.length > 6000) {
      notify.error(t('info.policyExceedsLimit'));
      pastedEl?.focus();
      return;
    }

    const data = readActiveFields(form);
    const text = composePolicyText(form.getAttribute('data-form-type'), data);

    // Se permite guardar aunque el texto compuesto esté vacío si el usuario
    // aporta su política pegada. Pero al menos una de las dos debe existir.
    if (!text && !pastedPolicy) {
      notify.error(t('info.addInfoOrPastePolicy'));
      return;
    }

    let wasSuccess = false;
    try {
      // No ocultamos el form para que el spinner (que está dentro) sea visible
      disableForm(form, true);
      sendBtn?.classList.add('hidden');
      arrow?.classList.add('hidden');
      spinner?.classList.remove('hidden');
      result.innerHTML = '';

      // ➋ Guardar texto + estado para poder pre-rellenar en futuras aperturas
      const envelope = {
        __schema: 'policy-v1',
        text,
        values: data,
        naKeys: collectNAKeys(form),
        userPolicy: pastedPolicy // ⬅️ política pegada por el usuario

      };

      const resp = await fetchWithAuth('/policies/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy_type: policyName, content: JSON.stringify(envelope) })
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();
      const ignored = payload?.ignored_info || payload?.ignoredInfo; // soporte snake/camel
      console.log('Policy save response:', payload);
      if (Array.isArray(ignored) && ignored.length) {
        console.warn('Ignored info:', ignored);
        notify.warning(t('info.botInstructionDetected'));
      }

      if (payload?.status === 'complete') {
        // 💾 refresca caché de esta política para próximas aperturas
        const k = normKey(policyName);
        POLICY_CACHE.set(k, { state: envelope, ts: Date.now() });
        
        // 🎯 IMPORTANTE: Capturar si el onboarding estaba incompleto ANTES de marcar este paso
        const wasIncompleteBeforeSaving = !isOnboardingComplete();
        console.log('🔍 [info] Onboarding completo ANTES de guardar esta política:', !wasIncompleteBeforeSaving);
        
        const stepKey = resolveStepKey(policyName);
        if (stepKey) markOnboardingStep(stepKey, true);

        // 🆕 Verificar si se completó todo el onboarding y marcar en backend
        announceOnboardingProgress(wasIncompleteBeforeSaving);

        wasSuccess = true;

        // Ocultamos formulario + aviso + caja de política
        form.classList.add('hidden');
        const announce = card.querySelector('.pf-announcement');
        const userBox  = card.querySelector('.user-policy-box');
        const tip      = card.querySelector('.policy-tip');
        announce?.classList.add('hidden');
        userBox?.classList.add('hidden');
        tip?.classList.add('hidden');

        // Asegura que el contenedor de resultado esté visible y al final
        const host = card.querySelector('.expand-content') || card;
        host.appendChild(result);
        result.classList.remove('hidden');
        result.innerHTML = '';

        const p = document.createElement('p');
        p.textContent = t('info.congratulations');
        p.style.textAlign = 'center';
        p.style.fontWeight = 'bold';
        p.style.fontSize = '2rem';
        result.appendChild(p);

        // Llevar el mensaje a la vista
        setTimeout(() => { result.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 0);
      } else {
        notify.error(t('info.policySavedPartially'));
      }
    } catch (err) {
      console.error(err);
      notify.error(t('info.errorSavingPolicy'));
      disableForm(form, false);
     } finally {
      spinner?.classList.add('hidden');
      arrow?.classList.remove('hidden');

      if (!wasSuccess) {
        // Rehabilitamos el formulario y el botón de enviar si hubo error
        disableForm(form, false);
        sendBtn?.classList.remove('hidden');
      }
    }
  });
}

function readActiveFields(form) {
  const data = {};
  form.querySelectorAll('.pf-field').forEach(field => {
    if (field.dataset.na === 'true') return;
    field.querySelectorAll('input,textarea,select').forEach(el => {
      if (el.disabled || !el.name) return;
      data[el.name] = (el.value || '').trim();
    });
  });
  return data;
}

function composePolicyText(type, d) {
  if (type === 'returns') {
    const estados = parseJSONArr(d.estado_producto);
    const metodos = parseJSONArr(d.metodo_reembolso);
    const cancOps = parseJSONArr(d.cancelacion_opciones);
    return [
      d.dias_devolucion ? `El cliente dispone de ${d.dias_devolucion} días ${d.tipo_dias || ''} para devolver.` : '',
      estados.length ? `Estado aceptado: ${estados.join(', ')}.` : '',
      d.coste_devolucion ? (d.coste_devolucion === 'tienda'
        ? 'Devolución gratis (la asume la tienda).'
        : 'Devolución a cargo del cliente.') : '',
      metodos.length ? `Reembolso: ${metodos.join(', ')}.` : '',
      d.reembolso_dias ? `Plazo de reembolso: ${d.reembolso_dias} días.` : '',
      (cancOps.length || d.cancelacion_condiciones)
        ? `Cancelación: ${[...cancOps, d.cancelacion_condiciones].filter(Boolean).join('. ')}.` : '',
      d.url_devoluciones ? `Más info: ${d.url_devoluciones}` : ''
    ].filter(Boolean).join('\n\n');
  }

  if (type === 'shipping') {
    const zonas   = parseJSONArr(d.zonas_envio);
    const tarifas = tryParseJSON(d.tarifas_json);
    const tarifasTxt = (Array.isArray(tarifas) && tarifas.length)
      ? 'Tarifas:\n' + tarifas.map(t =>
          `• ${t.zona || '(zona)'} — ${t.precio || '(precio)'}${t.tiempo ? ` — ${t.tiempo}` : ''}${t.nota ? ` (${t.nota})` : ''}`
        ).join('\n')
      : '';
    const tracking = d.tiene_tracking
      ? (d.tiene_tracking === 'sí'
          ? `Nº de seguimiento: sí${d.tracking_cuando ? ` (se envía ${d.tracking_cuando})` : ''}.`
          : 'Nº de seguimiento: no.')
      : '';

    return [
      tarifasTxt,
      d.tiempo_entrega ? `Tiempo estimado global: ${d.tiempo_entrega}.` : '',
      zonas.length ? `Zonas de envío: ${zonas.join(', ')}.` : '',
      tracking,
      d.tiene_numero_orden ? `Número de orden visible: ${d.tiene_numero_orden}.` : '',
      d.seguimiento_via ? `Seguimiento vía: ${d.seguimiento_via}${d.tracking_url ? ` (${d.tracking_url})` : ''}.` : '',
      d.url_envios ? `Política de envíos: ${d.url_envios}` : ''
    ].filter(Boolean).join('\n\n');
  }

  // storeinfo
  const pagos = parseJSONArr(d.metodos_pago);
  let garantia = '';
  if (d.garantia_tipo) {
    if (d.garantia_tipo === 'Sin garantía') garantia = 'Garantía: sin garantía.';
    else if (d.garantia_valor) garantia = `Garantía: ${d.garantia_valor} ${d.garantia_tipo.toLowerCase()}.`;
  }
  return [
    pagos.length ? `Métodos de pago aceptados: ${pagos.join(', ')}.` : '',
    d.ubicacion_tipo
      ? `Ubicación: ${d.ubicacion_tipo}${d.ubicacion_tipo === 'Física' && d.direccion_tienda ? ` (${d.direccion_tienda})` : ''}.`
      : '',
    d.permite_cambio_direccion
      ? `Cambio de dirección: ${d.permite_cambio_direccion}${d.cambio_direccion_condiciones ? ` — ${d.cambio_direccion_condiciones}` : ''}.`
      : '',
    d.tiene_tabla_tallas
      ? `Tabla de tallas: ${d.tiene_tabla_tallas}${d.tabla_tallas_url ? ` — ${d.tabla_tallas_url}` : ''}.`
      : '',
    garantia
  ].filter(Boolean).join('\n\n');
}

function parseJSONArr(s) { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
function tryParseJSON(s) { try { return JSON.parse(s || '[]'); } catch { return []; } }
function escapeAttr(v)   { return String(v || '').replaceAll('"', '&quot;'); }

/* ──────────────────────────────────────────────────────────────
 * FAQ: render, NA toggle, añadir, guardar
 * ────────────────────────────────────────────────────────────── */

function initFAQ(card) {
  const container = card.querySelector('#faqContainer');
  const blocksWrap = container.querySelector('#faqBlocks');
  const tip = card.querySelector('.policy-tip');
  const addBtn    = container.querySelector('#faqAdd');
  const sendBtn   = card.querySelector('#faqSend');
  const spinner   = card.querySelector('.loading-spinner');
  const arrow     = card.querySelector('.arrow-collapse');
  const result    = card.querySelector('.result-container');

  // Eliminar bloque
  container.addEventListener('click', (e) => {
    const del = e.target.closest('.faq-del-btn');
    if (!del) return;
    const block = del.closest('.faq-block');
    if (!block) return;
    block.remove();
    // Si no queda ninguno, crea uno en blanco y enfoca
    if (!blocksWrap.querySelector('.faq-block')) {
      const nb = createFAQBlock({ question: '', answer: '' });
      blocksWrap.appendChild(nb);
      setTimeout(() => nb.querySelector('.faq-question-text')?.focus(), 0);
    }
  });

  // Traducir botón manualmente (no usar data-i18n en elementos con event listeners)
  const updateAddButtonText = () => {
    if (addBtn) addBtn.textContent = t('info.addQuestion');
  };
  updateAddButtonText();
  window.addEventListener('locale-changed', updateAddButtonText);

  // Añadir bloque (vacío y con foco en la pregunta)
  addBtn?.addEventListener('click', () => {
    const block = createFAQBlock({ question: '', answer: '' });
    blocksWrap.appendChild(block);
    setTimeout(() => block.querySelector('.faq-question-text')?.focus(), 0);
  });

  // Auto-resize respuestas
  container.addEventListener('input', (e) => {
    const ta = e.target.closest('.faq-answer');
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  });

  // Guardar (sin N/A: cada bloque exige pregunta y respuesta)
  sendBtn?.addEventListener('click', async () => {
    const blocks = blocksWrap.querySelectorAll('.faq-block');
    const faqs = [];
    for (const [i, block] of [...blocks].entries()) {
      const qEl = block.querySelector('.faq-question-text');
      const aEl = block.querySelector('.faq-answer');
      const q = (qEl?.textContent || '').trim();
      const a = (aEl?.value || '').trim();

      if (!q) { notify.warning(t('info.missingQuestion').replace('{number}', i + 1)); qEl?.focus(); return; }
      if (!a) { notify.warning(t('info.missingAnswer').replace('{number}', i + 1)); aEl?.focus(); return; }

      faqs.push({ question: q, answer: a });
    }
    if (!faqs.length) { notify.error(t('info.addAtLeastOneQuestion')); return; }

    let wasSuccess = false;
    try {
      sendBtn.classList.add('hidden');
      arrow?.classList.add('hidden');
      spinner?.classList.remove('hidden');
      result.innerHTML = '';

      const resp = await fetchWithAuth('/policies/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy_type: 'Preguntas Frecuentes', content: faqs })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const ignored = data?.ignored_info || data?.ignoredInfo; // soporte snake/camel
      if (Array.isArray(ignored) && ignored.length) {
        notify.warning(t('info.botInstructionInAnswer'));
      }

      if (data?.status === 'complete') {
        wasSuccess = true;
        // Ocultamos formulario
        container.classList.add('hidden');
        sendBtn.classList.add('hidden');
        tip?.classList.add('hidden');

        result.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = t('info.congratulations');
        p.style.textAlign = 'center';
        p.style.fontWeight = 'bold';
        p.style.fontSize = '2rem';
        result.appendChild(p);
      } else {
        notify.error(t('info.unexpectedResponseSavingFAQ'));
      }
    } catch (err) {
      console.error(err);
      notify.error(t('info.errorSavingFAQ'));
    } finally {
      spinner?.classList.add('hidden');
      arrow?.classList.remove('hidden');
      if (!wasSuccess) {
        sendBtn.classList.remove('hidden');
      }
    }
  });
}

function createFAQBlock({ question = '', answer = '' } = {}) {
  const block = document.createElement('div');
  block.className = 'faq-block';
  block.innerHTML =
    '<button type="button" class="faq-del-btn" aria-label="Eliminar bloque">Eliminar</button>' +
    `<p class="faq-question-text" contenteditable="true" tabindex="0" role="textbox" aria-label="Pregunta">${escapeHTML(question)}</p>` +
    '<textarea class="faq-answer" placeholder="Escribe la respuesta aquí..." aria-label="Respuesta"></textarea>';

  const qEl = block.querySelector('.faq-question-text');
  const ta  = block.querySelector('.faq-answer');

  ta.value = answer || '';

  // Auto-resize inicial
  setTimeout(() => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }, 0);

  // Contadores
  attachCounterForContentEditable(qEl, LIMITS.faq_q);
  attachCounter(ta, LIMITS.faq_a);

  return block;
}



async function prefillFAQ(card) {
  const blocksWrap = card.querySelector('#faqBlocks');
  const container = card.querySelector('#faqContainer');
  const resultBox = card.querySelector('.result-container');
  const sendBtn = card.querySelector('#faqSend');

  const tip2 = card.querySelector('.policy-tip');

  container.classList.remove('hidden');
  sendBtn?.classList.remove('hidden');
  tip2?.classList.remove('hidden');
  if (resultBox) resultBox.innerHTML = '';

  blocksWrap.innerHTML = '';
  try {
    const res = await fetchWithAuth('/policies/get?policy_name=Preguntas%20Frecuentes', { method: 'GET' });
    const data = await res.json();

    const items = Array.isArray(data?.content) ? data.content : [];
    if (!items.length) {
      const q1 = createFAQBlock({
        question: '¿Cuánto tarda el envío?',
        answer: ''
      });
      const q2 = createFAQBlock({
        question: '¿Cómo puedo rastrear mi paquete?',
        answer: ''
      });
      const q3 = createFAQBlock({
        question: '¿Tiene algun coste hacer una devolución?',
        answer: ''
      });
      
      blocksWrap.appendChild(q1);
      blocksWrap.appendChild(q2);
      blocksWrap.appendChild(q3);

      // Enfocar la primera pregunta
      const qEl = q1.querySelector('.faq-question-text');
      if (qEl) {
        qEl.focus();
        const sel = window.getSelection?.();
        const range = document.createRange?.();
        if (sel && range) {
          range.selectNodeContents(qEl);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }

    items.forEach(it => {
      const q = (it?.question || '').trim();
      const a = (it?.answer || '').trim();
      const b = createFAQBlock({ question: q, answer: a });
      blocksWrap.appendChild(b);
    });

    // Foco en la primera pregunta
    setTimeout(() => blocksWrap.querySelector('.faq-question-text')?.focus(), 0);
  } catch (err) {
    console.error(err);
    // Fallback: un bloque vacío y foco
    const b = createFAQBlock({ question: '', answer: '' });
    blocksWrap.appendChild(b);
    setTimeout(() => b.querySelector('.faq-question-text')?.focus(), 0);
  }
}

function escapeHTML(s) { return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

// ➌ Helpers: cargar desde BD y aplicar estado

function disableForm(form, disabled) {
  form.querySelectorAll('input, textarea, select, button').forEach(el => {
    // No deshabilitar elementos dentro del spinner
    if (el.closest('.loading-spinner')) return;
    // El submit lo controlamos aparte con sendBtn
    if (el.type === 'submit') return;
    el.disabled = !!disabled;
  });
}

function resetNABuckets(form) {
  const naSection = form.querySelector('[data-na-section]');
  const naList    = form.querySelector('[data-na-list]');
  if (naList) naList.innerHTML = '';
  if (naSection) naSection.classList.add('hidden');

  form.querySelectorAll('.pf-field').forEach(field => {
    field.dataset.na = 'false';
    field.style.display = '';
    field.querySelectorAll('input,textarea,select').forEach(el => el.disabled = false);
    const btn = field.querySelector('[data-na-toggle]');
    if (btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('active');
      btn.textContent = 'N/A';
    }
  });
}

function collectNAKeys(form) {
  return [...form.querySelectorAll('.pf-field[data-na="true"]')]
    .map(f => f.dataset.key || '');
}

async function maybeLoadPolicyFromDB(card) {
  const policyType = card.dataset.policyType;
  const policyName = POLICY_TYPE_TO_SPANISH[policyType]; // Convertir a nombre en español
  
  // FAQ: recarga siempre para reflejar cambios
  if (policyType === 'faq') {
    await prefillFAQ(card);
    return;
  }

  const form = card.querySelector('form.policy-form');
  if (!form) return;

  try {
    // ➊ mira caché
    const k = normKey(policyName);
    let state = null;
    const cached = POLICY_CACHE.get(k);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
      state = cached.state;
    } else {
      const res = await fetchWithAuth(`/policies/get?policy_name=${encodeURIComponent(policyName)}`, { method: 'GET' });
      const data = await res.json();
      if (!data?.found) return;
      const raw = data.content;
      if (typeof raw !== 'string') return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.__schema === 'policy-v1') {
          state = parsed;
          POLICY_CACHE.set(k, { state, ts: Date.now() });
        }
      } catch { /* legacy texto plano */ }
    }
    if (!state) return; // si es texto simple anterior, no hacemos prefill

    // Normaliza la vista: muestra form, limpia mensajes, resetea NA
    resetPolicyView(card);
    resetNABuckets(form);

    // 1) Rellenar valores de inputs/textarea/select
    const values = state.values || {};
    Object.entries(values).forEach(([name, val]) => {
      const el = form.querySelector(`[name="${CSS.escape(name)}"]`);
      if (!el) return;
      el.value = val;
    });

    // Política pegada guardada
    const pastedEl = form.querySelector('textarea[name="policy_pasted"]');
    if (pastedEl) pastedEl.value = state.userPolicy || '';

    // 2) Reconstruir tabla de tarifas si existe
    if (values.tarifas_json) hydrateRateTableFromJSON(form, values.tarifas_json);

    // 3) Sincronizar chips a partir de los hidden
    syncChipGroupsFromHidden(form);

    // 4) Re-evaluar dependientes
    updateDependents(form);

    // 5) Enviar a “No aplican” los campos guardados como NA
    (state.naKeys || []).forEach(key => sendFieldToNA(form, key));

  } catch (err) {
    console.error('Prefill policy error', err);
  }
}

function syncChipGroupsFromHidden(form) {
  form.querySelectorAll('[data-chip-group]').forEach(group => {
    const name   = group.dataset.name;
    const hidden = form.querySelector(`input[name="${CSS.escape(name)}"]`);
    if (!hidden) return;

    const single = group.hasAttribute('data-single');
    let values = [];
    if (single) {
      if (hidden.value) values = [hidden.value];
    } else {
      try { const v = JSON.parse(hidden.value || '[]'); values = Array.isArray(v) ? v : []; }
      catch { values = []; }
    }

    group.querySelectorAll('.chip').forEach(b => b.classList.remove('selected'));

    const otherInput = group.querySelector('.chip-other-input');
    values.forEach(val => {
      const btn = [...group.querySelectorAll('.chip')]
        .find(b => !b.classList.contains('chip-other') && b.dataset.value === val);
      if (btn) {
        btn.classList.add('selected');
      } else {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip selected';
        chip.dataset.value = val;
        chip.textContent = val;
        if (otherInput && otherInput.parentElement === group) {
          otherInput.before(chip);
        } else {
          group.appendChild(chip);
        }
      }
    });
  });
  updateDependents(form);
}

function sendFieldToNA(form, key) {
  const field = form.querySelector(`.pf-field[data-key="${CSS.escape(key)}"]`);
  if (!field) return;

  const naSection = form.querySelector('[data-na-section]');
  const naList    = form.querySelector('[data-na-list]');
  const active    = form.querySelector('[data-active-list]');
  if (!naSection || !naList || !active) return;
  if (field.dataset.na === 'true') return;

  // anclajes para poder volver a su sitio
  const findSiblingPf = (el, dir) => {
    let n = el?.[dir];
    while (n && !(n.classList && n.classList.contains('pf-field'))) n = n[dir];
    return n;
  };
  const nextField = findSiblingPf(field, 'nextElementSibling');
  const prevField = findSiblingPf(field, 'previousElementSibling');

  const row = field.querySelector('.pf-label-row')?.cloneNode(true) || document.createElement('div');
  const ph  = document.createElement('div');
  ph.className = 'pf-field-na';
  ph.dataset.originalKey  = field.dataset.key || '';
  ph.dataset.returnNextKey = nextField?.dataset.key || '';
  ph.dataset.returnPrevKey = prevField?.dataset.key || '';
  ph.appendChild(row);

  // actualizar estado visual/botón
  const btn = field.querySelector('[data-na-toggle]');
  if (btn) {
    btn.setAttribute('aria-pressed', 'true');
    btn.classList.add('active');
    btn.textContent = 'N/A ';
  }

  field.dataset.na = 'true';
  field.style.display = 'none';
  field.querySelectorAll('input,textarea,select').forEach(el => el.disabled = true);

  naList.appendChild(ph);
  naSection.classList.remove('hidden');
}

function hydrateRateTableFromJSON(form, tarifasJson) {
  const wrap = form.querySelector('[data-rate-table]');
  if (!wrap) return;
  const body = wrap.querySelector('[data-rate-body]');
  if (!body) return;

  body.innerHTML = '';

  let arr = [];
  try { const v = JSON.parse(tarifasJson || '[]'); arr = Array.isArray(v) ? v : []; }
  catch { arr = []; }

  const createRow = (zona = '', precio = '', tiempo = '', nota = '') => {
    const row = document.createElement('div');
    row.className = 'rate-row';
    row.innerHTML = `
      <input type="text" placeholder="Zona"   value="${escapeAttr(zona)}">
      <input type="text" placeholder="Precio" value="${escapeAttr(precio)}">
      <input type="text" placeholder="Tiempo" value="${escapeAttr(tiempo)}">
      <input type="text" placeholder="Notas"  value="${escapeAttr(nota)}">
      <button type="button" aria-label="Eliminar fila">&times;</button>
    `;
    row.querySelector('button')?.addEventListener('click', () => row.remove());
    body.appendChild(row);
  };

  if (!arr.length) {
    createRow();
  } else {
    arr.forEach(t => createRow(t.zona || '', t.precio || '', t.tiempo || '', t.nota || ''));
  }
}

// ──────────────────────────────────────────────────────────────
// Validación “todo o NA” por bloque (.pf-field)
// ──────────────────────────────────────────────────────────────
function validateAllOrNA(form) {
  const fields = [...form.querySelectorAll('.pf-field')].filter(f => f.dataset.na !== 'true');
  for (const field of fields) {
    // Caso especial: tabla de tarifas
    if (field.querySelector('[data-rate-table]')) {
      const vr = validateRateTable(field);
      if (!vr.ok) return vr;
      continue;
    }

    // Controles requeridos del bloque (visibles y habilitados)
    const controls = [...field.querySelectorAll('input,textarea,select')].filter(el => {
      if (el.disabled) return false;
      // Ocultos por dependencias no cuentan
      const dep = el.closest('.pf-dependent');
      if (dep && !dep.classList.contains('show')) return false;
      // Ignoramos los realmente opcionales
      if (isOptional(el)) return false;
      // Deben tener name salvo que sean hidden (los hidden de chips son requeridos si el bloque se usa)
      if (!el.name && el.type !== 'hidden') return false;
      return true;
    });

    // Si no hay controles requeridos en el bloque, lo consideramos válido (p. ej. solo campo opcional)
    if (!controls.length) continue;

    let anyFilled = false;
    let someEmpty = false;

    for (const el of controls) {
      const raw = (el.value || '').trim();
      const blankHidden = (el.type === 'hidden') && (raw === '' || raw === '[]');
      const isBlank = (raw === '' || blankHidden);

      if (!isBlank) anyFilled = true;
      if (isBlank)  someEmpty = true;
    }

    // Si ningún control requerido tiene valor → bloque vacío pero activo → error
    if (!anyFilled) {
      return {
        ok: false,
        message: `Rellena el bloque “${fieldTitle(field)}” por completo o márcalo como “No aplicable (N/A)”.`,
        el: controls[0] || field
      };
    }

    // Si hay mezcla (unos con valor y otros vacíos) → parcial → error
    if (someEmpty) {
      // apúntale al primero vacío
      const firstEmpty = controls.find(el => {
        const raw = (el.value || '').trim();
        return raw === '' || (el.type === 'hidden' && (raw === '' || raw === '[]'));
      });
      return {
        ok: false,
        message: `Completa el bloque “${fieldTitle(field)}” (no puede quedar a medias) o márcalo como “No aplicable (N/A)”.`,
        el: firstEmpty || field
      };
    }
  }
  return { ok: true };
}

// Reglas de opcionalidad minimalistas:
// - Placeholder con “(opcional)” → opcional
// - TEXTAREA se considera opcional por defecto (notas, detalles)
// - Hidden de chips NUNCA es opcional (se valida arriba)
function isOptional(el) {
  if (el.type === 'hidden') return false;
  const ph = (el.placeholder || '').toLowerCase();
  if (ph.includes('(opcional)')) return true;
  if (el.tagName === 'TEXTAREA') return true;
  return false;
}

function fieldTitle(field) {
  const label = field.querySelector('.pf-label-row label');
  return label ? label.textContent.trim() : (field.dataset.key || 'este bloque');
}

// ──────────────────────────────────────────────────────────────
// Validación específica: tabla de tarifas (Zona, Precio, Tiempo obligatorios)
// ──────────────────────────────────────────────────────────────
function validateRateTable(field) {
  const body = field.querySelector('[data-rate-body]');
  if (!body) return { ok: true };

  // Elimina filas totalmente vacías (no cuentan como “parciales”)
  [...body.querySelectorAll('.rate-row')].forEach(row => {
    const inputs = [...row.querySelectorAll('input')];
    if (inputs.every(i => (i.value || '').trim() === '')) row.remove();
  });

  const rows = [...body.querySelectorAll('.rate-row')];
  if (!rows.length) {
    // Bloque activo sin filas → vacío → error
    return {
      ok: false,
      message: `Añade al menos una fila completa en “${fieldTitle(field)}” o márcalo como “No aplicable”.`,
      el: field.querySelector('[data-add-row]') || field
    };
  }

  for (const row of rows) {
    const [zona, precio, tiempo, nota] = row.querySelectorAll('input');
    // Notas es opcional; los otros 3 son obligatorios
    const required = [zona, precio, tiempo];
    const firstEmpty = required.find(i => !i || (i.value || '').trim() === '');
    if (firstEmpty) {
      return {
        ok: false,
        message: `Completa Zona, Precio y Tiempo en cada fila de “${fieldTitle(field)}” o elimina la fila incompleta.`,
        el: firstEmpty
      };
    }
  }
  return { ok: true };
}
async function loadPastEmailsSidebar() {
  const list = document.querySelector('.info-sidebar.is-popup .info-messages');
  if (!list) return;

  list.innerHTML = ''; // limpia placeholders

  // skeleton simple
  const sk = document.createElement('div');
  sk.textContent = t('info.loadingMessages');
  sk.style.color = '#a1a1aa';
  list.appendChild(sk);

  try {
    const res = await fetchWithAuth('/emails/past?limit=100', { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    console.log('[past] raw data', data);
    console.log(`[past] ${items.length} items loaded`);


    list.innerHTML = '';

    if (!items.length) {
      const empty = document.createElement('p');
      empty.textContent = t('info.noEmailsProcessed');
      empty.style.color = '#a1a1aa';
      empty.style.textAlign = 'center';
      list.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();

    items.forEach(it => {
      const ideas = normalizeIdeas(it.ideas_clave_sin_informacion);
      if (ideas.length) {
        ideas.forEach((idea, idx) => {
          // duplicamos el item con metadatos de idea
          frag.appendChild(makeInfoMessageButton({
            ...it,
            _idea: idea,
            _ideaIndex: idx
          }));
        });
      } else {
        // fallback por si llegara alguno sin ideas
        frag.appendChild(makeInfoMessageButton(it));
      }
    });

    list.appendChild(frag);
    // marca el primero como seleccionado (opcional)
    list.querySelector('.info-message')?.classList.add('selected');

    // dentro de loadPastEmailsSidebar(), reemplaza la delegación existente por esto:
    list.addEventListener('click', async (e) => {
    // ⬇️ Click directo en la zona roja de la papelera => eliminar sin abrir modal
    const trash = e.target.closest('.trash-reveal');
    if (trash) {
      e.preventDefault();
      e.stopPropagation();

      const btn = trash.closest('.info-message');
      if (!btn) return;

      const emailId = btn.dataset.emailId || '';
      const idea    = btn.dataset.idea || '';

      if (!idea) {
        // Si este item no trae idea concreta, abrimos modal como fallback
        // (para evitar marcar una clave vacía en backend)
        const p = btn._payload || {};
        openIdeaModal({
          emailId,
          idea,
          subject:  p.subject,
          sender:   p.sender,
          date:     p.date,
          bodyHtml: p.body_html
        });
        return;
      }

      try {
        const r = await markIdeaProcessed(emailId, idea, 'eliminado');
        // ⚠️ CAMBIO: el backend ya NO elimina docs (deleted siempre false)
        // Solo miramos remaining para saber si apagar el flag
        if ((r?.remaining ?? 0) === 0) reflectPendingIdeasUI(false);
        removeIdeaFromSidebar(emailId, idea);
        notify.success(t('info.ideaDeleted'));
        // fetchWithAuth ya dispara el ping del badge, así que el puntito se refresca solo
      } catch (err) {
        console.error(err);
        notify.error(t('info.couldNotDeleteIdea'));
      }
      return; // ⬅️ no seguir (no abrir modal)
    }

    // ⬇️ Comportamiento normal: abrir modal
    const btn = e.target.closest('.info-message');
    if (!btn) return;

    list.querySelectorAll('.info-message.selected').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    const p = btn._payload || {};
    openIdeaModal({
      emailId:  btn.dataset.emailId,
      idea:     btn.dataset.idea,
      subject:  p.subject,
      sender:   p.sender,
      date:     p.date,
      bodyHtml: p.body_html
    });
  });

  } catch (err) {
    console.error(err);
    list.innerHTML = '';
    const errP = document.createElement('p');
    errP.textContent = 'No se pudieron cargar los correos.';
    errP.style.color = '#ef4444';
    errP.style.textAlign = 'center';
    list.appendChild(errP);
  }
}

function makeInfoMessageButton(item) {
  // ⚠️ CAMBIO: campos condicionales pueden estar ausentes
  const primary =
    (item._idea || '').trim() ||
    (item.texto_combinado || '').trim() ||
    (item.subject || '').trim() ||
    (item.sender ? `De ${item.sender}` : 'Mensaje sin remitente');

  const wrap = document.createElement('div');
  wrap.className = 'info-item';
  const ideaIndex = (item._ideaIndex != null ? String(item._ideaIndex) : '0');
  wrap.dataset.id = `${item.id || 'mail'}#${ideaIndex}`;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'info-message has-trash';
  btn.dataset.emailId = item.id || '';
  btn.dataset.ideaIndex = ideaIndex;
  if (item._idea != null) btn.dataset.idea = item._idea;

  // 👉 guarda el resto para el modal (con fallbacks por campos condicionales)
  btn._payload = {
    id: item.id,
    subject: item.subject || '(sin asunto)',          // ⚠️ campo condicional
    sender: item.sender || '(sin remitente)',         // ⚠️ campo condicional
    date: item.date || '',
    body_html: item.body_html || '',                   // ⚠️ campo condicional
  };

  btn.innerHTML = `
    <div class="info-msg-header">
      <span class="info-msg-title"></span>
    </div>
    <span class="trash-reveal" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6l-1.35 14.11A2 2 0 0 1 15.66 22H8.34A2 2 0 0 1 6.35 20.11L5 6"></path>
        <path d="M14 10v6"></path>
        <path d="M10 10v6"></path>
        <line x1="9" y1="6" x2="9" y2="4"></line>
        <line x1="15" y1="6" x2="15" y2="4"></line>
      </svg>
    </span>
  `;
  btn.querySelector('.info-msg-title').textContent = truncate(primary, 120);
  wrap.appendChild(btn);
  return wrap;
}




function normalizeIdeas(raw) {
  if (!raw) return [];
  // Si viene como JSON de array en string, intenta parsearlo
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map(s => stripBullet(String(s))).filter(Boolean);
    } catch { /* sigue */ }
  }
  // Si ya es array
  if (Array.isArray(raw)) {
    return raw.map(s => stripBullet(String(s))).filter(Boolean);
  }
  // Si es string plano con posibles viñetas/separadores
  if (typeof raw === 'string') {
    return raw
      .split(/\r?\n|[;|]/g)               // separa por líneas, ; o |
      .map(s => s.split(/•|·|—|-|\*/g))   // parte adicional por viñetas
      .flat()
      .map(s => stripBullet(s))
      .filter(Boolean);
  }
  return [];
}

function stripBullet(s) {
  return String(s || '')
    .replace(/^[\s•\-\*\u2013\u2014·]+/, '') // quita viñetas y espacios iniciales
    .trim();
}



function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function formatDateHint(d) {
  // acepta ISO o cadenas de cabecera de email
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) {
    return dt.toLocaleString();
  }
  return d; // si no se puede parsear, muestra tal cual
}


// --- Toggle del popup derecho con lengüeta y click fuera ---
const popup = document.querySelector('.info-sidebar.is-popup');
if (popup) {
  const tab = popup.querySelector('.info-tab');

  // Cerrar al hacer click fuera del popup
  document.addEventListener('click', (e) => {
    // ⛔️ Si el click viene del modal (overlay o contenido), no cierres la sidebar
    if (e.target.closest('.idea-modal') || e.target.closest('.idea-modal-overlay')) {
      return;
    }

    if (!popup.contains(e.target)) {
      popup.classList.add('is-collapsed');
      if (tab) tab.setAttribute('aria-expanded', 'false');
    }
  });

  // Evitar que clicks dentro del popup lo cierren
  popup.addEventListener('click', (e) => e.stopPropagation());

  // Abrir/cerrar con la lengüeta
  if (tab) {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      const collapsed = popup.classList.toggle('is-collapsed');
      tab.setAttribute('aria-expanded', String(!collapsed));
      tab.setAttribute('aria-label', collapsed ? 'Mostrar panel' : 'Ocultar panel');
    });
  }
}

async function markIdeaProcessed(emailId, ideaText, state) {
  const body = { email_id: emailId, idea: ideaText, processed: true };
  if (state) body.state = state;
  const res = await fetchWithAuth('/emails/past/mark_idea', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json(); // { remaining, deleted }
}

function removeIdeaFromSidebar(emailId, ideaText){
  const list = document.querySelector('.info-sidebar.is-popup .info-messages');
  if (!list) return;
  const btn = list.querySelector(`.info-message[data-email-id="${CSS.escape(emailId)}"][data-idea="${CSS.escape(ideaText)}"]`);
  if (btn) btn.closest('.info-item')?.remove();
}


let _escCloser = null;
function openIdeaModal({ emailId, idea, subject, sender, date, bodyHtml }) {
  closeIdeaModal(); // cierra si hay uno

  const overlay = document.createElement('div');
  overlay.className = 'idea-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const modal = document.createElement('div');
  modal.className = 'idea-modal';

  // HEADER
  const header = document.createElement('div');
  header.className = 'idea-modal-header';
  header.innerHTML = `
    <div class="idea-modal-title">
      <h3>Completar información</h3>
      <p>A continuacion, podras interpretar la información que le ha faltado al bot en este correo para poder reescribir la pregunta si estuviera mal formulada, y responderla con la información que creas que puede venir bien para responder la siguiente vez. Basicamente, como si crearamos un bloque de preguntas frecuentes, las preguntas que escribas aqui, se guardarán en esa sección. (si ves que la pregunta no tiene sentido,<strong> eliminala</strong>)</p>
    </div>
    <button type="button" class="idea-modal-close" aria-label="Cerrar">&times;</button>
  `;

  // BODY → 2 columnas
  const body = document.createElement('div');
  body.className = 'idea-modal-body';

  // LEFT: email entrante
  const left = document.createElement('div');
  left.className = 'idea-left';
  // ⚠️ CAMBIO: sender y subject pueden estar ausentes (campos condicionales)
  left.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-header-content" style="justify-content: space-between;">
          <p>
            <span>${sender ? escapeHTML(sender) : '(sin remitente)'}</span>
            <strong>${subject ? escapeHTML(subject) : '(sin asunto)'}</strong>
          </p>
          <span>${date ? formatDateHint(date) : ''}</span>
        </div>
      </div>
      <div class="panel-scroll">
        <div id="ideaEmailBody"></div>
      </div>
    </div>
  `;

  // RIGHT: formulario
  const right = document.createElement('div');
  right.className = 'idea-right';
  right.innerHTML = `
    <div class="idea-card" 
         data-email-id="${escapeHTML(emailId || '')}"
         data-original-idea="${escapeHTML(idea || '')}">
      <div class="idea-question-row">
        <h4 class="idea-question" title="${escapeHTML(idea || '')}">
          ${escapeHTML(idea || 'Idea sin título')}
        </h4>
        <button type="button" class="idea-edit-btn" aria-label="Editar pregunta" title="Editar">Editar</button>
      </div>

      <label class="idea-label">Añade la información:</label>
      <textarea class="idea-textarea" placeholder="Escribe aquí la información que falta…" rows="10"></textarea>
      <div class="idea-actions">
        <button type="button" class="btn btn-save">Guardar</button>
        <button type="button" class="btn btn-delete">Eliminar</button>
      </div>
    </div>
  `;

  body.append(left, right);
  modal.append(header, body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Render del email
  const container = left.querySelector('#ideaEmailBody');
  renderHtmlEmail(container, bodyHtml || '', '');

  // Cerrar por X / overlay
  const closeBtn = header.querySelector('.idea-modal-close');
  const stopIt = (e) => e.stopPropagation();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { e.stopPropagation(); closeIdeaModal(); } else { e.stopPropagation(); } });
  modal.addEventListener('click', stopIt);
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeIdeaModal(); });
  _escCloser = (ev) => { if (ev.key === 'Escape') closeIdeaModal(); };
  document.addEventListener('keydown', _escCloser);

  // ====== Handlers internos (EDITAR / GUARDAR / ELIMINAR) ======
  const cardEl = right.querySelector('.idea-card');
  const qEl    = right.querySelector('.idea-question');
  const editBt = right.querySelector('.idea-edit-btn');
  const saveBt = right.querySelector('.btn.btn-save');
  const delBt  = right.querySelector('.btn.btn-delete');
  const answerEl = right.querySelector('.idea-textarea');
  const emailId_ = cardEl.dataset.emailId;
  const origIdea = cardEl.dataset.originalIdea;

  attachCounterForContentEditable(qEl, LIMITS.faq_q);
  attachCounter(answerEl, LIMITS.faq_a);

  function enterEdit(){
    qEl.setAttribute('contenteditable','true');
    qEl.classList.add('editing-underline');
    editBt.classList.add('is-editing');
    editBt.textContent = 'Listo';
    editBt.setAttribute('aria-label','Terminar edición');
    editBt.title = 'Terminar edición';
    qEl.focus();
    const sel = window.getSelection?.(); const range = document.createRange?.();
    if(sel && range){ range.selectNodeContents(qEl); sel.removeAllRanges(); sel.addRange(range); }
  }
  function leaveEdit(){
    qEl.removeAttribute('contenteditable');
    qEl.classList.remove('editing-underline');
    editBt.classList.remove('is-editing');
    editBt.textContent = 'Editar';
    editBt.setAttribute('aria-label','Editar pregunta');
    editBt.title = 'Editar';
  }
  editBt.addEventListener('click', () => {
    const isEditing = qEl.getAttribute('contenteditable') === 'true';
    if (isEditing) leaveEdit(); else enterEdit();
  });
  qEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); leaveEdit(); }
  });

  async function appendFAQEntry(question, answer, marks = {}) {
    const payload = {
      question: (question || '').trim(),
      answer: (answer || '').trim(),
      is_na: Boolean(marks.isNA || marks.invalid) // alias para "inválido"
    };

    const r = await fetchWithAuth('/policies/append-faq-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();

    // Si el back decidió ignorarlo (p. ej. porque todo era “inválido” tras el saneado)
    if (j?.status === 'ignored') {
      notify.warning(t('info.faqEntryDiscarded'));
      if (Array.isArray(j?.ignored_info) && j.ignored_info.length) {
        console.warn('FAQ ignored_info:', j.ignored_info);
      }
      return; // no seguimos: no se guardó
    }

    if (j?.status !== 'complete') {
      throw new Error('Respuesta inesperada al guardar FAQ');
    }

    // Aviso si hubo trozos filtrados
    const ignored = j?.ignored_info || j?.ignoredInfo;
    if (Array.isArray(ignored) && ignored.length) {
      notify.warning(t('info.invalidPartsIgnored'));
      console.warn('FAQ ignored_info:', ignored);
    }

  }


  // VALIDACIÓN + acciones
  saveBt.addEventListener('click', async () => {
    const newQuestion = (qEl.textContent || '').trim();
    const answer = (answerEl.value || '').trim();

    if (!newQuestion){
      notify.warning(t('info.questionCannotBeEmpty'));
      enterEdit(); // ayuda a que el usuario la edite
      return;
    }
    if (!answer){
      notify.warning(t('info.addAnswer'));
      answerEl.focus();
      return;
    }
    if (newQuestion.length > LIMITS.faq_q){
      notify.warning(t('info.questionExceedsLimit').replace('{limit}', LIMITS.faq_q));
      enterEdit();
      return;
    }
    if (answer.length > LIMITS.faq_a){
      notify.warning(t('info.answerExceedsLimit').replace('{limit}', LIMITS.faq_a));
      answerEl.focus();
      return;
    }

    try{
      await appendFAQEntry(newQuestion, answer);
      const r = await markIdeaProcessed(emailId_, origIdea, 'usado');
      // ⚠️ CAMBIO: el backend ya NO elimina docs (deleted siempre false)
      // Solo miramos remaining para saber si apagar el flag
      if ((r?.remaining ?? 0) === 0) reflectPendingIdeasUI(false);
      removeIdeaFromSidebar(emailId_, origIdea);
      notify.success(t('info.questionSaved'));
      closeIdeaModal();
    }catch(e){
      console.error(e);
      notify.error('No se pudo guardar la FAQ');
    }
  });

  delBt.addEventListener('click', async () => {
    try{
      const r = await markIdeaProcessed(emailId_, origIdea, 'eliminado');
      // ⚠️ CAMBIO: el backend ya NO elimina docs (deleted siempre false)
      // Solo miramos remaining para saber si apagar el flag
      if ((r?.remaining ?? 0) === 0) reflectPendingIdeasUI(false);
      removeIdeaFromSidebar(emailId_, origIdea);
      notify.success('Idea eliminada de pendientes');
      closeIdeaModal();
    }catch(e){
      console.error(e);
      notify.error('No se pudo eliminar la idea');
    }
  });
}


function closeIdeaModal() {
  const overlay = document.querySelector('.idea-modal-overlay');
  if (overlay) overlay.remove();
  if (_escCloser) {
    document.removeEventListener('keydown', _escCloser);
    _escCloser = null;
  }
}

// Sanitizador simple: quita <script> y on*=
function sanitizeHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';

  // elimina scripts
  tmp.querySelectorAll('script, iframe').forEach(n => n.remove());
  // elimina on* handlers
  tmp.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => {
      if (/^on/i.test(a.name)) el.removeAttribute(a.name);
      // evita javascript: en href/src
      if ((a.name === 'href' || a.name === 'src') && /^javascript:/i.test(a.value)) {
        el.removeAttribute(a.name);
      }
    });
  });
  return tmp.innerHTML;
}


/* ──────────────────────────────────────────────────────────────
 * Fin
 * ────────────────────────────────────────────────────────────── */
