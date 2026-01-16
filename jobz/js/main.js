/**
 * Job Application Form - Main JavaScript (Modular)
 * Handles form submission, validation, auto-save, and interactive effects
 */

import CONFIG from './config.js';
import { toast } from './toast.js';

class App {
    constructor() {
        this.initDoms();
        this.initEventListeners();
        this.loadDraft();
        this.handleInitialLoading();
    }

    initDoms() {
        this.form = document.querySelector("#job_opening");
        this.submitBtn = document.querySelector("#submit_btn");
        this.spinner = document.querySelector("#job_spin");
        this.smile = document.querySelector("#job_smile");
        this.sad = document.querySelector("#job_sad");
        this.inputs = this.form.querySelectorAll('input, textarea');
        this.loadingOverlay = document.getElementById('loading_overlay');
    }

    initEventListeners() {
        this.form.addEventListener("submit", (e) => this.handleSubmit(e));

        // Auto-save on input
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
                setTimeout(() => {
                    this.loadingOverlay.classList.add('hidden');
                }, 300);
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
            toast.show('Please fill in all required fields correctly.', 'warning');
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
        if (isLoading) {
            this.spinner.classList.remove("hidden");
            this.spinner.classList.add("active");
            this.smile.classList.add("hidden");
            this.sad.classList.add("hidden");
        } else {
            this.spinner.classList.remove("active");
            this.spinner.classList.add("hidden");
        }
    }

    handleSuccess() {
        this.smile.classList.remove("hidden");
        this.smile.classList.add("active");
        toast.show('Application submitted successfully!', 'success');

        // Clear draft after successful submission
        localStorage.removeItem('job_app_draft');

        setTimeout(() => {
            this.form.reset();
            this.form.classList.remove('was-validated');
            this.smile.classList.remove("active");
            this.smile.classList.add("hidden");
            this.submitBtn.disabled = false;
        }, CONFIG.SUBMISSION_RESET_TIMEOUT);
    }

    handleError(message) {
        this.sad.classList.remove("hidden");
        this.sad.classList.add("active");
        toast.show(`Error: ${message}`, 'error');
        this.submitBtn.disabled = false;
    }

    saveDraft() {
        const data = {};
        this.inputs.forEach(input => {
            data[input.name] = input.value;
        });
        localStorage.setItem('job_app_draft', JSON.stringify(data));
    }

    loadDraft() {
        const draft = localStorage.getItem('job_app_draft');
        if (draft) {
            const data = JSON.parse(draft);
            this.inputs.forEach(input => {
                if (data[input.name]) {
                    input.value = data[input.name];
                }
            });
            toast.show('Restored your progress from draft.', 'info', 3000);
        }
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
