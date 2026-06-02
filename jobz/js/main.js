/**
 * Job Application Form - Main JavaScript (Modular)
 * Handles form submission, validation, auto-save, and interactive effects
 */

import CONFIG from './config.js';
import { toast } from './toast.js';

class App {
    constructor() {
        this.saveDraftTimer = null;
        this.initDoms();
        this.initEventListeners();
        this.loadDraft();
        this.handleInitialLoading();
    }

    initDoms() {
        this.form = document.querySelector("#job_opening");
        this.submitBtn = document.querySelector("#submit_btn");
        this.spinner = document.querySelector("#job_spin");
        this.resetBtn = document.querySelector("#reset_btn");
        this.inputs = this.form.querySelectorAll('input, textarea');
        this.loadingOverlay = document.getElementById('loading_overlay');
    }

    initEventListeners() {
        this.form.addEventListener("submit", (e) => this.handleSubmit(e));

        if (this.resetBtn) {
            this.resetBtn.addEventListener("click", () => this.handleReset());
        }

        // Auto-save on input with debounce
        this.inputs.forEach(input => {
            input.addEventListener('input', () => this.saveDraft());

            // Real-time validation
            input.addEventListener('blur', () => this.validateField(input));
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') {
                    this.form.requestSubmit();
                }
            }
        });
    }

    handleInitialLoading() {
        const hideLoading = () => {
            document.body.classList.add('loaded');
            if (this.loadingOverlay) {
                this.loadingOverlay.style.opacity = '0';
                this.loadingOverlay.addEventListener('transitionend', () => {
                    this.loadingOverlay.classList.add('hidden');
                }, { once: true });
            }
        };

        // If load event already fired (standard for deferred modules on small files)
        if (document.readyState === 'complete') {
            hideLoading();
        } else {
            window.addEventListener('load', hideLoading);
        }
    }

    validateField(input) {
        if (!input.checkValidity()) {
            input.classList.add('is-invalid');
        } else {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            setTimeout(() => input.classList.remove('is-valid'), 2000);
        }
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (!this.form.checkValidity()) {
            this.form.classList.add('was-validated');
            toast.show('Please fill in all required fields correctly.', 'warning', CONFIG.TOAST_DURATION);
            return;
        }

        const formData = new FormData(this.form);
        this.setLoadingState(true);

        // Immediate feedback requested by user
        toast.show('Submitting your application... Please wait for feedback.', 'info', 10000);

        try {
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            if (result.ok === true) {
                this.handleSuccess();
            } else {
                this.handleError(result.message || 'The submission was not successful. Please try again.');
            }
        } catch (error) {
            console.error("Submission error details:", error);
            this.handleError("Submission error: " + error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        this.submitBtn.disabled = isLoading;
        this.form.setAttribute('aria-busy', isLoading ? 'true' : 'false');
        if (isLoading) {
            this.spinner.classList.remove("hidden");
            this.spinner.classList.add("active");
        } else {
            this.spinner.classList.remove("active");
            this.spinner.classList.add("hidden");
        }
    }

    handleSuccess() {
        toast.show('Application submitted successfully!', 'success', CONFIG.TOAST_DURATION);

        // Clear draft after successful submission
        localStorage.removeItem('job_app_draft');

        setTimeout(() => {
            this.form.reset();
            this.form.classList.remove('was-validated');
            this.inputs.forEach(input => {
                input.classList.remove('is-valid', 'is-invalid');
            });
            this.submitBtn.disabled = false;
        }, CONFIG.SUBMISSION_RESET_TIMEOUT);
    }

    handleError(message) {
        toast.show(`Error: ${message}`, 'error', CONFIG.TOAST_DURATION);
        this.submitBtn.disabled = false;
    }

    handleReset() {
        this.form.reset();
        this.form.classList.remove('was-validated');
        this.inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
        localStorage.removeItem('job_app_draft');
        toast.show('Form fields and draft have been reset.', 'info', CONFIG.TOAST_DURATION);
    }

    saveDraft() {
        if (this.saveDraftTimer) {
            clearTimeout(this.saveDraftTimer);
        }
        this.saveDraftTimer = setTimeout(() => {
            const data = {};
            this.inputs.forEach(input => {
                data[input.name] = input.value;
            });
            localStorage.setItem('job_app_draft', JSON.stringify(data));
        }, 500);
    }

    loadDraft() {
        try {
            const draft = localStorage.getItem('job_app_draft');
            if (draft) {
                const data = JSON.parse(draft);
                this.inputs.forEach(input => {
                    if (data[input.name]) {
                        input.value = data[input.name];
                    }
                });
                toast.show('Restored your progress from draft.', 'info', CONFIG.TOAST_DURATION);
            }
        } catch (error) {
            console.error("Failed to load draft:", error);
            localStorage.removeItem('job_app_draft');
        }
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
