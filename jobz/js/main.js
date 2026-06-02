/**
 * Job Application Form - Main JavaScript (Modular)
 * Handles form submission, validation, auto-save, and interactive effects
 */

import CONFIG from './config.js';
import { toast } from './toast.js';

class App {
    constructor() {
        this.saveDraftTimer = null;
        this.isSubmitting = false;
        this.submitToast = null;
        this.initDoms();
        this.initEventListeners();
        this.loadDraft();
        this.initCharacterCounters();
        this.handleInitialLoading();
    }

    initDoms() {
        this.form = document.querySelector("#job_opening");
        this.submitBtn = document.querySelector("#submit_btn");
        this.spinner = document.querySelector("#job_spin");
        this.resetBtn = document.querySelector("#reset_btn");
        this.inputs = this.form.querySelectorAll('input, textarea');
        this.hiringTeam = document.querySelector("#hiring_team");
        this.jobDesc = document.querySelector("#job_description");
        this.companyDesc = document.querySelector("#company_description");
        this.jobDescCounter = document.querySelector("#job_description_counter");
        this.companyDescCounter = document.querySelector("#company_description_counter");
        this.loadingOverlay = document.getElementById('loading_overlay');
    }

    initEventListeners() {
        this.form.addEventListener("submit", (e) => this.handleSubmit(e));

        if (this.resetBtn) {
            this.resetBtn.addEventListener("click", () => this.handleReset());
        }

        // Auto-save on input with debounce
        this.inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.saveDraft();
                if (input === this.jobDesc || input === this.companyDesc) {
                    this.updateCounter(input);
                }
            });

            // Real-time validation
            input.addEventListener('blur', () => this.validateField(input));
        });

        // Hiring Team focus/blur behavior
        if (this.hiringTeam) {
            this.hiringTeam.addEventListener("focus", () => {
                if (this.hiringTeam.value === "Not Defined") {
                    this.hiringTeam.value = "";
                }
            });
            this.hiringTeam.addEventListener("blur", () => {
                if (this.hiringTeam.value.trim() === "") {
                    this.hiringTeam.value = "Not Defined";
                }
            });
        }

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

        // Double-submit guard
        if (this.isSubmitting) return;

        if (!this.form.checkValidity()) {
            this.form.classList.add('was-validated');
            toast.show('Please fill in all required fields correctly.', 'warning', CONFIG.TOAST_DURATION);

            // Focus and scroll to first invalid field
            const firstInvalid = this.form.querySelector(':invalid');
            if (firstInvalid) {
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalid.focus();
            }
            return;
        }

        const formData = new FormData(this.form);
        this.setLoadingState(true);
        this.isSubmitting = true;

        // Immediate feedback, save reference to hide later
        this.submitToast = toast.show('Submitting your application... Please wait for feedback.', 'info', 90000);

        // AbortController for 90 seconds timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        try {
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: "POST",
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            // Dismiss the submitting info toast before success/error notification
            if (this.submitToast) {
                this.submitToast.hide();
                this.submitToast = null;
            }

            if (result.ok === true) {
                this.handleSuccess();
            } else {
                this.handleError(result.message || 'The submission was not successful. Please try again.');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (this.submitToast) {
                this.submitToast.hide();
                this.submitToast = null;
            }
            console.error("Submission error details:", error);
            if (error.name === 'AbortError') {
                this.handleError("Submission error: Request timed out after 90 seconds.");
            } else {
                this.handleError("Submission error: " + error.message);
            }
        } finally {
            this.setLoadingState(false);
            this.isSubmitting = false;
        }
    }

    setLoadingState(isLoading) {
        this.submitBtn.disabled = isLoading;
        if (this.resetBtn) {
            this.resetBtn.disabled = isLoading;
        }
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
            if (this.hiringTeam) {
                this.hiringTeam.value = "Not Defined";
            }
            this.initCharacterCounters();
        }, CONFIG.SUBMISSION_RESET_TIMEOUT);
    }

    handleError(message) {
        toast.show(`Error: ${message}`, 'error', CONFIG.TOAST_DURATION);
    }

    handleReset() {
        // Check if there is any user entered text
        const hasContent = Array.from(this.inputs).some(input => {
            if (input === this.hiringTeam) {
                return input.value !== "Not Defined" && input.value.trim() !== "";
            }
            return input.value.trim() !== "";
        });

        if (hasContent) {
            const confirmed = confirm('Are you sure you want to reset the form? All unsaved data will be lost.');
            if (!confirmed) return;
        }

        this.form.reset();
        this.form.classList.remove('was-validated');
        this.inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
        if (this.hiringTeam) {
            this.hiringTeam.value = "Not Defined";
        }
        localStorage.removeItem('job_app_draft');
        this.initCharacterCounters();
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

    initCharacterCounters() {
        if (this.jobDesc) this.updateCounter(this.jobDesc);
        if (this.companyDesc) this.updateCounter(this.companyDesc);
    }

    updateCounter(input) {
        const length = input.value.length;
        if (input === this.jobDesc && this.jobDescCounter) {
            this.jobDescCounter.textContent = `${length} / 15000`;
        } else if (input === this.companyDesc && this.companyDescCounter) {
            this.companyDescCounter.textContent = `${length} / 15000`;
        }
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
