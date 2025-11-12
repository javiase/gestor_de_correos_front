// js/pages/email.js
import { initSidebar } from '/js/components/sidebar.js';
import { fetchWithAuth } from '/js/utils/api.js';
import { LIMITS } from '/js/config.js?v=1';
import { enforceFlowGate, getStoreCached } from '/js/utils/flow-gate.js';
import { notify } from '/js/utils/notify.js';

enforceFlowGate();

// Límites prudentes (≈25MB Gmail, dejamos margen por base64)
const GMAIL_MAX_TOTAL_BYTES = 24 * 1024 * 1024; // ~24 MiB total
const GMAIL_MAX_PER_FILE    = 24 * 1024 * 1024; // ~24 MiB por archivo

function formatBytes(n){
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(1)} MB`;
}

// === ICONOS SVG PARA ADJUNTOS (inline, super ligeros) ===
const ATT_SVGS = {
  img: `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="200" height="200" rx="30" fill="#0097a7"/>
  <circle cx="150" cy="58" r="16" fill="white"/>
  <path d="M28 160 L88 88 Q94 80 102 92 L120 118 Q128 130 142 122 L172 160 Z" fill="white"/>
</svg>
  `,
  csv: `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="200" height="200" rx="30" fill="#388e3c"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-size="80" font-weight="bold" fill="white" font-family="Arial, sans-serif">CSV</text>
</svg>
  `,
  pdf: `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="200" height="200" rx="30" fill="#d32f2f"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-size="80" font-weight="bold" fill="white" font-family="Arial, sans-serif">PDF</text>
</svg>
  `,
  doc: `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="200" height="200" rx="30" fill="#1976d2"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-size="80" font-weight="bold" fill="white" font-family="Arial, sans-serif">DOC</text>
</svg>
  `,
  txt: `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="200" height="200" rx="30" fill="#616161"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-size="80" font-weight="bold" fill="white" font-family="Arial, sans-serif">TXT</text>
</svg>
  `,
  other: `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="200" height="200" rx="30" fill="#455A64"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-size="64" font-weight="bold" fill="white" font-family="Arial, sans-serif">FILE</text>
</svg>
  `
};

async function openAttachmentAuth(a, emailId){

  const baseUrl =
    a.url ||
    `/emails/attachment?email_id=${encodeURIComponent(emailId)}&att_id=${encodeURIComponent(a.attachmentId)}`;

  try {
    const res = await fetchWithAuth(baseUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const ctHeader = (res.headers.get('Content-Type') || '').toLowerCase();
    let blob = await res.blob();

    // Si el tipo viene vacío/genérico, corrígelo con el Content-Type o con el mime conocido
    const fallbackType = ctHeader || (a.mimeType || '');
    if (!blob.type || blob.type === '' || blob.type === 'application/octet-stream') {
      const ab = await blob.arrayBuffer();
      blob = new Blob([ab], { type: fallbackType || 'application/octet-stream' });
    }

    const mime = (blob.type || fallbackType || 'application/octet-stream').toLowerCase();
    const blobUrl = URL.createObjectURL(blob);
    const fileName = a.filename || 'archivo';

    if (mime.startsWith('image/')) {
      ensurePreviewUI();
      showAttachmentPreview({ url: blobUrl, mime, filename: fileName, kind: 'image' });
      return;
    }
    if (mime === 'application/pdf' || /\.pdf$/i.test(fileName)) {
      ensurePreviewUI();
      showAttachmentPreview({ url: blobUrl, mime: 'application/pdf', filename: fileName, kind: 'pdf' });
      return;
    }

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;            // ← fuerza descarga
    // iOS/Safari necesita que esté en el DOM
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Limpieza
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  } catch (err) {
    console.error('Adjunto no accesible:', err);
    notify?.error?.('No se pudo abrir/descargar el archivo.');
  }
}

// === PREVIEW POPUP (imágenes / PDF) ===
let __preview = null;

function ensurePreviewUI(){
  if (__preview) return;
  const wrap = document.createElement('div');
  wrap.id = 'attPreviewBackdrop';
  wrap.innerHTML = `
    <div class="attpv-backdrop" data-action="close"></div>
    <div class="attpv-modal" role="dialog" aria-modal="true" aria-label="Vista previa">
      <div class="attpv-toolbar">
        <div class="left">
          <button class="attpv-btn" data-action="zoom-out" title="Alejar">-</button>
          <button class="attpv-btn" data-action="zoom-in" title="Acercar">+</button>
          <button class="attpv-btn" data-action="zoom-reset" title="Tamaño 100%">100%</button>
          <button class="attpv-btn" data-action="zoom-fit" title="Ajustar a ventana">Ajustar</button>
        </div>
        <div class="center"><span class="attpv-title"></span></div>
        <div class="right">
          <button class="attpv-btn" data-action="close" title="Cerrar">✕</button>
        </div>
      </div>
      <div class="attpv-viewport">
        <div class="attpv-canvas"></div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const state = {
    scale: 1,
    fit: false,
    url: null,
    kind: null,
  };

  const qs = (sel) => wrap.querySelector(sel);
  const titleEl = qs('.attpv-title');
  const canvas  = qs('.attpv-canvas');
  const viewport= qs('.attpv-viewport');

  function applyScale(newScale){
    state.scale = Math.max(0.1, Math.min(8, newScale || 1));
    canvas.style.transform = `scale(${state.scale})`;
  }

  function zoomFit(){
    state.fit = true;
    // Para "ajustar", dejamos scale=1 y que el contenido limite por CSS (max-width/height)
    applyScale(1);
  }

  function zoomReset(){
    state.fit = false;
    applyScale(1);
  }

  function cleanupUrl(){
    if (state.url) {
      try { URL.revokeObjectURL(state.url); } catch(e) {}
      state.url = null;
    }
  }

  function close(){
    cleanupUrl();
    canvas.innerHTML = '';
    wrap.classList.remove('open');
    state.scale = 1;
    state.fit   = false;
    state.kind  = null;
  }

  wrap.addEventListener('click', (e) => {
    const a = (e.target && e.target.getAttribute && e.target.getAttribute('data-action')) || '';
    if (a === 'close') {
      close();
      e.preventDefault();
    }
  });

  wrap.querySelector('[data-action="zoom-in"]').addEventListener('click', () => {
    state.fit = false;
    applyScale(state.scale * 1.2);
  });
  wrap.querySelector('[data-action="zoom-out"]').addEventListener('click', () => {
    state.fit = false;
    applyScale(state.scale / 1.2);
  });
  wrap.querySelector('[data-action="zoom-reset"]').addEventListener('click', zoomReset);
  wrap.querySelector('[data-action="zoom-fit"]').addEventListener('click', zoomFit);

  // Wheel-zoom (Ctrl+rueda o trackpad pinch emulado)
  viewport.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      state.fit = false;
      const delta = e.deltaY > 0 ? (1/1.15) : 1.15;
      applyScale(state.scale * delta);
    }
  }, { passive:false });

  // Drag para desplazar (cuando el contenido es más grande)
  let dragging = false, sx=0, sy=0, sl=0, st=0;
  viewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    sl = viewport.scrollLeft; st = viewport.scrollTop;
    viewport.classList.add('dragging');
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    viewport.classList.remove('dragging');
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    viewport.scrollLeft = sl - (e.clientX - sx);
    viewport.scrollTop  = st - (e.clientY - sy);
  });

  __preview = {
    el: wrap,
    titleEl,
    canvas,
    viewport,
    state,
    applyScale,
    zoomFit,
    zoomReset,
    close,
    setContent({ url, kind, filename }){
      cleanupUrl();
      state.url = url;
      state.kind = kind;
      titleEl.textContent = filename || '';
      canvas.innerHTML = '';

      if (kind === 'image') {
        const img = document.createElement('img');
        img.src = url;
        img.alt = filename || 'imagen';
        img.className = 'attpv-img';
        canvas.appendChild(img);
      } else if (kind === 'pdf') {
        // Iframe con el PDF (el scale se aplica al canvas contenedor)
        const frame = document.createElement('iframe');
        frame.className = 'attpv-pdf';
        frame.src = url;
        frame.setAttribute('title', filename || 'PDF');
        frame.setAttribute('loading', 'lazy');
        canvas.appendChild(frame);
      }

      // Estado inicial: "Ajustar"
      __preview.zoomFit();
      wrap.classList.add('open');
      // Asegura que el scroll arranca centrado arriba
      requestAnimationFrame(() => {
        __preview.viewport.scrollTop = 0;
        __preview.viewport.scrollLeft = 0;
      });
    }
  };

  // Cerrar con ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.classList.contains('open')) {
      __preview.close();
    }
  });
}

function showAttachmentPreview({ url, mime, filename, kind }){
  ensurePreviewUI();
  __preview.setContent({ url, kind, filename });
}

function svgForKind(kind){ return ATT_SVGS[kind] || ATT_SVGS.other; }

function escRe(s) { return (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function stripInlineImages(html = '', attachments = []) {
  let out = html || '';
  // Quita <img> que apunten a cid:, a tu endpoint /emails/attachment?att_id=…,
  // o que contengan el filename del adjunto inline.
  attachments.forEach(a => {
    if (!a || a.inline !== true) return;

    if (a.contentId) {
      const reCid = new RegExp(
        `<img\\b[^>]*\\bsrc\\s*=\\s*["']\\s*cid:\\s*<?${escRe(a.contentId)}>?["'][^>]*>`,
        'gi'
      );
      out = out.replace(reCid, '');
    }
    if (a.attachmentId) {
      const reAtt = new RegExp(
        `<img\\b[^>]*\\bsrc\\s*=\\s*["'][^"']*?/emails/attachment[^"']*?att_id=${escRe(a.attachmentId)}[^"']*?["'][^>]*>`,
        'gi'
      );
      out = out.replace(reAtt, '');
    }
    if (a.filename) {
      const reFile = new RegExp(
        `<img\\b[^>]*\\bsrc\\s*=\\s*["'][^"']*?${escRe(a.filename)}[^"']*?["'][^>]*>`,
        'gi'
      );
      out = out.replace(reFile, '');
    }
  });

  // Además, como red de seguridad: elimina cualquier <img src="cid:...">
  out = out.replace(/<img\b[^>]*\bsrc\s*=\s*["']\s*cid:[^"']+["'][^>]*>/gi, '');
  return out;
}

function enforceContentEditableMax(el, max) {
  let lastHtml = el.innerHTML;
  el.addEventListener('beforeinput', (e) => {
    const plain = (el.textContent || '');
    // Permite borrado/navegación sin límite
    if (e.inputType.startsWith('delete') || e.inputType === 'historyUndo' || e.inputType === 'historyRedo') return;
    // Si ya estás en el límite, cancela nuevas entradas
    if (plain.length >= max) {
      e.preventDefault();
    }
  });
  el.addEventListener('input', () => {
    // Guarda último HTML válido por si quieres tener undo manual
    lastHtml = el.innerHTML;
  });
}

function getAttachmentKind(a){
  const mime = (a.mimeType || '').toLowerCase();
  const name = (a.filename || '').toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return 'img';
  if (mime === 'application/pdf' || /\.pdf$/.test(name)) return 'pdf';
  if (mime.includes('msword') || mime.includes('officedocument.word') || /\.(docx?|rtf)$/.test(name)) return 'doc';
  if (mime.includes('excel') || mime.includes('spreadsheet') || /\.(xlsx?)$/.test(name)) return 'csv'; // sin icono xls → usa csv
  if (/\.csv$/.test(name)) return 'csv';
  if (/\.txt$/.test(name)) return 'txt';
  return 'other';
}

function analyzeEmailHtml(rawHtml = "") {
  const h = (rawHtml || "").toLowerCase();
  if (!h.trim()) return { isStructured:false, preferWhite:false };

  let score = 0;

  // 1) Maquetación clásica de newsletters
  const tableCount = (h.match(/<table\b/gi) || []).length;
  if (tableCount >= 2) score += 2;           // varias tablas
  if (h.includes('<!--[if mso]')) score += 2; // hacks de Outlook
  if (/\bwidth\s*=\s*["']?5\d{2,3}["']?/.test(h) || /width\s*:\s*5\d{2,3}px/.test(h)) score += 1; // 500-799px
  if (/margin\s*:\s*0\s*auto/.test(h)) score += 1; // centrado típico

  // 2) Complejidad visual
  const styleCount = (h.match(/style=/gi) || []).length;
  if (styleCount >= 12) score += 1;
  if (styleCount >= 25) score += 1;

  // 3) Botones y badges
  if (/<a[^>]+(background|border-radius|display:\s*inline-block|padding:\s*[^;]{2,})/i.test(h)) score += 1;

  // 4) Imágenes grandes de cabecera / logos anchos
  if (/<img[^>]+(width=["']?[34-7]\d{2}["']?|style=["'][^"']*width:\s*[34-7]\d{2}px)/i.test(h)) score += 1;

  // 5) Atributos “email HTML antiguo”
  if (/\balign=["']?center|valign=["']?top|bgcolor=|cellpadding=|cellspacing=/i.test(h)) score += 1;

  // 6) Señales claras de wrapper claro
  const hasWhiteBg =
    /\bbgcolor=['"]?#?fff/i.test(h) ||
    /background(-color)?:\s*#?fff/i.test(h) ||
    /rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/.test(h);

  // 7) ¿Parece casi texto plano?
  const tagNames = (h.match(/<([a-z0-9-]+)/gi) || []).map(m => m.replace('<',''));
  const nonTrivial = tagNames.filter(t => !['p','br','a','span','strong','em','b','i'].includes(t));
  const looksPlain = tableCount === 0 && nonTrivial.length <= 2 && styleCount < 6;

  const isStructured = !looksPlain && (score >= 3);
  const preferWhite  = hasWhiteBg; // si declara blancos, mejor blanco

  return { isStructured, preferWhite };
}

// Detecta plantilla clara y decide estilos del iframe según el tema del usuario
function renderHtmlEmail(container, rawHtml, fallbackText = '', attachments = []) {
  // ——— 1) Tema del usuario ———
  // usa data-theme="light|dark|auto" si lo tenéis; si no, cae a prefers-color-scheme
  const appThemeAttr =
    document.documentElement.getAttribute('data-theme') || 'dark';
  const systemDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const appTheme = appThemeAttr === 'auto'
    ? (systemDark ? 'dark' : 'light')
    : appThemeAttr; // 'light' | 'dark'

  const { isStructured, preferWhite } = analyzeEmailHtml(rawHtml || '');
  // Regla:
  //  - si hay estructura → SIEMPRE blanco (como Gmail)
  //  - si no hay estructura → usa el tema del usuario, salvo que el HTML pida explícitamente blanco
  const useWhite = isStructured || preferWhite || appTheme === 'light';
  const bg = useWhite ? '#ffffff' : '#2a2a2a';
  const fg = useWhite ? '#111111' : '#e6e6e6';

  // ——— 3) Sanitiza el HTML del email ———
  let innerHtml;
  if (rawHtml && rawHtml.trim()) {
    const stripped = stripInlineImages(rawHtml, attachments);
    // Si NO está estructurado, lo envolvemos en el wrapper para que herede estilos del bot
    innerHtml = isStructured
      ? stripped
      : `<div class="panel-content">${stripped}</div>`;
  } else {
    // Texto plano → conviértelo en <p> y envuélvelo
    const paragraphs = (fallbackText || '')
      .split('\n')
      .map(p => `<p>${p}</p>`)
      .join('');
    innerHtml = `<div class="panel-content" id="receivedContent">${paragraphs}</div>`;
  }

  // ——— 4) Optimización: Si el HTML es muy grande (>50KB), usar loading diferido ———
  const htmlSize = innerHtml.length;
  const isLargeEmail = htmlSize > 50000;

  if (isLargeEmail) {
    // Mostrar indicador de carga
    container.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #9ca3af;">
        <div style="margin-bottom: 1rem;">
          <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
        </div>
        <div>Cargando email grande (${Math.round(htmlSize / 1024)}KB)...</div>
      </div>
    `;
  }

  // Sanitizar en el siguiente frame para no bloquear UI
  requestAnimationFrame(() => {
    const safeHtml = DOMPurify.sanitize(innerHtml, {
      ALLOW_UNKNOWN_PROTOCOLS: true,
      ADD_TAGS: ['style','svg','path'],
      ADD_ATTR: ['style','target','align','border','cellpadding','cellspacing','background'],
      FORBID_TAGS: ['script','iframe','object','embed','form'],
    });

    // CSS base + overrides de tema
    const baseCSS = `
    :root { color-scheme: ${useWhite ? 'light' : 'dark'}; }
    html,body {
      margin:0 !important; padding:0 !important;
      background:${bg} !important; color:${fg} !important;
      font:14px/1.45 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    }
    a:not([class*="btn"]):not([class*="button"]):not([role="button"])
      :not([style*="background"]):not([style*="padding"]):not([style*="border-radius"]) {
      color: inherit !important;
      text-decoration: underline;
    }

    /* Estado visitado/activo igual */
    a:visited, a:active {
      color: inherit !important;
    }

    /* Hover suave */
    a:hover { opacity: .85; text-decoration: underline; }
    img { max-width:100% !important; height:auto !important; border:0; outline:0; }
    img[src^="cid:"] { display:none !important; }
    img[src*="/emails/attachment"] { display:none !important; }
    table { border-collapse:collapse !important; max-width:100%; }
    blockquote { margin:.5em 0 .5em 1em; padding-left:.8em; border-left:3px solid rgba(0,0,0,.2); }
    hr { border:0; border-top:1px solid rgba(0,0,0,.15); }
    .panel-content {
      /* iguala la “sensación” del bot sin usar vh */
      font-size: 1.2rem;       /* ~15px */
      line-height: 1.45;        /* cómodo para lectura */
      color: inherit;           /* usa fg calculado arriba */
    }
    .panel-content p,
    .panel-content div,
    .panel-content span,
    .panel-content li {
      font: inherit;
      color: inherit;
    }
    .panel-content p { margin: .45em 0; }
    /* En oscuro y email NO claro: evitar texto negro sobre fondo oscuro */
    ${!useWhite ? `
      body, p, div, span, td, li, a, h1, h2, h3, h4, h5, h6 { color:${fg} !important; }
      /* Algunas plantillas fijan bg blancos en celdas: neutralízalos en oscuro */
      table[bgcolor], td[bgcolor],
      div[style*="background"], td[style*="background"],
      table[style*="background-color:#fff"], td[style*="background-color:#fff"],
      table[style*="background-color: #fff"], td[style*="background-color: #fff"] {
        background-color:${bg} !important;
      }
    ` : ``}
  `;

   // --- Skeleton anti-salto: reserva el alto previo ---
  const lastH = parseInt(container.dataset.lastH || '0', 10);
  const currentH = container.offsetHeight || lastH || 160;
  container.style.minHeight = currentH + 'px';

  // CSS base + srcdoc ya construidos arriba…
  const srcdoc = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <base target="_blank">
        <style>${baseCSS}</style>
      </head>
      <body>${safeHtml}</body>
    </html>
  `;

  // --- OPTIMIZACIÓN: Para emails grandes (>50KB), skip probe y renderizar directamente ---
  if (isLargeEmail) {
    const iframe = document.createElement('iframe');
    iframe.className = 'gmail-frame';
    // Removido sandbox para evitar errores de scripts bloqueados
    iframe.style.display = 'block';
    iframe.style.width = '100%';
    iframe.style.border = '0';
    iframe.style.height = '800px'; // altura inicial generosa
    iframe.style.transition = 'height .12s ease';
    
    // Para emails muy grandes, usar Blob URL en lugar de srcdoc
    const blob = new Blob([srcdoc], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    iframe.src = blobUrl;

    container.innerHTML = '';
    container.appendChild(iframe);

    // Ajustar altura una vez cargado
    iframe.addEventListener('load', () => {
      // Limpiar el blob URL después de un tiempo
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      
      if (!iframe.contentWindow) return;
      const idoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!idoc || !idoc.body) return;
      
      setTimeout(() => {
        const h = (idoc.body?.scrollHeight || 800) + 16;
        iframe.style.height = h + 'px';
        container.dataset.lastH = String(h);
        container.style.minHeight = '0';
      }, 150);
    });
    
    return; // Skip probe para emails grandes
  }

  // --- PROBE offscreen: medimos altura real sin pintar nada visible (solo emails pequeños) ---
  const probe = document.createElement('iframe');
  // Removido sandbox para evitar errores de scripts bloqueados
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.width  = container.clientWidth + 'px';
  probe.style.height = '0';
  probe.srcdoc = srcdoc;
  document.body.appendChild(probe);

  probe.addEventListener('load', () => {
    const pdoc = probe.contentDocument || probe.contentWindow.document;
    const measured = ((pdoc?.body?.scrollHeight) || currentH) + 16;
    probe.remove();

    // --- IFRAME REAL: se inserta ya con la altura final ---
    const iframe = document.createElement('iframe');
    iframe.className = 'gmail-frame';
    // Removido sandbox para evitar errores de scripts bloqueados
    iframe.style.display = 'block';
    iframe.style.width = '100%';
    iframe.style.border = '0';
    iframe.style.height = measured + 'px';
    iframe.style.transition = 'height .12s ease';
    iframe.srcdoc = srcdoc;

    container.innerHTML = '';
    container.appendChild(iframe);

    container.dataset.lastH = String(measured);
    requestAnimationFrame(() => { container.style.minHeight = '0'; });

    // Ajustes suaves si cambian cosas dentro (imágenes, fuentes, etc.)
    const fix = () => {
      if (!iframe.contentWindow) return;
      const idoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!idoc || !idoc.body) return;
      const h = (idoc.body?.scrollHeight || measured) + 16;
      iframe.style.height = h + 'px';
      container.dataset.lastH = String(h);
    };

    iframe.addEventListener('load', () => {
      if (!iframe.contentWindow) return;
      const idoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!idoc) return;
      Array.from(idoc.images || []).forEach(img => img.addEventListener('load', fix));
      if ('ResizeObserver' in window && idoc.body) new ResizeObserver(fix).observe(idoc.body);
      setTimeout(fix, 300);
    });
  }); // Cierre del probe.addEventListener('load')
  }); // Cierre del requestAnimationFrame
}

class EmailView {
  constructor() {
    initSidebar('#sidebarContainer');
    this.container = document.getElementById('chatContainer');
    this.prevBtn = null;
    this.nextBtn = null;
    this.isLoading = false; // Estado de carga
    this.shopName = null; // 🆕 Nombre de la tienda Shopify

    const params = new URLSearchParams(location.search);
    this.targetId = params.get('id') || null;

    this.ids = JSON.parse(sessionStorage.getItem('inbox_ids') || '[]');
    this.index = parseInt(sessionStorage.getItem('inbox_index') || '0', 10);
    this.page = parseInt(sessionStorage.getItem('inbox_page') || '1', 10);
    this.loadedPages = new Set();
    this.emailsPerPage = 20; // emails por batch
    this.prefetchThreshold = 5;
    this.pages = 1;       // total de batches disponibles (se rellena al primer fetch)
    this.cache = [];      // aquí replicaremos ids → datos
    this.sendBtn = null;
    this.deleteBtn = null;
    this.anchorId = null;

    // orden heredado del inbox (defaults seguros)
    this.sortOrder = sessionStorage.getItem('inbox_sort')    || 'desc';
    this.sortBy    = sessionStorage.getItem('inbox_sort_by') || 'id';

    this.init();
  }

  // Muestra spinner y oculta todo el contenido
  showLoading() {
    this.isLoading = true;
    
    // Ocultar todas las tarjetas y contenido
    const gridContainer = document.querySelector('.grid-container');
    const historyContainer = document.getElementById('historyContainer');
    
    if (gridContainer) {
      gridContainer.style.visibility = 'hidden';
      gridContainer.style.opacity = '0';
    }
    
    if (historyContainer) {
      historyContainer.style.visibility = 'hidden';
      historyContainer.style.opacity = '0';
    }
    
    const rightSidebar = document.querySelector('.right-sidebar');
    if (rightSidebar) {
      rightSidebar.classList.add('collapsed');
      rightSidebar.style.visibility = 'hidden';
    }

    // Mostrar spinner en el contenedor principal
    const chat = document.getElementById('chatContainer');
    const existingSpinner = chat.querySelector('.email-loading-spinner');
    if (!existingSpinner) {
      const spinner = document.createElement('div');
      spinner.className = 'email-loading-spinner';
      spinner.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 1rem;">
          <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #6b7280;"></i>
          <div style="color: #9ca3af; font-size: 1rem;">Cargando correo...</div>
        </div>
      `;
      chat.appendChild(spinner);
    }
  }

  // Oculta spinner y muestra todo el contenido
  hideLoading() {
    this.isLoading = false;
    
    // Quitar spinner
    const chat = document.getElementById('chatContainer');
    const spinner = chat.querySelector('.email-loading-spinner');
    if (spinner) {
      spinner.remove();
    }

    // Mostrar todas las tarjetas con transición suave
    const gridContainer = document.querySelector('.grid-container');
    const historyContainer = document.getElementById('historyContainer');
    
    if (gridContainer) {
      gridContainer.style.visibility = 'visible';
      gridContainer.style.opacity = '1';
    }
    
    if (historyContainer) {
      historyContainer.style.visibility = 'visible';
      historyContainer.style.opacity = '1';
    }

    // Mostrar sidebar y botón toggle con transición suave
    const rightSidebar = document.querySelector('.right-sidebar');
    const toggleBtn = document.getElementById('toggleRightSidebar');
    
    if (rightSidebar) {
      rightSidebar.style.visibility = 'visible';
      rightSidebar.style.opacity = '1';
    }
    
    if (toggleBtn) {
      toggleBtn.style.visibility = 'visible';
      toggleBtn.style.opacity = '1';
    }
  }

  async init() {
    this.anchorId = null;
    this.anchorDate = null;
    
    // 🆕 Cargar nombre de la tienda Shopify
    try {
      const store = await getStoreCached();
      this.shopName = store?.shopName || 'tu-tienda';
    } catch (e) {
      console.warn('[init] No se pudo obtener el nombre de la tienda:', e);
      this.shopName = 'tu-tienda';
    }
    
    // 1) Construye botones de navegación
    this.buildNavButtons();

    await this.ensureSelectedEmail();

    // **PRE‑FETCH** de siguiente batch si entraste directamente en un correo >=15
    let localPos = this.index % this.emailsPerPage;
    const nextPage = this.page + 1;
    if (
      localPos >= this.emailsPerPage - 5 && // posiciones 15–19
      nextPage <= this.pages &&
      !this.loadedPages.has(nextPage)
    ) {
      await this.loadBatch(nextPage, { replace: false });
      this.loadedPages.add(nextPage);

      // Fija anchor según sort_by y sort (vale para desc y asc)
      if (this.ids && this.ids.length > 0 && !this.anchorId && !this.anchorDate) {
        if (this.sortBy === 'id') {
          // en desc el “más nuevo” está al principio; en asc, al final
          this.anchorId = (this.sortOrder === 'desc') ? this.ids[0] : this.ids[this.ids.length - 1];
        } else if (this.sortBy === 'date') {
          // toma la fecha del primer/último elemento como ancla
          const first = this.cache[0];
          const last  = this.cache[this.cache.length - 1];
          const ref   = (this.sortOrder === 'desc') ? first : last;
          this.anchorDate = ref?.date || null; // ISO/fecha que tengas en los docs
        }
      }
    }

    // **PRE‑FETCH anterior** si index < 5
    const prevPage = this.page - 1;
    if (
      localPos < 5 &&
      prevPage >= 1 &&
      !this.loadedPages.has(prevPage)
    ) {
      // prepend para no desordenar índices
      await this.loadBatch(prevPage, { replace: false, prepend: true });
      this.loadedPages.add(prevPage);
      // desplazamos el índice para seguir apuntando al mismo email
      this.index += this.emailsPerPage;
      // recalculamos posición local (opcional)
      localPos = this.index % this.emailsPerPage;
    }

    this.page = Math.floor(this.index / this.emailsPerPage) + 1;
    sessionStorage.setItem('inbox_page', this.page);

    // 3) Renderiza
    this.renderCurrent();
  }

  // Devuelve true si consigue fijar this.index por id
  setIndexById(id) {
    const pos = this.ids.indexOf(id);
    if (pos !== -1) {
      this.index = pos;
      return true;
    }
    return false;
  }

  async markAsRead(emailId) {
    try {
      if (!emailId) return;
      await fetchWithAuth('/emails/mark_read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: emailId })
      });
    } catch (e) {
      console.warn('No se pudo marcar como leído:', e);
    }
  }

  // Carga la página actual y, si no encuentra targetId, expande a páginas vecinas
  async ensureSelectedEmail() {
    // Carga la página que tenías guardada (o 1 si no existe)
    await this.loadBatch(this.page, { replace: true });
    this.loadedPages.add(this.page);

    // Si no viene id en la URL, conserva el comportamiento anterior
    if (!this.targetId) {
      sessionStorage.setItem('inbox_ids', JSON.stringify(this.ids));
      return;
    }

    // ¿Está ya en la página actual?
    if (this.setIndexById(this.targetId)) {
      sessionStorage.setItem('inbox_ids', JSON.stringify(this.ids));
      return;
    }

    // Necesitaremos saber cuántas páginas hay
    // (this.pages quedó ajustado en loadBatch)
    let radius = 1;
    let found = false;

    // Expande: +1, -1, +2, -2, ...
    while (!found && (this.page - radius >= 1 || this.page + radius <= this.pages)) {
      // Prueba página siguiente
      if (this.page + radius <= this.pages) {
        const p = this.page + radius;
        if (!this.loadedPages.has(p)) {
          await this.loadBatch(p, { replace: false });
          this.loadedPages.add(p);
        }
        if (this.setIndexById(this.targetId)) { found = true; break; }
      }

      // Prueba página anterior (prepend para mantener orden y desplazar ids al frente)
      if (this.page - radius >= 1) {
        const p = this.page - radius;
        if (!this.loadedPages.has(p)) {
          await this.loadBatch(p, { replace: false, prepend: true });
          this.loadedPages.add(p);
        }
        if (this.setIndexById(this.targetId)) { found = true; break; }
      }

      radius++;
    }

    if (!found) {
      console.warn('[email] targetId no encontrado; mostrando primer correo cargado.');
      this.index = 0;
    }

    // Ajusta derivados
    this.page = Math.floor(this.index / this.emailsPerPage) + 1;
    sessionStorage.setItem('inbox_page', this.page);
    sessionStorage.setItem('inbox_index', this.index);
    sessionStorage.setItem('inbox_ids', JSON.stringify(this.ids));
  }

  buildNavButtons() {
    // Ya no creamos nada, tomamos los que has puesto en el HTML
    this.prevBtn = document.getElementById('prevEmail');
    this.nextBtn = document.getElementById('nextEmail');
    this.sendBtn = document.getElementById('sendReply');
    this.deleteBtn = document.getElementById('deleteEmail');
    this.fileInput = document.getElementById('replyFilesInput');
    this.filesPreview = document.getElementById('replyFilesPreview');
    this.pendingFiles = []; // File[]

    this.attachBtn = document.getElementById('attachBtn');
    if (this.attachBtn && this.fileInput) {
      this.attachBtn.addEventListener('click', () => this.fileInput.click());
    }

    if (!this.prevBtn || !this.nextBtn) {
      console.error("No encuentro los botones de navegación en el DOM");
      return;
    }

    this.prevBtn.addEventListener('click', () => this.navigate(-1));
    this.nextBtn.addEventListener('click', () => this.navigate(1));

    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        this.addPendingFiles(files);
        this.fileInput.value = ''; // reset para poder elegir el mismo archivo otra vez
      });
    }

    // acciones de enviar / borrar
    if (this.sendBtn) this.sendBtn.addEventListener('click', () => this.sendReply());
    if (this.deleteBtn) this.deleteBtn.addEventListener('click', () => this.deleteEmail());
  }

  // Añadir y validar adjuntos para la respuesta
  addPendingFiles(files){
    const MAX_FILES = 10;

    let curr = this.pendingFiles.slice();
    for (const f of files){
      if (curr.length >= MAX_FILES) {
        notify?.error?.('Máximo 10 adjuntos.');
        break;
      }

      // 1) Límite por archivo
      if ((f.size || 0) > GMAIL_MAX_PER_FILE){
        notify?.error?.(`"${f.name}" es demasiado grande (${formatBytes(f.size)}). Límite ~24 MB por archivo.`);
        continue; // no lo añadimos
      }

      // 2) Límite total
      const nextTotal = curr.reduce((s, x) => s + (x.size || 0), 0) + (f.size || 0);
      if (nextTotal > GMAIL_MAX_TOTAL_BYTES){
        notify?.error?.(
          `Superas el límite total (~24 MB). Intento con "${f.name}" → ${formatBytes(nextTotal)}`
        );
        continue; // no lo añadimos
      }

      curr.push(f);
    }

    this.pendingFiles = curr;
    this.renderPendingFiles();
  }

  removePendingFile(idx){
    this.pendingFiles.splice(idx,1);
    this.renderPendingFiles();
  }

  renderPendingFiles(){
    if (!this.filesPreview) return;
    // usa el mismo grid de entrantes
    this.filesPreview.classList.add('attachments-grid');
    this.filesPreview.innerHTML = '';

    this.pendingFiles.forEach((f, i) => {
      const kind = getAttachmentKind({ mimeType: f.type, filename: f.name });
      const chip = document.createElement('div');      // div como chip, igual look
      chip.className = 'attachment-chip outgoing';

      chip.innerHTML = `
        <span class="att-icon" aria-hidden="true">${svgForKind(kind)}</span>
        <span class="att-name" title="${f.name}">${f.name}</span>
        <button class="rm" title="Quitar" aria-label="Quitar">x</button>
      `;

      chip.querySelector('.rm').addEventListener('click', () => this.removePendingFile(i));
      this.filesPreview.appendChild(chip);
    });
  }

  async loadBatch(page, { replace = false, prepend = false } = {}) {
    if (!replace && this.loadedPages.has(page)) {
      return;
    }
    let anchorQS = '';
    if (this.sortBy === 'id' && this.anchorId) {
      anchorQS = (this.sortOrder === 'desc')
        ? `&anchor_max_id=${encodeURIComponent(this.anchorId)}`
        : `&anchor_min_id=${encodeURIComponent(this.anchorId)}`;
    } else if (this.sortBy === 'date' && this.anchorDate) {
      anchorQS = (this.sortOrder === 'desc')
        ? `&anchor_max_date=${encodeURIComponent(this.anchorDate)}`
        : `&anchor_min_date=${encodeURIComponent(this.anchorDate)}`;
    }

    const res = await fetchWithAuth(
      `/emails/get?page=${page}&sort=${this.sortOrder}&sort_by=${this.sortBy}${anchorQS}`
    );
    const responseData = await res.json();
    const { emails, pages } = responseData;

    // Log details about each email's shopify_orders
    emails.forEach((email, index) => {
    });
    this.pages = pages;

    const normalized = emails.map(e => ({
      ...e,
      id: e.id ?? e._id
    }));
    if (replace) {
      this.cache = normalized;
      this.ids = normalized.map(e => e.id);
    } else if (prepend) {
      this.cache = normalized.concat(this.cache);
      this.ids = normalized.map(e => e.id).concat(this.ids);
    } else {
      this.cache = this.cache.concat(normalized);
      this.ids = this.ids.concat(normalized.map(e => e.id));
    }

    sessionStorage.setItem('inbox_ids', JSON.stringify(this.ids));
    this.loadedPages.add(page);
  }

  async navigate(dir) {
    // 1) Calcula el nuevo índice y evita salirte de rango
    const newIndex = this.index + dir;
    if (newIndex < 0 || newIndex >= this.ids.length) return;
    this.index = newIndex;
    // 2) Calcula posición local y páginas
    const localPos = this.index % this.emailsPerPage;
    const currentPage = Math.floor(this.index / this.emailsPerPage) + 1;
    const prevPage = currentPage - 1;
    const nextPage = currentPage + 1;
    // 3) On‑demand: carga la página actual si no se había cargado
    if (!this.loadedPages.has(currentPage)) {
      await this.loadBatch(currentPage, { replace: false });
    }

    // 4) Pre‑fetch siguiente si estás en las últimas 5 posiciones
    if (
      localPos >= this.emailsPerPage - 5 &&
      nextPage <= this.pages &&
      !this.loadedPages.has(nextPage)
    ) {
      await this.loadBatch(nextPage, { replace: false });
    }

    // 5) Pre‑fetch anterior si estás en las primeras 5 posiciones
    if (
      localPos < 5 &&
      prevPage >= 1 &&
      !this.loadedPages.has(prevPage)
    ) {
      await this.loadBatch(prevPage, { replace: false, prepend: true });
      // Ajusta el índice para mantener el mismo email “activo”
      this.index += this.emailsPerPage;
    }
    // 6) Renderiza el correo calculado
    this.renderCurrent();

    // 7) Actualiza this.page y sessionStorage, y sustituye la URL
    this.page = Math.floor(this.index / this.emailsPerPage) + 1;
    sessionStorage.setItem('inbox_page', this.page);
    sessionStorage.setItem('inbox_index', this.index);
    history.replaceState({}, '', `?id=${encodeURIComponent(this.ids[this.index])}`);
  }

  renderCurrent() {
    // Mostrar loading al inicio
    this.showLoading();
    
    const id = this.ids[this.index];
    this.markAsRead(id);
    const email = this.cache.find(e => e.id === id);
    if (!email) {
      this.hideLoading();
      return console.error('Email no cargado aún');
    }
    // Flag para evitar llamar hideLoading múltiples veces
    let loadingHidden = false;
    const finishLoading = () => {
      if (loadingHidden) return;
      loadingHidden = true;
      this.hideLoading();
      this.updateRightSidebar(email);
    };

    // Usar requestAnimationFrame para renderizar en el siguiente frame
    requestAnimationFrame(() => {
      // Renderizar todo el contenido
      this.renderEmailContent(email);
      
      // **IMPORTANTE: Esperar a que el iframe del correo entrante esté cargado**
      const checkIframeLoaded = () => {
        const receivedContent = document.getElementById('receivedContent');
        const iframe = receivedContent?.querySelector('iframe.gmail-frame');
        
        if (!iframe) {
          // No hay iframe (es texto plano), ocultar loading directamente
          setTimeout(finishLoading, 100);
          return;
        }

        // Timeout de seguridad: si tarda más de 8 segundos, mostrar igual
        const safetyTimeout = setTimeout(() => {
          console.warn('[checkIframeLoaded] Timeout alcanzado (8s), mostrando contenido');
          finishLoading();
        }, 8000);

        let checkAttempts = 0;
        const maxAttempts = 80; // 80 * 100ms = 8 segundos

        // Verificar si el iframe ya está cargado
        const checkLoad = () => {
          if (loadingHidden) {
            return;
          }
          
          checkAttempts++;
          
          const iframeWin = iframe.contentWindow;
          const iframeDoc = iframeWin?.document;
          if (iframeDoc && iframeDoc.readyState === 'complete' && iframeDoc.body) {
            // Iframe completamente cargado
            clearTimeout(safetyTimeout);
            setTimeout(finishLoading, 100);
          } else if (checkAttempts >= maxAttempts) {
            // Demasiados intentos
            console.warn('[checkLoad] Máximo de intentos alcanzado, mostrando contenido');
            clearTimeout(safetyTimeout);
            finishLoading();
          } else {
            // Todavía cargando, verificar de nuevo
            setTimeout(checkLoad, 100);
          }
        };

        // Agregar listener de load como respaldo
        iframe.addEventListener('load', () => {
          clearTimeout(safetyTimeout);
          setTimeout(finishLoading, 100);
        }, { once: true });

        // También escuchar errores
        iframe.addEventListener('error', (e) => {
          console.error('[iframe.error] Error cargando iframe:', e);
          clearTimeout(safetyTimeout);
          finishLoading();
        }, { once: true });

        // Iniciar verificación
        setTimeout(checkLoad, 100);
      };

      // Dar tiempo suficiente para que el iframe se inserte en el DOM
      setTimeout(checkIframeLoaded, 300);
    });
  }

  renderEmailContent(email) {
    // ——— Historial de conversación ———
    const hist = document.getElementById('historyContainer');
    // si no hay conversación, la ocultamos
    if (!email.conversation || email.conversation.length === 0) {
      hist.style.display = 'none';
      hist.innerHTML = '';
    } else {
      hist.style.display = 'flex';
      hist.innerHTML = '';
      email.conversation.forEach(msg => {
        // contenedor principal
        const mc = document.createElement('div');
        mc.classList.add('mail-container', msg.role); // .client o .bot

        // título
        const title = document.createElement('h4');
        title.textContent = msg.role === 'client'
          ? 'Se recibió'
          : 'Se respondió';
        mc.appendChild(title);

        // panel anidado
        const panel = document.createElement('div');
        panel.className = 'panel';

        // header del panel
        const ph = document.createElement('div');
        ph.className = 'panel-header';
        ph.innerHTML = `
          <div class="panel-header-content" style="justify-content: space-between;">
            <p>${msg.role === 'client' ? 'De:' : 'Para:'}
               ${msg.role === 'client' ? email.sender : ''}</p>
            <span>${this.formatEmailDate(msg.date)}</span>
          </div>
        `;
        panel.appendChild(ph);

        // body del panel
        const ps = document.createElement('div');
        ps.className = 'panel-scroll';
        ps.innerHTML = DOMPurify.sanitize(`
          <div class="panel-content">
            ${msg.message.split('\n').map(p => `<p>${p}</p>`).join('')}
          </div>
        `);
        panel.appendChild(ps);

        // aquí no añadimos footer porque es sólo histórico
        mc.appendChild(panel);
        hist.appendChild(mc);
      });
      // — Aquí añadimos la nota al final —
      const note = document.createElement('div');
      note.className = 'history-note';
      note.style.textAlign = 'center';
      note.innerHTML = '<span style="font-size:1.2em;vertical-align:middle;">&#8593;</span> Historial anterior con cliente. <span style="font-size:1.2em;vertical-align:middle;">&#8593;</span>';
      hist.appendChild(note);
    }
    // vuelca en los IDs de tu HTML
    document.getElementById('emailFrom').textContent =
      'De: ' + ((email.return_mail || '').replace(/^<(.+)>$/, '$1') || 'Desconocido');
    document.getElementById('emailDate').textContent =
      this.formatEmailDate(email.date);
    document.getElementById('emailSubject').textContent =
      'Asunto: ' + (email.subject || '(sin asunto)');

    // Si tenemos HTML real, lo renderizamos en un iframe aislado (como Gmail)
    const rc = document.getElementById('receivedContent');
    rc.innerHTML = ''; // limpio contenedor
    if (email.body_html && email.body_html.trim()) {
      renderHtmlEmail(rc, email.body_html, '', email.attachments || []);
    } else {
      // Fallback a texto plano
      const rec = (email.body || '')
        .split('\n').map(p => `<p>${p}</p>`).join('');
      rc.innerHTML = DOMPurify.sanitize(rec);
    }
    const incomingPanel = rc.closest('.panel');

    // --- Adjuntos visibles (no inline) ---

    // Limpia cualquier grid anterior de este panel (evita “residuos” al navegar)
    const oldAttWrap = incomingPanel?.querySelector('#attachmentsContainer');
    if (oldAttWrap) oldAttWrap.remove();

    const visibleAttachments = (email.attachments || []);

    // Crea e inserta el grid SOLO si hay adjuntos (evita el “salto”)
    if (visibleAttachments.length > 0 && incomingPanel) {
      const attWrap = document.createElement('div');
      attWrap.id = 'attachmentsContainer';
      attWrap.className = 'attachments-grid';
      // debajo del cuerpo recibido
      rc.parentNode.insertBefore(attWrap, rc.nextSibling);

      visibleAttachments.forEach(a => {
        const aEl = document.createElement('a');
        aEl.href = '#';
        aEl.title = a.filename || 'archivo';
        aEl.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (aEl.dataset.opening === '1') return;   // ← reentrancia
          aEl.dataset.opening = '1';
          openAttachmentAuth(a, email.id)
            .catch(err => console.error('openAttachmentAuth error', err))
            .finally(() => { aEl.dataset.opening = '0'; });
        });

        const kind = getAttachmentKind(a);
        aEl.className = 'attachment-chip';
        aEl.innerHTML = `
          <span class="att-icon" aria-hidden="true">${svgForKind(kind)}</span>
          <span class="att-name">${a.filename || 'archivo'}</span>
        `;
        attWrap.appendChild(aEl);
      });
    }

    // --- Footer del panel entrante ---
    // Por defecto está oculto por CSS. Lo mostramos solo si NO hay adjuntos.
    if (incomingPanel) {
      incomingPanel.classList.toggle('show-footer', visibleAttachments.length === 0);
    }

    const respSubj = document.getElementById('responseSubject');
    respSubj.textContent = email.asunto_respuesta;

    // respuesta del bot
    document.getElementById('responseContent').innerHTML =
      (email.texto_combinado || '<p>Sin respuesta</p>')
        .split('\n')
        .map(p => `<p>${p}</p>`)
        .join('');

    const respEl = document.getElementById('responseContent');
    // Si es contentEditable, aplica límite; si fuera <textarea>, usa maxLength
    if (respEl) {
      if (respEl.getAttribute('contenteditable') === 'true' || respEl.isContentEditable) {
        enforceContentEditableMax(respEl, LIMITS.email_body); // 2000
      } else if (respEl.tagName === 'TEXTAREA') {
        respEl.maxLength = LIMITS.email_body;
        // Si traes texto precargado, recórtalo por si acaso
        respEl.value = (respEl.value || '').slice(0, LIMITS.email_body);
      }
    }

    // habilita/deshabilita botones
    this.prevBtn.disabled = this.index === 0;
    this.nextBtn.disabled = this.index === this.ids.length - 1;

    // 🆕 Resetea el checkbox de "cerrar conversación" al navegar entre correos
    const closeConversationCheck = document.getElementById('closeConversationCheck');
    if (closeConversationCheck) {
      closeConversationCheck.checked = false;
    }

    // ——— Scroll automático al “mensaje recibido” ———
    const chat = document.getElementById('chatContainer');
    const hasHistory = hist && hist.style.display !== 'none' && hist.children.length > 0;
    const recib = document.querySelector('.mail-container.actual');

    // Si hay scroll disponible
    if (chat.scrollHeight > chat.clientHeight) {
      if (hasHistory && recib) {
        recib.style.marginTop = '0px';

        // Desplaza para que quede 15% más abajo
        const offset = recib.offsetTop - chat.clientHeight * 0.15;
        chat.scrollTop = Math.max(offset, 0);
      } else {
        // No hay historial → forzamos scroll hacia arriba
        recib.style.marginTop = '2vh';  // Ajusta este valor según el diseño

      }
    }

    // 🆕 RENDERIZAR BARRA LATERAL CON INFORMACIÓN DE SHOPIFY
    this.renderShopifySidebar(email);
  }

  /**
   * Actualiza la visibilidad del sidebar derecho basándose en si hay pedido
   */
  updateRightSidebar(email) {
    const rightSidebar = document.querySelector('.right-sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleBtn = document.getElementById('toggleRightSidebar');
    if (!rightSidebar || !mainContent) return;

    // Expandir sidebar si hay algún pedido (singular o múltiple)
    const hasOrder = this.getSingleOrder(email) || this.hasMultipleOrders(email);
    if (hasOrder) {
      // Hay pedido(s): expandir sidebar
      rightSidebar.classList.remove('collapsed');
      mainContent.classList.add('sidebar-expanded');
      if (toggleBtn) toggleBtn.classList.add('expanded');
    } else {
      // No hay pedido: mantener colapsado
      rightSidebar.classList.add('collapsed');
      mainContent.classList.remove('sidebar-expanded');
      if (toggleBtn) toggleBtn.classList.remove('expanded');
    }
  }

  /**
   * 🆕 Renderiza la barra lateral con diseño limpio y contextual
   */
  renderShopifySidebar(email) {
    // 1️⃣ ========== SETUP SIDEBAR TOGGLE ==========
    const rightSidebar = document.querySelector('.right-sidebar');
    
    // Si no hay pedido (ni singular ni múltiple), colapsar la sidebar
    const hasOrder = this.getSingleOrder(email) || this.hasMultipleOrders(email);
    if (!hasOrder) {
      rightSidebar?.classList.add('collapsed');
    } else {
      rightSidebar?.classList.remove('collapsed');
    }
    
    // Setup del botón toggle
    this.setupSidebarToggle();
    
    // 2️⃣ ========== ENCABEZADO CONTEXTUAL (Badges) ==========
    const headerEl = document.getElementById('contextualHeader');
    const badges = [];
    
    // Badge de estado de conversación
    if (email.conversation_metadata?.status) {
      const status = email.conversation_metadata.status;
      badges.push(`<span class="badge conversation"><i class="fas fa-comments"></i> ${status}</span>`);
    }
    
    // Badge de match Shopify
    if (email.shopify_match) {
      const match = email.shopify_match;
      
      // Mapear confidence string a valores numéricos y clases CSS
      const confidenceMap = {
        'high': { value: 95, class: 'high-confidence', text: 'Alta' },
        'medium': { value: 70, class: 'medium-confidence', text: 'Media' },
        'low': { value: 40, class: 'low-confidence', text: 'Baja' }
      };
      
      const confidenceData = confidenceMap[match.confidence] || { value: 0, class: '', text: match.confidence };
      const matchText = match.matchedBy === 'email' ? 'Pedido conectado por: Email' : 
                        match.matchedBy === 'phone' ? 'Pedido conectado por: Teléfono' : 
                        match.matchedBy === 'order' ? 'Pedido conectado por: Nº pedido' : 'Match';
      
      // Solo mostrar si hay confidence válido
      if (confidenceData.value > 0) {
        badges.push(`<span class="badge match ${confidenceData.class}">
          <i class="fas fa-link"></i> ${matchText} (Confianza ${confidenceData.text})
        </span>`);
      }
    }
    
    // Badges de clases de correo (máximo 2) con colores del inbox
    if (email.clases_de_email && email.clases_de_email.length > 0) {
      const classes = email.badges.slice(0, 2);
      classes.forEach(cls => {
        const badgeClass = this.getEmailClassBadgeClass(cls);
        badges.push(`<span class="badge class ${badgeClass}"><i class="fas fa-tag"></i> ${cls}</span>`);
      });
      if (email.clases_de_email.length > 2) {
        badges.push(`<span class="badge class badge-otros">+${email.clases_de_email.length - 2}</span>`);
      }
    }
    
    headerEl.innerHTML = badges.length > 0 ? badges.join('') : '';

    // 3️⃣ ========== CARD DE PEDIDO ==========
    const orderCard = document.getElementById('orderCard');
    // Detectar si hay múltiples orders (shopify_orders es array)
    if (this.hasMultipleOrders(email)) {
      // Múltiples orders: mostrar selector
      orderCard.innerHTML = this.renderMultipleOrdersSelector(email.shopify_orders, email);
      
      // IMPORTANTE: Setup del selector DESPUÉS de insertar el HTML en el DOM
      // Usar setTimeout para asegurar que el DOM esté actualizado
      setTimeout(() => {
        this.setupOrderSelector(email);
      }, 0);
    } else if (this.getSingleOrder(email)) {
      // Un solo order: renderizar normalmente
      orderCard.innerHTML = this.renderOrderCard(this.getSingleOrder(email), email);
    } else {
      // Sin pedido vinculado
      orderCard.innerHTML = `
        <div class="no-order-banner">
          <i class="fas fa-box-open"></i> Sin pedido vinculado
        </div>
        ${email.shopify_customer ? this.renderOrderSelector(email) : ''}
      `;
    }

    // 3️⃣ ========== CARD DE CLIENTE ==========
    const customerCard = document.getElementById('customerCard');
    
    if (email.shopify_customer) {
      const customer = email.shopify_customer;
      customerCard.innerHTML = this.renderCustomerCard(customer);
    } else {
      customerCard.innerHTML = '<p style="color: #71717a; font-size: 13px; text-align: center; padding: 20px 0;">No hay información del cliente disponible</p>';
    }

    // 4️⃣ ========== PANELES SECUNDARIOS (Acordeones) ==========
    const secondaryPanels = document.getElementById('secondaryPanels');
    const panels = [];
    
    // Panel: Detalles del pedido (solo si hay un único order)
    if (this.getSingleOrder(email) && !this.hasMultipleOrders(email)) {
      panels.push(this.renderOrderDetailsPanel(this.getSingleOrder(email)));
    }
    
    // Panel: Detalles del cliente
    if (email.shopify_customer) {
      panels.push(this.renderCustomerDetailsPanel(email.shopify_customer));
    }
    
    // Panel: Detalles de la conversación
    if (email.conversation_metadata) {
      panels.push(this.renderConversationDetailsPanel(email.conversation_metadata, email.shopify_match));
    }
    
    secondaryPanels.innerHTML = panels.join('');
    
    // Setup de acordeones
    this.setupAccordions();
    
    // 5️⃣ ========== ACTUALIZAR BOTONES DE ACCIÓN ==========
    this.updateActionButtons(email);
  }

  /**
   * Renderiza la card principal del pedido
   */
  renderOrderCard(order, email) {
    const items = order.line_items || [];
    const tracking = order.tracking?.[0];
    this.currency = order.currency || 'EUR';
    
    return `
      <div class="card-title">
        <i class="fas fa-shopping-bag"></i>
        Pedido
      </div>
      
      <div class="order-number-display">
        <div class="order-number-large" onclick="navigator.clipboard.writeText('${order.name || order.order_number}')" title="Click para copiar">
          ${order.name || order.order_number || 'N/A'}
        </div>
        ${order.shopify_id ? `
        <a href="https://admin.shopify.com/store/${this.shopName}/orders/${order.shopify_id}" 
           target="_blank" 
           class="order-link">
          <i class="fas fa-external-link-alt"></i>
          Ver en Shopify
        </a>` : ''}
      </div>
      
      <div class="order-products-list">
        ${items.map(item => {
          const qty = item.quantity || item.qty || 1;
          const refundedQty = item.refundedQty || item.refunded_qty || 0;
          const refundableQty = item.refundableQty || item.refundable_qty || 0;
          const isFullyRefunded = refundedQty > 0 && refundableQty === 0;
          const isPartiallyRefunded = refundedQty > 0 && refundableQty > 0;
          
          return `
        <div class="product-summary-item">
          <div class="product-summary-thumbnail">
            ${item.image ? 
              `<img src="${item.image}" alt="${item.title || 'Producto'}" loading="lazy">` :
              '<i class="fas fa-box"></i>'
            }
          </div>
          <div class="product-summary-content">
            <div class="product-summary-title">${item.title || 'Producto'}</div>
            <div class="product-summary-price-wrapper">
              <div class="product-summary-price">${this.formatPrice(item.price, order.currency)}</div>
              ${isFullyRefunded ? `
              <div class="refund-status fully-refunded">
                <i class="fas fa-undo"></i> Reembolsado
              </div>` : ''}
              ${isPartiallyRefunded ? `
              <div class="refund-status partially-refunded">
                <i class="fas fa-undo"></i> ${refundedQty} reemb. · ${refundableQty} disp.
              </div>` : ''}
            </div>
          </div>
        </div>
          `;
        }).join('')}
        
        <div class="order-total-summary">Total: ${this.formatPrice(order.total_price, order.currency)}</div>
      </div>
      
      <div class="order-details-summary">
        <div class="summary-row">
          <i class="fas fa-calendar-alt"></i>
          <span class="value">${this.formatShopifyDate(order.created_at)}</span>
        </div>
        
        ${order.shipping_address?.city && order.shipping_address?.country ? `
        <div class="summary-row">
          <i class="fas fa-map-marker-alt"></i>
          <span class="value">${order.shipping_address.city}, ${order.shipping_address.country}</span>
        </div>` : ''}
        
        <div class="summary-row">
          <i class="fas fa-truck"></i>
          ${tracking ? 
            `<a href="${tracking.url || '#'}" target="_blank" class="tracking-link">${tracking.number || tracking.code}</a>` :
            '<span class="value" style="color: #71717a;">Sin tracking</span>'
          }
        </div>
      </div>
      
      <div class="status-pills">
        <span class="status-pill ${this.getOrderStatusClass(order.financial_status)}">
          <i class="fas fa-circle"></i>
          ${this.getOrderStatusText(order.financial_status)}
        </span>
        <span class="status-pill ${this.getFulfillmentStatusClass(order.fulfillment_status)}">
          <i class="fas fa-shipping-fast"></i>
          ${this.getFulfillmentStatusText(order.fulfillment_status)}
        </span>
      </div>
    `;
  }

  /**
   * Renderiza el selector de múltiples pedidos cuando hay ambigüedad
   */
  renderMultipleOrdersSelector(orders, email) {
    return `
      <div class="card-title">
        <i class="fas fa-shopping-bag"></i>
        Múltiples pedidos encontrados
      </div>
      
      <div class="multiple-orders-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <span>Se encontraron ${orders.length} pedidos para este cliente. Selecciona el correcto:</span>
      </div>
      
      <div class="order-selector-controls">
        <select id="orderDropdown" class="order-dropdown">
          <option value="">Selecciona un pedido...</option>
          ${orders.map(order => `
            <option value="${order._id}">
              ${order.name || order.order_number} - ${this.formatShopifyDate(order.created_at)}
            </option>
          `).join('')}
        </select>
        
        <button id="associateOrderBtn" class="btn-associate-order" disabled>
          <i class="fas fa-link"></i>
          Asociar pedido
        </button>
      </div>
      
      <div id="selectedOrderPreview"></div>
    `;
  }

  /**
   * Renderiza el selector de pedidos cuando no hay uno vinculado
   */
  renderOrderSelector(email) {
    // TODO: Implementar lógica para obtener pedidos recientes del cliente
    // Por ahora retorna un placeholder
    return `
      <div class="order-selector">
        <p style="font-size: 12px; color: #a1a1aa; margin-bottom: 8px;">Pedidos recientes de este cliente:</p>
        <div style="color: #71717a; font-size: 12px; font-style: italic; padding: 12px; text-align: center;">
          Funcionalidad en desarrollo
        </div>
      </div>
    `;
  }

  /**
   * Renderiza la card principal del cliente
   */
  renderCustomerCard(customer) {
    const location = customer.default_address ? 
      `${customer.default_address.city || ''}${customer.default_address.country ? ', ' + customer.default_address.country : ''}` : '';
    
    return `
      <div class="card-title">
        <i class="fas fa-user"></i>
        Cliente
      </div>
      
      <div class="customer-name-display">${customer.name || customer.email || 'Cliente sin nombre'}</div>
      
      ${location ? `
      <div class="customer-location">
        <i class="fas fa-map-marker-alt"></i>
        ${location}
      </div>` : ''}
      
      <div class="customer-metrics">
        <div class="metric-item">
          <div class="metric-label">Pedidos</div>
          <div class="metric-value">${customer.orders_count || 0}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Total gastado</div>
          <div class="metric-value highlight">${this.formatPrice(customer.total_spent, 'EUR')}</div>
        </div>
      </div>
      
      <div class="customer-contact">
        ${customer.email ? `
        <div class="contact-item">
          <i class="fas fa-envelope"></i>
          <span class="contact-value" onclick="navigator.clipboard.writeText('${customer.email}')" title="Click para copiar">
            ${customer.email}
          </span>
        </div>` : ''}
        
        ${customer.phone ? `
        <div class="contact-item">
          <i class="fas fa-phone"></i>
          <span class="contact-value" onclick="navigator.clipboard.writeText('${customer.phone}')" title="Click para copiar">
            ${customer.phone}
          </span>
        </div>` : ''}
      </div>
      
      ${customer.tags && customer.tags.length > 0 ? `
      <div class="customer-tags">
        ${customer.tags.slice(0, 4).map(tag => `<span class="customer-tag">${tag}</span>`).join('')}
        ${customer.tags.length > 4 ? `<span class="customer-tag more">+${customer.tags.length - 4}</span>` : ''}
      </div>` : ''}
    `;
  }

  /**
   * Renderiza el panel de detalles del pedido (acordeón)
   */
  renderOrderDetailsPanel(order) {
    const items = order.line_items || [];
    
    return `
      <div class="accordion" data-panel="order-details">
        <div class="accordion-header">
          <div class="accordion-title">
            <i class="fas fa-list"></i>
            Detalles del pedido
          </div>
          <i class="fas fa-chevron-down accordion-icon"></i>
        </div>
        <div class="accordion-content">
          ${items.length > 0 ? `
          <div class="products-table">
            ${items.map(item => {
              const qty = item.quantity || item.qty || 1;
              const refundedQty = item.refundedQty || item.refunded_qty || 0;
              const refundableQty = item.refundableQty || item.refundable_qty || 0;
              const isFullyRefunded = refundedQty > 0 && refundableQty === 0;
              const isPartiallyRefunded = refundedQty > 0 && refundableQty > 0;
              
              return `
            <div class="product-row">
              <div class="product-thumb">
                ${item.image ? 
                  `<img src="${item.image}" alt="${item.title || 'Producto'}" loading="lazy">` :
                  '<i class="fas fa-box"></i>'
                }
              </div>
              <div class="product-info">
                <div class="product-name">${item.title || 'Producto'}</div>
                ${item.variant ? `<div class="product-variant">${item.variant}</div>` : ''}
                ${item.sku ? `<div class="product-sku">SKU: ${item.sku}</div>` : ''}
              </div>
              <div class="product-qty-price">
                <div class="product-qty">× ${qty}</div>
                <div class="product-price-wrapper">
                  <div class="product-price">${this.formatPrice(item.price, order.currency)}</div>
                  ${isFullyRefunded ? `
                  <div class="refund-status fully-refunded">
                    <i class="fas fa-undo"></i> Reembolsado
                  </div>` : ''}
                  ${isPartiallyRefunded ? `
                  <div class="refund-status partially-refunded">
                    <i class="fas fa-undo"></i> ${refundedQty} reembolsado${refundedQty > 1 ? 's' : ''} · ${refundableQty} disponible${refundableQty > 1 ? 's' : ''}
                  </div>` : ''}
                </div>
              </div>
            </div>
              `;
            }).join('')}
          </div>` : '<p style="color: #71717a; font-size: 12px;">Sin productos</p>'}
          
          ${order.shipping_address || order.billing_address ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.04);">
            <div class="address-grid">
              ${order.shipping_address ? `
              <div class="address-block">
                <div class="address-label"><i class="fas fa-shipping-fast"></i> Dirección de envío</div>
                <div class="address-text">
                  ${order.shipping_address.address1 || ''}<br>
                  ${order.shipping_address.address2 ? order.shipping_address.address2 + '<br>' : ''}
                  ${order.shipping_address.city || ''}, ${order.shipping_address.zip || ''}<br>
                  ${order.shipping_address.province || ''}, ${order.shipping_address.country || ''}
                </div>
              </div>` : ''}
              
              ${order.billing_address ? `
              <div class="address-block">
                <div class="address-label"><i class="fas fa-file-invoice"></i> Dirección de facturación</div>
                <div class="address-text">
                  ${order.billing_address.address1 || ''}<br>
                  ${order.billing_address.address2 ? order.billing_address.address2 + '<br>' : ''}
                  ${order.billing_address.city || ''}, ${order.billing_address.zip || ''}<br>
                  ${order.billing_address.province || ''}, ${order.billing_address.country || ''}
                </div>
              </div>` : ''}
            </div>
          </div>` : ''}
          
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.04);">
            <div class="info-grid">
              ${order.gateway ? `
              <div class="info-item">
                <span class="info-item-label">Método de pago</span>
                <span class="info-item-value">${order.gateway}</span>
              </div>` : ''}
              

              
              ${order.note ? `
              <div class="info-item">
                <span class="info-item-label">Nota del pedido</span>
                <span class="info-item-value">${order.note}</span>
              </div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza el panel de detalles del cliente (acordeón)
   */
  renderCustomerDetailsPanel(customer) {
    return `
      <div class="accordion" data-panel="customer-details">
        <div class="accordion-header">
          <div class="accordion-title">
            <i class="fas fa-user-circle"></i>
            Detalles del cliente
          </div>
          <i class="fas fa-chevron-down accordion-icon"></i>
        </div>
        <div class="accordion-content">
          <div class="info-grid">
            ${customer.shopify_id ? `
            <div class="info-item">
              <span class="info-item-label">ID de Shopify</span>
              <span class="info-item-value">${customer.shopify_id}</span>
            </div>` : ''}
            
            ${customer.name ? `
            <div class="info-item">
              <span class="info-item-label">Nombre completo</span>
              <span class="info-item-value">${customer.name}</span>
            </div>` : ''}
            
            ${customer.email ? `
            <div class="info-item">
              <span class="info-item-label">Email</span>
              <span class="info-item-value">${customer.email}</span>
            </div>` : ''}
            
            ${customer.phone ? `
            <div class="info-item">
              <span class="info-item-label">Teléfono</span>
              <span class="info-item-value">${customer.phone}</span>
            </div>` : ''}

            
            ${customer.last_order_at ? `
            <div class="info-item">
              <span class="info-item-label">Último pedido</span>
              <span class="info-item-value">${this.formatShopifyDate(customer.last_order_at)}</span>
            </div>` : ''}
            
            ${customer.tags && customer.tags.length > 0 ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.04);">
              <div class="info-item-label" style="margin-bottom: 8px;">
                <i class="fas fa-tags"></i> Etiquetas
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${customer.tags.map(tag => `<span style="display: inline-block; padding: 4px 8px; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 4px; font-size: 11px; color: #a78bfa;">${tag}</span>`).join('')}
              </div>
            </div>` : ''}
            
            ${customer.default_address ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.04);">
              <div class="address-block">
                <div class="address-label"><i class="fas fa-home"></i> Dirección por defecto</div>
                <div class="address-text">
                  ${customer.default_address.address1 || ''}<br>
                  ${customer.default_address.address2 ? customer.default_address.address2 + '<br>' : ''}
                  ${customer.default_address.city || ''}, ${customer.default_address.zip || ''}<br>
                  ${customer.default_address.province || ''}, ${customer.default_address.country || ''}
                  ${customer.default_address.phone ? `<br><i class="fas fa-phone" style="font-size: 10px;"></i> ${customer.default_address.phone}` : ''}
                </div>
              </div>
            </div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza el panel de detalles de la conversación (acordeón)
   */
  renderConversationDetailsPanel(conversation, match) {
    return `
      <div class="accordion" data-panel="conversation-details">
        <div class="accordion-header">
          <div class="accordion-title">
            <i class="fas fa-comments"></i>
            Detalles de la conversación
          </div>
          <i class="fas fa-chevron-down accordion-icon"></i>
        </div>
        <div class="accordion-content">
          <div class="info-grid">
            ${conversation.status ? `
            <div class="info-item">
              <span class="info-item-label">Estado</span>
              <span class="info-item-value">${conversation.status}</span>
            </div>` : ''}
            
            ${conversation.inbound_count !== undefined ? `
            <div class="info-item">
              <span class="info-item-label">Mensajes entrantes</span>
              <span class="info-item-value">${conversation.inbound_count}</span>
            </div>` : ''}
            
            ${conversation.outbound_count !== undefined ? `
            <div class="info-item">
              <span class="info-item-label">Mensajes salientes</span>
              <span class="info-item-value">${conversation.outbound_count}</span>
            </div>` : ''}
            
            ${conversation.last_activity_at ? `
            <div class="info-item">
              <span class="info-item-label">Última actividad</span>
              <span class="info-item-value">${this.formatShopifyDate(conversation.last_activity_at)}</span>
            </div>` : ''}
            
            ${match ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.04);">
              <div class="info-item">
                <span class="info-item-label">Match por</span>
                <span class="info-item-value">${match.matchedBy || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-item-label">Confianza del match</span>
                <span class="info-item-value">${this.formatConfidenceText(match.confidence)}</span>
              </div>
              ${match.ambiguous !== undefined ? `
              <div class="info-item">
                <span class="info-item-label">¿Ambiguo?</span>
                <span class="info-item-value">${match.ambiguous ? 'Sí' : 'No'}</span>
              </div>` : ''}
            </div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Configura los acordeones (toggle open/close)
   */
  setupAccordions() {
    const accordions = document.querySelectorAll('.accordion');
    
    accordions.forEach(accordion => {
      const header = accordion.querySelector('.accordion-header');
      
      // Clonar para eliminar listeners anteriores
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);
      
      newHeader.addEventListener('click', () => {
        const isOpen = accordion.classList.contains('open');
        
        // Cerrar todos los demás acordeones
        accordions.forEach(acc => acc.classList.remove('open'));
        
        // Toggle este acordeón
        if (!isOpen) {
          accordion.classList.add('open');
        }
      });
    });
  }

  /**
   * Configura el selector de pedidos cuando hay múltiples orders
   */
  setupOrderSelector(email) {
    const dropdown = document.getElementById('orderDropdown');
    const associateBtn = document.getElementById('associateOrderBtn');
    const previewContainer = document.getElementById('selectedOrderPreview');
    if (!dropdown || !associateBtn || !previewContainer) {
      console.error('[setupOrderSelector] Faltan elementos del DOM');
      return;
    }
    
    const orders = email.shopify_orders;
    let selectedOrder = null;
    
    // Limpiar listeners anteriores (clonar elementos)
    const newDropdown = dropdown.cloneNode(true);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);
    
    const newAssociateBtn = associateBtn.cloneNode(true);
    associateBtn.parentNode.replaceChild(newAssociateBtn, associateBtn);
    
    // Evento: cambio en el dropdown
    newDropdown.addEventListener('change', (e) => {
      const orderId = e.target.value;
      
      if (!orderId) {
        // No hay selección: deshabilitar botón y limpiar preview
        newAssociateBtn.disabled = true;
        previewContainer.innerHTML = '';
        selectedOrder = null;
        return;
      }
      
      // Encontrar el order seleccionado
      selectedOrder = orders.find(o => o._id === orderId);
      if (selectedOrder) {
        // Habilitar botón y mostrar preview
        newAssociateBtn.disabled = false;
        previewContainer.innerHTML = this.renderOrderCard(selectedOrder, email);
      }
    });
    
    // Evento: click en botón de asociar
    newAssociateBtn.addEventListener('click', async () => {
      if (!selectedOrder) {
        console.warn('[setupOrderSelector] No hay order seleccionado');
        return;
      }
      
      try {
        newAssociateBtn.disabled = true;
        newAssociateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Asociando...';
        
        // Llamar al endpoint para asociar el order
        const conversationId = email.conversationId;
        if (!conversationId) {
          throw new Error('No se encontró conversationId');
        }
        const res = await fetchWithAuth('/emails/select_order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            selected_order_id: selectedOrder._id
          })
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || `Error ${res.status}`);
        }
        
        // Éxito: actualizar UI
        notify.success('Pedido asociado correctamente');
        
        // Recargar el email actual para reflejar el cambio
        await this.reloadAroundIndex();
        this.renderCurrent();
        
      } catch (error) {
        console.error('[setupOrderSelector] Error al asociar pedido:', error);
        notify.error(`Error al asociar pedido: ${error.message}`);
        
        // Restaurar botón
        newAssociateBtn.disabled = false;
        newAssociateBtn.innerHTML = '<i class="fas fa-link"></i> Asociar pedido';
      }
    });
  }

  /**
   * Actualiza el estado de los botones de acción
   */
  updateActionButtons(email) {
    // Obtener el order usando el método auxiliar
    const order = this.getSingleOrder(email);
    
    // Si hay múltiples orders, deshabilitar todos los botones
    const hasMultiple = this.hasMultipleOrders(email);
    
    // Botón de reembolso
    const btnReembolso = document.getElementById('actionReembolso');
    if (hasMultiple) {
      btnReembolso.disabled = true;
      btnReembolso.onclick = null;
      btnReembolso.setAttribute('data-tooltip', 'Selecciona un pedido primero');
    } else if (order) {
      // Verificar si hay items con refundableQty > 0 o si hay shipping disponible
      const hasRefundableItems = (order.line_items || []).some(item => 
        (item.refundableQty || item.refundable_qty || 0) > 0
      );
      const hasRefundableShipping = parseFloat(order.total_shipping || 0) > 0;
      const canRefund = hasRefundableItems || hasRefundableShipping;
      
      if (canRefund) {
        btnReembolso.disabled = false;
        btnReembolso.setAttribute('data-tooltip', 'Crear reembolso');
        btnReembolso.onclick = () => this.openRefundModal(email);
      } else {
        btnReembolso.disabled = true;
        btnReembolso.onclick = null;
        btnReembolso.setAttribute('data-tooltip', 'No hay items pendientes de reembolso');
      }
    } else {
      btnReembolso.disabled = true;
      btnReembolso.onclick = null;
      btnReembolso.setAttribute('data-tooltip', 'Sin pedido vinculado');
    }
    
    // Botón de cancelar
    const btnCancelar = document.getElementById('actionCancelar');
    if (hasMultiple) {
      btnCancelar.disabled = true;
      btnCancelar.setAttribute('data-tooltip', 'Selecciona un pedido primero');
    } else if (order && !order.cancelled_at && order.fulfillment_status !== 'fulfilled') {
      btnCancelar.disabled = false;
      btnCancelar.setAttribute('data-tooltip', 'Cancelar/Modificar pedido');
    } else {
      btnCancelar.disabled = true;
      btnCancelar.setAttribute('data-tooltip', order?.cancelled_at ? 'Pedido ya cancelado' : 
                                                order?.fulfillment_status === 'fulfilled' ? 'Pedido ya enviado' : 
                                                'Sin pedido vinculado');
    }
    
    // Botón de tracking
    const btnTracking = document.getElementById('actionTracking');
    if (hasMultiple) {
      btnTracking.disabled = true;
      btnTracking.setAttribute('data-tooltip', 'Selecciona un pedido primero');
    } else if (order && order.tracking && order.tracking.length > 0) {
      btnTracking.disabled = false;
      btnTracking.setAttribute('data-tooltip', 'Ver seguimiento');
      btnTracking.onclick = () => {
        const url = order.tracking[0].url;
        if (url) window.open(url, '_blank');
      };
    } else {
      btnTracking.disabled = true;
      btnTracking.setAttribute('data-tooltip', 'Sin información de tracking');
    }
    
    // Botón de descuento
    const btnDescuento = document.getElementById('actionDescuento');
    if (hasMultiple) {
      btnDescuento.disabled = true;
      btnDescuento.setAttribute('data-tooltip', 'Selecciona un pedido primero');
    } else if (order) {
      btnDescuento.disabled = false;
      btnDescuento.setAttribute('data-tooltip', 'Crear código de descuento');
    } else {
      btnDescuento.disabled = true;
      btnDescuento.setAttribute('data-tooltip', 'Sin pedido vinculado');
    }
  }

  /**
   * Obtiene un único order del email (si existe)
   */
  getSingleOrder(email) {
    // Si hay shopify_order (legacy), usarlo
    if (email.shopify_order) {
      return email.shopify_order;
    }
    
    // Si hay shopify_orders array con 1 elemento, usarlo
    if (email.shopify_orders && Array.isArray(email.shopify_orders) && email.shopify_orders.length === 1) {
      return email.shopify_orders[0];
    }
    return null;
  }

  /**
   * Detecta si hay múltiples orders en el email
   */
  hasMultipleOrders(email) {
    const hasMultiple = email.shopify_orders && Array.isArray(email.shopify_orders) && email.shopify_orders.length > 1;
    return hasMultiple;
  }

  /**
   * Obtiene la clase CSS para el estado de envío
   */
  getFulfillmentStatusClass(status) {
    const statusMap = {
      'fulfilled': 'fulfilled',
      'partial': 'pending',
      'unfulfilled': 'unfulfilled',
      'null': 'unfulfilled',
      '': 'unfulfilled'
    };
    return statusMap[status] || 'unfulfilled';
  }

  /**
   * Formatea precios con símbolo de moneda
   */
  formatPrice(amount, currency = 'EUR') {
    if (amount === undefined || amount === null) return 'N/A';
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return 'N/A';
    
    const symbols = {
      'EUR': '€',
      'USD': '$',
      'GBP': '£',
      'JPY': '¥'
    };
    
    const symbol = symbols[currency] || currency;
    return `${numAmount.toFixed(2)} ${symbol}`;
  }

  /**
   * Formatea el valor de confidence (string) a texto legible
   */
  formatConfidenceText(confidence) {
    const confidenceMap = {
      'high': 'Alta (95%)',
      'medium': 'Media (70%)',
      'low': 'Baja (40%)'
    };
    return confidenceMap[confidence] || confidence || 'Desconocida';
  }

  /**
   * Formatea fechas de Shopify de manera amigable
   */
  formatShopifyDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (diffDays === 0) {
      return `Hoy, ${hours}:${minutes}`;
    } else if (diffDays === 1) {
      return `Ayer, ${hours}:${minutes}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return `${day}/${month}/${year}`;
    }
  }

  /**
   * Obtiene la clase CSS para el estado financiero del pedido
   */
  getOrderStatusClass(status) {
    const statusMap = {
      'paid': 'paid',
      'pending': 'pending',
      'refunded': 'refunded',
      'partially_refunded': 'refunded',
      'voided': 'refunded'
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Obtiene el texto legible para el estado financiero
   */
  getOrderStatusText(status) {
    const textMap = {
      'paid': 'Pagado',
      'pending': 'Pendiente',
      'refunded': 'Reembolsado',
      'partially_refunded': 'Reembolso Parcial',
      'voided': 'Anulado',
      'authorized': 'Autorizado'
    };
    return textMap[status] || status || 'Desconocido';
  }

  /**
   * Obtiene el texto legible para el estado de envío
   */
  getFulfillmentStatusText(status) {
    const textMap = {
      'fulfilled': 'Enviado',
      'partial': 'Envío Parcial',
      'unfulfilled': 'Pendiente de Envío',
      'null': 'Pendiente de Envío',
      '': 'Pendiente de Envío'
    };
    return textMap[status] || status || 'Pendiente de Envío';
  }

  formatEmailDate(dateString) {
    const now = new Date();
    const emailDate = new Date(dateString);
    if (isNaN(emailDate.getTime())) {
      return dateString;
    }
    const diffMs = now - emailDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const hh = emailDate.getHours().toString().padStart(2, '0');
    const mm = emailDate.getMinutes().toString().padStart(2, '0');

    if (diffDays < 1 && now.getDate() === emailDate.getDate()) {
      return `${hh}:${mm}`;
    }
    const ayer = new Date(now);
    ayer.setDate(ayer.getDate() - 1);
    if (ayer.getDate() === emailDate.getDate() &&
      ayer.getMonth() === emailDate.getMonth() &&
      ayer.getFullYear() === emailDate.getFullYear()) {
      return `Ayer, ${hh}:${mm}`;
    }
    if (diffDays < 7) {
      const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      return `${diasSemana[emailDate.getDay()]}, ${hh}:${mm}`;
    }
    const d = emailDate.getDate().toString().padStart(2, '0');
    const mo = (emailDate.getMonth() + 1).toString().padStart(2, '0');
    const y = emailDate.getFullYear();
    return `${d}/${mo}/${y}, ${hh}:${mm}`;
  }

  async reloadAroundIndex() {
    // 1) Calcula la página actual en función del this.index
    this.page = Math.floor(this.index / this.emailsPerPage) + 1;
// 2) Reinicia cache y loadedPages
    this.cache = [];
    this.loadedPages.clear();
// 3) Carga replace de la página actual
await this.loadBatch(this.page, { replace: true });
    this.loadedPages.add(this.page);
    // 4) Guarda nuevo inbox_ids y inbox_page
    sessionStorage.setItem('inbox_ids', JSON.stringify(this.ids));
    sessionStorage.setItem('inbox_page', this.page);
// 5) Pre‑fetch de siguiente batch si toca
    const localPos = this.index % this.emailsPerPage;
    const nextPage = this.page + 1;
if (
      localPos >= this.emailsPerPage - this.prefetchThreshold &&
      nextPage <= this.pages
    ) {
      await this.loadBatch(nextPage, { replace: false });
      this.loadedPages.add(nextPage);
    }

    // 6) Pre‑fetch de page anterior si toca
    const prevPage = this.page - 1;
    if (
      localPos < this.prefetchThreshold &&
      prevPage >= 1
    ) {
await this.loadBatch(prevPage, { replace: false, prepend: true });
      this.loadedPages.add(prevPage);
      this.index += this.emailsPerPage;
    }
  }

  // Solo reflejo local (sin red)
  reflectPendingIdeasUI(has) {
    const cached = JSON.parse(localStorage.getItem('store') || '{}');
    cached.has_pending_ideas = !!has;
    localStorage.setItem('store', JSON.stringify(cached));
    document.body.classList.toggle('has-pending-ideas', !!has);
  }

  async sendReply() {
    const emailId = this.ids[this.index];
    const pageForEmail = Math.floor(this.index / this.emailsPerPage) + 1;
    // Asegurarnos de que el batch esté cargado
    if (!this.loadedPages.has(pageForEmail)) {
      await this.loadBatch(pageForEmail, { replace: false });
    }

    const email = this.cache.find(e => e.id === emailId);
    if (!email) return console.error('Email no encontrado en cache');

    // Extraer datos del DOM
    const recipient = (email.return_mail || email.sender || '').replace(/^<(.+)>$/, '$1');
    const subject = document.getElementById('responseSubject').textContent.trim();
    const message = DOMPurify.sanitize(document.getElementById('responseContent').innerHTML.trim());
    // 🆕 Obtener el valor del checkbox de cerrar conversación
    const closeConversationCheck = document.getElementById('closeConversationCheck');
    const shouldCloseConversation = closeConversationCheck?.checked || false;

    try {
      if ((message || '').length > LIMITS.email_body) {
        notify.error(`El cuerpo del correo supera ${LIMITS.email_body} caracteres.`);
        return;
      }
      const totalBytes = (this.pendingFiles || []).reduce((acc, f) => acc + (f?.size || 0), 0);
      if (totalBytes > GMAIL_MAX_TOTAL_BYTES) {
        notify.error(`Los adjuntos superan el límite (~24 MB). Peso total: ${formatBytes(totalBytes)}.`);
        return;
      }
      const tooBig = (this.pendingFiles || []).find(f => (f?.size || 0) > GMAIL_MAX_PER_FILE);
      if (tooBig) {
        notify.error(`"${tooBig.name}" es demasiado grande (${formatBytes(tooBig.size)}). Límite ~24 MB por archivo.`);
        return;
      }

      // 👉 FormData para adjuntos
      const fd = new FormData();
      fd.append('email_id', emailId);           // reply
      fd.append('recipient', recipient);        // por si tu back lo usa
      fd.append('subject', subject);
      fd.append('message', message);
      fd.append('close_conversation', shouldCloseConversation ? 'true' : 'false'); // 🆕
      this.pendingFiles.forEach(f => fd.append('files', f, f.name));

      const res = await fetchWithAuth('/emails/send', {
        method: 'POST',
        body: fd
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Error al enviar la respuesta:', res.status, err);
        notify.error('Error al enviar el correo ❌');
        return;
      }
      const payload = await res.json().catch(()=> ({}));
      this.reflectPendingIdeasUI(!!payload.has_pending_ideas);

      this.pendingFiles = [];
      this.renderPendingFiles();

      // 1) Quitarlo igual que delete
      const removedId = this.ids.splice(this.index, 1)[0];
      this.cache = this.cache.filter(e => e.id !== removedId);

      // 2) Ajustar índice por si lo eliminas
      if (this.index >= this.ids.length) {
        this.index = this.ids.length - 1;
      }

      // 3) Re-guardar en sessionStorage
      sessionStorage.setItem('inbox_index', this.index);

      // 4) Recarga toda la caché alrededor de this.index
      if (this.ids.length > 0) {
        await this.reloadAroundIndex();
        this.renderCurrent();
      } else {
        window.location.href = '/secciones/inbox.html';
        return;
      }
    } catch (e) {
      console.error('Error al enviar la respuesta:', e);
    }
  }

  async deleteEmail() {
    try {
      const emailId = this.ids[this.index];
      
      // 🆕 Obtener el valor del checkbox de cerrar conversación
      const closeConversationCheck = document.getElementById('closeConversationCheck');
      const shouldCloseConversation = closeConversationCheck?.checked || false;
      
      const url = `/emails/delete?email_id=${emailId}`;
      const res = await fetchWithAuth(url, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Error al borrar el email:', res.status, err);
        return;
      }
      const payload = await res.json().catch(()=> ({}));
      this.reflectPendingIdeasUI(!!payload.has_pending_ideas);

      // 1) Eliminar de ids y cache
      const removedId = this.ids.splice(this.index, 1)[0];
      this.cache = this.cache.filter(e => e.id !== removedId);

      // 2) Ajustar índice si es necesario
      if (this.index >= this.ids.length) {
        this.index = this.ids.length - 1;
      }

      // 3) Re-guardar en sessionStorage
      sessionStorage.setItem('inbox_index', this.index);

      // 3) Si quedan correos, recarga todo alrededor de this.index
      if (this.ids.length > 0) {
        await this.reloadAroundIndex();
        this.renderCurrent();
      } else {
        // Si no quedan, vuelve al inbox
        window.location.href = '/secciones/inbox.html';
      }
    } catch (e) {
      console.error('Error al borrar el email:', e);
    }
  }

  /**
   * 🆕 Mapea el nombre de la clase de email al nombre de la clase CSS para el badge
   */
  getEmailClassBadgeClass(className) {
    const classMap = {
      'postventa': 'badge-postventa',
      'envios': 'badge-envios',
      'envío': 'badge-envios',
      'envíos': 'badge-envios',
      'producto': 'badge-producto',
      'productos': 'badge-producto',
      'tienda': 'badge-tienda',
      'shopify': 'badge-shopify',
      'comerciales': 'badge-comerciales',
      'comercial': 'badge-comerciales',
      'otros': 'badge-otros',
      'otro': 'badge-otros'
    };
    
    const normalized = className.toLowerCase().trim();
    return classMap[normalized] || 'badge-otros';
  }

  /**
   * 🆕 Setup del botón toggle de la sidebar derecha
   */
  setupSidebarToggle() {
    const rightSidebar = document.querySelector('.right-sidebar');
    const toggleBtn = document.getElementById('toggleRightSidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (!toggleBtn || toggleBtn.dataset.listenerAdded) return;
    
    toggleBtn.addEventListener('click', () => {
      rightSidebar.classList.toggle('collapsed');
      
      // Sincronizar la clase del main-content
      if (rightSidebar.classList.contains('collapsed')) {
        mainContent.classList.remove('sidebar-expanded');
        toggleBtn.classList.remove('expanded');
      } else {
        mainContent.classList.add('sidebar-expanded');
        toggleBtn.classList.add('expanded');
      }
    });
    
    toggleBtn.dataset.listenerAdded = 'true';
  }

  /**
   * ============================================================
   * REFUND MODAL FUNCTIONALITY
   * ============================================================
   */

  /**
   * Abre el modal de refund
   */
  async openRefundModal(email) {
    // Usar el método auxiliar para obtener el order correcto
    const order = this.getSingleOrder(email);
    
    if (!order) {
      notify.error('No hay pedido vinculado o hay múltiples pedidos (selecciona uno primero)');
      return;
    }
    // Inicializar estado del refund - filtrar solo items con refundableQty > 0
    const refundableItems = (order.line_items || [])
      .filter(item => {
        const refundableQty = item.refundableQty || item.refundable_qty || 0;
        return refundableQty > 0;
      })
      .map(item => {
        // Construir el lineItemGid si no viene
        const lineItemGid = item.gid || item.lineItemGid || `gid://shopify/LineItem/${item.id}`;
        const refundableQty = item.refundableQty || item.refundable_qty || 0;
        const price = parseFloat(item.price || 0);
        
        return {
          lineItemGid: lineItemGid,
          title: item.title || item.name || 'Producto',
          price: price,
          quantity: refundableQty, // Cantidad refundable, no la cantidad original
          quantityRefundable: refundableQty,
          quantityToRefund: 0,
          restock: false,
          thumbnail: item.image || item.thumbnail || null,
          maxRefundableAmount: refundableQty * price
        };
      });
    
    // Si no hay items refundables ni shipping, no abrir el modal
    const hasRefundableShipping = parseFloat(order.total_shipping || 0) > 0;
    if (refundableItems.length === 0 && !hasRefundableShipping) {
      notify.error('No hay items pendientes de reembolso');
      return;
    }

    this.refundState = {
      order: order,
      orderGid: order.order_gid,
      items: refundableItems,
      shippingEnabled: false,
      shippingAmount: 0,
      shippingMax: parseFloat(order.total_shipping || 0),
      reason: '',
      manualAmount: '',
      suggestedRefund: null,
      previewTimeout: null,
      isSubmitting: false
    };

    // Renderizar el modal
    this.renderRefundModal();
    
    // Mostrar el modal
    const modal = document.getElementById('refundModal');
    modal.style.display = 'flex';
    
    // Setup event listeners
    this.setupRefundModalListeners();

    // ← Bootstrap: pedir preview vacío para inicializar máximos/sugerencias
    this.showSummaryLoading(true);
    this.callPreviewAPI();
  }

  /**
   * Renderiza el contenido del modal de refund
   */
  renderRefundModal() {
    const { order, items, shippingMax } = this.refundState;
    
    // Renderizar items
    const itemsList = document.getElementById('refundItemsList');
    itemsList.innerHTML = items.map((item, idx) => `
      <div class="refund-item" data-item-idx="${idx}">
        <div class="refund-item-main">
          <img src="${item.thumbnail || '/assets/icons/package.svg'}" 
               alt="${item.title}"
               class="refund-item-thumbnail">
          <div class="refund-item-info">
            <div class="refund-item-title">${DOMPurify.sanitize(item.title)}</div>
            <div class="refund-item-price">$${item.price.toFixed(2)}</div>
          </div>
          <div class="refund-item-actions">
            <div class="refund-quantity-input">
              <input type="number" 
                     class="refund-quantity-field" 
                     data-item-idx="${idx}"
                     min="0" 
                     max="${item.quantityRefundable}"
                     value="0"
                     placeholder="0">
              <span class="refund-quantity-suffix">/ ${item.quantity}</span>
            </div>
            <div class="refund-item-total" data-item-idx="${idx}">$0.00</div>
          </div>
        </div>
        <label class="refund-checkbox-wrapper refund-restock-wrapper" style="display: none;" data-item-idx="${idx}">
          <input type="checkbox" class="refund-checkbox refund-restock-checkbox" data-item-idx="${idx}">
          <span class="refund-checkbox-label">Restock</span>
        </label>
      </div>
    `).join('');
    
    // Renderizar sección de shipping si aplica
    const shippingSection = document.getElementById('refundShippingSection');
    if (shippingMax > 0) {
      shippingSection.style.display = 'block';
      document.getElementById('refundShippingMaxAmount').textContent = `$${shippingMax.toFixed(2)}`;
    } else {
      shippingSection.style.display = 'none';
    }
    
    // Resetear resumen
    this.updateRefundSummary();
  }

  /**
   * Setup de event listeners del modal
   */
  setupRefundModalListeners() {
    // Botón cerrar
    const closeBtn = document.getElementById('closeRefundModal');
    closeBtn.onclick = () => this.closeRefundModal();
    
    // Click fuera del modal
    const modal = document.getElementById('refundModal');
    modal.onclick = (e) => {
      if (e.target === modal) this.closeRefundModal();
    };
    
    // Inputs de cantidad - usar 'input' en lugar de 'change' para actualización en tiempo real
    document.querySelectorAll('.refund-quantity-field').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.itemIdx);
        let val = parseInt(input.value);
        
        // Si el valor está vacío o no es un número, no hacer nada (permitir edición)
        if (input.value === '' || isNaN(val)) {
          return;
        }
        
        const max = parseInt(input.max);
        val = Math.max(0, Math.min(max, val));
        input.value = val;
        this.handleQuantityChange(idx, val);
      });
      
      // También manejar el evento 'blur' para validar cuando pierde el foco
      input.addEventListener('blur', () => {
        const idx = parseInt(input.dataset.itemIdx);
        let val = parseInt(input.value);
        
        // Si el valor está vacío o no es válido, poner en 0
        if (input.value === '' || isNaN(val)) {
          input.value = 0;
          this.handleQuantityChange(idx, 0);
          return;
        }
        
        const max = parseInt(input.max);
        val = Math.max(0, Math.min(max, val));
        input.value = val;
        this.handleQuantityChange(idx, val);
      });
    });
    
    // Checkboxes de restock
    document.querySelectorAll('.refund-restock-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.dataset.itemIdx);
        this.handleRestockChange(idx, cb.checked);
      });
    });
    
    // Shipping checkbox
    const shippingCheckbox = document.getElementById('refundShippingCheck');
    shippingCheckbox.addEventListener('change', () => {
      this.handleShippingToggle(shippingCheckbox.checked);
    });
    
    // Shipping amount
    const shippingAmountInput = document.getElementById('refundShippingAmount');
    shippingAmountInput.addEventListener('input', () => {
      this.handleShippingAmountChange(shippingAmountInput.value);
    });
    
    // Manual amount
    const manualAmountInput = document.getElementById('refundManualAmount');
    manualAmountInput.addEventListener('input', () => {
      this.handleManualAmountChange(manualAmountInput.value);
    });
    
    // Botón submit
    const submitBtn = document.getElementById('submitRefundBtn');
    submitBtn.onclick = () => this.handleRefundSubmit();
  }

  /**
   * Maneja cambio de cantidad de un item
   */
  handleQuantityChange(itemIdx, quantity) {
    const item = this.refundState.items[itemIdx];
    item.quantityToRefund = quantity;
    
    // Mostrar/ocultar checkbox de restock
    const restockWrapper = document.querySelector(`.refund-restock-wrapper[data-item-idx="${itemIdx}"]`);
    if (quantity > 0) {
      restockWrapper.style.display = 'flex';
    } else {
      restockWrapper.style.display = 'none';
      item.restock = false;
      const checkbox = restockWrapper.querySelector('.refund-restock-checkbox');
      checkbox.checked = false;
    }
    
    // Actualizar total del item
    const itemTotal = quantity * item.price;
    const totalEl = document.querySelector(`.refund-item-total[data-item-idx="${itemIdx}"]`);
    totalEl.textContent = `$${itemTotal.toFixed(2)}`;
    
    // Llamar preview con debounce
    this.schedulePreviewCall();
  }

  /**
   * Maneja cambio de restock checkbox
   */
  async handleRestockChange(itemIdx, checked) {
    if (checked) {
      const defaultLocation = await this.getDefaultLocationGid();
      if (!defaultLocation) {
        notify.error('No hay ubicación por defecto para restock. Configúrala primero.');
        // revertir visualmente
        const cb = document.querySelector(`.refund-restock-checkbox[data-item-idx="${itemIdx}"]`);
        if (cb) cb.checked = false;
        this.refundState.items[itemIdx].restock = false;
        return;
      }
      // opcional: guarda location en el item por si quieres enseñarlo
      this.refundState.items[itemIdx].locationGid = defaultLocation;
    } else {
      this.refundState.items[itemIdx].locationGid = null;
    }

    this.refundState.items[itemIdx].restock = checked;
    this.schedulePreviewCall();
  }

  /**
   * Maneja toggle de shipping
   */
  handleShippingToggle(enabled) {
    this.refundState.shippingEnabled = enabled;
    const amountInput = document.getElementById('refundShippingAmount');
    amountInput.disabled = !enabled;
    
    if (!enabled) {
      this.refundState.shippingAmount = 0;
      amountInput.value = '';
    } else {
      // Cuando se habilita, establecer automáticamente el valor máximo disponible
      const maxShipping = this.refundState.shippingMax;
      this.refundState.shippingAmount = maxShipping;
      amountInput.value = maxShipping.toFixed(2);
    }
    
    this.schedulePreviewCall();
  }

  /**
   * Maneja cambio de shipping amount
   */
  handleShippingAmountChange(value) {
    const amount = parseFloat(value) || 0;
    const max = this.refundState.shippingMax;
    
    if (amount > max) {
      notify.error(`No puedes reembolsar más de $${max.toFixed(2)} en shipping`);
      document.getElementById('refundShippingAmount').value = max.toFixed(2);
      this.refundState.shippingAmount = max;
    } else {
      this.refundState.shippingAmount = amount;
    }
    
    this.schedulePreviewCall();
  }

  /**
   * Maneja cambio de manual amount
   */
  handleManualAmountChange(value) {
    this.refundState.manualAmount = value;
    this.updateRefundSummary();
  }

  /**
   * Programa una llamada al preview API con debounce
   */
  schedulePreviewCall() {
    if (this.refundState.previewTimeout) {
      clearTimeout(this.refundState.previewTimeout);
    }
    
    this.refundState.previewTimeout = setTimeout(() => {
      this.callPreviewAPI();
    }, 500);
  }

  /**
   * Llama al API de preview
   */
  async callPreviewAPI() {
    try {
      // Mostrar loaders en el summary
      this.showSummaryLoading(true);
      
      // Obtener locationGid si es necesario
      const defaultLocation = await this.getDefaultLocationGid();
      
      // Preparar items para el preview
      const items = this.refundState.items
        .filter(item => item.quantityToRefund > 0)
        .map(item => ({
          lineItemGid: item.lineItemGid,
          quantity: item.quantityToRefund,
          restock: item.restock,
          locationGid: item.restock ? defaultLocation : null
        }));
      
      // Preparar payload
      const payload = {
        orderGid: this.refundState.orderGid,
        items: items
      };
      
      // Añadir shipping si está habilitado
      if (this.refundState.shippingEnabled && this.refundState.shippingAmount > 0) {
        payload.shippingAmount = this.refundState.shippingAmount;
      }
      
      // Llamar al API
      const res = await fetchWithAuth('/shopify/refunds/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Error al calcular preview');
      }
      
      const data = await res.json();
      const sr = data.suggestedRefund;

      this.refundState.suggestedRefund = sr;

      // ← Nuevo: refrescar shippingMax desde el backend (GraphQL)
      const maxFromBe = parseFloat(sr?.meta?.shippingMax || '0');
      if (!Number.isNaN(maxFromBe)) {
        const previousMax = this.refundState.shippingMax;
        this.refundState.shippingMax = maxFromBe;

        const shippingSection = document.getElementById('refundShippingSection');
        const shippingInput   = document.getElementById('refundShippingAmount');
        const shippingMaxEl   = document.getElementById('refundShippingMaxAmount');

        if (maxFromBe > 0) {
          shippingSection.style.display = 'block';
          if (shippingMaxEl) shippingMaxEl.textContent = `$${maxFromBe.toFixed(2)}`;
          if (shippingInput) {
            shippingInput.max = maxFromBe.toFixed(2);
            shippingInput.placeholder = `0.00 – ${maxFromBe.toFixed(2)}`;
            
            // Solo actualizar el valor si:
            // 1. El shipping está habilitado Y
            // 2. El valor actual es 0 o igual al máximo anterior (no ha sido personalizado)
            const currentAmount = this.refundState.shippingAmount;
            const wasDefault = currentAmount === 0 || currentAmount === previousMax;
            
            if (this.refundState.shippingEnabled && wasDefault) {
              this.refundState.shippingAmount = maxFromBe;
              shippingInput.value = maxFromBe.toFixed(2);
            } else if (this.refundState.shippingAmount > maxFromBe) {
              // Clamp si el usuario escribió por encima del nuevo máximo
              this.refundState.shippingAmount = maxFromBe;
              shippingInput.value = maxFromBe.toFixed(2);
            }
          }
        } else {
          // No hay shipping disponible para reembolsar
          shippingSection.style.display = 'none';
          this.refundState.shippingEnabled = false;
          this.refundState.shippingAmount  = 0;
          if (shippingInput) shippingInput.value = '';
        }
      }

      // Ocultar loaders
      this.showSummaryLoading(false);
      this.updateRefundSummary();
      
    } catch (error) {
      console.error('Error en preview:', error);
      notify.error(error.message || 'Error al calcular el reembolso');
      this.showSummaryLoading(false);
    }
  }

  /**
   * Obtiene el location GID por defecto
   */
  async getDefaultLocationGid() {
    // TODO: Obtener esto del backend o de la configuración
    // Por ahora retornamos null y el backend usará su default
    return null;
  }

  /**
   * Muestra/oculta loaders en el summary
   */
  showSummaryLoading(loading) {
    const itemsAmount = document.getElementById('refundSummaryItemsAmount');
    const shippingAmount = document.getElementById('refundSummaryShippingAmount');
    const total = document.getElementById('refundSummaryTotal');
    
    if (loading) {
      itemsAmount.classList.add('loading');
      shippingAmount.classList.add('loading');
      total.classList.add('loading');
    } else {
      itemsAmount.classList.remove('loading');
      shippingAmount.classList.remove('loading');
      total.classList.remove('loading');
    }
  }

  /**
   * Actualiza el resumen del refund
   */
  updateRefundSummary() {
    const suggested = this.refundState.suggestedRefund;
    if (!suggested) {
      // No hay preview, mostrar ceros
      document.getElementById('refundSummaryItemsLabel').textContent = 'No items selected';
      document.getElementById('refundSummaryItemsAmount').textContent = '$0.00';
      document.getElementById('refundSummaryShippingRow').style.display = 'none';
      document.getElementById('refundSummaryTotal').textContent = '$0.00';
      document.getElementById('refundAvailableAmount').textContent = '$0.00 available for refund';
      document.getElementById('submitRefundBtn').disabled = true;
      document.getElementById('submitRefundBtn').innerHTML = '<i class="fas fa-undo"></i> Refund $0.00';
      return;
    }
    
    // Calcular totales
    const subtotal = parseFloat(suggested.totals.subtotal || 0);
    const tax = parseFloat(suggested.totals.tax || 0);
    const shipping = parseFloat(suggested.totals.shipping || 0);
    const duties = parseFloat(suggested.totals.duties || 0);
    const total = subtotal + tax + shipping + duties;
    const maxavailable = parseFloat(suggested.available.max || 0)
    // Contar items seleccionados
    const selectedCount = this.refundState.items.filter(i => i.quantityToRefund > 0).length;
    const itemsLabel = selectedCount === 1 ? '1 item' : `${selectedCount} items`;
    
    // Actualizar subtotal
    document.getElementById('refundSummaryItemsLabel').textContent = itemsLabel;
    document.getElementById('refundSummaryItemsAmount').textContent = `$${subtotal.toFixed(2)}`;
    
    // Mostrar/ocultar shipping
    if (shipping > 0) {
      document.getElementById('refundSummaryShippingRow').style.display = 'flex';
      document.getElementById('refundSummaryShippingAmount').textContent = `$${shipping.toFixed(2)}`;
    } else {
      document.getElementById('refundSummaryShippingRow').style.display = 'none';
    }
    
    // Actualizar total
    document.getElementById('refundSummaryTotal').textContent = `$${total.toFixed(2)}`;
    
    // Verificar si hay manual amount
    const manualAmount = parseFloat(this.refundState.manualAmount) || 0;
    const finalAmount = manualAmount > 0 ? manualAmount : total;
    
    // Validar que el manual amount no exceda el total
    const isValid = manualAmount === 0 || (manualAmount > 0 && manualAmount <= maxavailable);
    
    // Actualizar available amount
    document.getElementById('refundAvailableAmount').textContent = `$${maxavailable.toFixed(2)} available for refund`;
    
    // Actualizar botón submit
    const submitBtn = document.getElementById('submitRefundBtn');
    submitBtn.disabled = !isValid || finalAmount === 0 || this.refundState.isSubmitting;
    submitBtn.innerHTML = `<i class="fas fa-undo"></i> Refund $${finalAmount.toFixed(2)}`;
    
    // Mostrar error si manual amount es inválido
    if (manualAmount > 0 && manualAmount > maxavailable) {
      notify.error(`El monto manual no puede exceder $${maxavailable.toFixed(2)}`);
    }
  }

  /**
   * Maneja el submit del refund
   */
  async handleRefundSubmit() {
    if (this.refundState.isSubmitting) return;
    
    try {
      this.refundState.isSubmitting = true;
      const submitBtn = document.getElementById('submitRefundBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
      
      // Preparar items
      const items = this.refundState.items
        .filter(item => item.quantityToRefund > 0)
        .map(item => ({
          lineItemGid: item.lineItemGid,
          quantity: item.quantityToRefund,
          restock: item.restock,
          locationGid: item.restock ? null : undefined // El backend usará su default si es null
        }));
      
      // Preparar payload
      const payload = {
        request_id: this.generateUUID(),
        orderGid: this.refundState.orderGid,
        items: items,
        note: document.getElementById('refundReason').value || 'Reembolso procesado desde gestor de correos'
      };
      
      // Añadir shipping si está habilitado
      if (this.refundState.shippingEnabled && this.refundState.shippingAmount > 0) {
        payload.shippingAmount = this.refundState.shippingAmount;
      }
      
      // Transacciones a enviar:
      // - Si el usuario NO pone importe manual -> usamos las sugeridas del preview.
      // - Si pone manual -> 1 transacción con ese importe sobre el primer parent_id sugerido.
      const manualAmount = parseFloat(this.refundState.manualAmount || '0') || 0;
      const sug = this.refundState.suggestedRefund;

      if (sug && (!manualAmount || manualAmount === parseFloat(sug.totals.total || '0'))) {
        // Mapeamos todas las sugeridas
        payload.transactions = (sug.suggestedTransactions || []).map(t => ({
          parent_id: (t.parent_id || (t.parentTransaction ? t.parentTransaction.id : null)),
          amount: parseFloat(((t.amountSet && t.amountSet.presentmentMoney && t.amountSet.presentmentMoney.amount) || '0')),
          kind: 'REFUND',
          gateway: t.gateway || null
        })).filter(tx => tx.parent_id && tx.amount > 0);
      } else if (sug && manualAmount > 0) {
        const first = (sug.suggestedTransactions && sug.suggestedTransactions[0]) || null;
        if (!first) {
          notify.error('No se pudo determinar la transacción base para reembolso manual');
          this.refundState.isSubmitting = false;
          this.updateRefundSummary();
          return;
        }
        payload.transactions = [{
          parent_id: (first.parent_id || (first.parentTransaction ? first.parentTransaction.id : null)),
          amount: manualAmount,
          kind: 'REFUND',
          gateway: first.gateway || null
        }];
      }
      
      // Llamar al API de commit
      const res = await fetchWithAuth('/shopify/refunds/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Error al crear el reembolso');
      }
      
      const data = await res.json();
      
      // Éxito
      notify.success('Reembolso creado exitosamente');
      this.closeRefundModal();
      
      // Recargar el email para ver el estado actualizado
      await this.reloadAroundIndex();
      this.renderCurrent();
      
    } catch (error) {
      console.error('Error al crear refund:', error);
      notify.error(error.message || 'Error al crear el reembolso');
      
      // Solo actualizar el estado si el modal no se cerró
      if (this.refundState) {
        this.refundState.isSubmitting = false;
        this.updateRefundSummary(); // Re-habilitar el botón
      }
    }
  }

  /**
   * Cierra el modal de refund
   */
  closeRefundModal() {
    const modal = document.getElementById('refundModal');
    modal.style.display = 'none';
    
    // Limpiar estado
    this.refundState = null;
    
    // Limpiar timeout de preview si existe
    if (this.refundState?.previewTimeout) {
      clearTimeout(this.refundState.previewTimeout);
    }
  }

  /**
   * Genera un UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
}

document.addEventListener('DOMContentLoaded', () => new EmailView());

