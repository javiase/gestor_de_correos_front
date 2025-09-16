
import { isProfileComplete, getStoreCached } from '/js/utils/profile-gate.js';

// Módulo sidebar.js
export function initSidebar(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return console.warn("No existe " + containerSelector);
  return fetch("/partials/sidebar.html")
    .then((r) => {
      if (!r.ok) throw new Error("Error cargando sidebar: " + r.status);
      return r.text();
    })
    .then((html) => {
      container.innerHTML = html;
      // 👇 Señal universal: esta página tiene sidebar
      document.body.classList.add('has-sidebar');
      initEmailSidebar();
    })
    .catch(console.error);
}

class EmailSidebar {
  constructor() {
    this.sidebar = document.getElementById("sidebar");
    this.overlay = document.getElementById("sidebarOverlay");
    this.toggleBtn = document.getElementById("toggleSidebar");
    this.items = document.querySelectorAll(".menu-item[data-section]");
    this.settingsHeader = document.getElementById("settingsHeader");
    this.settingsMenu = document.getElementById("settingsMenu");
    this.createBtn = document.querySelector(".create-email");
    this.userProfile = document.getElementById("userProfile");
    this.isMobile = window.innerWidth <= 768;
    this.isCollapsed = false;
    this.userProfile = document.getElementById("userProfile");
    this.loadUserProfile();
    this.bind();
    this.setupProfileLock();
  }

  async setupProfileLock() {
    const store = await getStoreCached();
    this.profileComplete = isProfileComplete(store);
    this.updateDisabledMenu();
    // Si Perfil se guarda y queda completo, lo re-habilitamos
    window.addEventListener('profile-complete-changed', (e) => {
      this.profileComplete = !!e.detail?.complete;
      this.updateDisabledMenu();
    });
  }

  updateDisabledMenu() {
    const lock = !this.profileComplete;
    this.items.forEach(item => {
      const sec = item.dataset.section;
      const a = item.querySelector('a');
      const lockThis = lock && sec !== 'perfil';
      item.classList.toggle('is-disabled', lockThis);
      a.setAttribute('aria-disabled', lockThis ? 'true' : 'false');
      if (lockThis) {
        a.addEventListener('click', this.blockClick, { passive: false });
      } else {
        a.removeEventListener('click', this.blockClick, { passive: false });
      }
    });
    // Botón "Redactar"
    if (this.createBtn) {
      this.createBtn.classList.toggle('is-disabled', lock);
      if (lock) this.createBtn.addEventListener('click', this.blockClick, { passive:false });
      else this.createBtn.removeEventListener('click', this.blockClick, { passive:false });
    }
  }

  blockClick = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    window.location.href = '/secciones/perfil.html?msg=Completa%20tu%20perfil%20para%20continuar.';
  };

  async loadUserProfile() {
    try {
      try {
        await window.appUserPromise;
      } catch {
        throw new Error('usuario no autenticado');
      }
      const stored = localStorage.getItem("store");
      if (!stored) throw new Error("no hay datos en localStorage");
      const data = JSON.parse(stored);

      const nameEl  = this.userProfile.querySelector(".profile-name");
      const emailEl = this.userProfile.querySelector(".profile-email");
      const avatar  = this.userProfile.querySelector(".profile-avatar img");
      avatar.onload = () => avatar.classList.add("loaded");
      avatar.onerror = () => avatar.src = "/assets/icons/image.png";
      const firstName = data.firstName?.split(" ")[0] || "Sin nombre";
      nameEl.textContent  = firstName;
      emailEl.textContent = data.storeEmail;
      console.log("Cargando perfil de usuario:", data);
      // Avatar de Google si existe
      if (data.picture_url) {
        avatar.src = data.picture_url;
      }
    } catch (e) {
      console.warn("No pude cargar perfil:", e);
      this.userProfile.querySelector(".profile-name").textContent = "Sin nombre";
    }
  }


  bind() {
    this.items.forEach((item) =>
      item.querySelector("a").addEventListener("click", (e) => {
        e.preventDefault();
        this.navigate(item.dataset.section);
      })
    );
    this.toggleBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.toggle();
    });
    this.overlay?.addEventListener("click", () => this.close());
    this.createBtn?.addEventListener("click", () =>
      this.navigate("compose")
    );
    this.userProfile?.addEventListener("click", () =>
      this.navigate("perfil")
    );
    this.userProfile?.addEventListener("click", (e) => {
      e.preventDefault();
      this.navigate("profile");
    });

    this.settingsHeader?.addEventListener("click", () =>
      this.settingsMenu.classList.toggle("collapsed")
    );
    window.addEventListener("resize", () => this.onResize());
  }

  navigate(section) {
    if (!this.profileComplete && section !== 'perfil') {
      this.blockClick(new Event('click'));
      return;
    }
    // mapear a rutas
    const map = {
      inbox: "/secciones/inbox.html",
      compose: "/secciones/redactar.html",
      sent: "/secciones/sent.html",
      drafts: "/secciones/drafts.html",
      deleted: "/secciones/deleted.html",
      perfil: "/secciones/perfil.html",
      info: "/secciones/info.html",
    };
    const url = map[section];
    if (url) window.location.href = url;
  }

  toggle() {
    if (this.isMobile) {
      this.sidebar.classList.toggle("active");
      this.overlay.classList.toggle("active");
    } else {
      this.isCollapsed = !this.isCollapsed;
      this.sidebar.classList.toggle("collapsed", this.isCollapsed);

      // Aún tocamos el contenedor actual por compatibilidad
      const sc = document.getElementById('sidebarContainer');
      if (sc) sc.classList.toggle('collapsed', this.isCollapsed);

      // 👉 Señal global para TODAS las páginas
      document.body.classList.toggle('sidebar-collapsed', this.isCollapsed);
      window.dispatchEvent(new CustomEvent('sidebar:state', {
        detail: { collapsed: this.isCollapsed }
      }));

      this.updateToggleLabel?.();
    }
  }

  close() {
    if (this.isMobile) {
      this.sidebar.classList.remove("active");
      this.overlay.classList.remove("active");
    }
  }

  onResize() {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile && this.sidebar.classList.contains("active")) {
      this.sidebar.classList.remove("active");
      this.overlay.classList.remove("active");
    }
  }
}

function initEmailSidebar() {
  new EmailSidebar();
}
