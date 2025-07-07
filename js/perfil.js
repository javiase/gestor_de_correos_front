/*perfil.js */
class UserProfile {
    constructor() {
        this.originalData = {};
        this.currentData = {};
        this.hasUnsavedChanges = false;
        
        this.init();
    }
    
    init() {
        this.loadInitialData();
        this.bindEvents();
        this.setupFormValidation();
        this.updateDisplayInfo();
        
        console.log('User Profile initialized');
    }
    
    loadInitialData() {
        // Simulate loading data from API or localStorage
        this.originalData = {
            // Store Information
            storeName: 'My Awesome Store',
            storeEmail: 'store@example.com',
            storeUrl: 'mystore.com',
            storeDescription: 'Premium quality products with exceptional customer service. We specialize in unique items that bring value to your everyday life.',
            
            // Store Hours
            storeHours: {
                monday: { open: true, start: '09:00', end: '17:00' },
                tuesday: { open: true, start: '09:00', end: '17:00' },
                wednesday: { open: true, start: '09:00', end: '17:00' },
                thursday: { open: true, start: '09:00', end: '17:00' },
                friday: { open: true, start: '09:00', end: '17:00' },
                saturday: { open: true, start: '10:00', end: '16:00' },
                sunday: { open: false, start: '10:00', end: '16:00' }
            },
            
            // Physical Location
            hasPhysicalLocation: true,
            storeAddress: '123 Main Street',
            storeCity: 'New York',
            storeState: 'NY',
            storeZip: '10001',
            storeCountry: 'US',
            storePhone: '+1 (555) 123-4567',
            
            // Personal Information
            firstName: 'Fryderyk',
            lastName: 'Wiatrowski',
            personalEmail: 'fryderyk@example.com',
            personalPhone: '+1 (555) 987-6543',
            timezone: 'UTC-5',
            language: 'en',
            
            // Notifications
            emailNotifications: true,
            smsNotifications: false,
            marketingNotifications: true
        };
        
        this.currentData = { ...this.originalData };
        this.populateForm();
    }
    
    populateForm() {
        // Store Information
        document.getElementById('storeName').value = this.currentData.storeName;
        document.getElementById('storeEmail').value = this.currentData.storeEmail;
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
        
        // Store Hours
        Object.entries(this.currentData.storeHours).forEach(([day, hours]) => {
            const dayElement = document.querySelector(`[data-day="${day}"]`);
            const toggle = dayElement.querySelector('.day-toggle');
            const timeInputs = dayElement.querySelectorAll('.time-input');
            
            toggle.checked = hours.open;
            timeInputs[0].value = hours.start;
            timeInputs[1].value = hours.end;
            timeInputs[0].disabled = !hours.open;
            timeInputs[1].disabled = !hours.open;
        });
        
        this.toggleLocationFields();
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
        
        // Store hours toggles
        document.querySelectorAll('.day-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.handleDayToggle(e);
                this.markAsChanged();
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
                this.showMessage('Avatar updated successfully', 'success');
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
        const email = document.getElementById('personalEmail').value;
        
        document.getElementById('displayUserName').textContent = `${firstName} ${lastName}`;
        document.getElementById('displayUserEmail').textContent = email;
    }
    
    collectFormData() {
        const formData = {
            // Store Information
            storeName: document.getElementById('storeName').value,
            storeEmail: document.getElementById('storeEmail').value,
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
        document.querySelectorAll('.hours-day').forEach(dayElement => {
            const day = dayElement.dataset.day;
            const toggle = dayElement.querySelector('.day-toggle');
            const timeInputs = dayElement.querySelectorAll('.time-input');
            
            formData.storeHours[day] = {
                open: toggle.checked,
                start: timeInputs[0].value,
                end: timeInputs[1].value
            };
        });
        
        return formData;
    }
    
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
            await this.simulateApiCall(formData);
            
            // Update stored data
            this.currentData = { ...formData };
            this.originalData = { ...formData };
            this.hasUnsavedChanges = false;
            
            // Update display
            this.updateDisplayInfo();
            
            // Reset button states
            saveBtn.style.background = '#8b5cf6';
            document.getElementById('cancelBtn').style.display = 'none';
            
            this.showMessage('Profile updated successfully!', 'success');
            
        } catch (error) {
            console.error('Save error:', error);
            this.showMessage('Failed to save changes. Please try again.', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
    
    cancelChanges() {
        if (this.hasUnsavedChanges) {
            if (confirm('Are you sure you want to discard your changes?')) {
                this.currentData = { ...this.originalData };
                this.populateForm();
                this.hasUnsavedChanges = false;
                
                // Reset button states
                document.getElementById('saveBtn').style.background = '#8b5cf6';
                document.getElementById('cancelBtn').style.display = 'none';
                
                this.showMessage('Changes discarded', 'warning');
            }
        }
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
}

// Initialize the profile when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const userProfile = new UserProfile();
    
    // Make profile globally accessible for debugging
    window.userProfile = userProfile;
    
    console.log('User Profile page loaded successfully');
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