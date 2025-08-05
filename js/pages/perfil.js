import { initSidebar } from '/js/components/sidebar.js';
import { fetchWithAuth } from '/js/utils/api.js';

const PLAN_LABEL = {
  free:      "Plan Free",
  starter:   "Plan Starter",
  advanced:  "Plan Advanced",
  professional: "Plan Professional"
};

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
        this.setupFormValidation();
        this.updateDisplayInfo();
        
        console.log('User Profile initialized');
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
        
        const hasOpeningHours = this.currentData.storeHours || {};
        // Store Hours
        Object.entries(hasOpeningHours).forEach(([day, hours]) => {
            const dayElement = document.querySelector(`[data-day="${day}"]`);
            if (!dayElement) return; // si no existe el día, salta
            const toggle = dayElement.querySelector('.day-toggle');
            const timeInputs = dayElement.querySelectorAll('.time-input');
            
            toggle.checked = hours.open;
            timeInputs[0].value = hours.start;
            timeInputs[1].value = hours.end;
            timeInputs[0].disabled = !hours.open;
            timeInputs[1].disabled = !hours.open;
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
            //this.updateProfileProgress();
        });
        
        // Store hours toggles
        document.querySelectorAll('.day-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.handleDayToggle(e);
                this.markAsChanged();
                //this.updateProfileProgress();
            });
        });
        
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
        

        document.getElementById('logoutBtn')
        .addEventListener('click', async () => {
            const ok = await this.confirmModal('¿Quieres cerrar la sesión?', {
                        okText:'Sí, salir', okClass:'btn btn-danger'
                        });
            if (ok){
                localStorage.removeItem('token');
                localStorage.removeItem('store');
                window.location.href = '/index.html';
            }
        });

        document.getElementById('hasOpeningHours').addEventListener('change', () => {
            this.toggleHoursFields();
            this.markAsChanged();
        });

        document.getElementById('businessCategory').addEventListener('change', () => {
            const isOther = document.getElementById('businessCategory').value === 'other';
            document.getElementById('businessCategoryOtherContainer')
                    .classList.toggle('hidden', !isOther);
            this.markAsChanged();
        });

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
        const timeInputs = dayElement.querySelectorAll('.time-input');
        const isOpen = event.target.checked;
        
        timeInputs.forEach(input => {
            input.disabled = !isOpen;
            if (!isOpen) {
                input.style.opacity = '0.5';
            } else {
                input.style.opacity = '1';
            }
        });
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
        
        // Collect store hours
        if ( document.getElementById('hasOpeningHours').checked ) {
            formData.storeHours = {};
            document.querySelectorAll('.hours-day').forEach(dayElement => {
            const day        = dayElement.dataset.day;
            const toggle     = dayElement.querySelector('.day-toggle');
            const timeInputs = dayElement.querySelectorAll('.time-input');
            formData.storeHours[day] = {
                open:  toggle.checked,
                start: timeInputs[0].value,
                end:   timeInputs[1].value
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
        
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.innerHTML;
        
        // Show loading state
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        try {
            const formData = this.collectFormData();
            
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