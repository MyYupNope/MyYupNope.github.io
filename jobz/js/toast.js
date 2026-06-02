/**
 * Toast Notification System
 * Handles elegant, non-blocking user feedback
 */
class Toast {
    constructor() {
        this.container = this._createContainer();
    }

    /**
     * Creates and appends the toast container to the DOM
     * @private
     */
    _createContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Shows a toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'success', 'error', 'info', 'warning'
     * @param {number} duration - How long to show the toast (ms)
     */
    show(message, type = 'info', duration = 5000) {
        const toastId = `toast-${Date.now()}`;
        const backgroundColor = this._getBackgroundColor(type);

        const toastElement = document.createElement('div');
        toastElement.id = toastId;
        toastElement.className = 'toast align-items-center text-white border-0';
        toastElement.setAttribute('role', 'alert');
        toastElement.setAttribute('aria-live', 'assertive');
        toastElement.setAttribute('aria-atomic', 'true');
        toastElement.style.backgroundColor = backgroundColor;

        const flexContainer = document.createElement('div');
        flexContainer.className = 'd-flex';

        const toastBody = document.createElement('div');
        toastBody.className = 'toast-body';
        toastBody.textContent = message;

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close btn-close-white me-2 m-auto';
        closeButton.setAttribute('data-bs-dismiss', 'toast');
        closeButton.setAttribute('aria-label', 'Close');

        flexContainer.appendChild(toastBody);
        flexContainer.appendChild(closeButton);
        toastElement.appendChild(flexContainer);

        this.container.appendChild(toastElement);

        // Safety check for Bootstrap
        if (typeof bootstrap === 'undefined') {
            console.warn('Bootstrap JS not loaded. Feedback will be limited.');
            alert(message);
            return;
        }

        // Initialize Bootstrap Toast
        const bsToast = new bootstrap.Toast(toastElement, {
            delay: duration,
            autohide: true
        });

        bsToast.show();

        // Remove element from DOM after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });

        return bsToast;
    }

    _getBackgroundColor(type) {
        switch (type) {
            case 'success': return '#1e8e3e'; // Google Green
            case 'error': return '#d93025'; // Google Red
            case 'warning': return '#f9ab00'; // Google Yellow
            case 'info': return '#1a73e8'; // Google Blue
            default: return '#1a73e8';
        }
    }
}

export const toast = new Toast();
