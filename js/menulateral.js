// menulateral.js

// -------------- 1) Fetch + montaje del sidebar ----------------
function loadSidebar() {
  const container = document.getElementById("sidebarContainer");
  if (!container) {
    console.warn("No se ha encontrado #sidebarContainer. "
      + "¿Olvidaste poner <div id=\"sidebarContainer\"></div> en el HTML?");
    return;
  }

  fetch("../partials/menulateral.html")
    .then((res) => {
      if (!res.ok) throw new Error("Error cargando sidebar.html: " + res.status);
      return res.text();
    })
    .then((html) => {
      container.innerHTML = html;
      // Una vez inyectado el HTML, inicializamos la clase que maneja el comportamiento
      initEmailSidebar();
    })
    .catch((err) => console.error(err));
}

// ------------- 2) Clase EmailSidebar (igual que la que ya tienes) -------------
class EmailSidebar {
  constructor() {
    this.sidebar = document.getElementById("sidebar");
    this.sidebarOverlay = document.getElementById("sidebarOverlay");
    this.mainContent = document.getElementById("mainContent");
    this.menuItems = document.querySelectorAll(".menu-item[data-section]");
    this.contentSections = document.querySelectorAll(".content-section");
    this.settingsHeader = document.getElementById("settingsHeader");
    this.settingsMenu = document.getElementById("settingsMenu");
    this.userProfile = document.getElementById("userProfile");
    this.toggleSidebarBtn = document.getElementById("toggleSidebar");

    this.isCollapsed = false;
    this.isMobile = window.innerWidth <= 768;
    this.activeSection = "primary";
    this.settingsExpanded = true;

    this.init();
  }

  init() {
    this.bindEvents();
    this.handleResize();
    this.updateActiveSection("inbox");
    this.addTooltips();

    console.log("Email Sidebar initialized successfully");
  }

  bindEvents() {
    // Clicks en items del menú
    this.menuItems.forEach((item) => {
      const link = item.querySelector(".menu-link");
      link.addEventListener("click", (e) => this.handleMenuClick(e, item));
    });

    // Toggle sección Configuración
    this.settingsHeader?.addEventListener("click", () => this.toggleSettings());

    // Click en perfil
    this.userProfile?.addEventListener("click", () => this.handleProfileClick());

    // Botón para alternar sidebar
    this.toggleSidebarBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.toggleSidebar();
    });

    // Acción “Redactar Mail”
    document.querySelector(".create-email")?.addEventListener("click", () => {
      this.handleCreateEmail();
    });

    // Clic en overlay (solo en móvil)
    this.sidebarOverlay?.addEventListener("click", () => this.closeSidebar());

    // Resize de ventana
    window.addEventListener("resize", () => this.handleResize());

    // Navegación con teclado
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));

    // Evitar que clic dentro del sidebar cierre el menú (móvil)
    this.sidebar?.addEventListener("click", (e) => e.stopPropagation());
  }

  handleMenuClick(e, item) {
    e.preventDefault();
    const section = item.dataset.section;
    if (!section) return;

    // ──────────────────────────────────────────────────
    // 1) Actualizamos la clase 'active' localmente
    this.updateActiveSection(section);
    // ──────────────────────────────────────────────────

    // 2) Redirigimos a la página que corresponda
    //    Aquí puedes mapear 'all' → 'inbox.html', etc.
    let targetUrl = "";
    switch (section) {
      case "inbox":
        targetUrl = "/secciones/inbox.html";
        break;
      case "sent":
        targetUrl = "/landing.html";
        break;
      case "drafts":
        targetUrl = "drafts.html";
        break;
      case "deleted":
        targetUrl = "deleted.html";
        break;
      // … otros mapeos según tus data-section …
      default:
        targetUrl = ""; // si no hay página, no hacemos nada
    }

    if (targetUrl) {
      // Cambia la ubicación del navegador:
      window.location.href = targetUrl;
    }

    // 3) Si es móvil, ocultamos el sidebar tras la navegación
    if (this.isMobile) {
      setTimeout(() => this.closeSidebar(), 300);
    }
  }

  updateActiveSection(sectionId) {
    // 1) Quitamos “active” de todos los items del menú
    this.menuItems.forEach((item) => item.classList.remove("active"));

    // 2) Buscamos el menú correspondiente y le añadimos “active”
    const activeMenuItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeMenuItem) {
      activeMenuItem.classList.add("active");
      this.activeSection = sectionId;
    }

    // 3) Cambiamos el título de la pestaña si quieres:
    // (por ejemplo, “Bandeja de Entrada – Email App”)
    const capitalized = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
    document.title = `${capitalized} - Email App`;

    // 4) Disparamos un evento por si acaso alguien más quiere reaccionar
    this.dispatchEvent("sectionChange", { section: sectionId });

    // ──────────────────────────────────────────────────────────────────────
    //    NO hacemos nada con “contentSections” porque tu inbox siempre
    //    está visible en mainContent. Si más adelante añades otras secciones
    //    debes ocultarlas/mostrarlas aquí usando `if (sectionId==='otra') …`
    // ──────────────────────────────────────────────────────────────────────
  }

  toggleSettings() {
    this.settingsExpanded = !this.settingsExpanded;
    if (this.settingsExpanded) {
      this.settingsMenu?.classList.remove("collapsed");
      this.settingsHeader?.classList.remove("collapsed");
    } else {
      this.settingsMenu?.classList.add("collapsed");
      this.settingsHeader?.classList.add("collapsed");
    }
  }

  toggleSidebar() {
    if (this.isMobile) {
      this.sidebar?.classList.toggle("active");
      this.sidebarOverlay?.classList.toggle("active");
      document.body.style.overflow = this.sidebar?.classList.contains("active")
        ? "hidden"
        : "";
    } else {
      this.isCollapsed = !this.isCollapsed;
      this.sidebar?.classList.toggle("collapsed", this.isCollapsed);
      localStorage.setItem("sidebarCollapsed", this.isCollapsed);
    }
    this.dispatchEvent("sidebarToggle", { collapsed: this.isCollapsed });
  }

  closeSidebar() {
    if (this.isMobile) {
      this.sidebar?.classList.remove("active");
      this.sidebarOverlay?.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  handleCreateEmail() {
    console.log("Create new email clicked");
    this.dispatchEvent("createEmail");
  }

  handleProfileClick() {
    console.log("Profile clicked");
    this.dispatchEvent("profileClick");
  }

  addTooltips() {
    this.menuItems.forEach((item) => {
      const text = item.querySelector(".menu-text")?.textContent;
      if (text) item.setAttribute("data-tooltip", text);
    });
  }

  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;
    if (wasMobile !== this.isMobile) {
      this.sidebar?.classList.remove("active", "collapsed");
      this.sidebarOverlay?.classList.remove("active");
      document.body.style.overflow = "";
      if (!this.isMobile) {
        const savedState = localStorage.getItem("sidebarCollapsed");
        if (savedState === "true") {
          this.isCollapsed = true;
          this.sidebar?.classList.add("collapsed");
        }
      }
    }
  }

  handleKeyboard(e) {
    if (e.key === "Escape" && this.isMobile) {
      this.closeSidebar();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      this.toggleSidebar();
    }
    if (e.altKey) {
      const currentIndex = Array.from(this.menuItems).findIndex((item) =>
        item.classList.contains("active")
      );
      let newIndex = currentIndex;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : this.menuItems.length - 1;
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        newIndex = currentIndex < this.menuItems.length - 1 ? currentIndex + 1 : 0;
      }
      if (newIndex !== currentIndex) {
        const newSection = this.menuItems[newIndex].dataset.section;
        this.updateActiveSection(newSection);
      }
    }
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  // API opcional
  goToSection(sectionId) {
    this.updateActiveSection(sectionId);
  }

  collapse() {
    if (!this.isMobile && !this.isCollapsed) {
      this.toggleSidebar();
    }
  }

  expand() {
    if (!this.isMobile && this.isCollapsed) {
      this.toggleSidebar();
    }
  }

  getActiveSection() {
    return this.activeSection;
  }

  isCollapsedState() {
    return this.isCollapsed;
  }
}

// ------------- 3) Función para inicializar la instancia -------------
function initEmailSidebar() {
  // Verificamos que existan los elementos antes de crear la instancia
  if (!document.getElementById("sidebar") ||
      !document.getElementById("sidebarOverlay")) {
    console.warn("No se encontraron los elementos del sidebar para inicializar.");
    return;
  }

  const emailSidebar = new EmailSidebar();
  window.emailSidebar = emailSidebar;

  // Ejemplo: suscribirse a eventos personalizados
  document.addEventListener("sectionChange", (e) => {
    console.log(`Section changed to: ${e.detail.section}`);
  });
  document.addEventListener("createEmail", () => {
    console.log("Create email event triggered");
    // Aquí va tu lógica para crear un email
  });
  document.addEventListener("profileClick", () => {
    console.log("Profile clicked event triggered");
    // Aquí va tu lógica de perfil
  });
  document.addEventListener("sidebarToggle", (e) => {
    console.log(`Sidebar toggled. Collapsed: ${e.detail.collapsed}`);
    // P. ej. podrías guardar el estado en localStorage o actualizar algo más
  });
}

// ------------- 4) Arrancamos todo cuando el DOM esté listo -------------
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
});

// ------------- Opcional: Export como módulo -------------
if (typeof module !== "undefined" && module.exports) {
  module.exports = EmailSidebar;
}
