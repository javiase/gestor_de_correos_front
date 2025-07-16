
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
  }

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
      avatar.onerror = () => avatar.src = "/image.png";
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
      // además colapsamos el contenedor para que el main-content se desplace
      document
        .getElementById('sidebarContainer')
        .classList.toggle('collapsed', this.isCollapsed);
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
