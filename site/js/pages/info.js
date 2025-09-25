// js/pages/info.js

import { fetchWithAuth } from '/js/utils/api.js';
import { initSidebar } from '/js/components/sidebar.js';
import { enforceProfileGate } from '/js/utils/profile-gate.js';
import { enforceSessionGate } from '/js/utils/session-gate.js';
import { notify } from '/js/utils/notify.js';

enforceSessionGate();
enforceProfileGate();

document.addEventListener('DOMContentLoaded', () => {
  initSidebar('#sidebarContainer');
  setupCards();
});

/* ──────────────────────────────────────────────────────────────
 * Helpers de UI
 * ────────────────────────────────────────────────────────────── */

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
  const title = card.querySelector('h2')?.textContent?.trim() || '';
  // FAQ
  if (title === 'Preguntas Frecuentes') {
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
  initPolicySubmit(card, form, title);
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

function initPolicySubmit(card, form, policyTitle) {
  const sendBtn = form.querySelector('.pf-submit');
  const spinner = form.querySelector('.loading-spinner');
  const arrow   = card.querySelector('.arrow-collapse');

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
      notify.error('La política pegada supera el máximo de 6000 caracteres.');
      pastedEl?.focus();
      return;
    }

    const data = readActiveFields(form);
    const text = composePolicyText(form.getAttribute('data-form-type'), data);

    // Se permite guardar aunque el texto compuesto esté vacío si el usuario
    // aporta su política pegada. Pero al menos una de las dos debe existir.
    if (!text && !pastedPolicy) {
      notify.error('Añade información en el formulario o pega tu política.');
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
        body: JSON.stringify({ policy_type: policyTitle, content: JSON.stringify(envelope) })
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();

      if (payload?.status === 'complete') {
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
        p.textContent = '¡Felicidades, ya se ha guardado tu información! 🎉';
        p.style.textAlign = 'center';
        p.style.fontWeight = 'bold';
        p.style.fontSize = '2rem';
        result.appendChild(p);

        // Llevar el mensaje a la vista
        setTimeout(() => { result.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 0);
      } else {
        notify.error('Se ha guardado la política parcialmente, algunas reglas se han obviado.');
      }
    } catch (err) {
      console.error(err);
      notify.error('Error al guardar la política.');
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

      if (!q) { notify.warning(`Falta la pregunta en el bloque #${i + 1}`); qEl?.focus(); return; }
      if (!a) { notify.warning(`Falta la respuesta en el bloque #${i + 1}`); aEl?.focus(); return; }

      faqs.push({ question: q, answer: a });
    }
    if (!faqs.length) { notify.error('Añade al menos una pregunta.'); return; }

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
      if (data?.status === 'complete') {
        wasSuccess = true;
        // Ocultamos formulario
        container.classList.add('hidden');
        sendBtn.classList.add('hidden');
        tip?.classList.add('hidden');

        result.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = '¡Felicidades, ya se ha guardado tu información! 🎉';
        p.style.textAlign = 'center';
        p.style.fontWeight = 'bold';
        p.style.fontSize = '2rem';
        result.appendChild(p);
      } else {
        notify.error('Respuesta inesperada al guardar FAQs.');
      }
    } catch (err) {
      console.error(err);
      notify.error('Error al guardar FAQs.');
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
  const ta = block.querySelector('.faq-answer');
  ta.value = answer || '';
  // Ajusta altura inicial si hay contenido precargado
  setTimeout(() => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }, 0);
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
  const title = card.querySelector('h2')?.textContent?.trim() || '';
  // FAQ: recarga siempre para reflejar cambios
  if (title === 'Preguntas Frecuentes') {
    await prefillFAQ(card);
    return;
  }

  const form = card.querySelector('form.policy-form');
  if (!form) return;

  try {
    const res = await fetchWithAuth(`/policies/get?policy_name=${encodeURIComponent(title)}`, { method: 'GET' });
    const data = await res.json();
    if (!data?.found) return;

    const raw = data.content;
    if (typeof raw !== 'string') return;

    let state = null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.__schema === 'policy-v1') state = parsed;
    } catch { /* legacy texto plano, sin prefill */ }

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

/* ──────────────────────────────────────────────────────────────
 * Fin
 * ────────────────────────────────────────────────────────────── */
