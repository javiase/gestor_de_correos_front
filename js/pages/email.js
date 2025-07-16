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
    this.page      = 1;       // cuántos batches has cargado
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
    const batchIndex = Math.floor(this.index / 20) + 1;
    this.page = batchIndex;
    await this.loadBatch(batchIndex);

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

  async loadBatch(page) {
    const res = await fetchWithAuth(`/emails/get?page=${page}`);
    const { emails, pages } = await res.json();
    this.pages = pages;
    // concatena solo los emails de este lote en cache
    this.cache = this.cache.concat(emails);
  }

  async navigate(dir) {
    const newIndex = this.index + dir;
    // índice fuera de rango?
    if (newIndex < 0 || newIndex >= this.ids.length) return;
    this.index = newIndex;

    // si queda <5 emails disponibles en cache, precarga próximo batch
    const localPos    = this.index % 20;
    const currentPage = Math.floor(this.index / 20) + 1;
    if (localPos >= 15 && currentPage < this.pages) {
      this.page = currentPage + 1;
      this.loadBatch(this.page);
    }

    this.renderCurrent();
    // actualiza la URL y el sessionStorage
    const id = this.ids[this.index];
    history.replaceState({}, '', `?id=${encodeURIComponent(id)}`);
    sessionStorage.setItem('inbox_index', this.index);
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
    async sendReply() {
        const emailId = this.ids[this.index];
        const email = this.cache.find(e => e.id === emailId);
        if (!email) return console.error('Email no encontrado en cache');
        
        // Extrae destinatario, asunto y cuerpo editables
        const recipient = (email.return_mail || email.sender || '').replace(/^<(.+)>$/, '$1');
        const subject   = document.getElementById('responseSubject').textContent.trim();
        const message   = document.getElementById('responseContent').innerHTML.trim();
        const body = document.getElementById('responseContent').innerHTML;
        await fetchWithAuth('/emails/send', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ emailId, recipient, subject, message })
        });
        // aquí recarga lista o avanza al siguiente
        this.navigate(1);
    }

    async deleteEmail() {
        const emailId = this.ids[this.index];
        await fetchWithAuth(`/emails/delete?email_id=${emailId}`, {
            method: 'DELETE'
        });
        // elimina de cache y renderiza siguiente
        this.ids.splice(this.index,1);
        if (this.index >= this.ids.length) this.index = this.ids.length-1;
        this.renderCurrent();
    }
}

document.addEventListener('DOMContentLoaded', () => new EmailView());
