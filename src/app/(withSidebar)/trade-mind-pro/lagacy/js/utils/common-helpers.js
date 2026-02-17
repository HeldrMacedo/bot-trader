// js/utils/common-helpers.js
// Helpers compartilhados para reduzir duplicação em todo o sistema

// 📋 DEFINIÇÃO GLOBAL DE LOGCONFIG - DEVE SER A PRIMEIRA COISA EXECUTADA
(function () {
    'use strict';

    // Criar objeto logConfig global se não existir
    if (typeof window !== 'undefined' && typeof window.logConfig === 'undefined') {
        window.logConfig = {
            info: (context, message) => console.log(`ℹ️ [${context}] ${message}`),
            error: (context, message) => console.error(`❌ [${context}] ${message}`),
            warn: (context, message) => console.warn(`⚠️ [${context}] ${message}`),
            debug: (context, message) => console.log(`🔍 [${context}] ${message}`),
            shouldLog: (context, frequency = 1.0) => {
                // Verificar se deve fazer log baseado na frequência (0.0 a 1.0)
                return Math.random() <= frequency;
            }
        };
    }

    // Tornar disponível também como variável global (sem window)
    if (typeof globalThis !== 'undefined' && typeof globalThis.logConfig === 'undefined') {
        globalThis.logConfig = window.logConfig || {
            info: (context, message) => console.log(`ℹ️ [${context}] ${message}`),
            error: (context, message) => console.error(`❌ [${context}] ${message}`),
            warn: (context, message) => console.warn(`⚠️ [${context}] ${message}`),
            debug: (context, message) => console.log(`🔍 [${context}] ${message}`),
            shouldLog: (context, frequency = 1.0) => {
                // Verificar se deve fazer log baseado na frequência (0.0 a 1.0)
                return Math.random() <= frequency;
            }
        };
    }
})();

class CommonHelpers {
    // ========================================
    // DOM & UI HELPERS
    // ========================================

    static getElement(id, silent = false) {
        const el = document.getElementById(id);

        // 🔇 AUTO-SILENT: Elementos opcionais conhecidos não geram warnings
        const optionalPatterns = [
            // UI Elements que só existem em contextos específicos
            'symbol-select', 'barrier-', 'gale-', 'bottom-',
            'vip-', 'admin-', 'contract-', 'duration-',

            // Status elements que só aparecem quando sistema está ativo
            'monitoring-status-text', 'ai-status', 'gemini-version',

            // Footer elements que só existem quando rodapé está carregado
            'footer-', 'digit-pattern-', 'padrão-frequente',

            // Trade elements que só existem quando trading está ativo
            'trade-mode-', 'next-trade-', 'counter-', 'simulated-',

            // Configuration elements que só existem em views específicas
            'prediction-', 'stake-', 'real-', 'losses-',

            // Display elements que só existem quando dados estão sendo exibidos
            'execution-time', 'alerts-count', 'last-check', 'trades-executed',

            // Modal elements que só existem quando modais estão abertos
            'modal-', 'popup-', 'overlay-'
        ];

        const isOptional = optionalPatterns.some(pattern => id.includes(pattern)) ||
            // Elementos que terminam com palavras específicas
            id.endsWith('-display') ||
            id.endsWith('-counter') ||
            id.endsWith('-status') ||
            id.endsWith('-text') ||
            id.endsWith('-btn') ||
            id.endsWith('-input');


        return el;
    }

    static showElement(el) {
        if (el) el.style.display = '';
    }

    static hideElement(el) {
        if (el) el.style.display = 'none';
    }

    static enableButton(btn) {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('disabled');
        }
    }

    static disableButton(btn) {
        if (btn) {
            btn.disabled = true;
            btn.classList.add('disabled');
        }
    }

    static clearElement(el) {
        if (el) el.innerHTML = '';
    }

    static removeOrphanElements(selector) {
        const orphans = document.querySelectorAll(selector);
        orphans.forEach(el => {
            try {
                el.remove();
            } catch (error) {
                console.warn(`⚠️ [CLEANUP] Erro ao remover: ${selector}`, error);
            }
        });
    }

    // ========================================
    // ERROR HANDLING & NOTIFICATIONS
    // ========================================

    static showError(message, title = 'Erro', useAlert = false) {
        this.showToast(message, 'error');
        if (useAlert) {
            alert(`${title}: ${message}`);
        }
    }

    static showWarning(message, title = 'Aviso', useAlert = false) {
        this.showToast(message, 'warning');
        if (useAlert) {
            alert(`${title}: ${message}`);
        }
    }

    // 🔔 NOVO: Mostrar sucesso
    static showSuccess(message, duration = 3000) {
        this.showToast(message, 'success', duration);
    }

    // 🔔 NOVO: Mostrar Toast Notification
    static showToast(message, type = 'info', duration = 3000) {
        // 🔇 DESATIVADO A PEDIDO DO USUÁRIO - Remover mensagens de canto de tela
        return;

        /* Código original silenciado
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        ...
        */
    }

    static logDebug(context, message, frequency = 1.0) {
        // Verificar se deve fazer log baseado na frequência
        if (Math.random() > frequency) return;

        // Verificar se logConfig está disponível
        if (typeof logConfig !== 'undefined' && logConfig && typeof logConfig.debug === 'function') {
            logConfig.debug(context, message);
        }
    }

    // ========================================
    // SESSION & USER HELPERS
    // ========================================

    static getCurrentUser() {
        const user = SessionManager.getCurrentUser();
        if (!user) {
            console.warn('⚠️ [SESSION] Usuário não encontrado');
        }
        return user;
    }

    static getLoginId() {
        const user = this.getCurrentUser();
        return user?.authorize?.loginid || null;
    }

    static getSessionId() {
        return SessionManager.getUserSessionId();
    }

    static getToken() {
        return SessionManager.getLocalToken();
    }

    // ========================================
    // VALIDATION HELPERS
    // ========================================

    static isEmpty(value) {
        return !value || (typeof value === 'string' && value.trim() === '');
    }

    static isValidNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    static validateRequired(fields) {
        const missing = [];
        for (const [name, value] of Object.entries(fields)) {
            if (this.isEmpty(value)) {
                missing.push(name);
            }
        }
        return {
            isValid: missing.length === 0,
            missing
        };
    }

    // ========================================
    // ASYNC HELPERS
    // ========================================

    static async retryAsync(fn, maxAttempts = 3, delayMs = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                console.warn(`⚠️ [RETRY] Tentativa ${attempt} falhou, tentando novamente em ${delayMs}ms...`);
                await this.sleep(delayMs);
            }
        }
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ========================================
    // DATA HELPERS
    // ========================================

    static safeJSONParse(str, fallback = null) {
        try {
            return JSON.parse(str);
        } catch {
            return fallback;
        }
    }

    static safeJSONStringify(obj, fallback = '{}') {
        try {
            return JSON.stringify(obj);
        } catch {
            return fallback;
        }
    }

    static cloneObject(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch {
            return null;
        }
    }

    // ========================================
    // DIGIT EXTRACTION HELPERS
    // ========================================

    static extractLastDigitUnified(price, symbol = null) {
        try {
            // ✅ VALIDAÇÃO: Verificar se price é válido
            if (price === null || price === undefined || typeof price !== 'number') {
                console.warn(`⚠️ [UNIFIED EXTRACTION] Preço inválido: ${price}`);
                return null;
            }

            // 🎯 MÉTODO PRINCIPAL: SEMPRE usar marketData.extractLastDigitForAsset quando disponível
            const token = SessionManager?.getLocalToken?.();
            if (token) {
                const marketData = window.getMarketDataInstance?.(token);
                if (marketData && typeof marketData.extractLastDigitForAsset === 'function') {
                    // Usar símbolo fornecido ou tentar obter o símbolo ativo atual
                    const targetSymbol = symbol || window.selectedSymbol || SessionManager.getSessionData('selected_symbol');

                    if (targetSymbol) {
                        const result = marketData.extractLastDigitForAsset(price, targetSymbol);
                        if (result !== null && result !== undefined) {
                            return result;
                        }
                    }
                }
            }

            // 🔄 FALLBACK: Só usar quando marketData não estiver disponível
            console.warn(`⚠️ [UNIFIED EXTRACTION] Usando fallback para preço: ${price}`);
            const priceStr = price.toString();
            const decimalIndex = priceStr.indexOf('.');

            let decimalPlaces = 0;
            if (decimalIndex !== -1) {
                decimalPlaces = priceStr.length - decimalIndex - 1;
            }

            // ✅ CORREÇÃO: Respeitar exatamente as casas decimais detectadas, mínimo 1
            const effectiveDecimals = Math.max(1, decimalPlaces);
            const multiplier = Math.pow(10, effectiveDecimals);
            const processedPrice = Math.round(price * multiplier);

            // Extrair último dígito do número processado
            const lastDigit = processedPrice % 10;

            return lastDigit;
        } catch (error) {
            console.error('❌ [UNIFIED EXTRACTION] Erro:', error);
            return null;
        }
    }

    // ========================================
    // ARRAY HELPERS
    // ========================================

    static getLastN(arr, n) {
        if (!Array.isArray(arr)) return [];
        return arr.slice(-n);
    }

    static removeDuplicates(arr) {
        return [...new Set(arr)];
    }

    static groupBy(arr, key) {
        return arr.reduce((acc, item) => {
            const group = item[key];
            if (!acc[group]) acc[group] = [];
            acc[group].push(item);
            return acc;
        }, {});
    }
}

// Exportar para uso global
window.CommonHelpers = CommonHelpers;
