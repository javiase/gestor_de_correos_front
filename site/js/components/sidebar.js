
import { isProfileComplete, getStoreCached, isOnboardingComplete, seedOnboardingFromServer} from '/js/utils/flow-gate.js';

// Módulo sidebar.js
export function initSidebar(containerSelector, opts={}) {
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
      initEmailSidebar(opts);
    })
    .catch(console.error);
}

class EmailSidebar {
  constructor(opts={}) {
    this.skipSeed = !!opts.skipSeed;
    this.sidebar       = document.getElementById("sidebar");
    this.overlay       = document.getElementById("sidebarOverlay");
    this.toggleBtn     = document.getElementById("toggleSidebar");
    this.items         = document.querySelectorAll(".menu-item[data-section]");
    this.settingsHeader= document.getElementById("settingsHeader");
    this.settingsMenu  = document.getElementById("settingsMenu");
    this.createBtn     = document.querySelector(".create-email");
    this.userProfile   = document.getElementById("userProfile");
    this.isMobile      = window.innerWidth <= 768;
    this.isCollapsed   = false;

    this.profileComplete   = false;
    this.onboardingComplete= false;

    this.loadUserProfile();
    this.bind();
    this.setupFlowLocks();
  }

  /* ───────── Estado de locks (perfil + onboarding) ───────── */
  async setupFlowLocks() {
    const store = await getStoreCached();
    this.profileComplete = isProfileComplete(store);

    // Solo tiene sentido chequear onboarding si el perfil ya está completo
    if (this.profileComplete) {
      // Sembramos desde backend por si el local no está al día
      if (!this.skipSeed) await seedOnboardingFromServer();
      this.onboardingComplete = isOnboardingComplete();
    } else {
      this.onboardingComplete = false;
    }

    this.updateDisabledMenu();

    // Cuando el perfil cambie a “completo”, re-evaluamos
    window.addEventListener('profile-complete-changed', async (e) => {
      this.profileComplete = !!e.detail?.complete;
      if (this.profileComplete) {
        if (!this.skipSeed) await seedOnboardingFromServer();
        this.onboardingComplete = isOnboardingComplete();
      } else {
        this.onboardingComplete = false;
      }
      this.updateDisabledMenu();
    });

    // Si en tu app emites un evento al completar onboarding, lo soportamos:
    window.addEventListener('onboarding-complete-changed', (e) => {
      this.onboardingComplete = !!e.detail?.complete;
      this.updateDisabledMenu();
    });
  }

   /* ───────── Habilitar/deshabilitar elementos según el flujo ───────── */
  updateDisabledMenu() {
    // Reglas:
    //  - Perfil incompleto  → solo “perfil”
    //  - Perfil ok, info incompleta → solo “perfil” + “info”
    //  - Todo ok → todo habilitado
    let allowed = null; // null = todo permitido
    if (!this.profileComplete) {
      allowed = new Set(['perfil']);
    } else if (!this.onboardingComplete) {
      allowed = new Set(['perfil', 'info']);
    }

    this.items.forEach(item => {
      const sec = item.dataset.section;               // p.ej. 'inbox', 'compose', 'perfil', 'info'…
      const a   = item.querySelector('a');
      const lockThis = allowed ? !allowed.has(sec) : false;

      item.classList.toggle('is-disabled', lockThis);
      a.setAttribute('aria-disabled', lockThis ? 'true' : 'false');

      // Evita duplicar listeners
      a.removeEventListener('click', this.blockClick, { passive: false });
      if (lockThis) a.addEventListener('click', this.blockClick, { passive: false });
    });

    // Botón "Redactar": solo habilitado cuando TODO está completo
    const lockCompose = !this.profileComplete || !this.onboardingComplete;
    if (this.createBtn) {
      this.createBtn.classList.toggle('is-disabled', lockCompose);
      this.createBtn.removeEventListener('click', this.blockClick, { passive:false });
      if (lockCompose) this.createBtn.addEventListener('click', this.blockClick, { passive:false });
    }
  }

  /* ───────── Redirección cuando algo está bloqueado ───────── */
  blockClick = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!this.profileComplete) {
      window.location.href = '/secciones/perfil.html?msg=Completa%20tu%20perfil%20para%20continuar.';
      return;
    }
    if (!this.onboardingComplete) {
      window.location.href = '/secciones/info.html?msg=Completa%20esta%20secci%C3%B3n%20antes%20de%20continuar.';
      return;
    }
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
      integrations: "/secciones/integrations.html",
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

function initEmailSidebar(opts) {
  new EmailSidebar(opts);
}

function applyPendingDotFromCache() {
  try {
    const cached = JSON.parse(localStorage.getItem('store') || '{}');
    document.body.classList.toggle('has-pending-ideas', !!cached.has_pending_ideas);
  } catch {}
}

// en initSidebar()…
applyPendingDotFromCache();

// escucha cambios en caliente enviados por otras páginas
window.addEventListener('pending-ideas:count', (e) => {
  const count = e?.detail?.count ?? 0;
  document.body.classList.toggle('has-pending-ideas', count > 0);
});

// Escuchar cambios en el avatar desde el perfil
window.addEventListener('profile-avatar-updated', (e) => {
  const avatarImg = document.querySelector('.profile-avatar img');
  if (avatarImg && e.detail?.picture_url) {
    avatarImg.src = e.detail.picture_url;
  }
});
