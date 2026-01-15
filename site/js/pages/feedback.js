/**
 * FEEDBACK PAGE CONTROLLER
 * Handles feedback form submission and validation
 */

import { initSidebar } from '../components/sidebar.js';
import { t, initI18n } from '../utils/i18n.js';
import { fetchWithAuth } from '../utils/api.js';
import { notify } from '../utils/notify.js';

class FeedbackPage {
  constructor() {
    this.form = null;
    this.messageTextarea = null;
    this.charCountSpan = null;
    this.submitBtn = null;
    this.successSection = null;
    this.formWrapper = null;
    this.maxChars = 1000;
  }

  async init() {
    console.log('[Feedback] Initializing feedback page...');
    
    // Initialize sidebar
    await initSidebar('#sidebarContainer');
    
    // Initialize i18n
    initI18n();
    
    // Get DOM elements
    this.form = document.getElementById('feedbackForm');
    this.messageTextarea = document.getElementById('feedbackMessage');
    this.charCountSpan = document.getElementById('charCount');
    this.submitBtn = document.getElementById('submitFeedbackBtn');
    this.successSection = document.getElementById('feedbackSuccess');
    this.formWrapper = document.querySelector('.feedback-form-wrapper');
    this.sendAnotherBtn = document.getElementById('sendAnotherBtn');

    if (!this.form) {
      console.error('[Feedback] Form not found');
      return;
    }

    // Setup event listeners
    this.setupEventListeners();

    // Pre-fill user email if available
    await this.prefillUserEmail();

    console.log('[Feedback] Page initialized successfully');
  }

  setupEventListeners() {
    // Character counter
    if (this.messageTextarea) {
      this.messageTextarea.addEventListener('input', () => {
        this.updateCharCount();
      });
    }

    // Form submission
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // Send another feedback button
    if (this.sendAnotherBtn) {
      this.sendAnotherBtn.addEventListener('click', () => {
        this.resetForm();
      });
    }
  }

  updateCharCount() {
    const length = this.messageTextarea.value.length;
    this.charCountSpan.textContent = length;

    // Update color based on length
    this.charCountSpan.parentElement.classList.remove('near-limit', 'at-limit');
    
    if (length >= this.maxChars) {
      this.charCountSpan.parentElement.classList.add('at-limit');
    } else if (length >= this.maxChars * 0.8) {
      this.charCountSpan.parentElement.classList.add('near-limit');
    }

    // Prevent exceeding max length
    if (length > this.maxChars) {
      this.messageTextarea.value = this.messageTextarea.value.substring(0, this.maxChars);
      this.charCountSpan.textContent = this.maxChars;
    }
  }

  async prefillUserEmail() {
    try {
      // Get user profile to pre-fill email
      const res = await fetchWithAuth('/users/me');
      if (res.ok) {
        const user = await res.json();
        const emailInput = document.getElementById('feedbackEmail');
        if (emailInput && user.email) {
          emailInput.value = user.email;
        }
      }
    } catch (error) {
      console.log('[Feedback] Could not prefill email:', error);
      // Non-critical error, continue
    }
  }

  validateForm() {
    const message = this.messageTextarea.value.trim();
    const type = document.getElementById('feedbackType').value;
    const priority = document.getElementById('feedbackPriority').value;

    if (!message) {
      notify.error(t('feedback.errorMessageRequired'));
      this.messageTextarea.focus();
      return false;
    }

    if (message.length < 10) {
      notify.error(t('feedback.errorMessageTooShort'));
      this.messageTextarea.focus();
      return false;
    }

    if (!type) {
      notify.error(t('feedback.errorTypeRequired'));
      document.getElementById('feedbackType').focus();
      return false;
    }

    if (!priority) {
      notify.error(t('feedback.errorPriorityRequired'));
      document.getElementById('feedbackPriority').focus();
      return false;
    }

    return true;
  }

  async handleSubmit() {
    // Validate form
    if (!this.validateForm()) {
      return;
    }

    // Disable submit button
    this.submitBtn.disabled = true;
    this.submitBtn.classList.add('loading');

    try {
      // Collect form data
      const formData = {
        message: this.messageTextarea.value.trim(),
        type: document.getElementById('feedbackType').value,
        priority: document.getElementById('feedbackPriority').value,
        area: document.getElementById('feedbackArea').value || 'general',
        contact_email: document.getElementById('feedbackEmail').value.trim() || null,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      console.log('[Feedback] Submitting feedback:', formData);

      // Send to backend
      const res = await fetchWithAuth('/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${res.status}`);
      }

      // Success
      console.log('[Feedback] Feedback submitted successfully');
      notify.success(t('feedback.successNotification'));
      this.showSuccessMessage();

    } catch (error) {
      console.error('[Feedback] Error submitting feedback:', error);
      notify.error(t('feedback.errorSubmitting'));
    } finally {
      // Re-enable submit button
      this.submitBtn.disabled = false;
      this.submitBtn.classList.remove('loading');
    }
  }

  showSuccessMessage() {
    // Hide form
    if (this.formWrapper) {
      this.formWrapper.style.display = 'none';
    }

    // Show success message
    if (this.successSection) {
      this.successSection.style.display = 'block';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm() {
    // Reset form
    this.form.reset();
    this.updateCharCount();

    // Hide success message
    if (this.successSection) {
      this.successSection.style.display = 'none';
    }

    // Show form
    if (this.formWrapper) {
      this.formWrapper.style.display = 'block';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-prefill email
    this.prefillUserEmail();
  }

  cleanup() {
    console.log('[Feedback] Cleaning up feedback page...');
    // Remove event listeners if needed
  }
}

// Initialize page when DOM is ready
const feedbackPage = new FeedbackPage();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => feedbackPage.init());
} else {
  feedbackPage.init();
}

export default feedbackPage;
