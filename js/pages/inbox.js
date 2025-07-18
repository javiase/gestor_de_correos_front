// js/pages/inbox.js
import { initSidebar } from '/js/components/sidebar.js';
import { fetchWithAuth } from '/js/utils/api.js';

class EmailInbox {
  constructor() {
    this.currentPage    = 1;
    this.emailsPerPage  = 20;
    this.allEmails      = [];
    this.filteredEmails = [];
    this.allLoaded      = false;
    this.searchTerm     = '';

    this.spinner = document.getElementById('loadingIndicator');
    this.init();
  }

  async init() {
    // monta la sidebar
    initSidebar('#sidebarContainer');

    // carga correos y después inicializa eventos, paginación y render
    await this.loadEmails(1);
    this.bindEvents();
    this.updatePagination();
    this.renderEmails();
  }
  showSpinner() {
  this.spinner.style.display = 'flex';
  }

  hideSpinner() {
    this.spinner.style.display = 'none';
  }

  // helper para decidir en qué grupo de fecha va cada email
  getGroupKey(email) {
    const dt  = new Date(email.date);
    const now = new Date();

    const isSameDay = (a, b) =>
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();

    if (isSameDay(dt, now)) {
      return 'hoy';
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(dt, yesterday)) {
      return 'ayer';
    }
    // p.ej. "january2025"
    const month = dt.toLocaleString('en', { month: 'long' }).toLowerCase();
    return `${month}${dt.getFullYear()}`;
  }

  // formatea la fecha para la columna de tiempo
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
    if (
      ayer.getDate() === emailDate.getDate() &&
      ayer.getMonth() === emailDate.getMonth() &&
      ayer.getFullYear() === emailDate.getFullYear()
    ) {
      return `Ayer, ${hh}:${mm}`;
    }
    if (diffDays < 7) {
      const diasSemana = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
      return `${diasSemana[emailDate.getDay()]}, ${hh}:${mm}`;
    }
    const d  = emailDate.getDate().toString().padStart(2, '0');
    const mo = (emailDate.getMonth() + 1).toString().padStart(2, '0');
    const y  = emailDate.getFullYear();
    return `${d}/${mo}/${y}, ${hh}:${mm}`;
  }

  // trae correos del backend
  async loadEmails(page = 1) {
    this.showSpinner();
    try {
      const res = await fetchWithAuth(`/emails/get?page=${page}`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const { emails, total, pages } = await res.json();
      this.allEmails      = emails;
      this.filteredEmails = [...emails];
      this.currentPage    = page;
      this.totalEmails    = total;                        
      this.totalPages     = pages;                         
      this.allLoaded      = false; 
    } catch (err) {
      console.error('Error cargando correos:', err);
      // opcionalmente mostrar un mensaje de error al usuario
    }finally{
      this.hideSpinner();
    }
  }

  // listeners de búsqueda, paginación y atajos
  bindEvents() {
    document.getElementById('searchInput')
      .addEventListener('input', e => {
        this.searchTerm = e.target.value.toLowerCase();
        this.filterEmails();
      });

    document.getElementById('prevBtn')
      .addEventListener('click', () => this.changePage(-1));
    document.getElementById('nextBtn')
      .addEventListener('click', () => this.changePage(1));

    document.addEventListener('keydown', e => {
      if      (e.key === 'Escape')                    document.getElementById('searchInput').blur();
      else if (e.ctrlKey && e.key === 'ArrowLeft')   this.changePage(-1);
      else if (e.ctrlKey && e.key === 'ArrowRight')  this.changePage(1);
    });
  }

  // filtra según el término de búsqueda
  async filterEmails() {
    this.showSpinner();
    if (!this.searchTerm) {
      this.allLoaded = false;                  
      await this.loadEmails(1);
    } else {
      // búsqueda global: carga todas las páginas sólo la primera vez
      if (!this.allLoaded) {
        let all = [];
        for (let p = 1; p <= this.totalPages; p++) {
          const resp = await fetchWithAuth(`/emails/get?page=${p}`);
          const { emails } = await resp.json();
          all = all.concat(emails);
        }
        this.allEmails = all;
        this.allLoaded = true;
      }
      // ahora filtra sobre el conjunto completo
      this.filteredEmails = this.allEmails.filter(mail =>
        (mail.sender  || '').toLowerCase().includes(this.searchTerm) ||
        (mail.subject || '').toLowerCase().includes(this.searchTerm) ||
        // si usas snippet/body para preview:
        ((mail.snippet || mail.body || '').toLowerCase().includes(this.searchTerm))
      );
    }
    this.currentPage = 1;
    this.updatePagination();
    this.renderEmails();
    this.hideSpinner();
  }

  // emails de la página actual
  getCurrentPageEmails() {
    // Si no hay búsqueda activa, usamos directamente los 20 correos que el backend ya paginó
    if (!this.searchTerm) {
      return this.filteredEmails;
    }
    // En modo búsqueda (front-end pagination) sí hacemos slice
    const start = (this.currentPage - 1) * this.emailsPerPage;
    return this.filteredEmails.slice(start, start + this.emailsPerPage);
  }
  

  // renderiza la lista, agrupada por fecha
  renderEmails() {
    const listContainer = document.getElementById('emailList');
    listContainer.innerHTML = '';

    const pageEmails = this.getCurrentPageEmails();

    if (pageEmails.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No se han encontrado correos</h3>
          <p>Intenta ajustar tus términos de búsqueda</p>
        </div>`;
      return;
    }

    pageEmails.forEach(email =>
      listContainer.appendChild(this.createEmailElement(email))
    );
  }

  // construye el DOM de cada email
  createEmailElement(email) {
    const div = document.createElement('div');
    div.className = `email-item ${email.read ? 'read' : 'unread'}`;
    div.tabIndex  = 0;
    console.log('|'+email.subject+'|')
    div.innerHTML = `
      <div class="email-sender">${email.return_mail.replace(/^<(.+)>$/,'$1')}</div>
      <div class="email-content">
      <div class="email-subject">
        ${
          // si viene vacío, solo espacios o el literal "<no subject>"
          !email.subject ||
          !email.subject.trim() ||
          email.subject.trim() === '<no subject>'
            ? '(sin asunto)'
            : email.subject
        }
      </div>
        <div class="email-preview">${((email.body || "").split(/\s+/).slice(0,15).join(" ") + "...") }</div>
      </div>
      <div class="email-meta">
        ${email.hasAttachment ? '<i class="fas fa-paperclip"></i>' : ''}
        ${email.isDraft      ? '<span class="draft-badge">Draft</span>' : ''}
      </div>
      <div class="email-time">${this.formatEmailDate(email.date)}</div>
    `;
    div.addEventListener('click', () => this.openEmail(email));
    return div;
  }

  // navega a la página de detalle
  async openEmail(email) {
    try {
      await fetchWithAuth('/emails/mark_read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: email.id })
      });
      // opcional: actualizar en memoria para que cambie el estilo sin recargar
      email.read = true;
      // refresca la lista
      this.renderEmails();

    } catch (err) {
      console.error('No se pudo marcar leído:', err);
    }
      // Guarda la lista completa y el índice en sessionStorage
      const allIds = this.filteredEmails.map(e => e.id);
      const index  = allIds.indexOf(email.id);
      sessionStorage.setItem('inbox_ids', JSON.stringify(allIds));
      sessionStorage.setItem('inbox_index', index);
      sessionStorage.setItem('inbox_page', this.currentPage);

      // Redirige
      window.location.href = `/secciones/email.html?id=${encodeURIComponent(email.id)}`;  
  }  

  // actualiza los botones y contador de páginas
  updatePagination() {
      const totalPages = this.searchTerm
      ? Math.ceil(this.filteredEmails.length / this.emailsPerPage) || 1
      : (this.totalPages || 1);    document.getElementById('pageInfo').textContent   = `${this.currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled       = this.currentPage <= 1;
    document.getElementById('nextBtn').disabled       = this.currentPage >= totalPages;
  }

  // cambia de página
  async changePage(direction) {
    // en búsqueda, paginación local; si no, usa totalPages del back
    const totalPages = this.searchTerm
      ? Math.ceil(this.filteredEmails.length / this.emailsPerPage) || 1
      : (this.totalPages || 1);

    const nextPage = this.currentPage + direction;
    if (nextPage < 1 || nextPage > totalPages) return;

    // Solo recargar del backend cuando NO hay búsqueda activa
    if (!this.searchTerm) {
      await this.loadEmails(nextPage);
    }

    // En ambos casos, actualizamos currentPage y refrescamos UI
    this.currentPage = nextPage;
    this.renderEmails();
    this.updatePagination();
    document.querySelector('.email-list')
      .scrollTo({ top: 0, behavior: 'smooth' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EmailInbox();
});
