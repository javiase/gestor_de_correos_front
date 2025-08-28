import { initSidebar } from '/js/components/sidebar.js';
import { fetchWithAuth } from '/js/utils/api.js';
import { LIMITS } from '/js/config.js?v=1'; 

const PLAN_LABEL = {
  free:      "Plan Free",
  starter:   "Plan Starter",
  advanced:  "Plan Advanced",
  professional: "Plan Professional"
};
// Reglas por prefijo (longitudes de número nacional válidas)
const PHONE_RULES = {
  '1':  { name: 'NANP (US/CA)', nsn: [10] },            // US, CA
  '34': { name: 'España',        nsn: [9]  },
  '44': { name: 'Reino Unido',   nsn: [10] },
  '49': { name: 'Alemania',      nsn: [10,11] },
  '33': { name: 'Francia',       nsn: [9]  },
  '39': { name: 'Italia',        nsn: [9,10,11] },
  '61': { name: 'Australia',     nsn: [9]  },
  '81': { name: 'Japón',         nsn: [9,10] }
};
const DEFAULT_NSN_MIN = 8, DEFAULT_NSN_MAX = 15;

function findPhoneRuleByE164(e164) {
  const digits = e164.replace(/^\+/, '');
  const codes = Object.keys(PHONE_RULES).sort((a,b) => b.length - a.length); // longest match
  for (const cc of codes) {
    if (digits.startsWith(cc)) {
      return { cc, ...PHONE_RULES[cc], rest: digits.slice(cc.length) };
    }
  }
  return { cc: null, name: 'Desconocido', rest: digits, nsn: null };
}

function normalizeE164(input) {
  // Deja un único + al inicio y solo dígitos después
  input = input.trim();
  const hasPlus = input.startsWith('+');
  const digits  = input.replace(/[^\d]/g, '');
  return (hasPlus ? '+' : '+') + digits; // forzamos siempre +
}


/*perfil.js */
class UserProfile {
    constructor() {
        this.originalData = {};
        this.currentData = {};
        this.hasUnsavedChanges = false;
        this.showCachedAvatar();
        this.init();
    }
    showCachedAvatar() { //Para mostrar el avatar antes de hacer la llamada al /me, asi evitamos el flasheo de la imagen sin cargar
        const cached = JSON.parse(localStorage.getItem('store') || '{}');
        if (cached.picture_url) {
        const img = document.getElementById('userAvatar');
        img.src = cached.picture_url;
        img.onload  = () => img.classList.add('loaded');
        img.onerror = () => (img.src = '/image.png');
        }
    }
    async init() {
        await this.loadInitialData();

        const params = new URLSearchParams(window.location.search);
        const msg    = params.get('msg');
        if (msg) {
            this.showMessage(decodeURIComponent(msg), 'success');
            // limpiamos la URL para que al recargar no vuelva a mostrarlo
            window.history.replaceState({}, '', window.location.pathname);
        }

        this.bindEvents();

        document.addEventListener('input', (e) => {
            const el = e.target;
            if (!el || !('value' in el)) return;
            const max = LIMITS.profile_field;
            if (typeof el.value === 'string' && el.value.length > max) {
                el.value = el.value.slice(0, max);
            }
        }, { passive: true });


        this.setupFormValidation();
        this.updateDisplayInfo();
        
        console.log('User Profile initialized');
    }
    applyMaxLengthConstraints() {
        const DEFAULT_MAX = LIMITS.profile_field; // 1000
        // Overrides por id de campo para que el límite sea razonable en UI
        const OVERRIDES = {
            storePhone: 32,
            personalPhone: 32,
            storeZip: 20,
            storeUrl: 1000,
            storeName: 120,
            storeDescription: 600,
            storeAddress: 200,
            storeCity: 120,
            storeState: 120,
            firstName: 120,
            lastName: 120,
            personalEmail: 320,
            businessCategoryOther: 120,
        };

        const selector = 'input[type="text"], input[type="email"], input[type="url"], input[type="tel"], textarea';

        document.querySelectorAll(selector).forEach(el => {
            const id  = el.id || '';
            const max = OVERRIDES[id] ?? DEFAULT_MAX;

            // Atributo + propiedad (algunos navegadores respetan más el atributo)
            el.setAttribute('maxlength', String(max));
            if ('maxLength' in el) el.maxLength = max;

            // Recorta si ya viene largo (precarga)
            if (typeof el.value === 'string' && el.value.length > max) {
            el.value = el.value.slice(0, max);
            }

            // Hard-trim en tiempo real (tecleo/pegar/drag&drop/IME)
            el.addEventListener('input', () => {
            if (typeof el.value === 'string' && el.value.length > max) {
                el.value = el.value.slice(0, max);
            }
            }, { passive: true });
        });
    }

    
    async loadInitialData() {
        try{
            const res = await fetchWithAuth('/stores/me');
            if (!res.ok) throw new Error('Error fetching profile');
            const data = await res.json();
            localStorage.setItem('store', JSON.stringify(data));
            console.log('Profile data loaded:', data);
            this.originalData = data;
            this.currentData = { ...data };
            this.populateForm();
            this.toggleHoursFields();
            //this.updateProfileProgress();
        }catch (err) {
            console.error('Load error:', err);
        }
    }
    
    populateForm() {
        // Store Information
        document.getElementById('storeName').value = this.currentData.storeName;
        document.getElementById('storeUrl').value = this.currentData.storeUrl;
        document.getElementById('storeDescription').value = this.currentData.storeDescription;
        
        // Physical Location
        document.getElementById('hasPhysicalLocation').checked = this.currentData.hasPhysicalLocation;
        document.getElementById('storeAddress').value = this.currentData.storeAddress;
        document.getElementById('storeCity').value = this.currentData.storeCity;
        document.getElementById('storeState').value = this.currentData.storeState;
        document.getElementById('storeZip').value = this.currentData.storeZip;
        document.getElementById('storeCountry').value = this.currentData.storeCountry;
        document.getElementById('storePhone').value = this.currentData.storePhone;
        
        // Personal Information
        document.getElementById('firstName').value = this.currentData.firstName;
        document.getElementById('lastName').value = this.currentData.lastName;
        document.getElementById('personalEmail').value = this.currentData.personalEmail;
        document.getElementById('personalPhone').value = this.currentData.personalPhone;
        document.getElementById('timezone').value = this.currentData.timezone;
        document.getElementById('language').value = this.currentData.language;
        
        // Notifications
        document.getElementById('emailNotifications').checked = this.currentData.emailNotifications;
        document.getElementById('smsNotifications').checked = this.currentData.smsNotifications;
        document.getElementById('marketingNotifications').checked = this.currentData.marketingNotifications;
        
        const storeHours = this.currentData.storeHours || {};
        document.querySelectorAll('.hours-day').forEach(dayElement => {
            const day = dayElement.dataset.day;
            const hours = storeHours[day] || null;
            const toggle = dayElement.querySelector('.day-toggle');
            const isOpen = hours ? !!hours.open : false;
            toggle.checked = isOpen;

            // Normaliza a array de tramos
            const slots = Array.isArray(hours?.slots)
                ? hours.slots
                : (hours && hours.start && hours.end) ? [{ start: hours.start, end: hours.end }] : [];

            this.renderDaySlots(day, isOpen ? slots : []);
            // Habilita/inhabilita inputs y botón añadir
            dayElement.querySelectorAll('input[type="time"], button[data-action="add-slot"]').forEach(el => {
                el.disabled = !isOpen;
            });
            dayElement.classList.toggle('day-closed', !isOpen);
        });

        const avatar = document.getElementById('userAvatar');
        if (this.currentData.picture_url) {
            avatar.src = this.currentData.picture_url;
        }
        avatar.onerror = () => {
            // si falla la carga, pon una imagen genérica
            avatar.src = '/image.png';
            };
            if (this.currentData.picture_url) {
                avatar.src = this.currentData.picture_url;
            } else {
                // si no viene picture_url, también pon el placeholder
                avatar.src = '/image.png';
        }
        // Si el backend trae businessCategory
        if (this.currentData.businessCategory) {
            document.getElementById('businessCategory').value = this.currentData.businessCategory;
            const isOther = this.currentData.businessCategory === 'other';
            document.getElementById('businessCategoryOtherContainer')
                    .classList.toggle('hidden', !isOther);
            if (isOther) {
                document.getElementById('businessCategoryOther').value =
                this.currentData.businessCategoryOther || '';
            }
        }
        //this.updateProfileProgress();
        this.toggleLocationFields();
        this.applyMaxLengthConstraints();
    }
    // Toggle opening hours fields based on checkbox
    toggleHoursFields() {
        const checkbox  = document.getElementById('hasOpeningHours');
        const container = document.getElementById('openingHoursFields');
        if (!container) return;            // evita el null
        const show = checkbox.checked;
        // show/hide y habilita inputs
        container.classList.toggle('hidden', !show);
        container.querySelectorAll('input').forEach(inp => {
            inp.disabled = !show;
        });
    }
    
    bindEvents() {
        // Save and Cancel buttons
        document.getElementById('saveBtn').addEventListener('click', () => this.saveChanges());
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelChanges());
        
        // Avatar upload
        document.getElementById('avatarEditBtn').addEventListener('click', () => {
            document.getElementById('avatarInput').click();
        });
        document.getElementById('avatarInput').addEventListener('change', (e) => {
            this.handleAvatarUpload(e);
        });
        
        // Physical location toggle
        document.getElementById('hasPhysicalLocation').addEventListener('change', () => {
            this.toggleLocationFields();
            this.markAsChanged();
        });

        // Delegación horarios (con guard por si no existe el nodo)
        const hoursRoot = document.getElementById('openingHoursFields');
        if (hoursRoot) {
            // Toggle día abierto/cerrado
            hoursRoot.addEventListener('change', (e) => {
            if (e.target.matches('.day-toggle')) {
                this.handleDayToggle(e);
                this.markAsChanged();
            }
            });

            // Añadir / quitar tramos
            hoursRoot.addEventListener('click', (e) => {
            const addBtn = e.target.closest('[data-action="add-slot"]');
            const rmBtn  = e.target.closest('[data-action="remove-slot"]');

            if (addBtn) {
                const dayEl = addBtn.closest('.hours-day');
                this.addSlot(dayEl.dataset.day);
                this.markAsChanged();
            }

            if (rmBtn) {
                const slotEl = rmBtn.closest('[data-slot-index]');
                const dayEl  = rmBtn.closest('.hours-day');
                const idx    = parseInt(slotEl.dataset.slotIndex, 10);
                this.removeSlot(dayEl.dataset.day, idx);
                this.markAsChanged();
            }
            });
        }

        // NEW — Validación en vivo de teléfonos (tienda y personal)
        ['storePhone', 'personalPhone'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            // Solo permitir + al inicio y dígitos/espacios después (en input)
            el.addEventListener('input', () => {
            const cleaned = el.value.replace(/(?!^\+)[^\d\s]/g, ''); // deja + solo al inicio
            if (cleaned !== el.value) el.value = cleaned;
            this.clearFieldError(el);
            }, { passive: true });

            // Validación E.164 al perder foco
            el.addEventListener('blur', () => {
            if (!el.value.trim()) return; // si no es obligatorio y está vacío, omite
            this._validatePhoneField(el);
            });
        });

        // NEW — Cambiar placeholder según país de tienda
        const storeCountryEl = document.getElementById('storeCountry');
        if (storeCountryEl) {
            storeCountryEl.addEventListener('change', () => {
            const ccMap = { US:'1', CA:'1', UK:'44', DE:'49', FR:'33', ES:'34', IT:'39', AU:'61', JP:'81' };
            const cc = ccMap[ storeCountryEl.value ] || '';
            const ph = document.getElementById('storePhone');
            if (ph) ph.placeholder = cc ? `+${cc} …` : '+…';
            });
        }

        // Form inputs change detection
        const formInputs = document.querySelectorAll('.form-input, .form-textarea, .form-select, input[type="checkbox"], input[type="time"]');
        formInputs.forEach(input => {
            input.addEventListener('input', () => this.markAsChanged());
            input.addEventListener('change', () => this.markAsChanged());
        });
        
        // Prevent accidental navigation
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            const ok = await this.confirmModal('¿Quieres cerrar la sesión?', {
            okText:'Sí, salir', okClass:'btn btn-danger'
            });
            if (ok){
            localStorage.removeItem('token');
            localStorage.removeItem('store');
            window.location.href = '/index.html';
            }
        });

        // Mostrar/ocultar bloque de horarios
        document.getElementById('hasOpeningHours').addEventListener('change', () => {
            this.toggleHoursFields();
            this.markAsChanged();
        });

        // Other category
        document.getElementById('businessCategory').addEventListener('change', () => {
            const isOther = document.getElementById('businessCategory').value === 'other';
            document.getElementById('businessCategoryOtherContainer')
                    .classList.toggle('hidden', !isOther);
            this.markAsChanged();
        });

        // Delete account
        document.getElementById('deleteAccountBtn').addEventListener('click', () => {
            this.showDeleteModal();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
            if (e.key === 's') {
                e.preventDefault();
                this.saveChanges();
            }
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.cancelChanges();
            }
            }
        });
    }

    
    setupFormValidation() {
        const requiredFields = document.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.clearFieldError(field));
        });
    }
    
    validateField(field) {
        const value = field.value.trim();
        const isValid = value !== '';
        
        if (!isValid) {
            field.classList.add('error');
            this.showFieldError(field, 'This field is required');
        } else {
            field.classList.remove('error');
            this.clearFieldError(field);
        }
        
        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                field.classList.add('error');
                this.showFieldError(field, 'Please enter a valid email address');
                return false;
            }
        }
        
        return isValid;
    }
    
    showFieldError(field, message) {
        this.clearFieldError(field);
        const errorElement = document.createElement('span');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.style.color = '#ef4444';
        errorElement.style.fontSize = '12px';
        errorElement.style.marginTop = '4px';
        field.parentNode.appendChild(errorElement);
    }
    
    clearFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        field.classList.remove('error');
    }
    
    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                this.showMessage('File size must be less than 5MB', 'error');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                this.showMessage('Please select a valid image file', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('userAvatar').src = e.target.result;
                this.markAsChanged();
                this.showMessage('Avatar actualizado', 'success');
            };
            reader.readAsDataURL(file);
        }
    }
    
    toggleLocationFields() {
        const hasLocation = document.getElementById('hasPhysicalLocation').checked;
        const locationFields = document.getElementById('locationFields');
        const requiredFields = locationFields.querySelectorAll('[required]');
        
        if (hasLocation) {
            locationFields.classList.remove('hidden');
            requiredFields.forEach(field => field.required = true);
        } else {
            locationFields.classList.add('hidden');
            requiredFields.forEach(field => field.required = false);
        }
    }
    
    handleDayToggle(event) {
        const dayElement = event.target.closest('.hours-day');
        const isOpen = event.target.checked;

        dayElement.querySelectorAll('input[type="time"]').forEach(inp => {
            inp.disabled = !isOpen;
            inp.style.opacity = isOpen ? '1' : '0.5';
        });

        const addBtn = dayElement.querySelector('[data-action="add-slot"]');
        if (addBtn) addBtn.disabled = !isOpen;

        dayElement.classList.toggle('day-closed', !isOpen);
    }
    
    markAsChanged() {
        this.hasUnsavedChanges = true;
        document.getElementById('saveBtn').style.background = '#10b981';
        document.getElementById('cancelBtn').style.display = 'flex';
    }
    
    updateDisplayInfo() {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = this.currentData.storeEmail;
        
        document.getElementById('displayUserName').textContent = `${firstName} ${lastName}`;
        document.getElementById('displayUserEmail').textContent = email;

        /* 👉 NOMBRE DEL PLAN */
        const planKey = this.currentData?.plan || "free";
        document.getElementById('displayUserPlan').textContent = PLAN_LABEL[planKey] ?? "Plan desconocido";

        // — Usos y créditos extra —
        const usedEl   = document.getElementById('usedEmails');
        const extraEl  = document.getElementById('extraCredits');
        const totalEl  = document.getElementById('totalLimit');

        const used  = this.currentData.usage       || 0;
        const extra = this.currentData.extra_usage || 0;
        const limit = (this.currentData.limit     || 0);

        usedEl.textContent  = used;
        extraEl.textContent = extra;
        totalEl.textContent = limit;

        // — Badge de días de prueba —
        const badgeEl  = document.getElementById('trialBadge');
        const daysEl   = document.getElementById('trialDays');

        const daysLeft = this.getTrialDaysLeft(this.currentData);
        if (daysLeft > 0) {
        daysEl.textContent = String(daysLeft);
        badgeEl.classList.remove('hidden');

        const trialEnd = this.getTrialEndDate(this.currentData);
        if (trialEnd) {
            // Tooltip: cuándo termina exactamente (hora local)
            badgeEl.title = `Termina el ${trialEnd.toLocaleString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Europe/Madrid'
            })}`;
        } else {
            badgeEl.title = '';
        }
        } else {
            badgeEl.classList.add('hidden');
            badgeEl.title = '';
        }

    }

    getTrialDaysLeft(data) {
        // Solo calculamos a partir de trial_end (si no existe, no hay trial)
        const end = this.getTrialEndDate(data);
        if (!end) return 0;

        const diffMs = end.getTime() - Date.now();
        if (diffMs <= 0) return 0;

        // UX: cuenta cualquier fracción como 1 día restante
        return Math.max(0, Math.ceil(diffMs / 86400000));
    }

    getTrialEndDate(data) {
        // Tu backend solo envía trial_end si está en trial
        return this._parseDate(data?.trial_end || null);
    }

    _parseDate(value) {
        if (!value) return null;
        // Soporta ISO string o epoch (ms / s)
        if (typeof value === 'number') {
            // Stripe suele dar segundos
            const ms = value < 1e12 ? value * 1000 : value;
            const d = new Date(ms);
            return isNaN(d.getTime()) ? null : d;
        }
        if (typeof value === 'string') {
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        }
        return null;
    }

    _validatePhoneField(inputEl) {
        const raw = inputEl.value.trim();
        const e164 = normalizeE164(raw);

        if (!/^\+\d{8,16}$/.test(e164)) {
            this.showFieldError(inputEl, 'Usa formato internacional: +código y solo dígitos (8–16 en total).');
            return false;
        }

        const { cc, nsn, rest } = findPhoneRuleByE164(e164);
        if (nsn && !nsn.includes(rest.length)) {
            this.showFieldError(inputEl, `Longitud inválida para +${cc}. Debe tener ${nsn.join(' o ')} dígitos tras el prefijo.`);
            return false;
        }

        if (!nsn) {
            // País no mapeado: valida rango genérico 8–15 para el número nacional
            if (rest.length < DEFAULT_NSN_MIN || rest.length > DEFAULT_NSN_MAX) {
            this.showFieldError(inputEl, `Número muy corto/largo. Usa entre ${DEFAULT_NSN_MIN} y ${DEFAULT_NSN_MAX} dígitos tras el prefijo.`);
            return false;
            }
        }

        // Normaliza visualmente a E.164 compacto (sin espacios)
        inputEl.value = `+${cc ? cc : ''}${rest}`;
        this.clearFieldError(inputEl);
        return true;
    }

    _validatePhones() {
        const fields = [
            { id: 'storePhone',    label: 'Número de Teléfono (tienda)'   },
            { id: 'personalPhone', label: 'Número de Teléfono (personal)' }
        ];
        let ok = true;
        for (const f of fields) {
            const el = document.getElementById(f.id);
            if (!el) continue;
            const val = el.value.trim();
            if (!val) continue; // si no es obligatorio, saltamos
            if (!this._validatePhoneField(el)) ok = false;
        }
        return ok;
    }


    // Configurable: número máximo de tramos por día
    MAX_SLOTS_PER_DAY = 3;

    renderDaySlots(day, slots = []) {
        const dayElement = document.querySelector(`.hours-day[data-day="${day}"]`);
        if (!dayElement) return;
        const container = dayElement.querySelector('[data-day-slots]');
        if (!container) return;

        container.innerHTML = '';
        // Si no hay tramos pero el día está abierto, sugiere uno
        if (slots.length === 0 && dayElement.querySelector('.day-toggle').checked) {
            slots = this._suggestDefaultSlots(day);
        }

        slots.forEach((slot, idx) => {
            container.appendChild(this._createSlotEl(day, slot, idx));
        });

        // Deshabilita añadir si se alcanzó el máximo
        const addBtn = dayElement.querySelector('[data-action="add-slot"]');
        if (addBtn) addBtn.disabled = (slots.length >= this.MAX_SLOTS_PER_DAY) || !dayElement.querySelector('.day-toggle').checked;
    }

    _createSlotEl(day, slot, idx) {
        const el = document.createElement('div');
        el.className = 'slot';
        el.dataset.slotIndex = String(idx);
        el.setAttribute('data-slot-index', String(idx)); // para query robusta

        el.innerHTML = `
            <input type="time" class="time-input" data-role="start" value="${slot.start || '09:00'}">
            <span class="time-separator">a</span>
            <input type="time" class="time-input" data-role="end"   value="${slot.end   || '17:00'}">
            <button type="button" class="remove-slot" data-action="remove-slot" title="Eliminar tramo">
            <i class="fas fa-times"></i>
            </button>
        `;
        return el;
    }

    addSlot(day) {
        const dayElement = document.querySelector(`.hours-day[data-day="${day}"]`);
        if (!dayElement) return;
        const container = dayElement.querySelector('[data-day-slots]');
        const curr = Array.from(container.querySelectorAll('.slot')).length;
        if (curr >= this.MAX_SLOTS_PER_DAY) return;

        // Sugerir siguiente tramo por defecto
        const suggestion = this._nextSlotSuggestion(day, container);
        container.appendChild(this._createSlotEl(day, suggestion, curr));

        // Re-evaluar botón añadir
        const addBtn = dayElement.querySelector('[data-action="add-slot"]');
        if (addBtn) addBtn.disabled = (curr + 1 >= this.MAX_SLOTS_PER_DAY);
    }

    removeSlot(day, idx) {
        const dayElement = document.querySelector(`.hours-day[data-day="${day}"]`);
        if (!dayElement) return;
        const container = dayElement.querySelector('[data-day-slots]');
        const slotEl = container.querySelector(`[data-slot-index="${idx}"]`);
        if (!slotEl) return;
        slotEl.remove();

        // Reindexar
        container.querySelectorAll('.slot').forEach((s, i) => {
            s.dataset.slotIndex = String(i);
        });

        const addBtn = dayElement.querySelector('[data-action="add-slot"]');
        if (addBtn) addBtn.disabled = false;
    }

    // Sugerencias: primer día partido típico ES
    _suggestDefaultSlots(day) {
        // Puedes personalizar por día si quieres
        return [
            { start: '09:00', end: '13:30' },
            { start: '16:00', end: '19:00' },
        ];
    }

    _nextSlotSuggestion(day, container) {
        const slots = Array.from(container.querySelectorAll('.slot')).map(s => ({
            start: s.querySelector('[data-role="start"]').value,
            end:   s.querySelector('[data-role="end"]').value,
        }));
        if (slots.length === 0) return { start: '09:00', end: '13:30' };
        if (slots.length === 1) {
            // Sugerir tarde si solo hay mañana
            return { start: '16:00', end: '19:00' };
        }
        // A partir de ahí, sugiere a continuación de la última
        const last = slots[slots.length - 1];
        const start = last.end;
        const end   = this._addMinutes(start, 120); // tramo de 2h por defecto
        return { start, end };
    }

    _addMinutes(hhmm, minutes) {
        const [h, m] = hhmm.split(':').map(Number);
        const base = new Date(0,0,1,h,m,0);
        const d2 = new Date(base.getTime() + minutes*60000);
        const pad = v => String(v).padStart(2,'0');
        return `${pad(d2.getHours())}:${pad(d2.getMinutes())}`;
    }

    _validateOpeningHours() {
        let ok = true;
        const errors = [];

        document.querySelectorAll('.hours-day').forEach(dayElement => {
            const day    = dayElement.dataset.day;
            const open   = dayElement.querySelector('.day-toggle')?.checked;
            if (!open) return;

            // Lee tramos
            const slots = Array.from(dayElement.querySelectorAll('.slot')).map(slotEl => {
                const s = slotEl.querySelector('[data-role="start"]').value;
                const e = slotEl.querySelector('[data-role="end"]').value;
                return { start: s, end: e };
            });

            // Formato y orden
            const toMin = (hhmm) => {
                const [h,m] = hhmm.split(':').map(Number);
                if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
                    return h*60 + m;
            };

            // Validación básica: start < end
            for (const {start, end} of slots) {
                const s = toMin(start), e = toMin(end);
                if (!(s < e)) {
                    ok = false;
                    errors.push(`"${day}": un tramo tiene inicio >= fin (${start} - ${end}).`);
                    break;
                }
            }
            if (!ok) return;

            // Sin solapes
            const sorted = slots
            .map(x => ({...x, s: toMin(x.start), e: toMin(x.end)}))
            .sort((a,b) => a.s - b.s);

            for (let i=1; i<sorted.length; i++) {
                if (sorted[i].s < sorted[i-1].e) {
                    ok = false;
                    errors.push(`"${day}": tramos solapados (${sorted[i-1].start}-${sorted[i-1].end} y ${sorted[i].start}-${sorted[i].end}).`);
                    break;
                }
            }
        });

        if (!ok) {
            this.showMessage(`Revisa horarios: ${errors.join(' ')}`, 'error');
        }
        return ok;
        }

    
    collectFormData() {
        const formData = {
            // Store Information
            storeName: document.getElementById('storeName').value,
            storeUrl: document.getElementById('storeUrl').value,
            storeDescription: document.getElementById('storeDescription').value,
            
            // Physical Location
            hasPhysicalLocation: document.getElementById('hasPhysicalLocation').checked,
            storeAddress: document.getElementById('storeAddress').value,
            storeCity: document.getElementById('storeCity').value,
            storeState: document.getElementById('storeState').value,
            storeZip: document.getElementById('storeZip').value,
            storeCountry: document.getElementById('storeCountry').value,
            storePhone: document.getElementById('storePhone').value,
            
            // Personal Information
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            personalEmail: document.getElementById('personalEmail').value,
            personalPhone: document.getElementById('personalPhone').value,
            timezone: document.getElementById('timezone').value,
            language: document.getElementById('language').value,
            
            // Notifications
            emailNotifications: document.getElementById('emailNotifications').checked,
            smsNotifications: document.getElementById('smsNotifications').checked,
            marketingNotifications: document.getElementById('marketingNotifications').checked,
            
            // Store Hours
            storeHours: {}
        };
        
        // Collect store hours (múltiples tramos)
        if (document.getElementById('hasOpeningHours').checked) {
            formData.storeHours = {};
            document.querySelectorAll('.hours-day').forEach(dayElement => {
                const day    = dayElement.dataset.day;
                const toggle = dayElement.querySelector('.day-toggle');

                const slots = [];
                dayElement.querySelectorAll('.slot').forEach(slotEl => {
                const start = slotEl.querySelector('input[data-role="start"]').value;
                const end   = slotEl.querySelector('input[data-role="end"]').value;
                if (start && end) slots.push({ start, end });
                });

                formData.storeHours[day] = {
                open: toggle.checked,
                slots: toggle.checked ? slots : []
                };
            });
        } else {
            formData.storeHours = {};
        }
        formData.businessCategory = document.getElementById('businessCategory').value;
        if (formData.businessCategory === 'other') {
        formData.businessCategoryOther =
            document.getElementById('businessCategoryOther').value.trim();
        }

        
        return formData;
    }
    /**updateProfileProgress() {
        const requiredFields = Array.from(
            document.querySelectorAll('.form-input[required], .form-select[required]')
        );
        const totalFields = requiredFields.length;
        const filled = requiredFields
            .filter(f => f.value.trim() !== '')
            .length;
        const pct = totalFields
            ? Math.round((filled / totalFields) * 100)
            : 0;
        document.getElementById('profileProgressBar').style.width = pct + '%';
    }**/

    
    validateForm() {
        const requiredFields = document.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    async saveChanges() {
        if (!this.validateForm()) {
            this.showMessage('Please fix the errors before saving', 'error');
            return;
        }
        // Validación de teléfonos antes de activar loading
        if (!this._validatePhones()) {
            this.showMessage('Revisa los números de teléfono en formato internacional.', 'error');
            return;
        }

        // Validación de horarios antes de guardar
        if (!this._validateOpeningHours()) {
            saveBtn.innerHTML = originalText; 
            saveBtn.disabled = false;
            return;
        }

        
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.innerHTML;
        
        // Show loading state
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        try {
            const formData = this.collectFormData();

            // ⛔ Límite por campo (mismo mapa que en applyMaxLengthConstraints)
            const DEFAULT_MAX = LIMITS.profile_field; // 1000
            const OVERRIDES = {
                storePhone: 32,
                personalPhone: 32,
                storeZip: 20,
                storeUrl: 2048,
                storeName: 120,
                storeDescription: 600,
                storeAddress: 200,
                storeCity: 120,
                storeState: 120,
                firstName: 120,
                lastName: 120,
                personalEmail: 320,
                businessCategoryOther: 120,
            };

            for (const [k, v] of Object.entries(formData)) {
                if (typeof v !== 'string') continue;
                const max = OVERRIDES[k] ?? DEFAULT_MAX;
                if (v.length > max) {
                    this.showMessage(`El campo "${k}" supera ${max} caracteres.`, 'error');
                    saveBtn.innerHTML = originalText; saveBtn.disabled = false;
                    return;
                }
            }

            
            // Simulate API call
            // 2) Llamada al endpoint PUT /stores/me
            const res = await fetchWithAuth('/stores/me', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error('Error actualizando la tienda');

            const updated = await res.json();

            localStorage.setItem('store', JSON.stringify(updated));

            this.currentData  = { ...updated };
            this.originalData = { ...updated };
            this.hasUnsavedChanges = false;

            this.populateForm();
            this.toggleHoursFields();
            this.updateDisplayInfo();
            //this.updateProfileProgress();

            // Reset button states
            saveBtn.style.background = '#8b5cf6';
            document.getElementById('cancelBtn').style.display = 'none';
            this.showMessage('Perfil actualizado!', 'success');
            
        } catch (error) {
            console.error('Save error:', error);
            this.showMessage('Error al guardar los cambios. Por favor, inténtalo de nuevo.', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
    
    async cancelChanges() {
        if (!this.hasUnsavedChanges) return;
        
        const ok = await this.confirmModal(
                    '¿Seguro que quieres descartar los cambios?',
                    { okText:'Descartar', okClass:'btn btn-danger' }
                    );
        if (!ok) return;

        this.currentData = { ...this.originalData };
        this.populateForm();
        this.hasUnsavedChanges = false;

        document.getElementById('saveBtn').style.background = '#8b5cf6';
        document.getElementById('cancelBtn').style.display  = 'none';
        this.showMessage('Cambios descartados', 'warning');
    }
    
    simulateApiCall(data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate random success/failure for demo
                if (Math.random() > 0.1) { // 90% success rate
                    resolve(data);
                } else {
                    reject(new Error('Network error'));
                }
            }, 1500);
        });
    }
    
    showMessage(text, type = 'success') {
        const messageContainer = document.getElementById('messageContainer');
        const message = document.createElement('div');
        message.className = `message ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 
                    'fa-exclamation-triangle';
        
        message.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${text}</span>
            <button class="message-close">&times;</button>
        `;
        
        messageContainer.appendChild(message);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 5000);
        
        // Manual close
        message.querySelector('.message-close').addEventListener('click', () => {
            message.remove();
        });
    }
    confirmModal(
        text             = '¿Estás seguro?',
        {
            okText     = 'Sí',
            cancelText = 'No',
            okClass    = 'btn btn-primary',
            cancelClass= 'btn btn-secondary'
        } = {}
        ) {
        return new Promise(resolve => {
            // Overlay
            const ov = Object.assign(document.createElement('div'), {className:'modal-overlay'});
            Object.assign(ov.style, {
            position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
            display:'flex', justifyContent:'center', alignItems:'center', zIndex:10000
            });

            // Caja
            const box = Object.assign(document.createElement('div'), {className:'modal-box'});
            Object.assign(box.style, {
            background:'#2a2a2a', color:'#fff', padding:'1.5rem',
            borderRadius:'8px', maxWidth:'90%', width:'320px', textAlign:'center'
            });
            box.innerHTML = `
            <p style="margin-bottom:1rem">${text}</p>
            <div class="modal-actions" style="display:flex;justify-content:center;gap:.75rem">
                <button class="${okClass}"    id="modalOk">${okText}</button>
                <button class="${cancelClass}" id="modalCancel">${cancelText}</button>
            </div>
            `;
            ov.appendChild(box);
            document.body.appendChild(ov);

            // Eventos
            box.querySelector('#modalOk').onclick = () => { cleanup(); resolve(true); };
            box.querySelector('#modalCancel').onclick = () => { cleanup(); resolve(false); };
            ov.onclick = e => (e.target === ov) && (cleanup(), resolve(false)); // clic fuera

            function cleanup(){ ov.remove(); }
        });
    }


    showDeleteModal() {
        // overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        // modal box
        const modal = document.createElement('div');
        modal.className = 'modal-box';
        modal.innerHTML = `
            <p>¿Estás seguro de que quieres eliminar tu cuenta?</p>
            <div class="modal-actions">
            <button id="confirmDelete" class="btn btn-secondary">Sí, eliminar</button>
            <button id="cancelDelete" class="btn btn-danger">No</button>
            </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // estilos mínimos (puedes pasarlos a CSS)
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 10000
        });
        Object.assign(modal.style, {
            background: '#444', padding: '1.5rem', borderRadius: '8px',
            maxWidth: '90%', width: '320px', textAlign: 'center'
        });
        modal.querySelector('.modal-actions').style.marginTop = '1rem';
        modal.querySelector('.modal-actions').style.display = 'flex';
        modal.querySelector('.modal-actions').style.justifyContent = 'center';
        modal.querySelectorAll('.btn').forEach(b => {
            b.style.margin = '0 0.5rem';
        });

        // listeners
        overlay.querySelector('#cancelDelete').addEventListener('click', () => {
            overlay.remove();
        });
        overlay.querySelector('#confirmDelete').addEventListener('click', async () => {
            try {
                const res = await fetchWithAuth('/stores/eliminar_tienda', { method: 'DELETE' });
                if (!res.ok) throw new Error('Error eliminando');
                // limpieza y logout
                localStorage.clear();
                window.location.href = '/index.html';
            } catch (err) {
                overlay.remove();
                this.showMessage('No pude eliminar tu cuenta', 'error');
            }
        });
    }
}

// Initialize the profile when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try{
        await initSidebar('#sidebarContainer');
        const userProfile = new UserProfile();
        window.userProfile = userProfile;
    }catch (err) {
        // Make profile globally accessible for debugging
        console.error('No pude inicializar la sidebar:', err);
    }
});

// Add some CSS for error states
const style = document.createElement('style');
style.textContent = `
    .form-input.error,
    .form-textarea.error,
    .form-select.error {
        border-color: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
    
    .location-fields.hidden {
        max-height: 0;
        opacity: 0;
        margin-top: 0;
        padding-top: 0;
        overflow: hidden;
    }
    
    .location-fields {
        max-height: 1000px;
        opacity: 1;
        margin-top: 24px;
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(style);