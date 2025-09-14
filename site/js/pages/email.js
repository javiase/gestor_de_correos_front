// js/pages/email.js
import { initSidebar } from '/js/components/sidebar.js';
import { fetchWithAuth } from '/js/utils/api.js';
import { LIMITS } from '/js/config.js?v=1';
import { enforceProfileGate } from '/js/utils/profile-gate.js';
import { enforceSessionGate } from '/js/utils/session-gate.js';
import { notify } from '/js/utils/notify.js';

enforceSessionGate();
enforceProfileGate();

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

function isViewableInBrowser(a){
  const mime = (a.mimeType || '').toLowerCase();
  const name = (a.filename || '').toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return true;
  if (mime === 'application/pdf' || /\.pdf$/.test(name)) return true;
  return false;
}

async function openAttachmentAuth(a, emailId){
  const baseUrl =
    a.url ||
    `/emails/attachment?email_id=${encodeURIComponent(emailId)}&att_id=${encodeURIComponent(a.attachmentId)}`;

  const preOpen = isViewableInBrowser(a) ? window.open('', '_blank', 'noopener') : null;

  try {
    const res = await fetchWithAuth(baseUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const ctHeader = (res.headers.get('Content-Type') || '').toLowerCase();
    let blob = await res.blob();

    // Si el tipo viene vacío/genérico, corrígelo con el Content-Type o con el mime conocido
    const fallbackType = ctHeader || (a.mimeType || '');
    if (!blob.type || blob.type === '' || blob.type === 'application/octet-stream') {
      const ab = await blob.arrayBuffer();
      blob = new Blob([ab], { type: fallbackType || 'application/octet-stream' });
    }

    const blobUrl = URL.createObjectURL(blob);
    const viewable = /^image\//.test(blob.type) || blob.type === 'application/pdf' || isViewableInBrowser(a);

    if (viewable) {
      if (preOpen) preOpen.location.href = blobUrl;
      else window.open(blobUrl, '_blank', 'noopener');
    } else {
      const tmp = document.createElement('a');
      tmp.href = blobUrl;
      tmp.download = a.filename || 'archivo';
      document.body.appendChild(tmp);
      tmp.click();
      tmp.remove();
    }

    // Limpieza
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  } catch (err) {
    if (preOpen && !preOpen.closed) preOpen.close();
    console.error('Adjunto no accesible:', err);
    notify?.error?.('No se pudo abrir/descargar el archivo.');
  }
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
  el.addEventListener('input', () => {
    const plain = (el.textContent || '');
    if (plain.length > max) {
      // recorta manteniendo caret al final
      const sel = window.getSelection();
      const range = document.createRange();
      el.textContent = plain.slice(0, max);
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
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
  const raw = (rawHtml && rawHtml.trim())
    ? stripInlineImages(rawHtml, attachments)
    : (fallbackText || '').replace(/\n/g, '<br>');
  const safeHtml = DOMPurify.sanitize(raw, {
    ALLOW_UNKNOWN_PROTOCOLS: true,
    ADD_TAGS: ['style','svg','path'],
    ADD_ATTR: ['style','target','align','border','cellpadding','cellspacing','background'],
    FORBID_TAGS: ['script','iframe','object','embed','form'],
  });

  // ——— 4) Crea iframe aislado ———
  const iframe = document.createElement('iframe');
  iframe.className = 'gmail-frame';
  // allow-same-origin necesario para poder ajustar altura/leer document,
  // pero sin allow-scripts mantenemos seguridad
  iframe.setAttribute(
    'sandbox',
    'allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation'
  );
  iframe.style.width = '100%';
  iframe.style.border = '0';

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
  iframe.srcdoc = srcdoc;

  // Inserta y ajusta altura
  container.innerHTML = '';
  container.appendChild(iframe);

  const onReady = () => {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const resize = () => { iframe.style.height = (doc.body.scrollHeight + 16) + 'px'; };
    // primera medida
    resize();
    // al cargar imágenes
    Array.from(doc.images || []).forEach(img => img.addEventListener('load', resize));
    // si hay cambios de layout
    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(doc.body);
    } else {
      setTimeout(resize, 300);
    }
  };
  iframe.addEventListener('load', onReady, { once: true });
}



class EmailView {
  constructor() {
    initSidebar('#sidebarContainer');
    this.container = document.getElementById('chatContainer');
    this.prevBtn = null;
    this.nextBtn = null;
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
    this.init();
  }

  async init() {
    // 1) Construye botones de navegación
    this.buildNavButtons();

    // 2) Precarga el batch que contiene tu índice actual
    await this.loadBatch(this.page, { replace: true });
    this.loadedPages.add(this.page);

    sessionStorage.setItem('inbox_ids', JSON.stringify(this.ids));

    // **PRE‑FETCH** de siguiente batch si entraste directamente en un correo >=15
    let localPos = this.index % this.emailsPerPage;
    const nextPage = this.page + 1;
    if (
      localPos >= this.emailsPerPage - 5 && // posiciones 15–19
      nextPage <= this.pages &&
      !this.loadedPages.has(nextPage)
    ) {
      console.log(`init(): prefetch page ${nextPage}`);
      await this.loadBatch(nextPage, { replace: false });
      this.loadedPages.add(nextPage);
    }

    // **PRE‑FETCH anterior** si index < 5
    const prevPage = this.page - 1;
    if (
      localPos < 5 &&
      prevPage >= 1 &&
      !this.loadedPages.has(prevPage)
    ) {
      console.log(`init(): prefetch prev page ${prevPage}`);
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

  buildNavButtons() {
    // Ya no creamos nada, tomamos los que has puesto en el HTML
    this.prevBtn = document.getElementById('prevEmail');
    this.nextBtn = document.getElementById('nextEmail');
    this.sendBtn = document.getElementById('sendReply');
    this.deleteBtn = document.getElementById('deleteEmail');

    if (!this.prevBtn || !this.nextBtn) {
      console.error("No encuentro los botones de navegación en el DOM");
      return;
    }

    this.prevBtn.addEventListener('click', () => this.navigate(-1));
    this.nextBtn.addEventListener('click', () => this.navigate(1));

    // acciones de enviar / borrar
    if (this.sendBtn) this.sendBtn.addEventListener('click', () => this.sendReply());
    if (this.deleteBtn) this.deleteBtn.addEventListener('click', () => this.deleteEmail());
  }

  async loadBatch(page, { replace = false, prepend = false } = {}) {
    console.log(`[loadBatch] page=${page} replace=${replace} prepend=${prepend}`);

    if (!replace && this.loadedPages.has(page)) {
      console.log(`  ↳ página ${page} ya cargada → skip`);
      return;
    }

    console.log(`  ↳ fetch /emails/get?page=${page}…`);
    const res = await fetchWithAuth(`/emails/get?page=${page}`);
    const { emails, pages } = await res.json();
    this.pages = pages;

    const normalized = emails.map(e => ({
      ...e,
      id: e.id ?? e._id
    }));

    console.log(`  ↳ normalized IDs de la página ${page}:`, normalized.map(e => e.id));

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
    console.log(`[navigate] dir=${dir} ⇒ newIndex=${newIndex}`);
    if (newIndex < 0 || newIndex >= this.ids.length) return;
    this.index = newIndex;
    console.log(`  ↳ index=${this.index}`);

    // 2) Calcula posición local y páginas
    const localPos = this.index % this.emailsPerPage;
    const currentPage = Math.floor(this.index / this.emailsPerPage) + 1;
    const prevPage = currentPage - 1;
    const nextPage = currentPage + 1;
    console.log(`  ↳ localPos=${localPos}, currentPage=${currentPage}`);

    // 3) On‑demand: carga la página actual si no se había cargado
    if (!this.loadedPages.has(currentPage)) {
      console.log(`  ↳ loading page ${currentPage} on demand`);
      await this.loadBatch(currentPage, { replace: false });
    }

    // 4) Pre‑fetch siguiente si estás en las últimas 5 posiciones
    if (
      localPos >= this.emailsPerPage - 5 &&
      nextPage <= this.pages &&
      !this.loadedPages.has(nextPage)
    ) {
      console.log(`  ↳ prefetch next page ${nextPage}`);
      await this.loadBatch(nextPage, { replace: false });
    }

    // 5) Pre‑fetch anterior si estás en las primeras 5 posiciones
    if (
      localPos < 5 &&
      prevPage >= 1 &&
      !this.loadedPages.has(prevPage)
    ) {
      console.log(`  ↳ prefetch prev page ${prevPage}`);
      await this.loadBatch(prevPage, { replace: false, prepend: true });
      // Ajusta el índice para mantener el mismo email “activo”
      this.index += this.emailsPerPage;
      console.log(`  ↳ adjusted index after prepend=${this.index}`);
    }
    console.log(
      `  ↳ READY TO RENDER: index=${this.index}`,
      `this.ids[${this.index - 2}…${this.index + 2}]=`,
      this.ids.slice(this.index - 2, this.index + 3)
    );
    // 6) Renderiza el correo calculado
    this.renderCurrent();

    // 7) Actualiza this.page y sessionStorage, y sustituye la URL
    this.page = Math.floor(this.index / this.emailsPerPage) + 1;
    sessionStorage.setItem('inbox_page', this.page);
    sessionStorage.setItem('inbox_index', this.index);
    history.replaceState({}, '', `?id=${encodeURIComponent(this.ids[this.index])}`);
  }

  renderCurrent() {
    const id = this.ids[this.index];
    const email = this.cache.find(e => e.id === id);
    if (!email) return console.error('Email no cargado aún');

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
    console.log('attachments:', email.attachments);




    // vuelca en los IDs de tu HTML
    document.getElementById('emailFrom').textContent =
      'De: ' + (email.return_mail.replace(/^<(.+)>$/, '$1') || 'Desconocido');
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

    // Adjuntos visibles (no inline)
    let attWrap = document.getElementById('attachmentsContainer');
    if (!attWrap) {
      attWrap = document.createElement('div');
      attWrap.id = 'attachmentsContainer';
      attWrap.className = 'attachments-grid';
      // debajo del cuerpo recibido
      rc.parentNode.insertBefore(attWrap, rc.nextSibling);
    }
    attWrap.innerHTML = '';

    const visibleAttachments = (email.attachments || []);

    visibleAttachments.forEach(a => {
      const aEl = document.createElement('a');

      // NO ponemos href real para que no intente ir sin auth
      aEl.href = '#';
      aEl.title = a.filename || 'archivo';
      aEl.addEventListener('click', (ev) => {
        ev.preventDefault();
        openAttachmentAuth(a, email.id);
      });

      const kind = getAttachmentKind(a);
      const svg  = svgForKind(kind);

      aEl.innerHTML = `
        <span class="att-icon" aria-hidden="true">${svg}</span>
        <span class="att-name">${a.filename || 'archivo'}</span>
      `;
      aEl.className = 'attachment-chip';
      attWrap.appendChild(aEl);
    });

    // si no queda nada que mostrar, elimina el contenedor
    if (visibleAttachments.length === 0) {
      attWrap.remove();
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
    console.log(`\n[reload] ▶ Starting reloadAroundIndex (index=${this.index})`);

    // 1) Calcula la página actual en función del this.index
    this.page = Math.floor(this.index / this.emailsPerPage) + 1;
    console.log(`[reload] 1) Calculated page=${this.page}`);

    // 2) Reinicia cache y loadedPages
    this.cache = [];
    this.loadedPages.clear();
    console.log(`[reload] 2) Cleared cache & loadedPages`);

    // 3) Carga replace de la página actual
    console.log(`[reload] 3) loadBatch page=${this.page} replace=true`);
    await this.loadBatch(this.page, { replace: true });
    this.loadedPages.add(this.page);
    console.log(
      `[reload]    → after loadBatch ids.length=${this.ids.length}, cache.length=${this.cache.length}`
    );

    // 4) Guarda nuevo inbox_ids y inbox_page
    sessionStorage.setItem('inbox_ids', JSON.stringify(this.ids));
    sessionStorage.setItem('inbox_page', this.page);
    console.log(
      `[reload] 4) sessionStorage -> inbox_ids (${this.ids.length} items), inbox_page=${this.page}`
    );

    // 5) Pre‑fetch de siguiente batch si toca
    const localPos = this.index % this.emailsPerPage;
    const nextPage = this.page + 1;
    console.log(`[reload] 5) localPos=${localPos}, prefetchThreshold=${this.prefetchThreshold}`);
    if (
      localPos >= this.emailsPerPage - this.prefetchThreshold &&
      nextPage <= this.pages
    ) {
      console.log(`[reload]    → prefetch nextPage=${nextPage}`);
      await this.loadBatch(nextPage, { replace: false });
      this.loadedPages.add(nextPage);
      console.log(
        `[reload]    → after prefetch next ids.length=${this.ids.length}, cache.length=${this.cache.length}`
      );
    }

    // 6) Pre‑fetch de page anterior si toca
    const prevPage = this.page - 1;
    if (
      localPos < this.prefetchThreshold &&
      prevPage >= 1
    ) {
      console.log(`[reload] 6) prefetch prevPage=${prevPage}`);
      await this.loadBatch(prevPage, { replace: false, prepend: true });
      this.loadedPages.add(prevPage);
      this.index += this.emailsPerPage;
      console.log(
        `[reload]    → after prepend prev ids.length=${this.ids.length}, cache.length=${this.cache.length}, index now=${this.index}`
      );
    }

    console.log(`[reload] ◀ Finished reloadAroundIndex\n`);

  }



  async sendReply() {
    const emailId = this.ids[this.index];
    const pageForEmail = Math.floor(this.index / this.emailsPerPage) + 1;
    console.log(`[sendReply] emailId=${emailId} at index=${this.index} (page ${pageForEmail})`);
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


    try {
      if ((message || '').length > LIMITS.email_body) {
        notify.error(`El cuerpo del correo supera ${LIMITS.email_body} caracteres.`);
        return;
      }

      const res = await fetchWithAuth('/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "emailId": emailId, recipient, subject, message })
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Error al enviar la respuesta:', res.status, err);
        notify.error('Error al enviar el correo ❌');
        return;
      }

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
      const res = await fetchWithAuth(`/emails/delete?email_id=${emailId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Error al borrar el email:', res.status, err);
        return;
      }

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
  
}

document.addEventListener('DOMContentLoaded', () => new EmailView());
