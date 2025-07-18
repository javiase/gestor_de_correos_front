// js/pages/email.js
import { initSidebar } from '/js/components/sidebar.js';
import { fetchWithAuth } from '/js/utils/api.js';

class EmailView {
  constructor() {
    initSidebar('#sidebarContainer');
    this.container = document.getElementById('chatContainer');
    this.prevBtn   = null;
    this.nextBtn   = null;
    this.ids       = JSON.parse(sessionStorage.getItem('inbox_ids') || '[]');
    this.index     = parseInt(sessionStorage.getItem('inbox_index') || '0', 10);
    this.page = parseInt(sessionStorage.getItem('inbox_page') || '1', 10);
    this.loadedPages = new Set();
    this.emailsPerPage = 20; // emails por batch
    this.prefetchThreshold = 5;
    this.pages     = 1;       // total de batches disponibles (se rellena al primer fetch)
    this.cache     = [];      // aquí replicaremos ids → datos
    this.sendBtn   = null;
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
      this.ids   = normalized.map(e => e.id);
    } else if (prepend) {
      this.cache = normalized.concat(this.cache);
      this.ids   = normalized.map(e => e.id).concat(this.ids);
    } else {
      this.cache = this.cache.concat(normalized);
      this.ids   = this.ids.concat(normalized.map(e => e.id));
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
    const localPos    = this.index % this.emailsPerPage;
    const currentPage = Math.floor(this.index / this.emailsPerPage) + 1;
    const prevPage    = currentPage - 1;
    const nextPage    = currentPage + 1;
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
        ps.innerHTML = `
          <div class="panel-content">
            ${msg.message.split('\n')
              .map(p => `<p>${p}</p>`)
              .join('')}
          </div>
        `;
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
        'De: ' + (email.return_mail.replace(/^<(.+)>$/,'$1') || 'Desconocido');
    document.getElementById('emailDate').textContent =
        this.formatEmailDate(email.date);
    document.getElementById('emailSubject').textContent =
        'Asunto: ' + (email.subject || '(sin asunto)');

    // body recibido (preserva saltos de línea)
    const rec = (email.body || '')
        .split('\n')
        .map(p => `<p>${p}</p>`)
        .join('');
    document.getElementById('receivedContent').innerHTML = rec;

    const respSubj = document.getElementById('responseSubject');
    respSubj.textContent = email.asunto_respuesta;

    // respuesta del bot
    document.getElementById('responseContent').innerHTML =
        (email.texto_combinado || '<p>Sin respuesta</p>')
        .split('\n')
        .map(p => `<p>${p}</p>`)
        .join('');

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
      const d  = emailDate.getDate().toString().padStart(2, '0');
      const mo = (emailDate.getMonth() + 1).toString().padStart(2, '0');
      const y  = emailDate.getFullYear();
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

      // Asegurarnos de que el batch esté cargado
      if (!this.loadedPages.has(pageForEmail)) {
        await this.loadBatch(pageForEmail, { replace: false });
      }

      const email = this.cache.find(e => e.id === emailId);
      if (!email) return console.error('Email no encontrado en cache');

      // Extraer datos del DOM
      const recipient = (email.return_mail || email.sender || '').replace(/^<(.+)>$/, '$1');
      const subject   = document.getElementById('responseSubject').textContent.trim();
      const message   = document.getElementById('responseContent').innerHTML.trim();

      try {
        const res = await fetchWithAuth('/emails/send', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ emailId, recipient, subject, message })
        });
        if (!res.ok) {
          const err = await res.json();
          console.error('Error al enviar la respuesta:', res.status, err);
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
