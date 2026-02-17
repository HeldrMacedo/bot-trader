// js/utils/ui-helpers.js
// Helpers para operações de UI e Modals

class UIHelpers {
    // ========================================
    // MODAL MANAGEMENT
    // ========================================

    static createModal(id, title, content, options = {}) {
        // Remover modal existente
        this.removeModal(id);

        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'custom-modal';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="UIHelpers.removeModal('${id}')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="UIHelpers.removeModal('${id}')">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
            </div>
        `;

        document.body.appendChild(modal);

        // Animação de entrada
        setTimeout(() => {
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
            modal.querySelector('.modal-content').style.opacity = '1';
        }, 10);

        return modal;
    }

    static removeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.querySelector('.modal-content').style.transform = 'scale(0.9)';
            modal.querySelector('.modal-content').style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
        }
    }

    static removeAllModals() {
        const modals = document.querySelectorAll('.custom-modal');
        modals.forEach(modal => modal.remove());
    }

    // ========================================
    // NOTIFICATION SYSTEM
    // ========================================

    static showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        const container = this.getOrCreateNotificationContainer();
        container.appendChild(notification);

        // Animação de entrada
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto-remover
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    static getOrCreateNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    // ========================================
    // LOADING INDICATORS
    // ========================================

    static showLoading(containerId, message = 'Carregando...') {
        const container = CommonHelpers.getElement(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="loading-indicator">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }

    static hideLoading(containerId) {
        const container = CommonHelpers.getElement(containerId);
        if (container) {
            const loading = container.querySelector('.loading-indicator');
            if (loading) loading.remove();
        }
    }

    // ========================================
    // BUTTON STATE MANAGEMENT
    // ========================================

    static setButtonState(buttonId, state) {
        const btn = CommonHelpers.getElement(buttonId);
        if (!btn) return;

        switch (state) {
            case 'loading':
                btn.disabled = true;
                btn.dataset.originalText = btn.textContent;
                btn.textContent = '⏳ Processando...';
                break;
            case 'success':
                btn.disabled = false;
                btn.textContent = btn.dataset.originalText || btn.textContent;
                btn.classList.add('success');
                setTimeout(() => btn.classList.remove('success'), 2000);
                break;
            case 'error':
                btn.disabled = false;
                btn.textContent = btn.dataset.originalText || btn.textContent;
                btn.classList.add('error');
                setTimeout(() => btn.classList.remove('error'), 2000);
                break;
            case 'reset':
            default:
                btn.disabled = false;
                btn.textContent = btn.dataset.originalText || btn.textContent;
                break;
        }
    }

    static updateMonitoringButtons(isActive) {
        const startBtn = CommonHelpers.getElement('start-monitoring-btn');
        const stopBtn = CommonHelpers.getElement('stop-monitoring-btn');

        if (isActive) {
            CommonHelpers.disableButton(startBtn);
            CommonHelpers.enableButton(stopBtn);
        } else {
            CommonHelpers.enableButton(startBtn);
            CommonHelpers.disableButton(stopBtn);
        }
    }

    // ========================================
    // FORM HELPERS
    // ========================================

    static getFormData(formId) {
        const form = CommonHelpers.getElement(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    }

    static setFormData(formId, data) {
        const form = CommonHelpers.getElement(formId);
        if (!form) return;

        for (const [key, value] of Object.entries(data)) {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = value;
        }
    }

    static clearForm(formId) {
        const form = CommonHelpers.getElement(formId);
        if (form) form.reset();
    }

    // ========================================
    // OVERLAY MANAGEMENT
    // ========================================

    static createOverlay(id, content, options = {}) {
        this.removeOverlay(id);

        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = `custom-overlay ${options.className || ''}`;
        overlay.innerHTML = content;

        document.body.appendChild(overlay);

        if (options.animate) {
            setTimeout(() => overlay.classList.add('show'), 10);
        }

        return overlay;
    }

    static removeOverlay(id) {
        const overlay = document.getElementById(id);
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 200);
        }
    }

    static removeAllOverlays() {
        const overlays = document.querySelectorAll('.custom-overlay');
        overlays.forEach(overlay => overlay.remove());
    }
}

// Exportar para uso global
window.UIHelpers = UIHelpers;
